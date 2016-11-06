# Frequently Asked Questions

> Can I use this without running [scuttlebot](http://github.com/ssbc/scuttlebot)?

You could get a friend to host dnssb for you if you _really_ trust them and don't care if they see all your dns requests.
Once running, you should be able to use the dns server as you would any other dns provider.

> Is it Enterprise-Ready?

That depends on your the needs of your Enterprise, but I would lean towards _no_.

> Does it protect against name-squatting?

The records available to dnssb are sourced from your ssb social network, so the quality of your results will depend on who you choose to follow (and who they choose to follow).

> How can I deal with malicious behaviour?

Records must be published by someone in your social network, and all such records are cryptographically signed using their private key.

If you notice malicious behaviour, it can always be traced back to the person who published it, through your social graph, if need be.
Naming things is a social problem, and the best way to resolve conflicts is probably to discuss it.

Additionally, in the future there will be better support for reporting and blocking abusive behaviour.

> Does it resolve conflicts if they occur?

Not yet.

> What is it good for?

1. If there is a DNS outage you can still resolve any records you or your friends have published to ssb.
2. As with everything committed to ssb, records are stored locally (and indefinitely) in a set of hash chains (one for each user). As such, if you don't have access to the internet at all, this will continue to work
3. You can use this as a kind of distributed hosts file

> How optimized is this?

Not much, but it should get better over time if people are interested in using it.

> Is there a web interface?

Not yet, but I'd like there to be!

> Does it handle wildcard entries?

Not yet, but I'd like it to!

