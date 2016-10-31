#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"
// http://unix.stackexchange.com/questions/65235/universal-node-js-shebang


var args = process.argv.slice(2);

if (args.length < 3 || args.length > 4) {
    console.log("Try: ");
    console.log("./publish.js name type value (class)");
    process.exit(1);
}

var TYPES = ['A', 'AAAA', 'CNAME', 'HINFO', 'ISDN', 'MX', 'NS', 'PTR', 'SOA', 'TXT'];

var isValidType = function (t) {
    return TYPES.indexOf(t) !== -1;
};

var CLASSES = ['IN', 'CH'];

var isValidClass = function (c) {
    return CLASSES.indexOf(c) !== -1;
};

var endsInSSB = function (s) {
    return /\.ssb$/i.test(s);
};

var isValidRecord = function (record) {
    return endsInSSB(record.name) && // it ends in .ssb
        record.value && // there is a value // TODO validate that it is correct for the type
        isValidType(record.type) && // it is a valid type
        isValidClass(record.class); // there is a class // TODO make sure it's valid
};

var makeRecord = function (name, type, value, _class) {
    return {
        name: name,
        type: type,
        value: value,
        class: _class || 'IN',
    };
};

var serialize = function (record) {
    return JSON.stringify(record);
};

var publish = function (name, type, value, _class) {
    var record = makeRecord(name, type, value, _class);

    if (!isValidRecord(record)) {
        console.error("invalid input");
        return void process.exit(1);
    }

    require("ssb-client")(function (err, sbot) {
        if (err) {
            console.error(err);
            return void process.exit(1);
        }

        // publish a message
        sbot.publish({ type: 'ssb-dns', record: record }, function (err, msg) {
            console.log(msg);

            console.log(JSON.stringify(record, null, 4));
            sbot.close();
            // msg.key           == hash(msg.value)
            // msg.value.author  == your id
            // msg.value.content == { type: 'post', text: 'My First Post!' }
            // ...
        })
    });
};

// name type value class
publish(args[0], args[1], args[2], args[3]);
