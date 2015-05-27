---
layout: post
title:  "Twitter's CSP Report Collector"
date:   2014-07-25 20:40:49
categories: csp twitter
---

We recently scrapped our previous CSP reporting endpoint and built a custom, single-purposed app. This is highly proprietary and will never be open sourced (do you run scribe, viz, logstash, etc???), but here are the building blocks of the design. This just launched a month or so ago, so I’m sure there is room to improve.

## Normalization

The incoming data is very wacky. Various browsers with various levels of maturity with an infinite number versions in the wild create chaos. Here’s a few things we do to normalize the data.

pologies if some of this is not 100% accurate, I have forgotten the details of these quirks since they have been abstracted away.

1.  Firefox used to add ports to violated-directives and a few other fields. These are rarely useful and muddy the data as it won’t match any other user agent. Strip these unless you run on non-standard ports.
1.  Inline content is indicated by a blank blocked-uri, yet many browsers send "self" Change this to "" to be consistent.
1.  Strip www from document-uri host values. Unless you serve different content of course.


## Send extra fields

The violation report has some data, but not everything I want. You can “smuggle” special values by adding them to the report-uri query string. I suggest adding the following fields:

1.  Application. Where did this come from? Use an opaque ID, or don’t. Revealing this information should not really matter.
1.  Was the policy enforced?
1.  What was the status code of the page? (might not be too valuable to most, but our reverse proxy replaces content for error pages)

## Extract extra fields at index time

A blocked-uri is nice, but a blocked-host is better. This allows you to group reports much more effectively in logstash. That way, entries for https://www.example.org/* can be grouped as example.org violations. Here are all of the fields we extract:

1.  blocked-host: the blocked-uri with the scheme, www, port, and path removed (tbh the blocked-uri is otherwise useless and a potential violation of privacy).
1.  report-host: the document-uri with the scheme, www, port, and path removed
1.  classification<sup>1</sup> : is this mixed content? inline script? unauthorized_host? this is not an exact science, but it’s useful.
1.  path: the path of the document-uri
1.  app_name: from the “extra fields above” – helpful if multiple apps are hosted on one domain.
1.  report_only – useful coordination and for boss-type people
1.  violation-type: the first token in the violated directive – helpful if your policy varies within an app.
1.  browser, browser +  major version: take the user-agent, but normalize the values into easily defined buckets. This is very useful for classifying plugin noise.
.  operating system (may indicate malware)

<sup>1</sup> Pseudo code for the classification:

<script src="https://gist.github.com/anonymous/3abda54ac971b2f4daaa.js"></script>

## Filter Noise

This is probably the most important thing to do, and it builds off of the ideas mentioned above. This is even less of a science than classifying reports. These reports are not counted in most statistics and are not sent to logstash. We still log them, but to a different location and we _will_ use this data to help browser vendors. Are we overzealous with our filtering? Probably.

We’re filtering ~80% of our reports!

We consider anything that we deem as “unactionable” or “too old” as noise. This noise come from plugins mostly, but also comes from other strange sources such as proxy sites that replay our CSP. Strange. The quality of the reports improve over time, so we started filtering out reports that were old than some arbitrary cutoff point in versioning.

I’ll just drop this bit of scala code for ya. It’s ugly. monads or something. This list grows by the week.


<script src="https://gist.github.com/oreoshake/2c8476f7ecda5fe930b7.js"></script>

And here’s a graph of our filtered report data:

| [![Screen Shot 2014-08-24 at 11.20.18 AM](/assets/csp-collector/Screen-Shot-2014-08-24-at-11.20.18-AM-300x146.png)](/assets/csp-collector/Screen-Shot-2014-08-24-at-11.20.18-AM.png) |
| --- |
| Reason for being filtered |

[![Screen Shot 2014-08-24 at 11.18.46 AM](/assets/csp-collector/Screen-Shot-2014-08-24-at-11.18.46-AM-300x260.png)](/assets/csp-collector/Screen-Shot-2014-08-24-at-11.18.46-AM.png) |
| --- |
| Legend for the graph of filtered reports |

## Now we can get to business

Now that we’ve normalized and filtered our data, we can get to work! We use logstash to dive into reports. The main feature we use is field extractions where we take all of the “extra fields” to logstash so we can quickly dive into reports.


| [![LogLens](/assets/csp-collector/LogLens-300x155.png)](/assets/csp-collector/LogLens.png) |
| --- |
| Logstash reports |

## OK, so how do I look at the mixed content violations for twitter.com, specifically the old rails code?

I search for:

>  classification:”mixed_content” app_name: monorail
>  blocked_host:twimg.com OR blocked_host:twitter.com
>  violated_directive:script-src app_name:translate.twitter.com

Now I can look at the various fields on the left and keep on digging! Logstash is awesome.

## Now show your work

For each application in our stack, we provided two simple graphs that allow people to take a quick glance at the state of things.


| [![viz](/assets/csp-collector/viz.png)](/assets/csp-collector/viz.png) |
| --- |
| Reports by classification and violated directive, per application |
