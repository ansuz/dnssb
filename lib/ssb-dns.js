var Pull = require("pull-stream");
var KVSet = require("kvset");
var Pad = require("pad-ipv6");

function fixRecord(r) {
  if (!r.ttl) r.ttl = 500;
  if (!r.class) r.class = "IN";
  if (r.value) r.data = r.value, delete r.value
  if (r.type === 'AAAA') r.data = Pad(r.data);
}

module.exports = function SsbDns(cb) {
    var set = new KVSet()
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
