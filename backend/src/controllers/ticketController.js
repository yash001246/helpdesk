const asyncHandler = require('../utils/asyncHandler');
const tickets = require('../services/ticketService');
const comments = require('../services/commentService');
const stats = require('../services/statsService');
const ActivityLog = require('../models/ActivityLog');

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await tickets.create(req.user, req.body) });
});

exports.list = asyncHandler(async (req, res) => {
  const { data, pagination } = await tickets.list(req.user, req.query);
  res.json({ success: true, data, pagination });
});

exports.get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await tickets.getAccessible(req.params.id, req.user) });
});

exports.update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await tickets.update(req.user, req.params.id, req.body) });
});

exports.remove = asyncHandler(async (req, res) => {
  await tickets.remove(req.user, req.params.id);
  res.json({ success: true, message: 'Ticket deleted' });
});

exports.listComments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await comments.list(req.user, req.params.id) });
});

exports.addComment = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await comments.add(req.user, req.params.id, req.body.message) });
});

exports.activity = asyncHandler(async (req, res) => {
  const ticket = await tickets.getAccessible(req.params.id, req.user);
  res.json({ success: true, data: await ActivityLog.find({ ticket: ticket._id }).sort({ createdAt: -1 }) });
});

exports.stats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await stats.summary(req.user) });
});
