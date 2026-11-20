const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  questionText: {
    type: String,
    required: true,
    trim: true
  },

  options: {
    A: { type: String, required: true, trim: true },
    B: { type: String, required: true, trim: true },
    C: { type: String, required: true, trim: true },
    D: { type: String, required: true, trim: true }
  },

  // Correct answer must be A, B, C, or D
  correctAnswer: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D'],
    set: value => String(value ?? '').trim().toUpperCase()
  },

  // Section system
  section: {
    type: String,
    default: 'General'
  },

  subSection: {
    type: String,
    default: ''
  },

  // Legacy fields
  subject: {
    type: String,
    default: 'General'
  },

  class: {
    type: String,
    default: 'N/A'
  },

  category: {
    type: String,
    default: 'General'
  },

  difficulty: {
    type: String,
    enum: [
      'Easy', 'Medium', 'Hard',
      'easy', 'medium', 'hard',
      'EASY', 'MEDIUM', 'HARD',
      'BASIC', 'INTERMEDIATE', 'ADVANCED'
    ],
    default: 'Easy'
  },

  isShuffle: {
    type: Boolean,
    default: false
  },

  tags: {
    type: String,
    default: ''
  },

  state: {
    type: String,
    default: 'READY'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
