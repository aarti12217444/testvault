const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedAnswer: { type: String, enum: ['A', 'B', 'C', 'D', null] },
    isCorrect: { type: Boolean }
  }],
  score: { type: Number, default: 0 },
  totalMarks: { type: Number },
  percentage: { type: Number },
  timeTaken: { type: Number }, // seconds

  // ===== SUBMIT REASON & PROCTORING =====
  submitReason: {
    type: String,
    enum: ['manual', 'time_up', 'tab_switch', 'fullscreen_exit', 'extension_detected', 'devtools_detected', 'multiple_warnings', 'camera_denied', 'auto_other'],
    default: 'manual'
  },
  submitLabel: { type: String, default: 'Manually Submitted' },
  suspiciousLevel: {
    type: String,
    enum: ['none', 'low', 'moderate', 'high'],
    default: 'none'
  },
  suspiciousDetails: { type: String, default: '' },
  activityLog: [{ 
    type: { type: String },
    message: { type: String },
    time: { type: String }
  }],

  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);