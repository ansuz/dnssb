var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var Query = require("./query");
var Dump = require("./dump");

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
    var q = req.question[0];

    // TODO validate queries more carefully
    if (!q) {
        console.error("invalid question");
        res.responseCode = 1; // FORMERR
        res.end();
        return;
    }

    Query.query(sbot, q, function (err, result) {
        if (err) {
            console.error(err.stack || err);
            res.responseCode = 2; // SERVFAIL
            return res.end();
        }
        if (result.authoritative) {
            res.authoritative = true;

            if (!result.domainExists) {
                res.responseCode = 3; // NXDOMAIN
            }
        }
        if (opt && opt.verbose) {
            var recs = records.map(Dump.recordToLine).join(", ")
            var auths = authorities.map(Dump.recordToLine).join(", ")
            console.log("%s: %s%s", q.name, recs,
                auths ? '. auths: ' : '', auths);
        }
        res.answer = result.answers;
        res.authority = result.authorities;
        res.end();
    });
};

var createServer = Server.create = function (sbot, port, host, cb, opt) {
    var Dnsd = require("modern-dnsd");
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

