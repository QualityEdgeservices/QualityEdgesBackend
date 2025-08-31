
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const {  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordResetConfirmation } = require('../utils/sendEmail');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Test = require('../models/Test');


// Generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, mobile, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { mobile }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this email or mobile number' 
      });
    }

    // Create user
    const user = new User({ name, email, mobile, password });
    await user.save();

    // Generate and save OTP
    const otp = generateOTP();
    await OTP.create({ email, otp });

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.status(201).json({ 
      message: 'Registration successful! Please check your email for verification code.' 
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Verify email with OTP
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the latest OTP for the email
    const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Update user verification status
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete used OTP
    await OTP.deleteMany({ email });

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    await OTP.create({ email, otp });

    // Send verification email
    await sendVerificationEmail(email, otp);

    res.json({ message: 'OTP resent successfully!' });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error while resending OTP' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Google authentication
const googleAuth = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      // Update googleId if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user for Google auth
      user = new User({
        name,
        email,
        googleId,
        isVerified: true,
        mobile: '0000000000' // Default mobile for Google users
      });
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Google login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error during Google authentication' });
  }
};


// Configure email transporter (update with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Forgot password - send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User with this email does not exist' 
      });
    }

    // Generate OTP and set expiration (10 minutes)
    const otp = generateOtp();
    const otpExpiration = Date.now() + 10 * 60 * 1000;

    // Save OTP and expiration to user
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = otpExpiration;
    await user.save();

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the OTP below to verify your identity:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #333; letter-spacing: 3px;">${otp}</h3>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Verify OTP
const  verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user by email
    const user = await User.findOne({ 
      email, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Check if OTP matches
    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Find user by email with valid OTP
    const user = await User.findOne({ 
      email, 
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


// Logout Controller
const logout = async (req, res) => {
  try {
    // If using cookies, clear them
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while logging out",
    });
  }
};

// const me = async (req, res) => {
//   try {
//     res.status(200).json(req.user);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('achievements');
    
    // Calculate user stats
    const tests = await Test.find({ userId: req.user.id });
    const testsTaken = tests.length;
    const avgScore = testsTaken > 0 
      ? tests.reduce((sum, test) => sum + test.score, 0) / testsTaken 
      : 0;
    const lastTest = tests.length > 0 
      ? tests.sort((a, b) => b.dateTaken - a.dateTaken)[0].name 
      : '';
    
    // Update user stats
    user.testsTaken = testsTaken;
    user.avgScore = Math.round(avgScore);
    user.lastTest = lastTest;
    
    // Add recent activity
    const recentActivity = tests
      .sort((a, b) => b.dateTaken - a.dateTaken)
      .slice(0, 3)
      .map(test => ({
        testName: test.name,
        date: test.dateTaken.toISOString().split('T')[0],
        score: test.score
      }));
    
    // Add recommended tests (simplified for demo)
    const recommendedTests = [
      {
        name: "SSC CHSL Full Test",
        description: "Based on your performance in similar tests"
      },
      {
        name: "Quant Speed Test",
        description: "Improve your calculation speed"
      },
      {
        name: "GK Daily Quiz",
        description: "Enhance your general knowledge"
      }
    ];
    
    res.json({
      ...user.toObject(),
      recentActivity,
      recommendedTests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleAuth,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  logout,
  me
};
