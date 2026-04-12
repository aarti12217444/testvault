const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const Result = require('../models/Result');
const Exam = require('../models/Exam');

// Submit exam
router.post('/submit', protect, authorizeRoles('student'), async (req, res) => {
  try {
    const { examId, answers, timeTaken } = req.body;
    const exam = await Exam.findById(examId).populate('questions');

    let score = 0;
    const evaluated = answers.map(ans => {
      const question = exam.questions.find(q => q._id.toString() === ans.questionId);
      const isCorrect = question && question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) score++;
      return { ...ans, isCorrect };
    });

    const percentage = ((score / exam.questions.length) * 100).toFixed(2);

    const result = await Result.create({
      examId, studentId: req.user._id,
      instituteId: req.user.instituteId,
      answers: evaluated, score,
      totalMarks: exam.totalMarks,
      percentage, timeTaken
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get results (student)
router.get('/my-results', protect, authorizeRoles('student'), async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user._id }).populate('examId', 'title subject');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all results (institute)
router.get('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const results = await Result.find({ instituteId: req.user.instituteId })
      .populate('studentId', 'name email')
      .populate('examId', 'title subject');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;