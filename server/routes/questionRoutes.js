
const express = require('express');
const router = express.Router();

const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const Question = require('../models/Question');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Maximum 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(xlsx|csv)$/i;

    if (allowedExtensions.test(file.originalname)) {
      return cb(null, true);
    }

    cb(new Error('Only .xlsx and .csv files are allowed.'));
  }
});

// ==========================================
// NORMALIZE CORRECT ANSWER
// Supports: A, a, " A ", Option B, B.
// ==========================================
const normalizeAnswer = (value) => {
  const raw = String(value ?? '').trim().toUpperCase();

  const match = raw.match(
    /^(?:OPTION\s*)?([A-D])(?:[.)\s:].*)?$/
  );

  return match ? match[1] : raw;
};

// ==========================================
// ADD SINGLE QUESTION
// ==========================================
router.post(
  '/',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {
    try {
      const { questionText, options, correctAnswer } = req.body;

      if (!questionText?.trim()) {
        return res.status(400).json({
          message: 'Question text is required.'
        });
      }

      if (
        !options ||
        !['A', 'B', 'C', 'D'].every(
          key => String(options[key] ?? '').trim()
        )
      ) {
        return res.status(400).json({
          message: 'All four options (A, B, C, D) are required.'
        });
      }

      const normalizedAnswer = normalizeAnswer(correctAnswer);

      if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
        return res.status(400).json({
          message: 'Correct answer must be A, B, C, or D.'
        });
      }

      const q = await Question.create({
        ...req.body,
        questionText: questionText.trim(),
        options: {
          A: String(options.A).trim(),
          B: String(options.B).trim(),
          C: String(options.C).trim(),
          D: String(options.D).trim()
        },
        correctAnswer: normalizedAnswer,
        instituteId: req.user.instituteId,
        createdBy: req.user._id
      });

      return res.status(201).json({
        message: 'Question added successfully.',
        question: q
      });
    } catch (err) {
      console.error('Add question error:', err);

      return res.status(500).json({
        message: err.message || 'Failed to add question.'
      });
    }
  }
);

// ==========================================
// BULK UPLOAD QUESTIONS FROM EXCEL / CSV
// ==========================================
router.post(
  '/bulk-upload',
  protect,
  authorizeRoles('institute'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select an Excel (.xlsx) or CSV (.csv) file.'
        });
      }

      const workbook = xlsx.read(req.file.buffer, {
        type: 'buffer'
      });

      const firstSheet = workbook.SheetNames[0];

      if (!firstSheet) {
        return res.status(400).json({
          message: 'The uploaded file contains no worksheet.'
        });
      }

      const sheet = workbook.Sheets[firstSheet];

      const data = xlsx.utils.sheet_to_json(sheet, {
        defval: ''
      });

      if (data.length === 0) {
        return res.status(400).json({
          message: 'The uploaded file contains no question rows.'
        });
      }

      // Normalize column headers to support minor variations
      const normalizeHeader = (header) =>
        String(header)
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_');

      const questions = data.map((row, index) => {
        const normalizedRow = {};

        for (const [key, value] of Object.entries(row)) {
          normalizedRow[normalizeHeader(key)] = value;
        }

        const get = (...keys) => {
          for (const key of keys) {
            if (normalizedRow[key] !== undefined) {
              return normalizedRow[key];
            }
          }
          return '';
        };

        const questionText = String(
          get('question', 'question_text')
        ).trim();

        const options = {
          A: String(get('option_a', 'optiona', 'a')).trim(),
          B: String(get('option_b', 'optionb', 'b')).trim(),
          C: String(get('option_c', 'optionc', 'c')).trim(),
          D: String(get('option_d', 'optiond', 'd')).trim()
        };

        return {
          rowNumber: index + 2,
          questionText,
          options,
          correctAnswer: normalizeAnswer(
            get('correct_answer', 'correctanswer', 'answer', 'correct_ans')
          ),
          subject: String(get('subject') || 'General').trim(),
          class: String(get('class', 'class_batch') || 'N/A').trim(),
          category: String(get('category') || 'Simple').trim(),
          difficulty: String(get('difficulty') || 'Easy').trim(),
          instituteId: req.user.instituteId,
          createdBy: req.user._id
        };
      });

      // Validate every row before inserting anything
      const invalidRows = questions
        .filter(q =>
          !q.questionText ||
          !q.options.A ||
          !q.options.B ||
          !q.options.C ||
          !q.options.D ||
          !['A', 'B', 'C', 'D'].includes(q.correctAnswer)
        )
        .map(q => ({
          row: q.rowNumber,
          question: q.questionText || '(missing question)',
          correctAnswer: q.correctAnswer || '(missing answer)',
          reason: !q.questionText
            ? 'Question is missing'
            : !q.options.A || !q.options.B ||
              !q.options.C || !q.options.D
              ? 'One or more options are missing'
              : 'Correct_Answer must be A, B, C, or D'
        }));

      if (invalidRows.length > 0) {
        return res.status(400).json({
          message: `${invalidRows.length} invalid row(s). No questions were uploaded.`,
          invalidRows
        });
      }

      // Remove helper field before inserting into MongoDB
      const documents = questions.map(({ rowNumber, ...question }) => question);

      const inserted = await Question.insertMany(documents, {
        ordered: true
      });

      return res.status(201).json({
        message: `${inserted.length} questions uploaded successfully.`,
        count: inserted.length
      });
    } catch (err) {
      console.error('Bulk upload error:', err);

      return res.status(500).json({
        message: err.message || 'Failed to upload questions.'
      });
    }
  }
);

