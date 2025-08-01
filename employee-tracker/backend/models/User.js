const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid phone number with country code']
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['employee', 'admin', 'manager'],
    default: 'employee'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user is active
userSchema.methods.isActiveUser = function() {
  return this.isActive;
};

module.exports = mongoose.model('User', userSchema);