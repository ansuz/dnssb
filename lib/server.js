var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var SsbDns = require("./ssb-dns");

var Server = module.exports = {};

var log = {
    req: function (req, opt) {
        if (!(opt && opt.verbose)) { return; }
        var q = req.question[0];
        console.log();
        console.log({
            name: q.name,
            type: q.type,
            class: q.class,
        });
    },
};

var answer = function (sbot, req, res, opt) {
    log.req(req, opt);

    var q = req.question;

    // TODO validate queries more carefully
    if (!q.length) {
        console.error("invalid question");
        res.end();
        return;
    }

    var qMap = {}
    q.forEach(function (q) {
        qMap[q.name.toLowerCase() + ':' + q.type] = true;
    });

    Pull(sbot.messagesByType({
        type: 'ssb-dns',
    }),
    Pull.filter(function (msg) {
        var c = msg.value.content;
        var record = c && c.record;
        return record && qMap[record.name + ':' + record.type];
    }),
    SsbDns(function (err, records) {
        if (opt && opt.verbose) {
            var names = q.map(function (q) { return q.name }).join(', ');
            var types = records.map(function (r) { return r.type }).join(', ');
            var vals = records.map(function (r) { return r.value }).join(', ');
            console.log("%s (%s) => %s", names, types, vals);
        }
        res.answer = records;
        res.end();
    }));
};

var createServer = function (sbot, port, host, cb, opt) {
    var Dnsd = require("dnsd");
    Dnsd.createServer(function(req, res) {
        answer(sbot, req, res, opt);
    }).listen(port, host, cb);
};

Server.listen = function (port, host, cb, opt) {
    var Client = require("ssb-client");
    Client(function (err, sbot) {
        if (err) {
            console.error(err);
            return void process.exit(1);
        }
        createServer(sbot, port, host, cb, opt);
    });
};

