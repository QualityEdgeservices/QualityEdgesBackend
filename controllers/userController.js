// controllers/userController.js
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const Test = require('../models/Test');
const Exam = require('../models/Exam');
const Achievement = require('../models/Achievement');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, mobile, education, address } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.name = name || user.name;
      user.mobile = mobile || user.mobile;
      user.education = education || user.education;
      user.address = address || user.address;
      
      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        education: updatedUser.education,
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        membership: updatedUser.membership
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get test history
const getTestHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const testAttempts = await TestAttempt.find({ userId: req.user._id, isCompleted: true })
      .populate('testId', 'title category')
      .populate('examId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await TestAttempt.countDocuments({ userId: req.user._id, isCompleted: true });
    
    res.json({
      testAttempts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalTests: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get performance data
const getPerformance = async (req, res) => {
  try {
    const testAttempts = await TestAttempt.find({ 
      userId: req.user._id, 
      isCompleted: true 
    });
    
    // Calculate overall performance
    const totalTests = testAttempts.length;
    const totalScore = testAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const avgScore = totalTests > 0 ? (totalScore / totalTests).toFixed(2) : 0;
    
    // Calculate accuracy
    const totalQuestions = testAttempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);
    const correctAnswers = testAttempts.reduce((sum, attempt) => sum + attempt.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(2) : 0;
    
    // Calculate subject-wise performance
    const subjectPerformance = {};
    testAttempts.forEach(attempt => {
      if (!subjectPerformance[attempt.examId]) {
        subjectPerformance[attempt.examId] = {
          total: 0,
          correct: 0,
          attempts: 0
        };
      }
      
      subjectPerformance[attempt.examId].total += attempt.totalQuestions;
      subjectPerformance[attempt.examId].correct += attempt.correctAnswers;
      subjectPerformance[attempt.examId].attempts += 1;
    });
    
    // Format subject performance
    const subjectData = [];
    for (const [examId, data] of Object.entries(subjectPerformance)) {
      const exam = await Exam.findById(examId);
      subjectData.push({
        subject: exam ? exam.name : 'Unknown',
        correct: data.correct,
        total: data.total,
        percentage: ((data.correct / data.total) * 100).toFixed(2),
        attempts: data.attempts
      });
    }
    
    // Get improvement over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await TestAttempt.aggregate([
      {
        $match: {
          userId: req.user._id,
          isCompleted: true,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          avgScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    const improvement = monthlyData.map(data => ({
      month: `${data._id.year}-${data._id.month.toString().padStart(2, '0')}`,
      score: data.avgScore.toFixed(2),
      tests: data.count
    }));
    
    res.json({
      overall: {
        testsTaken: totalTests,
        avgScore,
        accuracy,
        totalQuestions,
        correctAnswers,
        incorrectAnswers: totalQuestions - correctAnswers
      },
      subjects: subjectData,
      improvement
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get saved tests
const getSavedTests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('savedTests');
    res.json(user.savedTests || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get upcoming tests
const getUpcomingTests = async (req, res) => {
  try {
    // For now, return some sample upcoming tests
    // In a real application, this would come from a dedicated UpcomingTest model
    const upcomingTests = await Test.find({
      isActive: true,
      category: 'Set Wise'
    }).limit(5);
    
    res.json(upcomingTests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user achievements
const getAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({ userId: req.user._id });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user settings
const updateSettings = async (req, res) => {
  try {
    const { notifications } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (user) {
      user.settings = user.settings || {};
      user.settings.notifications = notifications || user.settings.notifications;
      
      await user.save();
      res.json({ message: 'Settings updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getTestHistory,
  getPerformance,
  getSavedTests,
  getUpcomingTests,
  getAchievements,
  updateSettings
};