const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  explanation: { type: String, default: '' },
});

const codingQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  inputFormat: { type: String, default: '' },
  outputFormat: { type: String, default: '' },
  constraints: { type: String, default: '' },
  allowedLanguages: {
    type: [String],
    default: ['python', 'javascript', 'java', 'cpp', 'c', 'csharp'],
  },
  testCases: [testCaseSchema],
  timeLimit: { type: Number, default: 5 }, // seconds
  memoryLimit: { type: Number, default: 256 }, // MB
  marks: { type: Number, default: 10 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  sampleCode: {
    python: { type: String, default: '' },
    javascript: { type: String, default: '' },
    java: { type: String, default: '' },
    cpp: { type: String, default: '' },
    c: { type: String, default: '' },
    csharp: { type: String, default: '' },
  },
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
}, { timestamps: true });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);