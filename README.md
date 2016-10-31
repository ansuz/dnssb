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


