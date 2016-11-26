#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
// http://unix.stackexchange.com/questions/65235/universal-node-js-shebang

var SsbRef = require("ssb-ref");
var Lib = require("./lib/");

(function () {
if (require.main !== module) { return module.exports = Lib; }

var publishHelp = "\tdnssb publish [previous record key...] name [ttl] [class] type value";
var updateHelp = "\tdnssb update name [ttl] [class] type value";
var branchHelp = "\tdnssb branch name type (class)";
var serverHelp = "\tdnssb server port host";
var dumpHelp = "\tdnssb dump";
var showHelp = "\tdnssb show [domain]";

var CLI_Help = function () {
    [
        "try one of:",
        serverHelp,
        publishHelp,
        updateHelp,
        branchHelp,
        dumpHelp,
        showHelp,
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
        var Client = require("ssb-client");

        Client(function (err, sbot) {
            if (err) throw err;

            var count = 0;
            Lib.dump.records(sbot, function (record) { // each
                console.log(JSON.stringify(record, null, 2));
                count++;
            }, function (err) { // done
                if (err) throw err;
                console.log("Found a total of %s valid ssb-dns records", count);
                sbot.close();
            });
        });
    }());
        break;
    case 'show':
    (function () {
        var name = argv[1] || '';
        var Client = require("ssb-client");

        Client(function (err, sbot) {
            if (err) throw err;

            Lib.dump.formattedRecords(sbot, {name: name}, function (line) {
                console.log(line);
            }, function (err) { // done
                if (err) throw err;
                sbot.close();
            });
        });
    }());
        break;
    case 'server':
    (function () {
        var port = argv[1] || 53053;
        var host = argv[2] || '127.0.0.1';
        var Client = require("ssb-client");

        Client(function (err, sbot) {
            if (err) throw err;

            Lib.server.listen(sbot, port, host, function () {
                console.log("server listening on %s:%s", host, port);
            });
        });
    }());
        break;
    case 'publish':
    (function () {
        var branches = [];
        while (argv[1] && SsbRef.isMsgId(argv[1])) {
            branches.push(argv.splice(1, 1)[0]);
        }

        if (argv.length < 4) {
            console.log("Try:");
            console.error(publishHelp);
            return;
        }

        var record = Lib.parse.argsToRecord(argv.slice(1));

        Lib.publish.record(branches, record, function (err, msg) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log(JSON.stringify(msg, null, 2));
            process.exit(0);
        });
    }());
        break;
    case 'update':
    (function () {
        if (argv.length < 4) {
            console.log("Try:");
            console.error(updateHelp);
            return;
        }

        var record = Lib.parse.argsToRecord(argv.slice(1));
        var Client = require("ssb-client");

        Client(function (err, sbot) {
            if (err) throw err;

            Lib.query.branches(sbot, record.name, record.type, record.class, function (err, branches) {
                if (err) throw err;
                Lib.publish.record(branches, record, function (err, msg) {
                    if (err) throw err;
                    console.log(msg);
                    process.exit(0);
                });
            });
        });
    }());
        break;


    case 'branch':
    (function () {
        if (argv.length < 3) {
            console.log("Try:");
            console.error(branchHelp);
            return;
        }

        var name = argv[1];
        var type = argv[2];
        var _class = argv[3];
        var Client = require("ssb-client");

        Client(function (err, sbot) {
            if (err) throw err;

            Lib.query.branches(sbot, name, type, _class, function (err, branches) {
                if (err) throw err;

                if (!branches.length) {
                    console.error("No branches found");
                    process.exit(1);
                }
                branches.forEach(function (branch) {
                    console.log(branch);
                });

                process.exit(0);
            });
        });
    }());
        break;
    default:
        CLI_Help();
        break;
}

}());
