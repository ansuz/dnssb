var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

function compareRecordsBySerial(a, b) {
    return b.data.serial - a.data.serial;
}

function compareRecords(a, b) {
    return a.name > b.name  ? 1 : a.name  < b.name  ? -1 :
           a.type > b.type  ? 1 : a.type  < b.type  ? -1 :
          a.class > b.class ? 1 : a.class < b.class ? -1 :
          0
}

function isRecordEqual(a, b) {
    return (a === b) || (a && b
        && a.name === b.name
        && a.type === b.type
        && a.class === b.class);
}

function mergeRecords(into, from) {
    if (from) from.filter(function (a) {
        return into.every(function (b) {
            return !isRecordEqual(a, b);
        })
    }).forEach(function (rec) {
        into.push(rec);
    });
}

function mergeResults(into, from) {
    mergeRecords(into.additionals, from.additionals);
    mergeRecords(into.answers, from.answers);
    mergeRecords(into.authorities, from.authorities);
    mergeRecords(into.questions, from.questions);
    if (from.expires < into.expires) into.expires = from.expires;
    into.domainExists |= from.domainExists
    into.authoritative |= from.authoritative
    into.cache &= from.cache
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

function RecordsMap() {
    this.recs = {};
}

RecordsMap.prototype.addRecord = function (r) {
    if (r.name in this.recs) {
        this.recs[r.name].push(r);
    } else {
        this.recs[r.name] = [r];
    }
};

RecordsMap.prototype.popRecords = function (name) {
    name = name.replace(/\.$/, '');
    var recs = this.recs[name];
    delete this.recs[name];
    return recs || [];
};

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

Wildcards.prototype.getTopRecords = function () {
    // get records for the shortest name length
    if (this.lengths.length) {
        var len = Math.min.apply(Math, this.lengths);
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

var nonRecurseTypes = {
    CNAME: true,
    AXFR: true,
    IXFR: true,
};

Query.query = function (sbot, question, cb) {
    if (nonRecurseTypes[question.type]) {
        Query.querySingle(sbot, question, cb);
    } else {
        Query.queryRecursive(sbot, question, [], cb);
    }
}

// recursive query
Query.queryRecursive = function (sbot, question, stack, cb) {
    var result = {
        cache: true,
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

        mergeResults(result, res)

        // recurse on CNAMEs
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

        if (!--waiting) cb(null, result);
    }
}

Query.querySingle = function (sbot, question, cb) {
    // look up records that match a question, including wildcard records
    // and zone authority records
    var qName = question.name.toLowerCase();
    var authorityDomains = expandName(qName);
    var wildcardDomains = expandName(qName, '*');
    var isIncrementalTransfer = question.type === 'IXFR'
    var isTransfer = isIncrementalTransfer || question.type === 'AXFR'

    var authorities = new Wildcards();
    var maybeGlue = new RecordsMap();
    var answers = isTransfer ? new Records() : new Wildcards();
    var zoneSerials = new ZoneSerials();
    var result = {
        cache: !isTransfer
    };
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        var recordDomains = expandName(record.name);
        zoneSerials.addRecord(recordDomains);
        if (isIncrementalTransfer
          && zoneSerials.getSerial(qName) < question.serial) {
            return false
        }
        var nameMatches = isTransfer ? qName in recordDomains :
                                       record.name in wildcardDomains;
        if (nameMatches) {
            result.domainExists = true;
        }
        if (!isTransfer) {
            if (record.type === 'A' || record.type === 'AAAA') {
                // include all because we might need them for glue
                return true;
            }
            if (record.type === 'NS' || record.type === 'SOA') {
                return record.name in authorityDomains
            }
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
        if (record.type === 'NS' || record.type === 'SOA') {
            result.authoritative = true;
            if (question.class === record.class
              && question.type === record.type
              && record.name in wildcardDomains) {
                answers.addRecord(record);
            } else {
                authorities.addRecord(record);
                if (isTransfer) {
                    answers.addRecord(record);
                }
            }
        } else if (!isTransfer
            && (record.type === 'A' || record.type === 'AAAA')
            && (!(record.name in wildcardDomains)
                || (question.type !== record.type && question.type !== '*')
                || (question.class !== record.class && question.class !== '*'))
        ) {
            maybeGlue.addRecord(record);
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

        result.additionals = [];
        result.authorities = isTransfer
            ? authorities.getTopRecords()
            : authorities.getRecords();
        result.authorities.forEach(updateAuthority);
        result.answers.forEach(updateAuthority);
        function updateAuthority(r) {
            if (r.type === 'SOA') {
                if (!r.data.serial) {
                    // special case: calculate a serial for the SOA
                    r.data.serial = zoneSerials.getSerial(r.name);
                }
                if (r.ttl < ttl) ttl = r.ttl;
                if (!result.answers.length) {
                    if (r.data.ttl < ttl) ttl = r.data.ttl;
                }
                if (!isTransfer) {
                    result.additionals = result.additionals.concat(
                        maybeGlue.popRecords(r.data.mname))
                }
            } else if (r.type === 'NS') {
                if (!isTransfer) {
                    result.additionals = result.additionals.concat(
                        maybeGlue.popRecords(r.data))
                }
            }
        }

        result.expires = Date.now() + ttl * 60e3;
        result.questions = [];

        if (isTransfer) {
            // RFC 5936, Section 2.2
            result.questions.push(question);
            // pick a SOA record to use as the bookend
            var soa = result.authorities.filter(function (r) {
                return r.type === 'SOA';
            }).sort(compareRecordsBySerial)[0];
            result.authorities.length = 0;
            if (soa) {
                result.answers = [soa].concat(
                    result.answers.filter(function (r) {
                        return r !== soa
                    }).sort(compareRecords),
                    [soa]
                );
            }
        } else {
            // only include SOA if there are no answers
            if (result.answers.length > 0) {
                result.authorities = result.authorities.filter(function (r) {
                    return r.type !== 'SOA';
                });
            }
            // include SOA if there are no answers, NS if there are
            result.authorities = result.authorities.filter(function (r) {
                return r.type !== (result.answers.length ? 'SOA' : 'NS');
            });

            // resolve wildcards in answers
            result.answers.forEach(function (r) {
                if (r.name !== qName && r.name in wildcardDomains) {
                    r.name = qName;
                }
            })
        }
        cb(null, result);
    }));
};
