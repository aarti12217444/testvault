const express = require('express');
const router = express.Router();
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Institute creates student
router.post('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const student = await User.create({
      name, email, password,
      role: 'student',
      instituteId: req.user.instituteId
    });
    res.status(201).json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all students of institute
router.get('/', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student', instituteId: req.user.instituteId });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;