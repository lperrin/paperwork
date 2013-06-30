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

You can then validate JSON like that:

```javascript
var result = paperwork.invalid(incomingPost, blogPostTemplate);
```

It will return false if the JSON is correct, or an array of strings otherwise.

Express integration
-------------------

If you're using [Express](http://expressjs.com), things are even simpler:

```javascript
app.post('/post', paperwork(blogPostTemplate), function (req, res) {
  // req.body is now validated
});
```

Invalid requests will receive an HTTP 400 response and will be silently rejected.

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