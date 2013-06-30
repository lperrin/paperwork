var _ = require('underscore');

module.exports = function (specs, custom) {
  return function (req, res, next) {
    if(!req.body)
      throw new Error('express.bodyParser() not enabled');

    var failed = invalid(req.body, specs);

    if(failed.length === 0 && _.isFunction(custom))
      failed = failed.concat(custom(req.body));

    if(_(failed).compact().length === 0)
      return next();

    res.send(400, {status: 'bad_request', reason: 'Body did not satisfy requirements', fields: failed});
  };
};

var invalid = module.exports.invalid = function (blob, specs) {
  if(!_(specs).isObject())
    throw new Error('specs must be an object');

  if(!_(blob).isObject())
    return _(specs).keys();

  return _.chain(specs).keys().reject(function check(field) {
    var spec = specs[field],
        val = blob[field];

    return checkSpec(spec, val);
  }).value();
};

function Optional(spec) {
  this.spec = spec;
}

module.exports.optional = function (spec) {
  return new Optional(spec);
};

function Multiple(specs) {
  this.specs = specs;
}

module.exports.all = function () {
  return new Multiple(Array.prototype.slice.call(arguments));
};

function checkSpec(spec, val) {
  if(spec instanceof Optional)
    return !val || checkSpec(spec.spec, val);

  if(val === undefined)
    return false;

  if(_.isRegExp(spec))
    return typeof(val) === 'string' && spec.test(val);

  if(spec === String)
    return typeof(val) === 'string';

  if(spec === Boolean)
    return typeof(val) === 'boolean';

  if(spec === Number)
    return typeof(val) === 'number';

  if(spec instanceof Multiple) {
    return _.every(spec.specs, function (spec) {
      return checkSpec(spec, val);
    });
  }

  if(_.isFunction(spec))
    return spec(val);

  if(_.isArray(spec)) {
    if(spec.length !== 1)
      throw new Error('array must contain only 1 sample value');

    var itemSpec = spec[0];

    return _.isArray(val) && _(val).all(function (item) {
      return checkSpec(itemSpec, item);
    });
  }

  if(_.isObject(spec)) {
    return _.isObject(val) && _(spec).all(function (subspec, field) {
      return checkSpec(subspec, val[field]);
    });
  }

  throw new Error('unknown spec type: ' + spec);
}