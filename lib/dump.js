var Pull = require("pull-stream");
var Paramap = require("pull-paramap");
var AsyncMemo = require("asyncmemo");
var getAvatar = require("ssb-avatar");
var Query = require("./query");
var Format = require("./format");
var Dump = module.exports = {};

Dump.records = function (sbot, each, done) {
    Pull(Query.all(sbot),
    Query.drainSet(each, done));
};

function sortRecords(records) {
    records.forEach(function (r) {
        r.labels = typeof r.name === 'string'
            ? r.name.split(/\./).reverse() : [];
    });
    records.sort(function (a, b) {
        var len = Math.max(a.labels.length, b.labels.length);
        for (var i = 0; i < len; i++) {
            var labA = a.labels[i] || '';
            var labB = b.labels[i] || '';
            if (labA > labB) return 1;
            if (labA < labB) return -1;
        }
        return 0;
    })
}

Dump.formattedRecords = function (sbot, opts, each, done) {
    sbot.whoami(function (err, feed) {
        if (err) throw err;
        var getAbout = AsyncMemo(getAvatar, sbot, feed.id);

        Pull(Query.inDomain(sbot, opts.name),
        Query.collectSet(function (err, records) {
            if (err) throw err;
            records.forEach(Format.formatNames(opts.name));
            sortRecords(records);
            Pull(Pull.values(records),
            Paramap(function (record, cb) {
                getAbout(record.author, function (err, about) {
                    record.authorName = '@' + about.name;
                    cb(err, record);
                });
            }, 8),
            Pull.map(Format.recordsToLines(Format.getMaxLengths(records))),
            Pull.drain(each, done))
        }));
    });
};
