const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
connectDB();

// Models
const User = require('./models/User');
const Institute = require('./models/Institute');
const Question = require('./models/Question');
const Exam = require('./models/Exam');
const Result = require('./models/Result');
const Notification = require('./models/Notification');
const CodingQuestion = require('./models/CodingQuestion');

// Routes
const xlsx = require('xlsx');
const proctorRoutes = require('./routes/proctorRoutes');
const codingRoutes = require('./routes/codingRoutes');

// ✅ App pehle define karo
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ Phir routes lagao

const { protect, authorizeRoles: allowRoles } = require('./middleware/authMiddleware');
app.use('/api/proctor', proctorRoutes);
app.use('/api/coding', codingRoutes);


// ========== HELPERS ==========
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// const protect = async (req, res, next) => {
//   try {
//     let token;
//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//       token = req.headers.authorization.split(' ')[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = await User.findById(decoded.id).select('-password');
//       return next();
//     }
//     return res.status(401).json({ message: 'No token' });
//   } catch (e) {
//     return res.status(401).json({ message: 'Token failed' });
//   }
// };

// const allowRoles = (...roles) => (req, res, next) => {
//   if (!req.user || !roles.includes(req.user.role)) {
//     return res.status(403).json({ message: 'Access denied' });
//   }
//   return next();
// };

// ========== AUTH ROUTES ==========
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, instituteId } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ name, email, password, role: role || 'student', instituteId: instituteId || null });
    return res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      return res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, instituteId: user.instituteId, token: generateToken(user._id) });
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', protect, async (req, res) => res.json(req.user));

