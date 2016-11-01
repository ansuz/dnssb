var Pull = require("pull-stream");
var KVSet = require("kvset");
var Query = module.exports = {};

Query.branches = function (name, type, _class, cb) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) return cb(err);

        var set = new KVSet()
        Pull(sbot.messagesByType({
            type: 'ssb-dns',
        }),
        Pull.filter(function (msg) {
            var c = msg.value.content;
            var record = c && c.record;
            return record
                && record.name === name
                && record.type === type
                && (!_class || _class === (record.class || 'IN'));
        }),
        Pull.drain(function (msg) {
            var c = msg.value.content;
            if (c.branch) set.remove(c.branch);
            set.add(msg.key);
        }, function (err) {
            if (err) return cb(err);
            cb(null, Object.keys(set.heads));
        }));
    });
};
