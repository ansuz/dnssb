var Pull = require("pull-stream");
var Query = require("./query");
var Dump = module.exports = {};

Dump.records = function (each, done) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) { return void done(err); }

        Pull(Query.all(sbot),
        Pull.drain(each, function (err) {
          if (err) throw err;
          done(sbot);
        }));
    });
};
