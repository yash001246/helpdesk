const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const bus = require('../events');
const ApiError = require('../utils/ApiError');
const { ROLES, EVENTS } = require('../utils/constants');

const isAdmin = (user) => user.role === ROLES.ADMIN;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, updated: { updatedAt: -1 } };

// Loads a ticket and enforces ownership: admins see everything, users only their own.
async function getAccessible(id, user) {
  const ticket = await Ticket.findById(id).populate('createdBy', 'name email');
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (!isAdmin(user) && String(ticket.createdBy._id) !== String(user._id)) {
    throw new ApiError(403, 'You can only access your own tickets');
  }
  return ticket;
}

async function list(user, q) {
  const filter = {};
  if (!isAdmin(user)) filter.createdBy = user._id;
  ['status', 'priority', 'category'].forEach((k) => q[k] && (filter[k] = q[k]));
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const [data, total] = await Promise.all([
    Ticket.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('createdBy', 'name email'),
    Ticket.countDocuments(filter),
  ]);

  return { data, pagination: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } };
}

async function create(user, data) {
  const ticket = await Ticket.create({ ...data, createdBy: user._id });
  await ticket.populate('createdBy', 'name email');
  await bus.publish(EVENTS.TICKET_CREATED, { ticket, actor: user });
  return ticket;
}

async function update(user, id, data) {
  const ticket = await getAccessible(id, user);

  if (!isAdmin(user) && ticket.status !== 'open') {
    throw new ApiError(409, 'Only open tickets can be edited. Add a comment instead.');
  }

  const changes = {};
  Object.entries(data).forEach(([field, value]) => {
    if (ticket[field] !== value) {
      changes[field] = { from: ticket[field], to: value };
      ticket[field] = value;
    }
  });
  if (!Object.keys(changes).length) return ticket;

  if (changes.status) {
    const { to } = changes.status;
    if (to === 'resolved') ticket.resolvedAt = new Date();
    else if (to === 'open' || to === 'in_progress') ticket.resolvedAt = undefined;
    ticket.closedAt = to === 'closed' ? new Date() : undefined;
  }
  await ticket.save();

  const { status, ...rest } = changes;
  if (Object.keys(rest).length) await bus.publish(EVENTS.TICKET_UPDATED, { ticket, actor: user, changes: rest });
  if (status) {
    await bus.publish(EVENTS.STATUS_CHANGED, { ticket, actor: user, from: status.from, to: status.to });
    if (status.to === 'resolved') await bus.publish(EVENTS.TICKET_RESOLVED, { ticket, actor: user });
  }
  return ticket;
}

async function remove(user, id) {
  const ticket = await getAccessible(id, user);
  if (!isAdmin(user) && ticket.status !== 'open') {
    throw new ApiError(409, 'Only open tickets can be deleted.');
  }
  await Promise.all([ticket.deleteOne(), Comment.deleteMany({ ticket: ticket._id })]);
  await bus.publish(EVENTS.TICKET_DELETED, { ticket, actor: user });
}

module.exports = { getAccessible, list, create, update, remove };
