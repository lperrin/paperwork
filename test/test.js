var should = require('should'),
    paperwork = require('../paperwork');

describe('Paperwork', function () {
  var blogPostTemplate = {
    article_id: Number,
    title: String,
    body: String,
    publish_immediately: Boolean,
    tags: [String]
  };

  it('should validate correct blob', function () {
    var blob = {
      article_id: 123,
      title: 'Another blog post',
      body: 'Test body',
      publish_immediately: true,
      tags: ['nodejs', 'test']
    };

    paperwork.invalid(blob, blogPostTemplate).should.eql([]);
  });

  it('should invalidate missing blob', function () {
    paperwork.invalid(null, blogPostTemplate).should.eql(['article_id', 'title', 'body', 'publish_immediately', 'tags']);
  });

  it('should invalidate blob with missing field', function () {
    var blob = {
      article_id: 123,
      title: 'Another blog post',
      publish_immediately: true,
      tags: ['nodejs', 'test']
    };

    paperwork.invalid(blob, blogPostTemplate).should.eql(['body']);
  });

  it('should invalidate blob with multiple missing fields', function () {
    var blob = {
      title: 'Another blog post',
      publish_immediately: true,
      tags: ['nodejs', 'test']
    };

    paperwork.invalid(blob, blogPostTemplate).should.eql(['article_id', 'body']);
  });

  it('should invalidate blob with bad type', function () {
    var blob = {
      article_id: '123',
      title: 'Another blog post',
      body: 'Test body',
      publish_immediately: true,
      tags: ['nodejs', 'test']
    };

    paperwork.invalid(blob, blogPostTemplate).should.eql(['article_id']);
  });

  var userProfileTemplate = {
    email: /[^@]+@[^@]+/,
    name: String,
    age: Number,
    phone: paperwork.optional(String),
    country: paperwork.optional(/^[a-z]{2}$/)
  };

  it('should validate blob with regex', function () {
    var blob = {
      email: 'someone@somewhere.com',
      name: 'Test User',
      age: 32,
      admin: true,
      phone: '1234',
      country: 'fr'
    };

    paperwork.invalid(blob, userProfileTemplate).should.eql([]);
  });

  it('should invalidate blob with bad regex', function () {
    var blob = {
      email: 'someone (at) somewhere.com',
      name: 'Test User',
      age: 32,
      admin: true,
      phone: '1234',
      country: 'frz'
    };

    paperwork.invalid(blob, userProfileTemplate).should.eql(['email', 'country']);
  });

  it('should ignore omitted optional fields', function () {
    paperwork.invalid({
      email: 'someone@somewhere.com',
      alias: 'test',
      name: 'Test User',
      age: 32,
      admin: true,
      country: 'be'
    }, userProfileTemplate).should.eql([]);
  });

  it('should invalidate bad optional fields', function () {
    paperwork.invalid({
      email: 'someone@somewhere.com',
      alias: 'test',
      name: 'Test User',
      age: 32,
      admin: true,
      phone: 1234
    }, userProfileTemplate).should.eql(['phone']);
  });

  var nestedTemplate = {
    email: /[^@]+@[^@]+/,
    name: String,
    age: function (age) {
      return age > 0;
    },
    config: paperwork.optional({
      user: String,
      password: String,
      flags: [Boolean],
      thing: {foo: String}
    })
  };

  it('should validate nested spec', function () {
    paperwork.invalid({
      email: 'someone@somewhere.com',
      alias: 'test',
      name: 'Test User',
      age: 32,
      config: {
        user: 'front',
        password: 'password',
        flags: [true, true, false],
        thing: {foo: 'bar'}
      }
    }, nestedTemplate).should.eql([]);
  });

  it('should invalidate nested missing field', function () {
    paperwork.invalid({
      email: 'someone@somewhere.com',
      alias: 'test',
      name: 'Test User',
      age: 32,
      config: {
        user: 'front',
        flags: [true, true, false],
        thing: {foo: 'bar'}
      }
    }, nestedTemplate).should.eql(['config']);
  });

  it('should invalidate nested invalid field', function () {
    paperwork.invalid({
      email: 'someone@somewhere.com',
      alias: 'test',
      name: 'Test User',
      age: 32,
      config: {
        user: 'front',
        password: 'password',
        flags: [true, true, 'oops'],
        thing: {foo: 'bar'}
      }
    }, nestedTemplate).should.eql(['config']);
  });

  var multipleConditionTemplate = {
    a: Number,
    b: paperwork.all(Number, function (val) {
      return val % 3 === 0;
    })
  };

  it('should validate multiple conditions', function  () {
    paperwork.invalid({
      a: 10,
      b: 9
    }, multipleConditionTemplate).should.eql([]);
  });

  it('should invalidate multiple conditions', function  () {
    paperwork.invalid({
      a: 10,
      b: 10
    }, multipleConditionTemplate).should.eql(['b']);
  });
});