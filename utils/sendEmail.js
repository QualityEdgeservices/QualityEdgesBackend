const transporter = require('../config/email');

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

const sendVerificationEmail = async (email, otp) => {
  const subject = 'Verify Your Email Address';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 8px;">
        ${otp}
      </h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  return await sendEmail(email, subject, html);
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const subject = 'Password Reset Request';
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to reset your password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    </div>
  `;

  return await sendEmail(email, subject, html);
};

const sendPasswordResetConfirmation = async (email) => {
  const subject = 'Password Reset Successful';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Successful</h2>
      <p>Your password has been successfully reset.</p>
      <p>If you did not make this change, please contact support immediately.</p>
    </div>
  `;

  return await sendEmail(email, subject, html);
};

module.exports = { 
  sendEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordResetConfirmation
};