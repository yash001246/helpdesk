const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const paginate = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });

exports.listUsers = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: paginate(page, limit, total) });
});

exports.updateRole = asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) throw new ApiError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user });
});

exports.activity = asyncHandler(async (req, res) => {
  const { event, page, limit } = req.query;
  const filter = event ? { event } : {};
  const [data, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: paginate(page, limit, total) });
});
