var Dns = require("native-dns");

var Resolve = module.exports = {};

Resolve.domain = function (server, domain, type, cb, eager) {
    var question = Dns.Question({
        name: domain,
        type: type,
    });

    var res = [];

    var req = Dns.Request({
        question: question,
        server: server, //{ address: '8.8.8.8', port: 53, type: 'udp' },
        timeout: 1000,
    });

    req.on('timeout', function () {
        return void cb(new Error('Timeout in making request'));
    });

    req.on('message', function (err, answer) {
        answer.answer.forEach(function (a) {
            res.push(a);
            if (typeof(eager) === 'function') { eager(a); }
        });
    });

    req.on('end', function () { cb(void 0, res); });
    req.send();
};

