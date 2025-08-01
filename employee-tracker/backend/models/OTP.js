const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for automatic document expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries
otpSchema.index({ phoneNumber: 1, createdAt: -1 });

// Method to check if OTP is valid
otpSchema.methods.isValid = function() {
  return !this.isUsed && this.expiresAt > new Date() && this.attempts < 3;
};

// Method to mark OTP as used
otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  return this.save();
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model('OTP', otpSchema);