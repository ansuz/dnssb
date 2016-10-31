var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var Dump = module.exports = {};

Dump.records = function (each, done) {
    var Client = require("ssb-client");

    Client(function (err, sbot) {
        if (err) { return void done(err); }

        Pull(sbot.messagesByType({
            type: 'ssb-dns',
        }),
        Pull.filter(function (msg) {
            return typeof(Ansuz.find(msg, ['value', 'content', 'record'])) === 'object';
        }),
        Pull.map(function (msg) {
            each(msg, Ansuz.find(msg, ['value', 'content', 'record']));
        }),
        Pull.onEnd(function () {
            done(sbot);
        }));
    });
};
