---
layout: post
title:  "Automatic XSS Protection With CSP: No Changes Required"
date:   2013-12-13 20:40:49
categories: csp-nonce csp-hash
---

In order to help ease approval for the Content Security Policy [script-hash proposal](http://lists.w3.org/Archives/Public/public-webappsec/2013Aug/0031.html), I created a PoC to demonstrate that this is just as easy as script-nonce. I believe script-hash is an idea that solves some of the shortcomings of script nonce. However, it is significantly more complex. I think that the complexity can be greatly reduced with proper tooling. [My PoC branch](https://github.com/twitter/secureheaders/pull/67) aims to prove that this can be practical. I have a [sample application](https://github.com/oreoshake/script_hash_test) with all of this in action.

## Hash? Nonce? Huh.

CSP is great for restricting inline script. It has received some backlash because to truly leverage the XSS protection provided by CSP, you need to remove all inline javascript (among other tasks). A solution for whitelisting inline content would certainly increase adoption. Here are the differences between the two proposals:

### Script nonce

{% highlight bash %}
Content-Security-Policy: script-src 'nonce-abc123'

<script nonce='abc123'>console.log("Hello world")</script>

{% endhighlight %}

IFF the nonce in the script tag matches the value in the header, the script executes.

Downside: _Protection can be entirely circumvented if you have dynamic javascript_. Caching of dynamic values cause caching issues, not great for massive scale. Using a static value reduces/eliminates protection. Using an easily guessable value is also troublesome.

Upside: pretty easy to apply

### Script hash

{% highlight bash %}
Content-Security-Policy: script-src 'sha1-<BASE64 ENCODED SHA1 HASH OF THE CONTENTS OF THE SCRIPT TAG>'

<script nonce='abc123'>console.log("Hello world")</script>

{% endhighlight %}

So in this case, script-src ‘sha1-fU8Y3i83rje0823mI+3hgmqgysc=’

Downside: moar harder for developers and browsers to implement.

Upside: if you don’t use dynamic javascript, your code is effectively certified as code that is allowed to execute. Doesn’t cause caching issues. Strength of protection is determined by hash strength and not implementation.

## Script Hash Generation

*   Grab all templates (stuff that turns into html that kinda already looks like html)
*   Iterate over each file and:
  *   Grep the code for /(<script([s]*(?!src)([w-])+=([“‘])[^”‘]+4)*[s]*>)(.*?)(</script>)/mx
  *   Take each match (second to last capture group in this case, ruby 1.8 doesn’t support named capture groups).
  *   Hash the value with SHA256 and base64 encode the output.
*   Store the filename and any hashes (e.g. in a YAML file, hash, associative array, whatever). Key: filename, value: array of hashes.

## Script hash application

*   Hook into the framework so that anytime a template is rendered, we take note.
*   Once rendering is done, add the hashes (if any) of all rendered templates to the content security policy.

## “Automatic inline script CSP protection”

To hopefully satisfy this claim, here’s some steps you’d have to take:

*   Have a task that watches the filesystem for changes to your templates.
*   Update the script hashes that are applied to the given template without having to restart any process.

Here’s a (poor quality) screen cast of [my PoC branch](https://github.com/twitter/secureheaders/pull/67):

<iframe width="560" height="315" src="https://www.youtube.com/embed/Bc2hvziTRxg" frameborder="0" allowfullscreen=""></iframe>

## Surprises

*   Generating hashes “on deploy” is no good. Tests would break if CSP is enforced and the hashes are outdated.
*   I’m not that great with Regexen. In writing this post, I noticed at least one improvement I can make.
