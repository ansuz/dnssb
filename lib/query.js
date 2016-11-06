var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

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
        var ts = record.timestamp;
        var value = this.serials[zone];
        this.serials[zone] = isNaN(value) || ts > value ? ts : value;
    }
};

ZoneSerials.prototype.getSerial = function (zone) {
    var secs = Math.floor(this.serials[zone]/1000) || 0;
    return secs % 0x100000000;
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

Query.query = function (sbot, question, cb) {
    // look up records that match a question, including wildcard records
    // and zone authority records
    var authorityDomains = expandName(question.name);
    var wildcardDomains = expandName(question.name, '*');
    var authorities = new Wildcards();
    var answers = new Wildcards();
    var zoneSerials = new ZoneSerials();
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        zoneSerials.addRecord(record);
        return record.type === 'SOA'
            ? record.name in authorityDomains
            : (record.name == question.name || record.name in wildcardDomains)
                && record.type == question.type
                && record.class == question.class;
    }),
    Query.drainSet(function (record) {
        if (record.type === 'SOA' && question.type !== 'SOA') {
            authorities.addRecord(record);
        } else {
            answers.addRecord(record);
        }
    }, function (err) {
        if (err) return cb(err);
        var authority = authorities.getRecords();
        authority.forEach(function (auth) {
            if (!auth.data.serial) {
                // special case: calculate a serial for the SOA
                auth.data.serial = zoneSerials.getSerial(auth.name);
            }
        });
        cb(null, answers.getRecords(), authority);
    }));
};
