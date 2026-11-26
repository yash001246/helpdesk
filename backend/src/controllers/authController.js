const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

// Public registration always creates a normal "user". Admins are created via the seed script
// or promoted by another admin – the role can never be chosen by the client.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, password });
  res.status(201).json({ success: true, data: { token: signToken(user), user } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password – don't reveal which accounts exist.
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password');
  res.json({ success: true, data: { token: signToken(user), user } });
});

exports.me = (req, res) => res.json({ success: true, data: req.user });
