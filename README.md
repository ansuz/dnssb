# dnssb

It's fairly easy to [serve dns](https://github.com/ansuz/modern-dnsd) from a nodejs process.

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
git clone https://github.com/ansuz/dnssb;
cd dnssb;
npm i -g;
```

## Usage

`dnssb` assumes that you have a scuttlebot instance running.
You can find out more about scuttlebot [here](https://ssbc.github.io/scuttlebot/).

Alternatively, you can run `dnssb server` as a scuttlebot plugin:

```
cd dnssb
mkdir -p ~/.ssb/node_modules
ln -rs . ~/.ssb/node_modules/dns
sbot plugins.enable dns
# restart sbot
```

## Publish a record

**NOTE**:So far the publishing script is hardcoded to reject records which don't end in `.ssb`.

This was [cSmith](https://github.com/cschmittiey)'s idea.

In the future this might be genralized to squat even more TLDs, or to simply be unopinionated about them.

```
dnssb publish [{prev record key}...] {domain name} [{ttl}] [{dns class}] {record type} {value}
```

For example:

```Bash
# publish an ipv4 record for localhost.ssb
dnssb publish localhost.ssb 3600 IN A 127.0.0.1

# publish an ipv6 record for localhost.ssb
dnssb publish localhost.ssb 3600 IN AAAA ::1
```

To replace some existing dnssb records, pass their ssb message id(s) as
the first arguments to the publish command. To append a record to the set of
existing records, omit the message ids.

To replace all existing records for a name+type+class, use `update`:

```
dnssb update {domain name} [{ttl}] [{dns class}] {record type} {value}
```

## Display all records

> I want to use this

You'll only be able to resolve records that your node knows about.

You can print a list of valid records with:

```
dnssb dump
```

## Fetch a record

First launch the server in one terminal:

```
dnssb server {port: 53053} {host: 127.0.0.1}
```

Then query it for a record:

```
dig @localhost -p 53053 {name} {type}
```

The records which are available to you are determined by your peering, but
assuming you have tried the `localhost.ssb` example commands listed above,
you should be able to run the following:

```Bash
# query for ipv4 localhost.ssb
dig @localhost -p 53053 localhost.ssb A

# query for ipv6 localhost.ssb
dig @localhost -p 53053 localhost.ssb AAAA
```

## Questions

See [the FAQ](/docs/FAQ.md)

## Contributing

dnssb is being developed on the platform for which it is designed ([secure-scuttlebutt](https://scuttlebot.io/)), using [git-ssb](https://www.npmjs.com/package/git-ssb).
To get involved, join #scuttlebutt on Freenode (irc), and ask to be invited into the network.

Otherwise, you can contact [ansuz](https://transitiontech.ca/contact) or [cel](https://celehner.com/) directly.
