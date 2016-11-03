var classes = {
    IN: true,
    NONE: true,
};

var Parse = module.exports = {};

Parse.argsToRecord = function (args) {
    args = args.slice(0);
    var record = {};
    record.name = args.shift().toLowerCase();
    if (Number.isInteger(+args[0])) {
        record.ttl = args.shift();
    }
    // "type and class mnemonics are disjoint" - RFC 1034
    if (args[0] in classes) {
        record.class = args.shift();
    } else {
        record.class = "IN";
    }
    record.type = args.shift();
    record.data = argsToData(record, args);
    return record;
}

function argsToData(record, args) {
    switch (record.class + " " + record.type) {
        case "IN A":
        case "IN AAAA":
        case "IN NS":
        case "IN PTR":
        case "IN CNAME":
            if (args.length !== 1) throw new TypeError("Invalid arguments");
            return args[0];
        case "IN MX":
            if (args.length !== 2) throw new TypeError("Invalid arguments");
            return args;
        case "IN SOA":
            if (args.length !== 7) throw new TypeError("Invalid arguments");
            return {
                mname: args[0],
                rname: args[1],
                serial: args[2],
                refresh: args[3],
                retry: args[4],
                expire: args[5],
                ttl: args[6]
            };
        case "IN TXT":
        case "IN SPF":
            if (args.length < 1) throw new TypeError("Invalid arguments");
            return args.length === 1 ? args[0] : args;
        case "IN SRV":
            if (args.length !== 4) throw new TypeError("Invalid arguments");
            return {
                priority: args[0],
                weight: args[1],
                port: args[2],
                target: args[3]
            };
        case "IN DS":
            if (args.length !== 4) throw new TypeError("Invalid arguments");
            return {
                key_tag: args[0],
                algorithm: args[1],
                digest_type: args[2],
                digest: args[3]
            };
        case "IN SSHFP":
            if (args.length !== 3) throw new TypeError("Invalid arguments");
            return {
                algorithm: args[0],
                fp_type: args[1],
                fingerprint: args[2]
            };
        case 'NONE A':
            if (args.length !== 0) throw new TypeError("Invalid arguments");
            return [];
        default:
            throw new TypeError('Unsupported record type: ' + JSON.stringify(record));
    }
}

if (!module.parent) {
    console.log(Parse.argsToRecord(process.argv.slice(2)));
}
