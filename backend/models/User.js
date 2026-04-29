const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String }, 
  otpExpires: { type: Date }, 
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);