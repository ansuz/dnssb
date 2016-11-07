**Note**: this is a not a manifesto, but a living document seeking to document the assumptions which underly dnssb as a technology, what it attempts to fix, and what it is outside of its scope.
Dissent and discussion are both welcome, but it is asked that you read this document in its entirety to understand the author(s)' perspectives.

# Why dnssb?

dnssb is not perfect, and does not aim to be perfect.

It is built with the simple hope that it will be useful to someone.

If it doesn't help you, that's fine.

Feel free to keep reading if you would like to understand who it is meant to help.

## Background

The Internet Domain Name System ([DNS](https://en.wikipedia.org/wiki/Domain_Name_System)) provides an abstraction over [IP addresses](https://en.wikipedia.org/wiki/IP_address).

> A name indicates what we seek. An address indicates where it is. A route indicates how to get there. --[RFC 791](https://tools.ietf.org/html/rfc791)

The value of a name is that two or more agents (be they humans or autonomous systems) can substitute names for addresses, and independently correlate the exchanged names with the address to which those names refer.
Ensuring that two agents achieve this in practice turns out to be a difficult problem which can be solved in a variety of ways.

[Zooko](https://en.wikipedia.org/wiki/Zooko_Wilcox-O%27Hearn) formulated the problem as [Zooko's triangle](https://en.wikipedia.org/wiki/Zooko%27s_triangle), asserting that any naming system must choose between two properties in the list of [human-meaningful, secure, decentralized].

There are many variations on DNS which aim to serve users who desire different combinations of the above properties.

It is arguable how well each solution addresses those needs, however, it is up to users to decide which they will adopt.
Depending on the implementation of a particular system, it need not be used in exclusion of others.

## Notable Systems

The aim of this document to explain the purpose of dnssb, and not to provide an exhaustive list of competitors.
That being said, it is worth mentioning a few for the purpose of providing context.

### ICANN

The most widespread naming system in existence is governed by the **Internet Corporation for Assigned Names and Numbers** ([ICANN](https://www.icann.org/)).

ICANN is a hierarchical organization which administrates the global namespace by delegating zones to subservient organizations.
Those zones are in turn divided into subzones, which can be further subdivided.

_Ownership_ of any zone can be revoked by the parent owner, all the way back up to the global root.

This form of governance is effectively a kind of [feudalism](https://en.wikipedia.org/wiki/Feudalism), which is not to say that it is incorrect.
Unique names are considered a resource, and resources must be distributed somehow.

**ICANN** typically distributes resources to _those who pay for them_.

#### ICANN and Censorship

ICANN seeks to provide a service which is both _human meaningful_ and _secure_.
When you ask for an address by name, it is intended that everyone agrees on what that address (or set of addresses) is.

Of course, the world is not perfect, and in practice systems are built such that we ask DNS providers to resolve a name for us.
In most of the world's jurisdictions there are subjects which are considered worthy of censorship.
These subjects often include, but are not limited to:

* hate speech
* criticism of the parent state
* pornography
* infringement on intellectual property

Without debating which of these, if any, are justified, it's clear to see that centralization makes it relatively easy to pressure DNS providers into revoking a particular domain such that it can't be resolved to an IP.

Censorship does not always stem from state actors lobbying DNS providers.
In many cases censorship is accomplished (on a temporary basis) via Distributed Denial of Service ([DDoS](https://en.wikipedia.org/wiki/Denial-of-service_attack)) attacks.

With the increasing number of devices connected to the internet via the trend commonly referred to as the _Internet of Things_, DDoS attacks have become increasingly more common and severe.

### Namecoin

[Namecoin](https://namecoin.org/) is based off of concepts popularized by _Bitcoin_.
It uses cryptography to create a globally unique list of name-record pairings.

Namecoin is quite remarkable in that it is considered to provide all three properties formulated by Zooko's triangle, hinting that Zooko's triangle may not be complete.

It is decentralized, and not governed by any state, meaning no one single entity is responsible, or directly capable of enforcing their opinions on the registry.
Since authority is derived from public-key cryptography, compromised public keys result in a loss of control over the associated domains.

Like Bitcoin, Namecoin has a cost (and thus a value) associated with each record.
Full clients must keep a copy of the chain of records, increasing the cost of participating even further.

If ICANN's monopoly is a kind of _feudalism_, then Namecoin's method of associating records with tokens is a kind of [anarcho-capitalism](https://en.wikipedia.org/wiki/Anarcho-capitalism).

In practice, the cost of bandwidth, electricity, and registering domains makes adoption of Namecoin's technology somewhat prohibitive to many potential users.
This makes its adoption less desirable to those who want to serve records.
This in turn tends to reinforce ICANN's monopoly on what a name means.

### Namecoin and Censorship

As mentioned above, there are numerous cases where a determined individual or group can be motivated to censor another.

Namecoin's nature makes it difficult to censor an author by revoking the validity of their name, however, it is generally still possible to attack the service which is hosting the offending content.
Since there is one global, public record of all the names, it is trivial to determine the location of the service.
Motivated parties need only attack that service.

Services which are referred to by ICANN domains still have this problem, in addition to denial of service based on attacks against DNS providers.
As such, Namecoin is still more resilient against censorship than ICANN, but it does not make censorship impossible.

## Finally, dnssb

### What's the _ssb_ in _dnssb_?

dnssb is a _Domain Name System_ built on top of [_Secure Scuttlebutt_](https://scuttlebot.io/) (aka SSB), a protocol by which users append messages to a personal log, and distribute their messages via a gossiping mechanism.

Messages' integrity is guaranteed by cryptography, and as such the original author need not be the one to distribute their content.
As such, it can be used as a distributed database which does not require constant connectivity to function, and which is [eventually consistent](https://en.wikipedia.org/wiki/Eventual_consistency).

Asymmetric peer connections are established manually by _following_ a feed, which can be _unfollowed_ at any point in time in the future.
This makes it reasonably simple to limit the records which you store to those belonging to the authors in whom you are interested.

Any kind of information can be published in a feed, and it is not possible to follow only parts of a feed.
As a result, authors can publish records of various types, and their audience must store and replicate either _all of it_, or _none of it_.

_dnssb_ provides a mechanism through which users can publish dns records to their feed, and search their local store for similar messages published by those they follow.
It exposes a conventional DNS server which is compatible with existing DNS clients.
It can be bound to a local address, or to a public address which others can use without running their own dnssb instance.

### What would anyone prefer this?

As Namecoin has shown, users must be motivated to adopt a particular DNS solution to be their arbiter of _the truth_.

The premise of dnssb is that it can bootstrap its adoption from _existing ssb networks_ and take advantage of socially motivated [network effects](https://en.wikipedia.org/wiki/Network_effect).

A variety of applications have already been built on ssb, and those who use those applications have built an implicit [_web of trust_](https://en.wikipedia.org/wiki/Web_of_trust).
The implications of the web of trust are not absolute, rather, their meaning depends on their context, which is fluid.

If a user is found to be publishing messages which others would prefer not to replicate, they can stop replicating them.
If a user prefers not to unfollow another, but finds their behaviour inappropriate, they can discuss the matter and reach consensus, or disagree and proceed to unfollow them.

Since anyone in your social network can publish records that your DNS server will resolve, your DNS server is only as secure as your social network.
To elaborate, unlike the solutions provided above, dnssb does not attempt to dictate global truth, instead, it attempts to provide mechanisms by which social groups can converge on a locally relevant truth.

dnssb assumes a position of [agonism](https://en.wikipedia.org/wiki/Agonism), which views conflict as unavoidable.
Rather than relying on a centralized political entity, or a distributed, cryptographically authoritative datastore to act as arbiter of the truth, dnssb relegates the responsibility to localized social groups.
It does so based on the arguments given above which demonstrate that _all systems are subject to social forces anyway_.

The challenge, then lies in situations in which two local communities which disagree determine how to interact.
Those at the borders of these disparate but overlapping networks must negotiate if they are to converge on a single truth.
If ICANN represents _feudalism_, and Namecoin embodies _Anarcho-Capitalism_, then dnssb can be interpreted as a type of [_federalism_](https://en.wikipedia.org/wiki/Federalism).

### Censorship and dnssb

Like those on Namecoin, DNS records distributed via Secure Scuttlebutt are guaranteed by cryptography.
Unlike those on Namecoin, they are not globally authoritative, and so if anyone wants to state that _a particular assertion is not the truth_, we are inclined to let them.
Their assertion will not stop others from distributing those records, and they will see that local disagreement has very little effect on the system as a whole.

Since censorship is a difficult concept to enforce in such a system, our hope is that dnssb addresses other concerns.

## Use Cases

### Temporary/Local Networks

You are hosting an event in which Secure Scuttlebutt is used to implement a local discussion forum.

Users take it upon themselves to launch a variety of self-hosted applications, and desire a DNS solution to avoid navigating by typing raw IP addresses.

A conventional DNS server would work, but that would require a centralized registration process, and everything would break if the host of that service decided to leave.

Given a group of users who already use Secure Scuttlebutt, dnssb is uniquely suited to provide a distributed registry which is simple to use, more respectful of the privacy of users' browsing habits, and resilient against changes to the network's membership.

### Community Administrated Public DNS Registries

You would like to host a DNS server, but do not want any single entity to be responsible for the content of its registry.

By subscribing to a number of feeds, a single server can aggregate a variety of trusted peers' decisions into a single point of authority.
This registry can be easily replicated by any peer subscribing to that feed, but can be overridden using other records if desired.

### Anonymous surfing

Having all your DNS records locally means that no-one can see your DNS
request to infer browsing habits. Even when using dnssec the owner of
the DNS server can still see the records you are requesting. Metadata
is often as important or more important than the actual content.
