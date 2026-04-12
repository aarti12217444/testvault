const express = require('express');
const router = express.Router();
const axios = require('axios');
const CodingQuestion = require('../models/CodingQuestion');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ── Language ID mapping for Piston API
const LANGUAGE_MAP = {
  python:     { language: 'python',  version: '3.10.0' },
  javascript: { language: 'node',    version: '18.15.0' },
  java:       { language: 'java',    version: '15.0.2' },
  cpp:        { language: 'c++',     version: '10.2.0' },
  c:          { language: 'c',       version: '10.2.0' },
  csharp:     { language: 'csharp',  version: '6.12.0' },
};

// ── POST /api/coding/questions — Create question (institute)
router.post('/questions', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const question = await CodingQuestion.create({
      ...req.body,
      instituteId: req.user.instituteId,
      createdBy: req.user._id,
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/coding/questions — Get all questions (institute)
router.get('/questions', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const questions = await CodingQuestion.find({ instituteId: req.user.instituteId })
      .select('-testCases.isHidden')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/coding/questions/:id — Get single question (student — hidden test cases nahi milenge)
router.get('/questions/:id', protect, async (req, res) => {
  try {
    const question = await CodingQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Student ko hidden test cases nahi dikhenge
    const questionObj = question.toObject();
    if (req.user.role === 'student') {
      questionObj.testCases = questionObj.testCases.filter(tc => !tc.isHidden);
    }
    res.json(questionObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/coding/questions/:id — Update question (institute)
router.put('/questions/:id', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    const question = await CodingQuestion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/coding/questions/:id
router.delete('/questions/:id', protect, authorizeRoles('institute'), async (req, res) => {
  try {
    await CodingQuestion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/coding/run — Run code against visible test cases only
router.post('/run', protect, async (req, res) => {
  try {
    const { code, language, questionId } = req.body;

    const langConfig = LANGUAGE_MAP[language];
    if (!langConfig) return res.status(400).json({ message: 'Language not supported' });

    const question = await CodingQuestion.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Sirf visible test cases pe run karo
    const visibleCases = question.testCases.filter(tc => !tc.isHidden);

    const results = await Promise.all(visibleCases.map(async (tc, index) => {
      try {
        const response = await axios.post(
          `${process.env.PISTON_URL}/execute`,
          {
            language: langConfig.language,
            version: langConfig.version,
            files: [{ name: 'main', content: code }],
            stdin: tc.input || '',
            run_timeout: (question.timeLimit || 5) * 1000,
          },
          { timeout: 15000 }
        );

        const actualOutput = (response.data.run?.stdout || '').trim();
        const expectedOutput = tc.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;

        return {
          testCase: index + 1,
          input: tc.input,
          expectedOutput,
          actualOutput,
          passed,
          stderr: response.data.run?.stderr || '',
          time: response.data.run?.cpu_time || 0,
        };
      } catch (err) {
        return {
          testCase: index + 1,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          passed: false,
          stderr: err.message,
          time: 0,
        };
      }
    }));

    res.json({ results, type: 'run' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/coding/submit — Submit code against ALL test cases
router.post('/submit', protect, authorizeRoles('student'), async (req, res) => {
  try {
    const { code, language, questionId, examId } = req.body;

    const langConfig = LANGUAGE_MAP[language];
    if (!langConfig) return res.status(400).json({ message: 'Language not supported' });

    const question = await CodingQuestion.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Saare test cases pe run karo (visible + hidden)
    const results = await Promise.all(question.testCases.map(async (tc, index) => {
      try {
        const response = await axios.post(
          `${process.env.PISTON_URL}/execute`,
          {
            language: langConfig.language,
            version: langConfig.version,
            files: [{ name: 'main', content: code }],
            stdin: tc.input || '',
            run_timeout: (question.timeLimit || 5) * 1000,
          },
          { timeout: 15000 }
        );

        const actualOutput = (response.data.run?.stdout || '').trim();
        const expectedOutput = tc.expectedOutput.trim();
        const passed = actualOutput === expectedOutput;

        return {
          testCase: index + 1,
          isHidden: tc.isHidden,
          passed,
          // Hidden test cases ka input/output student ko nahi dikhega
          input: tc.isHidden ? '***hidden***' : tc.input,
          expectedOutput: tc.isHidden ? '***hidden***' : expectedOutput,
          actualOutput: tc.isHidden ? (passed ? 'Passed' : 'Failed') : actualOutput,
          stderr: response.data.run?.stderr || '',
          time: response.data.run?.cpu_time || 0,
        };
      } catch (err) {
        return {
          testCase: index + 1,
          isHidden: tc.isHidden,
          passed: false,
          input: tc.isHidden ? '***hidden***' : tc.input,
          expectedOutput: tc.isHidden ? '***hidden***' : tc.expectedOutput,
          actualOutput: '',
          stderr: err.message,
          time: 0,
        };
      }
    }));

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const score = Math.round((passedTests / totalTests) * question.marks);

    res.json({
      results,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        score,
        maxMarks: question.marks,
        percentage: Math.round((passedTests / totalTests) * 100),
      },
      type: 'submit',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
// module.exports = { protect, authorizeRoles };