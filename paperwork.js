var _ = require('underscore');

function Visitor(path, errors) {
  this.path = path || 'body';
  this.errors = errors || [];
}

Visitor.prototype.enter = function(elem) {
  return new Visitor(this.path + '.' + elem, this.errors);
};

Visitor.prototype.clone = function (elem) {
  return new Visitor(this.path + '.' + elem);
};

Visitor.prototype.enterArray = function(i) {
  return new Visitor(this.path + '[' + i + ']', this.errors);
};

Visitor.prototype.report = function (reason) {
  this.errors.push(this.path + ': ' + reason);

  return null;
};

Visitor.prototype.checkType = function (val, type) {
  if (typeof(val) === type)
    return val;

  this.report('should be a ' + type);

  return null;
};

Visitor.prototype.checkFun = function (val, fun, reason) {
  if (fun(val))
    return val;

  this.report(reason || 'failed ' + getFunctionName(fun));

  return null;
};

Visitor.prototype.hasErrors = function () {
  return this.errors.length > 0;
};

function Optional(spec, defaultVal) {
  this.opt = spec;
  this.defaultVal = !_.isUndefined(defaultVal) ? defaultVal : null;
}

function Multiple(specs) {
  this.mult = specs;
}

function Or(specs) {
  this.or = specs;
}

function paperwork(spec, val, visitor) {
  if (spec instanceof Optional)
    return !_.isUndefined(val) && !_.isNull(val) ? paperwork(spec.opt, val, visitor) : spec.defaultVal;

  if (val === undefined)
    return visitor.report('missing');

  if (_.isRegExp(spec)) {
    if (typeof(val) !== 'string')
      return visitor.report('should be a string');

    if (!spec.test(val))
      return visitor.report('should match ' + spec);

    return val;
  }

  if (_.isString(spec)) {
    if (typeof(val) !== 'string')
      return visitor.report('should be a string');

    if (spec !== val)
      return visitor.report('should eql ' + spec);

    return val;
  }

  if (spec === String)
    return visitor.checkType(val, 'string');

  if (spec === Boolean)
    return visitor.checkType(val, 'boolean');

  if (spec === Number)
    return visitor.checkType(val, 'number');

  if (spec === Array)
    return visitor.checkType(val, _.isArray, 'should be an array');

  if (spec instanceof Multiple) {
    var allGood = _.all(spec.mult, function (spec) {
      return paperwork(spec, val, visitor) !== null;
    });

    return allGood ? val : null;
  }

  if (spec instanceof Or) {
    var cleaned = null;

    var anyGood = _.any(spec.or, function (spec) {
      var subvisitor = visitor.clone('or');
      cleaned = paperwork(spec, val, subvisitor);

      return !subvisitor.hasErrors();
    });

    if (anyGood)
      return cleaned;
    else {
      visitor.report('should match at least 1 condition');

      return null;
    }
  }

  if (_.isFunction(spec))
    return visitor.checkFun(val, spec, null);

  if (_.isArray(spec)) {
    var itemSpec = spec[0];

    if (!visitor.checkFun(val, _.isArray, 'should be an array'))
      return null;

    return _(val).map(function (item, i) {
      return paperwork(itemSpec, item, visitor.enterArray(i));
    });
  }

  if (_.isObject(spec)) {
    if (!visitor.checkFun(val, _.isObject, 'should be an object'))
      return null;

    var res = {};

    _(spec).each(function (subspec, field) {
      res[field] = paperwork(subspec, val[field], visitor.enter(field));
    });

    return res;
  }
}

function getFunctionName(fun) {
  var ret = fun.toString();

  ret = ret.substr('function '.length);
  ret = ret.substr(0, ret.indexOf('('));

  return ret;
}

var paperworkEval = module.exports = function (spec, blob, done) {
  var visitor = new Visitor(),
      cleaned = paperwork(spec, blob, visitor);

  if (visitor.hasErrors())
    done(visitor.errors);
  else
    done(null, cleaned);
};

module.exports.wrapHttp = function (spec, blob, done) {
  paperworkEval(spec, blob, function (errors, validated) {
    if (errors)
      return done({status: 'bad_request', reason: 'Body did not satisfy requirements.', errors: errors});

    done(null, validated);
  });
};

module.exports.accept = function (spec) {
  return function (req, res, next) {
    if (!req.body)
      throw new Error('express.bodyParser() not enabled');

    var visitor = new Visitor(),
        cleaned = paperwork(spec, req.body, visitor);

    if (!visitor.hasErrors()) {
      req.body = cleaned;

      return next();
    }

    var error = {
      status: 'bad_request',
      reason: 'Body did not satisfy requirements',
      errors: visitor.errors
    };

    if (res.locals && res.locals.sendError)
      return res.locals.sendError(error);

    res.status(400).send(error);
  };
};

module.exports.validator = function (spec) {
  return module.exports.bind(null, spec);
};

module.exports.optional = function (spec, defaultVal) {
  return new Optional(spec, defaultVal);
};

module.exports.all = function () {
  return new Multiple(Array.prototype.slice.call(arguments));
};

module.exports.or = function () {
  return new Or(Array.prototype.slice.call(arguments));
};

module.exports.any = function () {
  return new Or(Array.prototype.slice.call(arguments));
};
