const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const ProctoringLog = require('../models/ProctoringLog');
const { protect } = require('../middleware/authMiddleware');

// ========== CLOUDINARY CONFIG ==========
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── POST /api/proctor/snapshot
router.post('/snapshot', protect, async (req, res) => {
  try {
    const { examId, photo, status, timestamp } = req.body;

    if (!examId || !photo) {
      return res.status(400).json({ message: 'examId and photo required' });
    }

    // Cloudinary pe upload karo
    const uploaded = await cloudinary.uploader.upload(photo, {
      folder: `proctor/${examId}`,
      resource_type: 'image',
      quality: 'auto:low',
    });

    // DB mein sirf URL save hoga
    await ProctoringLog.create({
      examId,
      student: req.user._id,
      photo: uploaded.secure_url,
      status: status || 'clear',
      timestamp: timestamp || new Date(),
    });

    res.status(201).json({ success: true, url: uploaded.secure_url });
  } catch (err) {
    console.error('Proctor snapshot error:', err);
    res.status(500).json({ message: 'Failed to save snapshot' });
  }
});

// ── GET /api/proctor/:examId/:studentId
router.get('/:examId/:studentId', protect, async (req, res) => {
  try {
    const { examId, studentId } = req.params;

    const logs = await ProctoringLog.find({ examId, student: studentId })
      .sort({ timestamp: 1 });

    const summary = {
      total: logs.length,
      clear: logs.filter(l => l.status === 'clear').length,
      no_face: logs.filter(l => l.status === 'no_face').length,
      multiple_face: logs.filter(l => l.status === 'multiple_face').length,
      face_too_small: logs.filter(l => l.status === 'face_too_small').length,
      suspicious: logs.filter(l => l.status !== 'clear').length,
    };

    res.json({ logs, summary });
  } catch (err) {
    console.error('Proctor fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

module.exports = router;