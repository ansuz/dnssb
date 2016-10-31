#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
// http://unix.stackexchange.com/questions/65235/universal-node-js-shebang

var Lib = require("./lib/");

(function () {
if (require.main !== module) { return module.exports = Lib; }

var publishHelp = "\tssb-dns publish name type value (class)";
var serverHelp = "\tssb-dns server port host";
var dumpHelp = "\tssb-dns dump";


var CLI_Help = function () {
    [
        "try one of:",
        serverHelp,
        publishHelp,
        dumpHelp,
    ].forEach(function (m) {
        console.log(m);
    });
};

var argv = process.argv.slice(2);

switch (argv[0]) {
    case undefined:
        CLI_Help();
        break;
    case 'dump':
    (function () {
        var count = 0;
        Lib.dump.records(function (msg, record) { // each
            console.log(JSON.stringify(record, null, 2));
            count++;
        }, function (sbot) { // done
            console.log("Found a total of %s valid ssb-dns records", count);
            sbot.close();
        });
    }());
        break;
    case 'server':
    (function () {
        var port = argv[1] || 53053;
        var host = argv[2] || '127.0.0.1';

        Lib.server.listen( port, host, function () {
            console.log("server listening on %s:%s", host, port);
        });
    }());
        break;
    case 'publish':
    (function () {
        console.log(argv.length);
        if (argv.length < 4) {
            console.log("Try:");
            console.error(publishHelp);
            return;
        }

        var name = argv[1];
        var type = argv[2];
        var value = argv[3];
        var _class = argv[4];

        Lib.publish.record(name, type, value, _class, function (err, msg) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log(msg);
            process.exit(0);
        });
    }());
        break;
    default:
        CLI_Help();
        break;
}

}());
