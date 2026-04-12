const User = require('../models/User');
const jwt = require('jsonwebtoken');
// const { sendWelcomeEmail, sendOTPEmail } = require('../config/emailConfig');
// Purani line — ye comment out karo
// const { sendWelcomeEmail, sendOTPEmail } = require('../config/emailConfig');

// Naya — dummy functions
const sendWelcomeEmail = async (email, name) => console.log(`Welcome email to ${email}`);
const sendOTPEmail = async (email, otp) => console.log(`OTP ${otp} to ${email}`);

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Password strength check
const isStrongPassword = (password) => {
  // Naya — sab special chars allow
const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])[^\s]{8,}$/;
  return regex.test(password);
};

// @POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, instituteId } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Password strength check
    const isStrongPassword = (pwd) => {
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])[^\s]{8,}$/;
      return regex.test(pwd);
    };

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: 'Password must be 8+ characters with uppercase, lowercase, number and special character'
      });
    }

    // Check existing user
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role: role || 'student', 
      instituteId: instituteId || null 
    });

    // Email send karo — error aaye toh bhi registration rokna nahi
    sendWelcomeEmail(email, name).catch(err => {
      console.log('Welcome email failed (non-blocking):', err.message);
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id, name: user.name, email: user.email,
        role: user.role, instituteId: user.instituteId,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpire = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email, resetOTP: otp, resetOTPExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'Password must be 8+ chars with uppercase, lowercase, number and special char' });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @GET /api/auth/me
const getMe = async (req, res) => res.json(req.user);

module.exports = { register, login, getMe, forgotPassword, resetPassword };