const Comment = require('../models/Comment');
const bus = require('../events');
const ApiError = require('../utils/ApiError');
const { EVENTS } = require('../utils/constants');
const { getAccessible } = require('./ticketService');

async function list(user, ticketId) {
  const ticket = await getAccessible(ticketId, user);
  return Comment.find({ ticket: ticket._id }).sort({ createdAt: 1 }).populate('author', 'name role');
}

async function add(user, ticketId, message) {
  const ticket = await getAccessible(ticketId, user);
  if (ticket.status === 'closed') throw new ApiError(409, 'This ticket is closed and no longer accepts comments.');

  const comment = await Comment.create({ ticket: ticket._id, author: user._id, authorRole: user.role, message });
  await comment.populate('author', 'name role');
  await bus.publish(EVENTS.COMMENT_ADDED, { ticket, actor: user, comment });
  return comment;
}

module.exports = { list, add };
