var should = require('should'),
    paperwork = require('../paperwork');

describe('Paperwork', function () {
  var simple = {
    alias: /^[a-z0-9]+$/,
    name: String,
    admin: Boolean,
    age: Number
  };

  var withOption = {
    alias: /^[a-z0-9]+$/,
    name: String,
    admin: Boolean,
    country: paperwork.optional(/^[a-z]{2}$/)
  };

  var custom = {
    alias: function (alias) {
      return alias.length > 3;
    }
  };

  var nested = {
    inboxes: [String],
    config: {
      user: String,
      password: String,
      flags: [Boolean],
      thing: {foo: String}
    }
  };

  it('should validate correct blob', function () {
    var blob = {
      alias: 'test',
      name: 'Test User',
      admin: false,
      age: 31
    };

    paperwork.invalid(blob, simple).should.eql([]);
  });

  it('should invalidate missing blob', function () {
    paperwork.invalid(null, simple).should.eql(['empty']);
  });

  it('should invalidate blob with missing field', function () {
    var blob = {
      name: 'Test User',
      admin: true,
      age: 31
    };

    paperwork.invalid(blob, simple).should.eql(['alias']);
  });

  it('should invalidate blob with bad regexp', function () {
    var blob = {
      alias: 'test/',
      name: 'Test User',
      admin: true,
      age: 31
    };

    paperwork.invalid(blob, simple).should.eql(['alias']);
  });

  it('should invalidate blob with multiple errors', function () {
    var blob = {
      alias: 'test-',
      admin: 'true',
      age: 31
    };

    paperwork.invalid(blob, simple).should.eql(['alias', 'name', 'admin']);
  });

  it('should validate optional specs', function () {
    paperwork.invalid({
      alias: 'test',
      name: 'Test User',
      admin: true,
      country: 'be'
    }, withOption).should.eql([]);
  });

  it('should validate omitted optional specs', function () {
    paperwork.invalid({
      alias: 'test',
      name: 'Test User',
      admin: true
    }, withOption).should.eql([]);
  });

  it('should invalidate bad optional specs', function () {
    paperwork.invalid({
      alias: 'test',
      name: 'Test User',
      admin: true,
      country: 'youplaboum'
    }, withOption).should.eql(['country']);
  });

  it('should validate blob with custom validator', function () {
    paperwork.invalid({alias: 'bad'}, custom).should.eql(['alias']);
    paperwork.invalid({alias: 'good'}, custom).should.eql([]);
  });

  it('should validate nested spec', function () {
    paperwork.invalid({
      inboxes: ['contact', 'support'],
      config: {
        user: 'front',
        password: 'password',
        flags: [true, true, false],
        thing: {foo: 'bar'}
      }
    }, nested).should.eql([]);
  });

  it('should invalidate nested missing field', function () {
    paperwork.invalid({
      inboxes: ['contact', 'support'],
      config: {
        user: 'front',
        flags: [true, true, false],
        thing: {foo: 'bar'}
      }
    }, nested).should.eql(['config']);
  });

  it('should invalidate nested invalid field', function () {
    paperwork.invalid({
      inboxes: ['contact', 'support'],
      config: {
        user: 'front',
        password: 'password',
        flags: [true, true, false, 'oops'],
        thing: {foo: 'bar'}
      }
    }, nested).should.eql(['config']);
  });
});