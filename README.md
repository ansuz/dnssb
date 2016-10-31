# ssb-dns

It's fairly easy to [serve dns](https://github.com/iriscouch/dnsd) from a nodejs process.

[scuttlebot](http://ssbc.github.io/scuttlebot/) makes it easy to work with a peer-to-peer log store.

So let's mash them together.

> What could go wrong?

## Installation

Via npm:

```
npm i -g ssb-dns;
```

Or via git:

```
git clone https://github.com/ansuz/ssb-dns;
cd ssb-dns;
npm i -g;
```

## Configuraiton

By default, the server will listen on `127.0.0.1:53053`.

If you'd prefer, you can `cp config.js.dist config.js` and edit `config.js` to suit your needs.

## Publish a record

**NOTE**:So far the publishing script is hardcoded to reject records which don't end in `.ssb`.

This was [cSmith](https://github.com/cschmittiey)'s idea.

In the future this might be genralized to squat even more TLDs, or to simply be unopinionated about them.

```
ssb-dns publish {domain name} {record type} {value} [optionally add a dns class]
```

## Fetch a record

First launch the server in one terminal:

```
ssb-dns server {port: 53053} {host: 127.0.0.1}
```

Then query it for a record:

```
dig @localhost -p 53053 {name} {type}
```

## FAQ

> Can I use this without running [scuttlebot](http://github.com/ssbc/scuttlebot)?

You could get a friend to host it if you _really_ trust them.

> Is it Enterprise-Ready?

Hell no. It barely works

> Does it protect against name-squatting?

Not even a little bit.

> Does it resolve conflicts if they occur?

Not yet.

> What is it good for?

1. If there is a DNS outage you can still resolve any you or your friends have published to ssb
2. If you don't have access to the internet at all, this will continue to work (for some definition of work)
3. You can use this as a kind of distributed hosts file

> How optimized is this?

Not even a little bit, and it doesn't exactly fail gracefully either.

## TODO

* merge server and publish into one script
  - `ssb-dns server`
  - `ssb-dns publish`
* support more cli options
  - `--port=5353`
  - `--host=::`

