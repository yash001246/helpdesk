const mongoose = require('mongoose');
const { EVENTS } = require('../utils/constants');

// Append-only audit trail produced by the event handlers.
const activityLogSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    ticketTitle: { type: String, required: true }, // kept so the log stays readable after a ticket is deleted
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    event: { type: String, enum: Object.values(EVENTS), required: true },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ ticket: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
