// controllers/examController.js
const Exam = require('../models/Exam');
const Test = require('../models/Test');

// Get all exams with pagination
const getAllExams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const exams = await Exam.find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Exam.countDocuments({ isActive: true });
    
    res.json({
      exams,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalExams: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get exam details
const getExamDetail = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    // Get tests for this exam
    const tests = await Test.find({ 
      examId: req.params.examId, 
      isActive: true 
    }).select('title category questions duration');
    
    // Count tests by category
    const testCounts = {
      'Set Wise': 0,
      'Subject Wise': 0,
      'Topic Wise': 0
    };
    
    tests.forEach(test => {
      if (testCounts.hasOwnProperty(test.category)) {
        testCounts[test.category]++;
      }
    });
    
    res.json({
      ...exam.toObject(),
      tests,
      testCounts,
      totalTests: tests.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search exams
const searchExams = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;
    
    const query = {
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    };
    
    const exams = await Exam.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Exam.countDocuments(query);
    
    res.json({
      exams,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalExams: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllExams,
  getExamDetail,
  searchExams
};