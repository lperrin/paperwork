Paperwork
=========

Lightweight JSON validation for node.js REST APIs.

Why ?
-----

If you build a REST API with node.js, you'll end up validating JSON sooner or later. It's not exactly difficult, but life would be easier if:

- You knew precisely what the structure of data your API accepts.
- It was easy for your fellow developers to document the requirements of the API.
- It was easy for people consuming the API to understand why their request was rejected.
- You didn't have to write boilerplate code.

Install
-------

```
npm install paperwork
```

How it works
------------

Simple ! Just write a JSON template:

```javascript
var blogPostTemplate = {
  article_id: Number,
  title: String,
  body: String,
  publish_immediately: Boolean,
  tags: [String]
};
```

You can then validate JSON like that. It will return an array of missing or incorrect fields. The array is of course empty is everything is OK:

```javascript
paperwork(blogPostTemplate, incomingPost, function (err, validated) {
  if (err) {
    // err is the list of incorrect fields
    console.error(err);
  } else {
    // JSON was validated, extra fields were removed.
  }
});
```

Express integration
-------------------

If you're using [Express](http://expressjs.com), things are even simpler:

```javascript
app.post('/post', paperwork.accept(blogPostTemplate), function (req, res) {
  // req.body is now validated: you can use it without checking anything
});
```

Invalid requests will receive an HTTP 400 response and will be silently rejected. The response will contain a helpful message indicating what was wrong:

```javascript
{
  "status": "bad_request",
  "reason": "Body did not satisfy requirements",
  "errors": [
    "body.alias: should match /^[a-z0-9]+$/",
    "body.name: missing",
    "body.admin: should be a boolean",
    "body.age: should be a number"
  ]
}
```

Changes from 1.x
----------------

- Paperwork now silently removes unknown fields from the validated blob. This is done so you never pass unvalidated data to your code. For instance, if an attacker was to pass an extra `id`, you might end up using it to update the wrong object in your database.

- Paperwork now accepts an (error, validated) callback. It will pass either an error (the list of fields that did not match your requirements) or a validated JSON.

- You must now pass `paperwork.accept` to Express.


Advanced Usage
--------------

User profile with minimal email validation and optional fields

```javascript
var userProfileTemplate = {
  email: /[^@]+@[^@]+/,                    // validates only strings matching this regex
  name: String,
  age: Number,
  admin: Boolean,
  phone: paperwork.optional(String),       // makes the field optional
  country: paperwork.optional(/[a-z]{2}/)
};
```

Validating the content of an array

```javascript
var betterBlogPostTemplate = {
  title: String,
  body: String,
  attachments: paperwork.optional([{      // validates an array of attachments
    content_type: String,
    data: String,
    size: Number
  }])
};
```

Custom validation, multiple conditions

```javascript
var betterUserProfile = {
  email: /[^@]+@[^@]+/,
  name: String,
  age: function (age) {
    return age > 0;
  }
};

var evenBetterUserProfile = {
  email: /[^@]+@[^@]+/,
  name: String,
  age: paperwork.all(Number, function (age) {
    return age > 0;
  })
};
```
