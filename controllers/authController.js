
const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const {  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordResetConfirmation } = require('../utils/sendEmail');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user doesn't exist for security
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Send reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      return res.status(500).json({ message: 'Email could not be sent' });
    }

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    await sendPasswordResetConfirmation(user.email);

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Token is valid', email: user.email });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ message: 'Server error during token verification' });
  }
};



module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  verifyResetToken
};
