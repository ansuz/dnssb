# ssb-dns

It's fairly easy to serve dns from a nodejs process.

[scuttlebot](http://ssbc.github.io/scuttlebot/) makes it easy to work with a peer-to-peer log store.

So let's mash them together.

> What could go wrong?

## Installation

```
git clone https://github.com/ansuz/ssb-dns;
cd ssb-dns;
npm i;
```

## Publish a record

```
./publish.js {domain name} {record type} {value} [optionally add a dns class]
```

## Fetch a record

```
dig @localhost -p 53053 {name} {type}
```

## FAQ

> Can I use this without running [scuttlebot](http://github.com/ssbc/scuttlebot)

No, but you could get a friend to host it if you _really_ trust them.

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

