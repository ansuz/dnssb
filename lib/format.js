var Format = module.exports = {};
var Pull = require("pull-stream");

function pad(str, len) {
    if (Math.abs(len) < String(str).length) return str;
    if (len < 0) return ('                            ' + str).substr(len);
    if (len > 0) return (str + '                            ').substr(0, len);
}

Format.formatNames = function (name) {
    if (!name) {
        // make record name absolute
        return function (record) {
            record.name = record.name.replace(/\.?$/, '.');
        };
    }
    // make records' names be relative to some domain
    if (/[^a-z0-9\-.]/.test(name)) {
        throw new TypeError('name has bad characters');
    }
    var nameRegexp = new RegExp('(?:^|\\.)' + name.replace(/\./g, '\\.') + '$');
    return function (record) {
        record.name = record.name.replace(nameRegexp, '') || '@';
    };
};

Format.recordToLine = function (record) {
    return [
        record.id,
        pad(record.authorName, 12),
        pad(record.name, -24),
        pad(record.ttl, -5),
        pad(record.class, -3),
        pad(record.type, 5),
        dataToString(record, record.data)
    ].join(' ');
};

function dataToString(record, data) {
    switch (record.class + " " + record.type) {
        case "IN A":
        case "IN AAAA":
        case "IN NS":
        case "IN PTR":
        case "IN CNAME":
            return data;
        case "IN MX":
            return [].concat(data).join(" ");
        case "IN SOA":
            return [data.mname, data.rname, data.serial,
                data.refresh, data.retry, data.expire, data.ttl].join(" ");
        case "IN TXT":
        case "IN SPF":
            return [].concat(data).join("");
        case "IN SRV":
            return [data.priority, data.weight, data.port,
                data.target].join(" ");
        case "IN DS":
            return [data.key_tag, data.algorithm, data.digest_type,
                data.digest].join(" ");
        case "IN SSHFP":
            return [data.algorithm, data.fp_type, data.fingerprint].join(" ");
        case "NONE A":
            return "";
        default:
            return JSON.stringify(record.data);
    }
}
