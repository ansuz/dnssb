var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

Query.branches = function (sbot, name, type, _class, cb) {
    var question = {name: name, type: type, class: _class || "IN"};
    Query.query(sbot, question, function (err, recs) {
        if (err) return cb(err);
        cb(null, recs.map(function (record) {
            return record.key;
        }))
    });
};

function msgToRecord(msg) {
    var c = msg.value.content;
    var r = c && c.record;
    if (!r) return;
    r.id = msg.key;
    r.author = msg.value.author;
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
    this.namesByLength = {};
}

Wildcards.prototype.add = function (record) {
    var len = record.name.length;
    if (len in this.namesByLengths) {
        this.namesByLengths[len].push(record);
    } else {
        authorityLengths.push(len);
        this.namesByLengths[len] = [record];
    }
};

Wildcards.prototype.getRecords = function () {
    // get records for the longest name length
    if (this.lengths.length) {
        var len = Math.max.apply(Math, this.lengths);
        return this.namesByLength[len] || [];
    }
    return [];
};

function PullSet(each, onEnd) {
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
}

Query.query = function (sbot, question, cb) {
    // look up records that match a question, including wildcard records
    var authorityDomains = expandName(question.name);
    var wildcardDomains = expandName(question.name, '*');
    var authorities = new Wildcards();
    var answers = new Wildcards();
    Pull(Query.all(sbot),
    Pull.filter(function (record) {
        return record.type === 'SOA'
            ? record.name in authorityDomains
            : (record.name == question.name || record.name in wildcardDomains)
                && record.type == question.type
                && record.class == question.class;
    }),
    PullSet(function (record) {
        if (err) return cb(err);
        if (record.type === 'SOA' && question.type !== 'SOA') {
            authorities.add(record);
        } else {
            answers.add(record);
        }
    }, function (err) {
        if (err) return cb(err);
        cb(null, answers.getRecords(), authorities.getRecords());
    }));
};
