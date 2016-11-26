var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

function isRecordEqual(a, b) {
    return (a === b) || (a && b
        && a.name === b.name
        && a.type === b.type
        && a.class === b.class);
}

function merge(into, from) {
    if (from) from.filter(function (a) {
        return into.every(function (b) {
            return !isRecordEqual(a, b);
        })
    }).forEach(function (rec) {
        into.push(rec);
    });
}

Query.branches = function (sbot, name, type, _class, cb) {
    if (!_class) _class = "IN";
    var branches = [];
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        return record.name == name
            && record.type == type
            && record.class == _class;
    }),
    Query.drainSet(function (record) {
        branches.push(record.id);
    }, function (err) {
        cb(err, branches);
    }));
};

function msgToRecord(msg) {
    var c = msg.value.content;
    var r = c && c.record;
    if (!r) return;
    r.id = msg.key;
    r.author = msg.value.author;
    r.timestamp = msg.value.timestamp;
    r.branch = c.branch;
    if (!r.ttl) r.ttl = 500;
    if (!r.class) r.class = "IN";
    if (r.value) r.data = r.value, delete r.value
    if (r.type === 'AAAA') r.data = Pad(r.data);
    return r;
}

Query.all = function (sbot) {
    return Pull(sbot.messagesByType({
        type: 'ssb-dns',
    }),
    Pull.map(msgToRecord),
    Pull.filter());
};

function recordsInDomain(sbot, name) {
    var path = name.split(/\./g).reverse()

    /* enable this when records without path propery are to be deprecated:
    // use ssb-query if it is supported
    if (sbot.query) return sbot.query.read({
        query: [{$filter: {value: {content: {
            type: 'ssb-dns',
            path: {$prefix: path}
        }}}}]
    });
    */

    // fallback to logt
    return Pull(sbot.messagesByType({
        type: 'ssb-dns',
    }),
    Pull.filter(function (msg) {
        var c = msg.value.content;
        var p = c.path;
        if (!p) {
            var name = c.record && c.record.name;
            if (typeof name !== 'string') return false;
            p = name.split(/\./).reverse()
        }
        for (var i = 0; i < path.length; i++) {
            if (path[i] !== p[i]) return false;
        }
        return true;
    }));
}

Query.inDomain = function (sbot, name) {
    if (!name) return Query.all(sbot);
    return Pull(recordsInDomain(sbot, name),
    Pull.map(msgToRecord),
    Pull.filter());
};

function expandName(name, wildcard) {
    var names = {'': true};
    names[name] = true;
    for (var labels = name.split(/\./); labels.length; labels.shift()) {
        if (wildcard) labels[0] = wildcard;
        names[labels.join('.')] = true;
    }
    return names;
}

function Records() {
    this.recs = [];
}

Records.prototype.addRecord = function (record) {
    this.recs.push(record);
};

Records.prototype.getRecords = function () {
    return this.recs;
};

function Wildcards() {
    this.lengths = [];
    this.recordsByLength = {};
}

Wildcards.prototype.addRecord = function (record) {
    var len = record.name.length;
    if (len in this.recordsByLength) {
        this.recordsByLength[len].push(record);
    } else {
        this.recordsByLength[len] = [record];
        this.lengths.push(len);
    }
};

Wildcards.prototype.getRecords = function () {
    // get records for the longest name length
    if (this.lengths.length) {
        var len = Math.max.apply(Math, this.lengths);
        return this.recordsByLength[len] || [];
    }
    return [];
};

function ZoneSerials() {
    this.serials = {};
}

ZoneSerials.prototype.addRecord = function (zones) {
    for (var zone in zones) {
        this.serials[zone] = (+this.serials[zone] || 0) + 1;
    }
};

ZoneSerials.prototype.getSerial = function (zone) {
    return this.serials[zone] % 0x100000000;
};

Query.drainSet = function (each, onEnd) {
    var set = new KVSet();
    return Pull.drain(function (record) {
        if (record.branch) set.remove(record.branch);
        set.add(record.id, record);
    }, function (err) {
        if (err) return onEnd(err);
        for (var key in set.heads) {
            var record = set.heads[key];
            try {
                each(record);
            } catch(e) {
                return onEnd(e);
            }
        }
        onEnd(null);
    });
};

