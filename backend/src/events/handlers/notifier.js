const Notification = require('../../models/Notification');
const User = require('../../models/User');
const mailer = require('../../services/mailer');
const { EVENTS, ROLES } = require('../../utils/constants');

const idOf = (v) => String(v?._id || v);

async function adminIds() {
  const admins = await User.find({ role: ROLES.ADMIN }).select('_id');
  return admins.map((a) => String(a._id));
}

// Who should hear about this event?
async function recipients(event, { ticket, actor, to }) {
  const owner = idOf(ticket.createdBy);
  const byAdmin = actor.role === ROLES.ADMIN;
  let ids = [];

  switch (event) {
    case EVENTS.TICKET_CREATED:
      ids = await adminIds();
      break;
    case EVENTS.STATUS_CHANGED:
      // A resolved ticket is announced by the dedicated "resolved" event – avoid a duplicate.
      ids = to === 'resolved' ? [] : [owner];
      break;
    case EVENTS.TICKET_RESOLVED:
      ids = [owner];
      break;
    case EVENTS.TICKET_UPDATED:
    case EVENTS.COMMENT_ADDED:
      ids = byAdmin ? [owner] : await adminIds();
      break;
    case EVENTS.TICKET_DELETED:
      ids = byAdmin ? [owner] : [];
      break;
    default:
      ids = [];
  }
  return [...new Set(ids)].filter((id) => id !== String(actor._id));
}

const text = {
  [EVENTS.TICKET_CREATED]: ({ actor, ticket }) => `${actor.name} opened a new ticket: "${ticket.title}"`,
  [EVENTS.TICKET_UPDATED]: ({ actor, ticket }) => `${actor.name} updated the ticket "${ticket.title}"`,
  [EVENTS.STATUS_CHANGED]: ({ ticket, to }) => `Status of "${ticket.title}" changed to ${String(to).replace('_', ' ')}`,
  [EVENTS.COMMENT_ADDED]: ({ actor, ticket }) => `${actor.name} commented on "${ticket.title}"`,
  [EVENTS.TICKET_RESOLVED]: ({ ticket }) => `Your ticket "${ticket.title}" was marked as resolved`,
  [EVENTS.TICKET_DELETED]: ({ ticket }) => `The ticket "${ticket.title}" was deleted by an administrator`,
};

// Action: create in-app notifications (+ email when SMTP is configured).
module.exports = (event) => async (payload) => {
  const userIds = await recipients(event, payload);
  if (!userIds.length) return;

  const message = text[event](payload);
  await Notification.insertMany(
    userIds.map((user) => ({ user, ticket: payload.ticket._id, event, message }))
  );

  const users = await User.find({ _id: { $in: userIds } }).select('email');
  users.forEach((u) =>
    mailer
      .sendMail({ to: u.email, subject: `[Helpdesk] ${message}`, text: message })
      .catch((e) => console.error('[mail] failed:', e.message))
  );
};
