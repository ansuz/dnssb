var Pull = require("pull-stream");
var Query = require("./query");
var Format = require("./format");
var Dump = module.exports = {};

Dump.records = function (opts, each, done) {
    var Client = require("ssb-client");
    if (typeof opts === "function") done = each, each = opts, opts = {}

    Client(function (err, sbot) {
        if (err) { return void done(err); }

        Pull(Query.inDomain(sbot, opts.name),
        Query.drainSet(each, function (err) {
          if (err) throw err;
          done(sbot);
        }));
    });
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

Dump.formattedRecords = function (opts, each, done) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) throw err;

        Pull(Query.inDomain(sbot, opts.name),
        Query.collectSet(function (err, records) {
            if (err) throw err;
            records.forEach(Format.formatNames(opts.name));
            sortRecords(records);
            records.map(Format.recordToLine).forEach(each);
            done(sbot);
        }));
    });
};
