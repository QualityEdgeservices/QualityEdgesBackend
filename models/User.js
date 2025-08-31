const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
   type: String, 
    required: function () {
      return !this.googleId; 
    }
  },
  googleId: {
    type: String,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: 'data:image/png;base64,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'
  },
  resetPasswordOtp: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  membership: {
    type: String,
    enum: ['Free', 'Premium', 'Gold'],
    default: 'Free'
  },
  phone: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  testsTaken: {
    type: Number,
    default: 0
  },
  avgScore: {
    type: Number,
    default: 0
  },
  lastTest: {
    type: String,
    default: ''
  },
  achievements: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate password reset token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);