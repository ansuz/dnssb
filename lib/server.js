var Pull = require("pull-stream");
var Ansuz = require("ansuz");
var Query = require("./query");
var Dump = require("./dump");
var Net = require("net");
var Pad = require("pad-ipv6");

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

function queryKey(q) {
    return q.name + ' ' + (q.class || 'IN') + ' ' + q.type;
}

function CachingResolver(sbot) {
    this.sbot = sbot;
    this.cache = {/* name+class+type: result */};
    this.cbs = {/* name+class+type: [callback] */};
}

CachingResolver.prototype.answer = function (req, res, opt) {
    log.req(req, opt);

    // one query per dns message
    var q = req.question[0];

    // TODO validate queries more carefully
    if (!q) {
        console.error("invalid question");
        res.responseCode = 1; // FORMERR
        res.end();
        return;
    }

    this.query(q, function (err, result) {
        if (err) {
            console.error(err.stack || err);
            res.responseCode = 2; // SERVFAIL
            return res.end();
        }
        if (result.authoritative) {
            res.authoritative = true;

            if (!result.domainExists) {
                res.responseCode = 3; // NXDOMAIN
            }
        }
        if (opt && opt.verbose) {
            var recs = records.map(Dump.recordToLine).join(", ")
            var auths = authorities.map(Dump.recordToLine).join(", ")
            console.log("%s: %s%s", q.name, recs,
                auths ? '. auths: ' : '', auths);
        }
        res.answer = result.answers;
        res.authority = result.authorities;
        res.end();
    });
};

CachingResolver.prototype.query = function (q, cb) {
    var key = queryKey(q);
    var result = this.cache[key];
    if (result) {
        // cache hit
        if (result.expires > Date.now()) {
            return cb(null, result);
        } else {
            // expired
            delete this.cache[key];
        }
    }

    var cbs = this.cbs[key];
    if (cbs) return cbs.push(cb);
    cbs = this.cbs[key] = [cb];
    var self = this;

    Query.query(this.sbot, q, function (err, result) {
        if (!err) self.cache[key] = result;
        while (cbs.length) cbs.shift()(err, result);
        delete self.cbs[key];
    });
};

CachingResolver.prototype.autoPurge = function (interval) {
    return setInterval(this.purgeExpired.bind(this), interval);
};

CachingResolver.prototype.purgeExpired = function () {
    var now = Date.now();
    for (var key in cache) {
        var result = this.cache[key];
        if (now > result.expires) {
            delete cache[key];
        }
    }
};

CachingResolver.prototype.autoExpire = function () {
    // evict cached results when new record would change them
    var self = this;
    Pull(this.sbot.messagesByType({
        type: 'ssb-git',
        old: false
    }),
    Pull.drain(function (msg) {
        var record = msg.value.content.record;
        if (record) delete self.cache[queryKey(record)];
    }, function (err) {
        if (err) console.error(err);
    }));
};

var createServer = Server.create = function (sbot, port, host, cb, opt) {
    if (Net.isIPv6(host)) { host = Pad(host); }

    var resolver = new CachingResolver(sbot);
    resolver.autoPurge(180e3);
    resolver.autoExpire();

    var Dnsd = require("modern-dnsd");
    var server = Dnsd.createServer(function(req, res) {
        resolver.answer(req, res, opt);
    });

    server.on('error', function (msg, error, conn) {
        console.error(error.stack)
    });

    return server.listen(port, host, cb);
};

Server.listen = function (sbot, port, host, cb, opt) {
    var server = createServer(sbot, port, host, cb, opt);

    var close = function () {
        console.error("Server connection lost. Shutting down");
        sbot.close();
        server.close();
    };

    sbot.on('closed', close);
};

