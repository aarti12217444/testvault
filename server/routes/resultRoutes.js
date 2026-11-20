const express = require('express');
const router = express.Router();

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const Result = require('../models/Result');
const Exam = require('../models/Exam');


// ======================================================
// AUTO-SAVE ANSWERS
// ======================================================

router.put(
  '/auto-save',
  protect,
  authorizeRoles('student'),
  async (req, res) => {

    try {

      const { examId, answers } = req.body;

      // -------------------------------
      // Validate examId
      // -------------------------------

      if (!examId) {
        return res.status(400).json({
          message: 'Exam ID is required'
        });
      }


      // -------------------------------
      // Check exam
      // -------------------------------

      const exam = await Exam.findById(examId);

      if (!exam) {
        return res.status(404).json({
          message: 'Exam not found'
        });
      }


      // -------------------------------
      // Clean answers
      // -------------------------------

      const cleanAnswers = (answers || []).map(ans => ({
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer || null
      }));


      // -------------------------------
      // Find existing draft
      // -------------------------------

      let result = await Result.findOne({
        examId: examId,
        studentId: req.user._id,
        status: 'draft'
      });


      // ==================================================
      // EXISTING DRAFT → UPDATE
      // ==================================================

      if (result) {

        result.answers = cleanAnswers;

        await result.save();

      }

      // ==================================================
      // NO DRAFT → CREATE NEW DRAFT
      // ==================================================

      else {

        result = await Result.create({

          examId: examId,

          studentId: req.user._id,

          instituteId: req.user.instituteId,

          answers: cleanAnswers,

          score: 0,

          totalMarks: exam.totalMarks,

          percentage: 0,

          timeTaken: 0,

          status: 'draft'

        });

      }


      // -------------------------------
      // Response
      // -------------------------------

      res.json({

        success: true,

        message: 'Answers auto-saved successfully',

        resultId: result._id,

        savedAt: result.updatedAt

      });

    } catch (err) {

      console.error('Auto-save error:', err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);

// ======================================================
// GET DRAFT ANSWERS
// ======================================================

router.get(
  '/draft/:examId',
  protect,
  authorizeRoles('student'),
  async (req, res) => {

    try {

      const result = await Result.findOne({
        examId: req.params.examId,
        studentId: req.user._id,
        status: 'draft'
      });

      if (!result) {
        return res.json({
          exists: false,
          answers: {}
        });
      }

      const answers = {};

      result.answers.forEach(ans => {
        if (ans.questionId && ans.selectedAnswer) {
          answers[ans.questionId.toString()] = ans.selectedAnswer;
        }
      });

      res.json({
        exists: true,
        answers
      });

    } catch (err) {

      console.error('Draft fetch error:', err);

      res.status(500).json({
        message: err.message
      });

    }
  }
);


// ======================================================
// SUBMIT EXAM
// ======================================================

router.post(
  '/submit',
  protect,
  authorizeRoles('student'),
  async (req, res) => {

    try {

      const {
        examId,
        answers,
        timeTaken,
        submitReason,
        submitLabel,
        suspiciousLevel,
        suspiciousDetails,
        activityLog
      } = req.body;


      // -------------------------------
      // Get exam
      // -------------------------------

      const exam = await Exam
        .findById(examId)
        .populate('questions');


      if (!exam) {

        return res.status(404).json({
          message: 'Exam not found'
        });

      }


      // -------------------------------
      // Evaluate answers
      // -------------------------------

      
        let score = 0;

        const evaluated = (answers || []).map(ans => {
          const question = exam.questions.find(
            q => String(q._id) === String(ans.questionId)
          );

          const correctAnswer = String(
            question?.correctAnswer ?? ''
          ).trim().toUpperCase();

          const selectedAnswer = String(
            ans.selectedAnswer ?? ''
          ).trim().toUpperCase();

          const isCorrect =
            !!question &&
            correctAnswer === selectedAnswer;

          // Temporary debugging: check actual values
          console.log({
            question: question?.questionText,
            correctAnswer,
            selectedAnswer,
            isCorrect
          });

          if (isCorrect) score++;

          return {
            questionId: ans.questionId,
            selectedAnswer: ans.selectedAnswer || null,
            isCorrect
          };
        });



      // -------------------------------
      // Calculate percentage
      // -------------------------------

      const percentage =
        exam.questions.length > 0
          ? ((score / exam.questions.length) * 100).toFixed(2)
          : 0;


      // ==================================================
      // FIND EXISTING AUTO-SAVED DRAFT
      // ==================================================

      let result = await Result.findOne({

        examId: examId,

        studentId: req.user._id,

        status: 'draft'

      });


      // ==================================================
      // DRAFT EXISTS → CONVERT TO FINAL RESULT
      // ==================================================

      if (result) {

        result.answers = evaluated;

        result.score = score;

        result.totalMarks = exam.totalMarks;

        result.percentage = percentage;

        result.timeTaken = timeTaken || 0;

        result.submitReason =
          submitReason || 'manual';

        result.submitLabel =
          submitLabel || 'Manually Submitted';

        result.suspiciousLevel =
          suspiciousLevel || 'none';

        result.suspiciousDetails =
          suspiciousDetails || '';

        result.activityLog =
          activityLog || [];

        result.status = 'submitted';

        result.submittedAt = new Date();


        await result.save();

      }

      // ==================================================
      // NO DRAFT → CREATE FINAL RESULT
      // ==================================================

      else {

        result = await Result.create({

          examId: examId,

          studentId: req.user._id,

          instituteId: req.user.instituteId,

          answers: evaluated,

          score: score,

          totalMarks: exam.totalMarks,

          percentage: percentage,

          timeTaken: timeTaken || 0,

          submitReason:
            submitReason || 'manual',

          submitLabel:
            submitLabel || 'Manually Submitted',

          suspiciousLevel:
            suspiciousLevel || 'none',

          suspiciousDetails:
            suspiciousDetails || '',

          activityLog:
            activityLog || [],

          status: 'submitted',

          submittedAt: new Date()

        });

      }


      // -------------------------------
      // Response
      // -------------------------------

      res.status(201).json(result);

    } catch (err) {

      console.error('Submit exam error:', err);

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// ======================================================
// GET MY RESULTS - STUDENT
// ======================================================

router.get(
  '/my-results',
  protect,
  authorizeRoles('student'),
  async (req, res) => {

    try {

      const results = await Result
        .find({
          studentId: req.user._id,
          status: 'submitted'
        })
        .populate(
          'examId',
          'title subject'
        );

      res.json(results);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// ======================================================
// GET ALL RESULTS - INSTITUTE
// ======================================================

router.get(
  '/',
  protect,
  authorizeRoles('institute'),
  async (req, res) => {

    try {

      const results = await Result
        .find({
          instituteId: req.user.instituteId,
          status: 'submitted'
        })
        .populate(
          'studentId',
          'name email'
        )
        .populate(
          'examId',
          'title subject'
        );

      res.json(results);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }

  }
);


module.exports = router;