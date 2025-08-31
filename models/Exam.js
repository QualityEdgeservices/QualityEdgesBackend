// models/Exam.js
const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: '' },
  color: { 
    type: String, 
    enum: ['primary', 'secondary'], 
    default: 'primary' 
  },
  totalTests: { type: Number, default: 0 },
  duration: { type: String, default: '' },
  price: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  features: [{ type: String }],
  categories: {
    type: Map,
    of: [{
      name: { type: String, required: true },
      questions: { type: Number, required: true },
      duration: { type: String, required: true }
    }]
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);