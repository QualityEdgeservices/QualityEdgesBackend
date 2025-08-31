// models/TestAttempt.js
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOption: { type: Number, default: null },
  isCorrect: { type: Boolean, default: false },
  timeSpent: { type: Number, default: 0 } // in seconds
});

const testAttemptSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Test', 
    required: true 
  },
  examId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Exam', 
    required: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  timeSpent: { type: Number, default: 0 }, // in seconds
  responses: [responseSchema],
  score: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, default: 0 },
  incorrectAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  percentile: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('TestAttempt', testAttemptSchema);