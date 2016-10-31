var Publish = module.exports = {};

var help = Publish.help = function () {
    console.log("Try: ");
    console.log("./publish.js name type value (class)");
};

var TYPES = Publish.TYPES = ['A', 'AAAA', 'CNAME', 'HINFO', 'ISDN', 'MX', 'NS', 'PTR', 'SOA', 'TXT'];

var isValidType = Publish.isValidType = function (t) {
    return TYPES.indexOf(t) !== -1;
};

var CLASSES = Publish.CLASSES = ['IN', 'CH'];

var isValidClass = Publish.isValidClass = function (c) {
    return CLASSES.indexOf(c) !== -1;
};

var endsInSSB = Publish.endsInSSB = function (s) {
    return /\.ssb$/i.test(s);
};

var isValidRecord = Publish.isValidRecord = function (record) {
    // TODO return what's wrong with the input instead of a boolean

    return endsInSSB(record.name) && // it ends in .ssb
        record.value && // there is a value // TODO validate that it is correct for the type
        isValidType(record.type) && // it is a valid type
        isValidClass(record.class); // there is a class // TODO make sure it's valid
};

var makeRecord = Publish.makeRecord = function (name, type, value, _class) {
    return {
        name: typeof(name) === 'string' && name.toLowerCase(), // domain names must be lowercase
        type: type,
        value: value,
        class: _class || 'IN',
    };
};

Publish.record = function (name, type, value, _class, cb) {
    var record = makeRecord(name, type, value, _class);

    if (!isValidRecord(record)) {
        return void cb(new Error("invalid input"));
    }

    require("ssb-client")(function (err, sbot) {
        if (err) { return void cb(err); }

        // publish a message
        sbot.publish({ type: 'ssb-dns', record: record }, function (err, msg) {
            if (err) { return void cb(err); }


            sbot.close();
            return void cb(err, msg);

            console.log(msg);

            console.log(JSON.stringify(record, null, 4));
        })
    });
};

