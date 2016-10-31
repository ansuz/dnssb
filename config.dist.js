var Config = module.exports = {
    verbose: true,
    port: 53053,
    host: '127.0.0.1',
    ready: function () {
        console.log("\nServer running at %s:%s", Config.host, Config.port);
    },
};
