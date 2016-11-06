var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

Query.branches = function (sbot, name, type, _class, cb) {
    var question = {name: name, type: type, class: _class || "IN"};
    Pull(Query.query(sbot, question, function (err, recs) {
        if (err) return cb(err);
        cb(null, recs.map(function (record) {
            return record.key;
        }))
    }));
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
    Pull.map(msgToRecord));
};

Query.matches = function (question) {
    return Pull.filter(function (record) {
        return record
            && record.name === question.name
            && record.type === question.type
            && record.class === question.class;
    });
}

Query.records = function (sbot, cb) {
    var set = new KVSet();
    return Pull.drain(function (record) {
        if (record.branch) set.remove(record.branch);
        set.add(record.id, record);
    }, function (err) {
        if (err) return cb(err);
        var records = [];
        for (var key in set.heads) {
            var record = set.heads[key];
            records.push(record);
        }
        cb(err, records);
    });
};

Query.query = function (sbot, question, cb) {
    return Pull(Query.all(sbot),
        Query.matches(question),
        Query.records(sbot, cb));
};
