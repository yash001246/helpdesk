const mongoose = require('mongoose');
const { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES } = require('../utils/constants');

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 5000 },
    category: { type: String, enum: TICKET_CATEGORIES, default: 'general' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    status: { type: String, enum: TICKET_STATUSES, default: 'open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    resolvedAt: Date,
    closedAt: Date,
  },
  { timestamps: true }
);

// "My tickets" list, filtered by status and sorted by newest.
ticketSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
// Admin queue: filter by status + priority, newest first.
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

ticketSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Ticket', ticketSchema);
