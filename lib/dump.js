var Pull = require("pull-stream");
var Query = require("./query");
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
