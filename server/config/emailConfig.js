const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
};

const sendWelcomeEmail = async (email, name) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: `"Exam Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Registration Successful — Exam Platform',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:#1e3a5f;padding:24px;text-align:center">
          <h1 style="color:white;margin:0">📚 Exam Platform</h1>
        </div>
        <div style="padding:24px">
          <h2 style="color:#1e3a5f">Welcome, ${name}!</h2>
          <p style="color:#6b7280">You have successfully registered on Exam Platform.</p>
          <p style="color:#6b7280">You can now login and start your exams.</p>
          <a href="http://localhost:3000/login"
            style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
            Login Now →
          </a>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0">© 2024 Exam Platform</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendOTPEmail = async (email, otp) => {
  const transporter = createTransporter();
  const mailOptions = {
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
          <p style="color:#6b7280">Valid for 10 minutes only.</p>
          <div style="background:#eff6ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;margin:20px 0">
            <h1 style="color:#2563eb;letter-spacing:8px;margin:0">${otp}</h1>
          </div>
          <p style="color:#ef4444;font-size:12px">Do not share this OTP with anyone.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendWelcomeEmail, sendOTPEmail };