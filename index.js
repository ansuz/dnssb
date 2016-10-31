var Dnsd = require("dnsd");
var Client = require("ssb-client");
var Pull = require("pull-stream");
var Paramap = require("pull-paramap");

var Config;
try {
    Config = require("./config.js");
} catch (err) {
    console.error("\nCouldn't find './config.js'. Using defaults");
    Config = require("./config.dist.js");
}

var log = {
    req: function (req) {
        var q = req.question[0];
        console.log({
            name: q.name,
            type: q.type,
            class: q.class,
        });
    },
};

var answer = function (sbot, req, res) {
    console.log();
    log.req(req);

    var q = req.question;

    if (!q.length) {
        console.log("invalid question");
        res.end();
    }

    var name = q[0].name;
    var type = q[0].type;

    Pull(sbot.messagesByType({
        type: 'ssb-dns',
    }),
    Paramap(function getAvatar(msg, cb) {
        cb(null, msg);
    }),
    Pull.drain(function printMessage(msg) {
        var record = msg.value.content.record;

        if (typeof(record) !== 'object') { return; }

        if (name && type &&
            record.name === name &&
            record.type === type &&
            record.value) {
            console.log("%s (%s) => %s", name, record.type, record.value);

            // returns the first matching record found
            // TODO support multiple returned values
            res.answer.push({
                name: record.name,
                type: record.type,
                data: record.value,
                ttl: 500,
            });
            res.end()
        }
    }));
};

var createServer = function (sbot, port, host, cb) {
    Dnsd.createServer(function(req, res) {
        answer(sbot, req, res);
    }).listen(port, host, cb);
};

Client(function (err, sbot) {
    if (err) {
        console.error(err);
        return void process.exit(1);
    }
    createServer(sbot, Config.port, Config.host, Config.ready);
});

