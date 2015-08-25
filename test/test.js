var should = require('should'),
    sinon = require('sinon'),
    paperwork = require('../paperwork');

describe('Paperwork', function () {
  describe('Basic', function () {
    var simple = {
      alias: /^[a-z0-9]+$/,
      name: String,
      admin: Boolean,
      age: Number
    };

    it('should validate correct blob', function (done) {
      var blob = {
        alias: 'test',
        name: 'Test User',
        admin: false,
        age: 31
      };

      paperwork(simple, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.eql(blob);
        done();
      });
    });

    it('should invalidate missing blob', function (done) {
      paperwork(simple, null, function (err) {
        should.exist(err);
        err.should.eql(['body: should be an object']);
        done();
      });
    })

    it('should invalidate blob with one missing field', function (done) {
      var blob = {
        alias: 'test',
        admin: true,
        age: 31
      };

      paperwork(simple, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.name: missing']);
        done();
      });
    });

    it('should invalidate blob with two missing fields', function (done) {
      var blob = {
        name: 'Test User',
        admin: true
      };

      paperwork(simple, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.alias: missing', 'body.age: missing']);
        done();
      });
    });

    it('should invalidate blob with bad regexp', function (done) {
      var blob = {
        alias: 'test/',
        name: 'Test User',
        admin: true,
        age: 31
      };

      paperwork(simple, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.alias: should match /^[a-z0-9]+$/']);
        done();
      });
    });

    it('should invalidate blob with multiple errors', function (done) {
      var blob = {
        alias: 'test-',
        admin: 'true',
        age: '31'
      };

      paperwork(simple, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.alias: should match /^[a-z0-9]+$/', 'body.name: missing', 'body.admin: should be a boolean', 'body.age: should be a number']);
        done();
      });
    });

    it('should remove properties not in spec', function (done) {
      var blob = {
        id: 53,
        alias: 'test',
        name: 'Test User',
        admin: true,
        age: 32
      };

      paperwork(simple, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.not.have.property('id');
        validated.should.have.property('alias', 'test');
        validated.should.have.property('age', 32);
        done();
      });
    });
  });

  describe('Optional', function () {
    var withOption = {
      alias: /^[a-z0-9]+$/,
      name: String,
      admin: Boolean,
      country: paperwork.optional(/^[a-z]{2}$/)
    }

    it('should validate blob with optional spec', function (done) {
      var blob = {
        alias: 'test',
        name: 'Test User',
        admin: true,
        country: 'be'
      };

      paperwork(withOption, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.eql(blob);
        done();
      });
    });

    it('should validate blob without optional spec', function (done) {
      var blob = {
        alias: 'test',
        name: 'Test User',
        admin: true
      };

      paperwork(withOption, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.have.property('alias', 'test');
        validated.should.have.property('name', 'Test User');
        validated.should.have.property('admin', true);
        validated.should.have.property('country', null);
        done();
      });
    });

    it('should invalidate bad optional specs', function (done) {
      var blob = {
        alias: 'test',
        name: 'Test User',
        admin: true,
        country: 'thisistoolong'
      };

      paperwork(withOption, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.country: should match /^[a-z]{2}$/']);
        done();
      });
    });
  });

  describe('Advanced', function() {
    var custom = {
      alias: function longer_than_3(alias) {
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

    it('should invalidate blob with custom validator', function (done) {
      var blob = {
        alias: 'bad'
      };

      paperwork(custom, blob, function (err) {
        should.exist(err);
        err.should.eql(['body.alias: failed longer_than_3']);
        done();
      });
    });

    it('should validate blob with custom validator', function (done) {
      var blob = {
        alias: 'good'
      };

      paperwork(custom, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.eql(blob);
        done();
      });
    });

    it('should validate nested spec', function (done) {
      var blob = {
        inboxes: ['contact', 'support'],
        config: {
          user: 'front',
          password: 'password',
          flags: [true, true, false],
          thing: {foo: 'bar'}
        }
      };

      paperwork(nested, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.eql(blob);
        done();
      });
    });

    it('should remove extra fields from nested spec', function (done) {
      var blob = {
        id: 123,
        inboxes: ['contact', 'support'],
        config: {
          extra: true,
          user: 'front',
          password: 'password',
          flags: [true, true, false],
          thing: {id: 4, foo: 'bar'}
        }
      };

      paperwork(nested, blob, function (err, validated) {
        should.not.exist(err);
        should.exist(validated);
        validated.should.not.have.property('id');
        validated.should.have.property('config');
        validated.config.should.not.have.property('extra');
        validated.config.should.have.property('thing');
        validated.config.thing.should.not.have.property('id');
        validated.config.thing.should.have.property('foo', 'bar');
        done();
      });
    });

    it('should invalidate nested missing field', function (done) {
      var blob = {
        inboxes: ['contact', 'support'],
        config: {
          user: 'front',
          flags: [true, true, false],
          thing: {foo: 'bar'}
        }
      };

      paperwork(nested, blob, function  (err) {
        should.exist(err);
        err.should.eql(['body.config.password: missing']);
        done();
      });
    });
  });

  describe('Express', function () {
    var httpMocks = require('node-mocks-http');
    var simple = {
      alias: /^[a-z0-9]+$/,
      name: String,
      admin: Boolean,
      age: Number
    };

    it('should validate with Express middleware', function (done) {
      var fakeReq = {
        body: {
          alias: 'laurent',
          name: 'Laurent Perrin',
          admin: false,
          age: 32
        }
      };

      var fakeRes = httpMocks.createResponse();
      sinon.spy(fakeRes, 'send');
      sinon.spy(fakeRes, 'end');

      paperwork.accept(simple)(fakeReq, fakeRes, function () {
        should.exist(fakeReq.body);
        fakeReq.body.should.have.property('alias', 'laurent');
        fakeReq.body.should.have.property('admin', false);
        fakeRes.send.called.should.equal(false, 'res.send() should not have been called');
        fakeRes.end.called.should.equal(false, 'res.end() should not have been called');
        fakeRes._getData().should.equal('');
        done();
      });
    });

    it('should remove extra fields', function (done) {
      var fakeReq = {
        body: {
          id: 123,
          alias: 'laurent',
          name: 'Laurent Perrin',
          admin: false,
          age: 32
        }
      };

      var fakeRes = {
        send: function (code, json) {
          done(new Error('res.send() should not have been called'));
        }
      };

      paperwork.accept(simple)(fakeReq, fakeRes, function () {
        should.exist(fakeReq.body);
        fakeReq.body.should.have.property('alias', 'laurent');
        fakeReq.body.should.have.property('admin', false);
        fakeReq.body.should.not.have.property('id');
        done();
      });
    });

    it('should invalidate with Express middleware', function () {
      var fakeReq = {
        body: {
          alias: /laurent;/,
          name: 'Laurent Perrin',
          admin: false,
          age: 32
        }
      };

      var fakeRes = httpMocks.createResponse();
      sinon.spy(fakeRes, 'end')

      paperwork.accept(simple)(fakeReq, fakeRes, function () {
        done(new Error('done() should not have been called'));
      });

      setImmediate(function () {
        fakeRes.statusCode.should.equal(400, 'status code should be 400');
        fakeRes.end.called.should.equal(true, 'end() should have been called');
        fakeRes._getData().should.match(/bad_request/);
      });
    });
  });

  describe('.validator()', function () {
    var simple = {
      alias: /^[a-z0-9]+$/,
      name: String,
      admin: Boolean,
      age: Number
    };

    it('should return a function', function () {
      var validator = paperwork.validator(simple);
      validator.should.be.a.Function
    });

    it('should validate a given document', function (done) {
      var validator = paperwork.validator(simple);
      validator({
        alias: 'floby',
        name: 'Florent Jaby',
        admin: false,
        age: 25
      }, done);
    });

    it('should invalidate a given document', function (done) {
      var validator = paperwork.validator(simple);
      validator({
        name: 'Florent Jaby',
        admin: false,
        age: false
      }, function (err) {
        err.should.not.be.Undefined
        done();
      });
    });
  });
});
