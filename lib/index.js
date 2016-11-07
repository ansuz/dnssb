var Lib = module.exports = {};

Lib.publish = require("./publish");

Lib.server = require("./server");

Lib.dump = require("./dump");

Lib.query = require("./query");

Lib.parse = require("./parse");

Lib.format = require("./format");

// run as a scuttlebot plugin
var plugin = Lib;
var pkg = require("../package");
plugin.name = "dns";
plugin.version = "1.0.0";
plugin.manifest = {};
plugin.init = function (sbot, config) {
    var port = config.dns && config.dns.port || 53053;
    var host = config.dns && config.dns.host || config.host || "127.0.0.1";
    Lib.server.listen(sbot, port, host, function () {
        console.log("%s listening on %s:%s", pkg.name, host, port);
    });
};
