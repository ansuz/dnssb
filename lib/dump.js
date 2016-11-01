var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var Dump = module.exports = {};
var SsbDns = require("./ssb-dns");

Dump.records = function (each, done) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) { return void done(err); }

        Pull(sbot.messagesByType({
            type: 'ssb-dns',
        }),
        SsbDns(function (err, records) {
            records.forEach(each);
            done(sbot);
        }));
    });
};
