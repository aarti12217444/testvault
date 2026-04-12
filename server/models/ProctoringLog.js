const mongoose = require('mongoose');

const proctoringLogSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  photo: {
    type: String, // base64 image
    required: true,
  },
  status: {
    type: String,
    enum: ['clear', 'no_face', 'multiple_face', 'face_too_small', 'detection_error'],
    default: 'clear',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('ProctoringLog', proctoringLogSchema);