const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer token and attaches the current user to req.user.
const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'The account for this token no longer exists');

  req.user = user;
  next();
});

// Role based access control: authorize('admin')
const authorize =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new ApiError(403, 'You do not have permission to perform this action'));

module.exports = { authenticate, authorize };
