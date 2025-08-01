const twilio = require('twilio');
const OTP = require('../models/OTP');

// Initialize Twilio client
let twilioClient = null;

// Initialize Twilio (only if credentials are provided)
const initializeTwilio = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (accountSid && authToken && accountSid !== 'your-twilio-account-sid') {
    try {
      twilioClient = twilio(accountSid, authToken);
      console.log('Twilio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twilio:', error.message);
    }
  } else {
    console.warn('Twilio credentials not configured. OTP will be logged to console.');
  }
};

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
const sendOTPSMS = async (phoneNumber, otp) => {
  if (!twilioClient) {
    console.log(`[DEV MODE] OTP for ${phoneNumber}: ${otp}`);
    return { success: true, sid: 'dev-mode' };
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Your Employee Tracker verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return { success: false, error: error.message };
  }
};

// Generate and send OTP
const generateAndSendOTP = async (phoneNumber) => {
  try {
    // Invalidate any existing OTPs for this phone number
    await OTP.updateMany(
      { phoneNumber, isUsed: false },
      { isUsed: true }
    );

    // Generate new OTP
    const otpCode = generateOTP();

    // Save OTP to database
    const otpDoc = new OTP({
      phoneNumber,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await otpDoc.save();

    // Send OTP via SMS
    const smsResult = await sendOTPSMS(phoneNumber, otpCode);

    if (!smsResult.success) {
      throw new Error(`Failed to send SMS: ${smsResult.error}`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: otpDoc.expiresAt
    };

  } catch (error) {
    console.error('Generate and send OTP error:', error);
    return {
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    };
  }
};

// Verify OTP
const verifyOTP = async (phoneNumber, otpCode) => {
  try {
    // Find the most recent valid OTP for this phone number
    const otpDoc = await OTP.findOne({
      phoneNumber,
      otp: otpCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      // Try to find any OTP for this phone number to check attempts
      const anyOtp = await OTP.findOne({
        phoneNumber,
        otp: otpCode
      }).sort({ createdAt: -1 });

      if (anyOtp) {
        // Increment attempts if OTP exists but is invalid
        await anyOtp.incrementAttempts();
        
        if (anyOtp.attempts >= 3) {
          return {
            success: false,
            message: 'Too many failed attempts. Please request a new OTP.'
          };
        }
      }

      return {
        success: false,
        message: 'Invalid or expired OTP'
      };
    }

    // Mark OTP as used
    await otpDoc.markAsUsed();

    return {
      success: true,
      message: 'OTP verified successfully'
    };

  } catch (error) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    };
  }
};

// Check if phone number has too many recent OTP requests
const checkOTPRateLimit = async (phoneNumber) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  const recentOTPs = await OTP.countDocuments({
    phoneNumber,
    createdAt: { $gte: fifteenMinutesAgo }
  });

  return recentOTPs < 3; // Allow max 3 OTPs per 15 minutes
};

// Initialize Twilio on module load
initializeTwilio();

module.exports = {
  generateAndSendOTP,
  verifyOTP,
  checkOTPRateLimit,
  initializeTwilio
};