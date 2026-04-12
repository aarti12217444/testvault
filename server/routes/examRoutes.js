const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const Exam = require('../models/Exam');

// Create exam
router.post('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, instituteId: req.user.instituteId, createdBy: req.user._id });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get exams for institute
router.get('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const exams = await Exam.find({ instituteId: req.user.instituteId }).populate('questions');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get assigned exams for student
router.get('/my-exams', protect, authorizeRoles('student'), async (req, res) => {
  try {
    const exams = await Exam.find({ assignedTo: req.user._id, isActive: true });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;