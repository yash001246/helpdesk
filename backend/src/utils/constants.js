const ROLES = { USER: 'user', ADMIN: 'admin' };

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TICKET_CATEGORIES = ['technical', 'billing', 'account', 'feature_request', 'general', 'other'];

const EVENTS = {
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  STATUS_CHANGED: 'ticket.status_changed',
  COMMENT_ADDED: 'ticket.comment_added',
  TICKET_RESOLVED: 'ticket.resolved',
  TICKET_DELETED: 'ticket.deleted',
};

module.exports = { ROLES, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, EVENTS };
