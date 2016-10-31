var Pull = require("pull-stream");
var Ansuz = require("ansuz");

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
    }

    var name = q[0].name;
    var type = q[0].type;

    Pull(sbot.messagesByType({
        type: 'ssb-dns',
    }),
    Pull.map(function (msg) {
        return Ansuz.find(msg, ['value', 'content', 'record']);
    }),
    Pull.filter(function (record) { return record; }),
    Pull.find(function printMessage(record) {
        if (typeof(record) !== 'object') { return; }
        if (name && type &&
            record.name === name.toLowerCase() &&
            record.type === type &&
            record.value) {

            if (opt && opt.verbose) {
                console.log("%s (%s) => %s", name, record.type, record.value);
            }

            // returns the first matching record found
            // TODO support multiple returned values
            res.answer.push({
                name: record.name,
                type: record.type,
                data: record.value,
                ttl: 500, // short ttl
            });
            return true;
        }
    }, function () {
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

