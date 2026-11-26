const Ticket = require('../models/Ticket');
const { ROLES, TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES } = require('../utils/constants');

const toMap = (rows, keys) => keys.reduce((acc, k) => ({ ...acc, [k]: rows.find((r) => r._id === k)?.count || 0 }), {});
const group = (field) => [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }];

// Dashboard numbers. Admins see the whole system, users only their own tickets.
async function summary(user) {
  const match = user.role === ROLES.ADMIN ? {} : { createdBy: user._id };
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [r] = await Ticket.aggregate([
    { $match: match },
    {
      $facet: {
        total: [{ $count: 'n' }],
        byStatus: group('status'),
        byPriority: group('priority'),
        byCategory: group('category'),
        last7Days: [{ $match: { createdAt: { $gte: since } } }, { $count: 'n' }],
        resolution: [
          { $match: { resolvedAt: { $exists: true } } },
          { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } } } },
        ],
      },
    },
  ]);

  return {
    total: r.total[0]?.n || 0,
    createdLast7Days: r.last7Days[0]?.n || 0,
    avgResolutionHours: r.resolution[0] ? Number((r.resolution[0].avgMs / 3600000).toFixed(1)) : null,
    byStatus: toMap(r.byStatus, TICKET_STATUSES),
    byPriority: toMap(r.byPriority, TICKET_PRIORITIES),
    byCategory: toMap(r.byCategory, TICKET_CATEGORIES),
  };
}

module.exports = { summary };
