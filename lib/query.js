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
    var names = {};
    for (var labels = name.split(/\./); labels.length; labels.shift()) {
        if (wildcard) labels[0] = wildcard;
        names[labels.join('.')] = true;
    }
    return names;
}

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

ZoneSerials.prototype.addRecord = function (record) {
    for (var zone in expandName(record.name)) {
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
    // look up records that match a question, including wildcard records
    // and zone authority records
    var authorityDomains = expandName(question.name);
    var wildcardDomains = expandName(question.name, '*');
    var authorities = new Wildcards();
    var answers = new Wildcards();
    var zoneSerials = new ZoneSerials();
    var result = {};
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        zoneSerials.addRecord(record);
        var nameMatches = record.name == question.name
            || record.name in wildcardDomains
        if (nameMatches) {
            result.domainExists = true;
        }
        if (record.type === 'SOA') {
            return record.name in authorityDomains
        }
        return nameMatches
            && (record.type == question.type || record.type === 'CNAME')
            && record.class == question.class;
    }),
    Query.drainSet(function (record) {
        if (record.type === 'SOA') {
            result.authoritative = true;
            if (question.type === 'SOA'
              && question.class === record.class
              && (question.name === record.name
                    || record.name in wildcardDomains)) {
                answers.addRecord(record);
            } else {
                authorities.addRecord(record);
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
        // resolve cnames with another query
        if (question.type !== 'CNAME') {
            var cnames = result.answers.filter(function (answer) {
                return answer.type === 'CNAME';
            });
            var waiting = cnames.length;
            if (waiting > 0) {
                return cnames.forEach(function (record) {
                    Query.query(sbot, {
                        class: question.class,
                        type: question.type,
                        name: record.data.replace(/\.$/, '')
                    }, next);
                })
                function next(err, res) {
                    if (err) return waiting = 0, cb(err)
                    merge(result.additionals, res.additionals);
                    merge(result.answers, res.answers);
                    merge(result.authorities, res.authorities);
                    if (!--waiting) cb(err, result);
                }
            }
        }
        cb(null, result);
    }));
};
