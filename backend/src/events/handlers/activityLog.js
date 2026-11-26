const ActivityLog = require('../../models/ActivityLog');
const { EVENTS } = require('../../utils/constants');

const label = (s) => String(s).replace('_', ' ');

const describe = {
  [EVENTS.TICKET_CREATED]: ({ actor }) => `${actor.name} created the ticket`,
  [EVENTS.TICKET_UPDATED]: ({ actor, changes }) => `${actor.name} updated ${Object.keys(changes).join(', ')}`,
  [EVENTS.STATUS_CHANGED]: ({ actor, from, to }) => `${actor.name} changed status from ${label(from)} to ${label(to)}`,
  [EVENTS.COMMENT_ADDED]: ({ actor }) => `${actor.name} (${actor.role}) added a comment`,
  [EVENTS.TICKET_RESOLVED]: ({ actor }) => `${actor.name} marked the ticket as resolved`,
  [EVENTS.TICKET_DELETED]: ({ actor }) => `${actor.name} deleted the ticket`,
};

// Action: persist every event to the activity log.
module.exports = (event) => async (payload) => {
  const { ticket, actor } = payload;
  await ActivityLog.create({
    ticket: ticket._id,
    ticketTitle: ticket.title,
    actor: actor._id,
    actorName: actor.name,
    actorRole: actor.role,
    event,
    message: describe[event](payload),
    meta: payload.changes || (payload.from ? { from: payload.from, to: payload.to } : undefined),
  });
};
