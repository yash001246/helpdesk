const ApiError = require('../utils/ApiError');

// validate(schema, 'body' | 'query') – replaces the source with the parsed (sanitised) data.
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(new ApiError(400, 'Validation failed', details));
    }
    req[source] = result.data;
    next();
  };

const validateObjectId =
  (param = 'id') =>
  (req, _res, next) =>
    /^[a-f\d]{24}$/i.test(req.params[param]) ? next() : next(new ApiError(400, `Invalid ${param}`));

module.exports = { validate, validateObjectId };
