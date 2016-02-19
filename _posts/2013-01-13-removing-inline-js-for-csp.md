---
layout: post
title:  "Removing Inline Javascript (for CSP)"
date:   2013-01-13 20:40:49
categories: CSP
---

**This post is pretty old and has some outdated practices, but the idea remains the same: do not mix code (javascript) and data (server generated values).**

Here are the techniques I use to remove inline javascript from applications. This is the most important step in applying content security policy. CSP 1.1 has the concept of a script-nonce which allows inline script that matches the value, but I feel this is a bandaid. Before this becomes a part of the spec, I'm pushing for every application to remove inline javascript.  

The thing I like most about these techniques is that it only requires one form of escaping (HTML entity escaping), which is widely supported by templating languages, as opposed to context-specific escaping.  

## Loading values

### Single values: create a hidden input

```html
<input id="mything" type="hidden" value="<%= html_escape(@donkey) %>" />
```

```js
var thingy = $('#myinput').val()
```

### Multiple related values: create a hidden span with data-* attributes

<div>Using a naming convention and/or programmatic loading go a long way here. </div>

```html
<span class="hide" data-attr1="<%= html_escape(@attr1)%>" data-attr2="<%= html_escape(@attr2)%>" id="mycontainer"></span>
```

```js
var firstThingy = $('#mycontainer').data('attr1');
var secondThingy = $('#mycontainer').data('attr2');
```

### Loading complex objects: place the object in the content of script tag as HTML-escaped JSON, read the innerHTML of the span, and parse it as JSON.

This technique is also outlined in the [OWASP XSS Prevention Cheat Sheet](https://www.owasp.org/index.php/XSS_%28Cross_Site_Scripting%29_Prevention_Cheat_Sheet#RULE_.233.1_-_HTML_escape_JSON_values_in_an_HTML_context_and_read_the_data_with_JSON.parse) Thanks to @rx: improved on this a bit by using a script tag rather than a span. The values must still be escaped! Use html entity encoding here too. If you must, json encoding will work as well. Otherwise, breaking out of the script tag is just a matter of placing  
which is parsed by the browser BEFORE the javascript is parsed/executed. Again, even invalid JSON is trumped by what the browser thinks you meant to do and it will happily render an attackers closing script tag and what is to follow.  

A completely valid alternative is to JSON encode the values. Why didn't I use that approach? Because few templating languages support this directly. Take Mustache, which I absolutely love: your choices are HTML entity encode or output the raw values. This would require the JSON encoding to happen outside of the template, which is a recipe for disaster and trains people to think triple staches (raw data) is ok. This is bad.

```html
<script type="application/json" id="init_data">
  <%= html_escape(@donkey.to_json)%>
</script>
```

Note! You MUST set type="application/json" or CSP will consider it code, and block the inline script.  
In an external JS file, read the value as raw html and parse the encapsulated JSON to yield an associative array (a.k.a. map, dictionary, hash, etc).

```js
var dataElement = document.getElementById('init_data');
var jsonText = unescape(dataElement);  

// you may need to do additional processing, like calling split
var initData = JSON.parse(jsonBlock);
```

## Google analytics

We often make use of per-page values for google analytics. This often includes dynamic values. The technique above will work, but since it is common, here's a few helpers.  

ApplicationHelper  

```ruby
def google_analytics_setting index, value
  content_tag 'span', '', :class => 'hide',
    :id => "google_analytics_#{index}", :'data-value' => value
end

```

"myview.html.erb"  

```html
<%= google_analytics_setting 1, 'Key', 'Value' %>
```

external.js  

```js
function setCustomGAVar(index, key, value) {
  _gaq.push(['_setCustomVar', index, key, value]);
}

$(document).ready(function() {
  // set per-page values unobtrusively
  $('span[id^=google_analytics_]').each(function(index) {
    var self = $(this);
    var id = self.attr('id');
    var index = id.substring(id.length - 1);
    var key = self.data('key');
    var value = self.data('value');
    setCustomGAVar(index, key, value);
  });
};
```
