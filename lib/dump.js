var Pull = require("pull-stream");
var Query = require("./query");
var Dump = module.exports = {};

Dump.records = function (each, done) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) { return void done(err); }

        Pull(Query.all(sbot),
        Query.drainSet(each, function (err) {
          if (err) throw err;
          done(sbot);
        }));
    });
};

Dump.recordToLine = function (record) {
    // TODO: output in zone-file-like format
    return JSON.stringify(record);
};
