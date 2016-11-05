var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var Query = require("./query");

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

    // one query per dns message
    var q = req.question;

    // TODO validate queries more carefully
    if (!q.length) {
        console.error("invalid question");
        res.end();
        return;
    }

    Query.query(sbot, q[0], function (err, records) {
        if (err) console.error(err);
        if (opt && opt.verbose) {
            var types = records.map(function (r) { return r.type }).join(', ');
            var vals = records.map(function (r) { return r.value }).join(', ');
            console.log("%s (%s) => %s", q[0].name, types, vals);
        }
        res.answer = records;
        res.end();
    });
};

var createServer = Server.create = function (sbot, port, host, cb, opt) {
    var Dnsd = require("dnsd");
    var server = Dnsd.createServer(function(req, res) {
        answer(sbot, req, res, opt);
    });

    server.on('error', function (msg, error, conn) {
        console.error(error.stack)
    });

    return server.listen(port, host, cb);
};

Server.listen = function (sbot, port, host, cb, opt) {
    var server = createServer(sbot, port, host, cb, opt);

    var close = function () {
        console.error("Server connection lost. Shutting down");
        sbot.close();
        server.close();
    };

    sbot.on('closed', close);
};

