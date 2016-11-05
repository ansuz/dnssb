var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");
var Query = module.exports = {};

Query.branches = function (name, type, _class, cb) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) return cb(err);

        var question = {name: name, type: type, class: _class || "IN"};
        Pull(Query.query(sbot, question, function (err, recs) {
            if (err) return cb(err);
            cb(null, recs.map(function (record) {
                return record.key;
            }))
        }));
    });
};

function fixRecord(r) {
  if (!r.ttl) r.ttl = 500;
  if (!r.class) r.class = "IN";
  if (r.value) r.data = r.value, delete r.value
  if (r.type === 'AAAA') r.data = Pad(r.data);
}

Query.all = function (sbot) {
    return sbot.messagesByType({
        type: 'ssb-dns',
    });
};

Query.matches = function (question) {
    return Pull.filter(function (msg) {
        var c = msg.value.content;
        var record = c && c.record;
        return record
            && record.name === question.name
            && record.type === question.type
            && record.class === question.class;
    });
}

Query.records = function (sbot, cb) {
    var set = new KVSet();
    return Pull.drain(function (msg) {
        var c = msg.value.content;
        if (c.branch) set.remove(c.branch);
        set.add(msg.key, msg.value);
    }, function (err) {
        var records = [];
        for (var key in set.heads) {
            var value = set.heads[key];
            var c = value.content;
            var record = c && c.record;
            if (!record) continue;
            record.id = key;
            fixRecord(record);
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
