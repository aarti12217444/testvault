const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  title: { type: String, required: true },
  subject: { type: String, default: '' },
  class: { type: String, default: '' },
  description: { type: String, default: '' },

  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  duration: { type: Number, required: true },
  totalMarks: { type: Number, required: true },

  // ===== SCHEDULE =====
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },

  // ===== RESULT DECLARATION =====
  resultDeclared: { type: Boolean, default: false },
  resultDeclareAt: { type: Date, default: null }, // scheduled time for auto-declare
  resultDeclaredAt: { type: Date, default: null }, // actual time when declared

  // ===== PROCTORING SETTINGS =====
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },
  cameraEnabled: { type: Boolean, default: true },
  micEnabled: { type: Boolean, default: false },

  // ===== STATUS =====
  isActive: { type: Boolean, default: true },

}, { timestamps: true });

// Virtual field — exam ka current status
examSchema.virtual('status').get(function () {
  const now = new Date();
  if (!this.isActive) return 'Inactive';
  if (this.startTime && now < this.startTime) return 'Upcoming';
  if (this.endTime && now > this.endTime) return 'Expired';
  return 'Active';
});

examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Exam', examSchema);