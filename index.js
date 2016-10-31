var Dnsd = require("dnsd");
var Client = require("ssb-client");
var Pull = require("pull-stream");
var Paramap = require("pull-paramap");

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
        var text = msg.value.content.text;

        var result;
        try {
            result = JSON.parse(text);
        } catch (err) {
            throw new Error("Invalid record!");
        }
        if (name && type && result.name === name && result.type === type && result.value) {
            console.log("%s (%s) => %s", name, result.type, result.value);
            res.answer.push({
                name: result.name,
                type: result.type,
                data: result.value,
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
    var port = 53053;
    var host = '127.0.0.1';
    createServer(sbot, port, host, function () {
        console.log('Server running at %s:%s', host, port);
    });
});

