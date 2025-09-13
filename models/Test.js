// models/Test.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true },
  explanation: { type: String, default: '' },
  subject: { 
    type: String, 
    enum: ['Quant', 'English', 'Reasoning', 'GK'], 
    // required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'], 
    default: 'Medium' 
  },
  marks: { type: Number, default: 1 }
});

const testSchema = new mongoose.Schema({
  examId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exam', 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true }, // in seconds
  totalQuestions: { type: Number, required: true },
  questions: [questionSchema],
  category: { 
    type: String, 
    enum: ['Set Wise', 'Subject Wise', 'Topic Wise'], 
    required: true 
  },
  isFree: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);