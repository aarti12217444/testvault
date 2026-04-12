const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const Question = require('../models/Question');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Add single question
router.post('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const q = await Question.create({ ...req.body, instituteId: req.user.instituteId, createdBy: req.user._id });
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk upload via Excel
router.post('/bulk-upload', protect, authorizeRoles('institute'), upload.single('file'), async (req, res) => {
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const questions = data.map(row => ({
      questionText: row['Question'],
      options: { A: row['Option_A'], B: row['Option_B'], C: row['Option_C'], D: row['Option_D'] },
      correctAnswer: row['Correct_Answer'],
      subject: row['Subject'],
      class: row['Class'],
      category: row['Category'] || 'Simple',
      difficulty: row['Difficulty'] || 'Easy',
      instituteId: req.user.instituteId,
      createdBy: req.user._id
    }));

    await Question.insertMany(questions);
    res.json({ message: `${questions.length} questions uploaded successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get questions
router.get('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const { subject, class: cls, category } = req.query;
    const filter = { instituteId: req.user.instituteId };
    if (subject) filter.subject = subject;
    if (cls) filter.class = cls;
    if (category) filter.category = category;
    const questions = await Question.find(filter);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;