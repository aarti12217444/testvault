const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  questionText: { type: String, required: true },

  options: {
    A: { type: String, required: true },
    B: { type: String, required: true },
    C: { type: String, required: true },
    D: { type: String, required: true },
  },
  correctAnswer: { type: String, required: true },

  // ===== SECTION SYSTEM =====
  // Main section: Cloud Computing, Cyber Security, Full Stack, Programming, Logical Reasoning, DSA, etc.
  section: { type: String, default: 'General' },

  // Sub section: HTML, CSS, JS, React, Python, Java, Arrays, Trees, etc.
  subSection: { type: String, default: '' },

  // Old field — rakhte hain compatibility ke liye
  subject: { type: String, default: 'General' },
class: { type: String, default: 'N/A' },
category: { type: String, default: 'General' },

  // Difficulty
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard', 'EASY', 'MEDIUM', 'HARD', 'BASIC', 'INTERMEDIATE', 'ADVANCED'],
    default: 'Easy' 
  },

  // Shuffle this question's options
  isShuffle: { type: Boolean, default: false },

  // Tags (from Excel Tag column)
  tags: { type: String, default: '' },

  // State (READY, DRAFT, etc.)
  state: { type: String, default: 'READY' },

}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);