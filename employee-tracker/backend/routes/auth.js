const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateAndSendOTP, verifyOTP, checkOTPRateLimit } = require('../services/otpService');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for OTP requests
const otpRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 OTP requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for login attempts
const loginAttemptLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone number
// @access  Public
router.post('/send-otp', 
  otpRequestLimit,
  [
    body('phoneNumber')
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number with country code (e.g., +1234567890)')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { phoneNumber } = req.body;

      // Check rate limit for this phone number
      const canSendOTP = await checkOTPRateLimit(phoneNumber);
      if (!canSendOTP) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP requests for this phone number. Please wait 15 minutes.'
        });
      }

      // Check if user exists
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Phone number not registered. Please contact your administrator.'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact your administrator.'
        });
      }

      // Generate and send OTP
      const otpResult = await generateAndSendOTP(phoneNumber);

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: otpResult.message
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        expiresAt: otpResult.expiresAt
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while sending OTP'
      });
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and login user
// @access  Public
router.post('/verify-otp',
  loginAttemptLimit,
  [
    body('phoneNumber')
      .matches(/^\+[1-9]\d{1,14}$/)
      .withMessage('Please enter a valid phone number with country code'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be a 6-digit number')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { phoneNumber, otp } = req.body;

      // Verify OTP
      const otpResult = await verifyOTP(phoneNumber, otp);

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          message: otpResult.message
        });
      }

      // Get user details
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  }
);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        phoneNumber: req.user.phoneNumber,
        name: req.user.name,
        employeeId: req.user.employeeId,
        department: req.user.department,
        role: req.user.role,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile',
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must not exceed 100 characters')
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
      }

      const { name, department } = req.body;
      const user = req.user;

      // Update allowed fields
      if (name) user.name = name;
      if (department !== undefined) user.department = department;

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          employeeId: user.employeeId,
          department: user.department,
          role: user.role,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating profile'
      });
    }
  }
);

module.exports = router;