// ==========================================
// GET QUESTIONS FOR LOGGED-IN INSTITUTE
// ==========================================
router.get(
  '/',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {
    try {
      const { subject, class: className, category } = req.query;

      const filter = {
        instituteId: req.user.instituteId
      };

      if (subject) filter.subject = subject;
      if (className) filter.class = className;
      if (category) filter.category = category;

      const questions = await Question.find(filter).sort({
        createdAt: -1
      });

      return res.json(questions);
    } catch (err) {
      console.error('Get questions error:', err);

      return res.status(500).json({
        message: err.message || 'Failed to fetch questions.'
      });
    }
  }
);

// ==========================================
// MULTER / FILE UPLOAD ERRORS
// ==========================================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum allowed size is 5 MB.'
      : err.message;

    return res.status(400).json({ message });
  }

  if (err) {
    return res.status(400).json({
      message: err.message || 'File upload failed.'
    });
  }

  next();
});


 // ==========================================
 // UPDATE / EDIT QUESTION
 // ==========================================
router.put(
  '/:id',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        questionText,
        options,
        correctAnswer,
        subject,
        class: className,
        category,
        difficulty
      } = req.body;

      const question = await Question.findOne({
        _id: id,
        instituteId: req.user.instituteId
      });

      if (!question) {
        return res.status(404).json({
          message: 'Question not found or you do not have permission to edit it.'
        });
      }

      if (!questionText?.trim()) {
        return res.status(400).json({
          message: 'Question text is required.'
        });
      }

      if (
        !options ||
        !['A', 'B', 'C', 'D'].every(
          key => String(options[key] ?? '').trim()
        )
      ) {
        return res.status(400).json({
          message: 'All four options (A, B, C, D) are required.'
        });
      }

      const normalizedAnswer = normalizeAnswer(correctAnswer);

      if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
        return res.status(400).json({
          message: 'Correct answer must be A, B, C, or D.'
        });
      }

      question.questionText = questionText.trim();
      question.options = {
        A: String(options.A).trim(),
        B: String(options.B).trim(),
        C: String(options.C).trim(),
        D: String(options.D).trim()
      };
      question.correctAnswer = normalizedAnswer;

      if (subject !== undefined) question.subject = subject;
      if (className !== undefined) question.class = className;
      if (category !== undefined) question.category = category;
      if (difficulty !== undefined) question.difficulty = difficulty;

      await question.save();

      return res.status(200).json({
        message: 'Question updated successfully.',
        question
      });
    } catch (err) {
      console.error('Update question error:', err);

      if (err.name === 'CastError') {
        return res.status(400).json({
          message: 'Invalid question ID.'
        });
      }

      return res.status(500).json({
        message: err.message || 'Failed to update question.'
      });
    }
  }
);


 // ==========================================
 // BULK DELETE QUESTIONS
 // ==========================================
router.delete(
  '/bulk-delete',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {
    try {
      const { questionIds } = req.body;

      if (
        !Array.isArray(questionIds) ||
        questionIds.length === 0
      ) {
        return res.status(400).json({
          message: 'Please select at least one question.'
        });
      }

      const validIds = questionIds.filter(
  id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id)
);

if (validIds.length !== questionIds.length) {
  return res.status(400).json({
    message: 'One or more question IDs are invalid.',
    receivedIds: questionIds
  });
}

      const result = await Question.deleteMany({
        _id: { $in: validIds },
        instituteId: req.user.instituteId
      });

      return res.status(200).json({
        message: `${result.deletedCount} question(s) deleted successfully.`,
        deletedCount: result.deletedCount
      });
    } catch (err) {
      console.error('Bulk delete questions error:', err);

      return res.status(500).json({
        message: 'Failed to delete selected questions.'
      });
    }
  }
);

// ==========================================
// DELETE A QUESTION
// ==========================================
router.delete(
  '/:id',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Delete only a question belonging to this institute
      const question = await Question.findOneAndDelete({
        _id: id,
        instituteId: req.user.instituteId
      });

      if (!question) {
        return res.status(404).json({
          message: 'Question not found or you do not have permission to delete it.'
        });
      }

      return res.status(200).json({
        message: 'Question deleted successfully.',
        questionId: question._id
      });
    } catch (err) {
      console.error('Delete question error:', err);

      if (err.name === 'CastError') {
        return res.status(400).json({
          message: 'Invalid question ID.'
        });
      }

      return res.status(500).json({
        message: 'Failed to delete question.'
      });
    }
  }
);




module.exports = router;
