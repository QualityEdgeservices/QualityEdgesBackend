

const express = require('express');
const { body } = require('express-validator');
const {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleAuth,
   forgotPassword,
  resetPassword,
  verifyResetToken
} = require('../controllers/authController');
const auth = require('../middlewares/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Please enter a valid 10-digit mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please enter a valid email')
];

const resetPasswordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Routes
router.get('/me', auth, (req, res) => {
  res.json({ message: 'User profile data' });
});
router.post('/register', registerValidation, register);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOtp);
router.post('/login', loginValidation, login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

module.exports = router;