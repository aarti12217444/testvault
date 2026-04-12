const mongoose = require('mongoose');

const instituteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['school', 'college', 'university', 'company'],
    required: true
  },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  logo: { type: String, default: '' },
  inviteCode: { type: String, default: null },        // ← andar hona chahiye
  inviteCodeExpire: { type: Date, default: null },    // ← andar hona chahiye
}, { timestamps: true });

module.exports = mongoose.model('Institute', instituteSchema);