Query.collectSet = function (cb) {
    var records = [];
    return Query.drainSet(function (record) {
        records.push(record);
    }, function (err) {
        return cb(err, records);
    });
};

Query.query = function (sbot, question, cb) {
    Query.queryRecursive(sbot, question, [], cb)
}

// recursive query
Query.queryRecursive = function (sbot, question, stack, cb) {
    var isTransfer = question.type === 'AXFR'

    var result = {
        answers: [],
        authorities: [],
        additionals: [],
        questions: [],
        expires: Date.now() + 60*60e3,
    };

    // avoid infinite recursion
    if (stack.some(function (q) {
        return isRecordEqual(q, question);
    })) {
        return cb(null, result)
    }

    var waiting = 1;
    Query.querySingle(sbot, question, next);

    function next(err, res) {
        if (err) return waiting = 0, cb(err);

        merge(result.additionals, res.additionals);
        merge(result.answers, res.answers);
        merge(result.authorities, res.authorities);
        merge(result.questions, res.questions);
        if (res.expires < result.expires) result.expires = res.expires;

        // recurse on CNAMEs
        if (!isTransfer && question.type !== 'CNAME') {
            var stack2 = stack.concat(question)
            res.answers.filter(function (answer) {
                return answer.type === 'CNAME';
            }).map(function (record) {
                return {
                    class: question.class,
                    type: question.type,
                    name: record.data.replace(/\.$/, '')
                }
            }).forEach(function (q) {
                waiting++
                Query.queryRecursive(sbot, q, stack2, next)
            });
        }

        if (!--waiting) cb(null, result);
    }
}

Query.querySingle = function (sbot, question, cb) {
    // look up records that match a question, including wildcard records
    // and zone authority records
    var authorityDomains = expandName(question.name);
    var wildcardDomains = expandName(question.name, '*');
    var isTransfer = question.type === 'AXFR'
    var authorities = new Wildcards();
    var answers = isTransfer ? new Records() : new Wildcards();
    var zoneSerials = new ZoneSerials();
    var result = {};
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        var recordDomains = expandName(record.name);
        zoneSerials.addRecord(recordDomains);
        var nameMatches = isTransfer
            ? question.name in recordDomains
            : record.name in wildcardDomains;
        if (nameMatches) {
            result.domainExists = true;
        }
        if (record.type === 'SOA') {
            return record.name in authorityDomains;
        }
        return nameMatches
            && (isTransfer
             || question.type === record.type
             || question.type === '*'
             || 'CNAME' === record.type)
            && (question.class === record.class
             || question.class === '*');
    }),
    Query.drainSet(function (record) {
        if (record.type === 'SOA') {
            result.authoritative = true;
            if (question.class === record.class
             && question.type === 'SOA'
             && record.name in wildcardDomains) {
                answers.addRecord(record);
            } else {
                authorities.addRecord(record);
                if (isTransfer) {
                    answers.addRecord(record);
                }
            }
        } else {
            answers.addRecord(record);
        }
    }, function (err) {
        if (err) return cb(err);
        var ttl = 3600; // max internal ttl
        result.answers = answers.getRecords();
        result.answers.forEach(function (record) {
            if (record.ttl < ttl) ttl = record.ttl;
        });
        result.authorities = authorities.getRecords();
        result.authorities.forEach(function (auth) {
            if (!auth.data.serial) {
                // special case: calculate a serial for the SOA
                auth.data.serial = zoneSerials.getSerial(auth.name);
            }
            if (auth.ttl < ttl) ttl = auth.ttl;
            if (!result.answers.length) {
                if (auth.data.ttl < ttl) ttl = auth.data.ttl;
            }
        });
        result.expires = Date.now() + ttl * 60e3;
        result.additionals = [];
        result.questions = [];

        if (isTransfer) {
            // RFC 5936, Section 2.2
            result.questions.push(question);
            // pick a SOA record to use as the bookend
            var soa = result.authorities.splice(0)[0];
            result.answers = [soa].concat(result.answers.filter(function (r) {
                return r !== soa;
            }), [soa]);
        }
        cb(null, result);
    }));
};
