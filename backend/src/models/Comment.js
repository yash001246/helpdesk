const mongoose = require('mongoose');
const { ROLES } = require('../utils/constants');

const commentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapshot of the author's role when the comment was written (shown as a badge in the UI).
    authorRole: { type: String, enum: Object.values(ROLES), required: true },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: true }
);

commentSchema.index({ ticket: 1, createdAt: 1 });

commentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Comment', commentSchema);
