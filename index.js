var Dnsd = require("dnsd");
var Client = require("ssb-client");

var createServer = function (port, host, cb) {
    Dnsd.createServer(function(req, res) {
        res.end('1.2.3.4')
    }).listen(port, host, cb)
};

Client(function (err, sbot) {
    if (err) {
        console.error(err);
        return void process.exit(1);
    }
    var port = 53053;
    var host = '127.0.0.1';
    createServer(port, host, function () {
        console.log('Server running at %s:%s', host, port);
    });
});