app.post('/api/auth/register-with-code', async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;
    if (!name || !email || !password || !inviteCode) {
      return res.status(400).json({ message: 'All fields including invite code are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    const isStrongPassword = (pwd) => {
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])[^\s]{8,}$/;
      return regex.test(pwd);
    };
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be 8+ chars with A-Z, a-z, 0-9, special char' });
    }
    const institute = await Institute.findOne({
      inviteCode: inviteCode.toUpperCase(),
      inviteCodeExpire: { $gt: Date.now() }
    });
    if (!institute) {
      return res.status(400).json({ message: 'Invalid or expired invite code!' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered!' });
    }
    const user = await User.create({ name, email, password, role: 'student', instituteId: institute._id });

    try {
      const transporter = require('nodemailer').createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      transporter.sendMail({
        from: `"Exam Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Welcome to ${institute.name} — Exam Platform`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:#1e3a5f;padding:24px;text-align:center">
              <h1 style="color:white;margin:0">📚 Exam Platform</h1>
            </div>
            <div style="padding:24px">
              <h2 style="color:#1e3a5f">Welcome, ${name}! 🎉</h2>
              <p style="color:#6b7280">You have successfully joined <strong>${institute.name}</strong></p>
              <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0;border-radius:4px">
                <p style="margin:0;color:#15803d">✅ Institute: ${institute.name}</p>
                <p style="margin:4px 0 0;color:#15803d">✅ Email: ${email}</p>
              </div>
              <a href="http://localhost:3000/login" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Login Now →</a>
            </div>
          </div>
        `
      }).catch(err => console.log('Email failed:', err.message));
    } catch(emailErr) {
      console.log('Welcome email failed:', emailErr.message);
    }

    return res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, instituteName: institute.name,
      token: generateToken(user._id)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== INSTITUTE ROUTES ==========
app.post('/api/institutes', protect, allowRoles('superadmin'), async (req, res) => {
  try {
    const { name, type, email, phone, address } = req.body;
    const institute = await Institute.create({ name, type, email, phone, address });
    const adminUser = await User.create({ name: `${name} Admin`, email, password: 'Admin@123A', role: 'institute', instituteId: institute._id });
    institute.adminId = adminUser._id;
    await institute.save();
    return res.status(201).json({ institute, adminUser });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/institutes', protect, allowRoles('superadmin'), async (req, res) => {
  try {
    const institutes = await Institute.find().populate('adminId', 'name email');
    return res.json(institutes);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/institutes/:id', protect, async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) return res.status(404).json({ message: 'Not found' });
    return res.json(institute);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/institutes/generate-invite', protect, allowRoles('institute'), async (req, res) => {
  try {
    const institute = await Institute.findById(req.user.instituteId);
    if (!institute) return res.status(404).json({ message: 'Institute not found' });

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    institute.inviteCode = inviteCode;
    institute.inviteCodeExpire = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await institute.save();

    try {
      const transporter = require('nodemailer').createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: `"Exam Platform" <${process.env.EMAIL_USER}>`,
        to: institute.email,
        subject: `Invite Code for ${institute.name} — Exam Platform`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:#1e3a5f;padding:24px;text-align:center">
              <h1 style="color:white;margin:0">📚 Exam Platform</h1>
            </div>
            <div style="padding:24px;text-align:center">
              <h2 style="color:#1e3a5f">Your Institute Invite Code</h2>
              <p style="color:#6b7280">Share this code with your students to join <strong>${institute.name}</strong></p>
              <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;margin:20px 0">
                <h1 style="color:#2563eb;letter-spacing:8px;margin:0;font-size:36px">${inviteCode}</h1>
              </div>
              <p style="color:#ef4444;font-size:12px">⚠️ Valid for 7 days only.</p>
            </div>
          </div>
        `
      });
      console.log('Invite email sent to:', institute.email);
    } catch(emailErr) {
      console.log('Email failed:', emailErr.message);
    }

    return res.json({ message: 'Invite code generated!', inviteCode });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== STUDENT ROUTES ==========
app.post('/api/students', protect, allowRoles('institute'), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const student = await User.create({ name, email, password, role: 'student', instituteId: req.user.instituteId });
    return res.status(201).json(student);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/students', protect, allowRoles('institute'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student', instituteId: req.user.instituteId });
    return res.json(students);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== QUESTION ROUTES ==========
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.post('/api/questions/bulk-upload', protect, allowRoles('institute'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File nahi mili! field name "file" use karo' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    console.log('Total rows found:', data.length);
    console.log('First row keys:', Object.keys(data[0] || {}));
    console.log('First row data:', JSON.stringify(data[0]));

    const questions = data.map(row => {
      const tagRaw = (row['Tag'] || row['tag'] || '').toString().trim();
      const tagParts = tagRaw.split('/').map(t => t.trim());
      const section = row['Section'] || row['Subject'] || tagParts[1] || tagParts[0] || 'General';
      const subSection = row['SubSection'] || row['Class'] || tagParts[2] || tagParts[1] || '';

      const correctAnswerText = (row['Correct Answer-1'] || row['Correct_Answer'] || '').toString().trim();
      const optA = (row['Option 1'] || row['Option_A'] || '').toString().trim();
      const optB = (row['Option 2'] || row['Option_B'] || '').toString().trim();
      const optC = (row['Option 3'] || row['Option_C'] || '').toString().trim();
      const optD = (row['Option 4'] || row['Option_D'] || '').toString().trim();

      let correctAnswer = 'A';
      if (correctAnswerText === optA) correctAnswer = 'A';
      else if (correctAnswerText === optB) correctAnswer = 'B';
      else if (correctAnswerText === optC) correctAnswer = 'C';
      else if (correctAnswerText === optD) correctAnswer = 'D';

      const diffRaw = (row['Level'] || row['Difficulty'] || 'Easy').toString().trim();
      let difficulty = 'Easy';
      if (['medium', 'MEDIUM', 'Medium', 'INTERMEDIATE'].includes(diffRaw)) difficulty = 'Medium';
      else if (['hard', 'HARD', 'Hard', 'ADVANCED'].includes(diffRaw)) difficulty = 'Hard';

      const qText = (row['Question Statement'] || row['Question'] || '').toString().trim();

      return {
        questionText: qText,
        options: { A: optA, B: optB, C: optC, D: optD },
        correctAnswer,
        section,
        subSection,
        subject: section || 'General',
        class: subSection || (row['Class'] || '').toString().trim(),
        category: 'General',
        difficulty,
        isShuffle: row['isShuffle'] === true || row['isShuffle'] === 'true',
        tags: tagRaw,
        state: (row['State'] || 'READY').toString().trim(),
        instituteId: req.user.instituteId,
        createdBy: req.user._id
      };
    }).filter(q => {
      const valid = q.questionText && q.options.A && q.options.B && q.options.C && q.options.D;
      if (!valid) console.log('❌ Filtered out:', q.questionText);
      return valid;
    });

    console.log('Valid questions to insert:', questions.length);

    if (questions.length === 0) {
      return res.status(400).json({ message: 'Koi valid question nahi mila! Column names check karo.' });
    }

    await Question.insertMany(questions);
    return res.json({ message: `${questions.length} questions uploaded successfully!` });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/questions', protect, allowRoles('institute'), async (req, res) => {
  try {
    const q = await Question.create({ ...req.body, instituteId: req.user.instituteId, createdBy: req.user._id });
    return res.status(201).json(q);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/questions', protect, allowRoles('institute'), async (req, res) => {
  try {
    const { subject, class: cls, category } = req.query;
    const filter = { instituteId: req.user.instituteId };
    if (subject) filter.subject = subject;
    if (cls) filter.class = cls;
    if (category) filter.category = category;
    return res.json(await Question.find(filter));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== EXAM ROUTES ==========
app.post('/api/exams', protect, allowRoles('institute'), async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, instituteId: req.user.instituteId, createdBy: req.user._id });

    if (exam.assignedTo && exam.assignedTo.length > 0) {
      const notifications = exam.assignedTo.map(studentId => ({
        userId: studentId,
        title: '📝 New Exam Assigned!',
        message: `"${exam.title}" exam assigned to you. Subject: ${exam.subject}`,
        type: 'exam',
        link: '/student/dashboard',
      }));
      await Notification.insertMany(notifications);
    }

    return res.status(201).json(exam);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/exams', protect, allowRoles('institute'), async (req, res) => {
  try {
    return res.json(await Exam.find({ instituteId: req.user.instituteId }).populate('questions'));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/exams/my-exams', protect, allowRoles('student'), async (req, res) => {
  try {
    return res.json(await Exam.find({ assignedTo: req.user._id, isActive: true }).populate('questions'));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== RESULT DECLARE ROUTE ==========
app.post('/api/exams/:id/declare-result', protect, allowRoles('institute'), async (req, res) => {
  try {
    const { resultDeclareAt } = req.body;
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (resultDeclareAt) {
      exam.resultDeclareAt = new Date(resultDeclareAt);
      await exam.save();
      return res.json({ message: 'Result scheduled!', resultDeclareAt: exam.resultDeclareAt });
    }

    exam.resultDeclared = true;
    exam.resultDeclaredAt = new Date();
    await exam.save();

    const batchName = exam.class || exam.subject || 'Your Batch';
    if (exam.assignedTo && exam.assignedTo.length > 0) {
      const notifications = exam.assignedTo.map(studentId => ({
        userId: studentId,
        title: '📢 Result Declared!',
        message: `${batchName} — "${exam.title}" result is now available.`,
        type: 'result',
        link: '/student/results',
      }));
      await Notification.insertMany(notifications);
    }

    return res.json({ message: 'Result declared successfully!', exam });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== RESULT ROUTES ==========
app.post('/api/results/submit', protect, allowRoles('student'), async (req, res) => {
  try {
    const {
      examId, answers, timeTaken,
      submitReason, submitLabel, suspiciousLevel,
      suspiciousDetails, activityLog
    } = req.body;

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
      examId,
      studentId: req.user._id,
      instituteId: req.user.instituteId,
      answers: evaluated,
      score,
      totalMarks: exam.totalMarks,
      percentage,
      timeTaken,
      submitReason: submitReason || 'manual',
      submitLabel: submitLabel || 'Manually Submitted',
      suspiciousLevel: suspiciousLevel || 'none',
      suspiciousDetails: suspiciousDetails || '',
      activityLog: activityLog || [],
    });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/results/my-results', protect, allowRoles('student'), async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.user._id })
      .populate({
        path: 'examId',
        select: 'title subject class resultDeclared resultDeclaredAt resultDeclareAt'
      })
      .sort({ createdAt: -1 });

    const institute = req.user.instituteId
      ? await Institute.findById(req.user.instituteId)
      : null;

    const declaredResults = results.filter(r => r.examId?.resultDeclared === true);

    const enriched = declaredResults.map(r => ({
      ...r.toObject(),
      studentName: req.user.name,
      instituteName: institute?.name || 'Institute',
    }));

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/results', protect, allowRoles('institute'), async (req, res) => {
  try {
    return res.json(
      await Result.find({ instituteId: req.user.instituteId })
        .populate('studentId', 'name email')
        .populate('examId', 'title subject class resultDeclared resultDeclaredAt')
    );
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== PROFILE ROUTES ==========
app.get('/api/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const institute = user.instituteId ? await Institute.findById(user.instituteId) : null;
    return res.json({ user, institute });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/profile', protect, async (req, res) => {
  try {
    const { name, phone, address, rollNumber, profilePicture } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address, rollNumber, profilePicture },
      { new: true }
    ).select('-password');
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/profile/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect!' });
    user.password = newPassword;
    await user.save();
    return res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== LEADERBOARD ROUTE ==========
app.get('/api/leaderboard', protect, allowRoles('student'), async (req, res) => {
  try {
    const students = await User.find({
      role: 'student',
      instituteId: req.user.instituteId
    }).select('_id name profilePicture');

    const leaderboard = await Promise.all(students.map(async (student) => {
      const results = await Result.find({ studentId: student._id });
      const totalExams = results.length;
      const avgScore = totalExams > 0
        ? (results.reduce((a, r) => a + parseFloat(r.percentage), 0) / totalExams).toFixed(1)
        : 0;
      const bestScore = totalExams > 0
        ? Math.max(...results.map(r => parseFloat(r.percentage)))
        : 0;
      return {
        _id: student._id,
        name: student.name,
        profilePicture: student.profilePicture || '',
        totalExams,
        avgScore: parseFloat(avgScore),
        bestScore: parseFloat(bestScore),
      };
    }));

    leaderboard.sort((a, b) => b.avgScore - a.avgScore || b.bestScore - a.bestScore);
    const ranked = leaderboard.map((s, i) => ({ ...s, rank: i + 1 }));
    return res.json(ranked);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== NOTIFICATION ROUTES ==========
app.get('/api/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    return res.json({ message: 'Marked as read' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.put('/api/notifications/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    return res.json({ message: 'All marked as read' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== FORGOT PASSWORD ROUTES ==========
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found!' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      const transporter = require('nodemailer').createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: `"Exam Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset OTP — Exam Platform',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
            <div style="background:#1e3a5f;padding:24px;text-align:center">
              <h1 style="color:white;margin:0">📚 Exam Platform</h1>
            </div>
            <div style="padding:24px;text-align:center">
              <h2 style="color:#1e3a5f">Password Reset OTP</h2>
              <p style="color:#6b7280">Use this OTP to reset your password. Valid for 10 minutes.</p>
              <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;margin:20px 0">
                <h1 style="color:#2563eb;letter-spacing:8px;margin:0;font-size:36px">${otp}</h1>
              </div>
              <p style="color:#ef4444;font-size:12px">⚠️ Do not share this OTP with anyone.</p>
            </div>
          </div>
        `
      });
    } catch(emailErr) {
      console.log('OTP email failed:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send OTP email!' });
    }

    return res.json({ message: 'OTP sent to your email!' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({
      email,
      resetOTP: otp,
      resetOTPExpire: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP!' });

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;
    await user.save();

    return res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ========== AUTO DECLARE SCHEDULED RESULTS ==========
setInterval(async () => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      resultDeclared: false,
      resultDeclareAt: { $lte: now, $ne: null }
    });

    for (const exam of exams) {
      exam.resultDeclared = true;
      exam.resultDeclaredAt = now;
      await exam.save();

      const batchName = exam.class || exam.subject || 'Your Batch';
      if (exam.assignedTo && exam.assignedTo.length > 0) {
        const notifications = exam.assignedTo.map(studentId => ({
          userId: studentId,
          title: '📢 Result Declared!',
          message: `${batchName} — "${exam.title}" result is now available.`,
          type: 'result',
          link: '/student/results',
        }));
        await Notification.insertMany(notifications);
      }
      console.log(`✅ Auto-declared result for: ${exam.title}`);
    }
  } catch (err) {
    console.error('Auto declare error:', err.message);
  }
}, 60000);

// ========== START ==========
app.get('/', (req, res) => res.send('API Running ✅'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));