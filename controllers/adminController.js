// controllers/adminController.js
const User = require('../models/User');
const Exam = require('../models/Exam');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');

// Create exam
const createExam = async (req, res) => {
  try {
    const exam = await Exam.create(req.body);
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.examId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.examId,
      { isActive: false },
      { new: true }
    );
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const createTest = async (req, res) => {
  try {
    const { examId, title, description, duration, totalQuestions, category, ...rest } = req.body;

    // 1. Create the test
    const test = await Test.create({
      examId,
      title,
      description,
      duration,
      totalQuestions,
      category,
      ...rest
    });

    // 2. Find the exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // 3. Create category if it does not exist
    if (!exam.categories.has(category)) {
      exam.categories.set(category, []); // create new category
    }

    // 4. Push test summary into that category
    const categoryArray = exam.categories.get(category);
    categoryArray.push({
      name: title,
      questions: totalQuestions,
      duration: `${duration}s`
    });
    exam.categories.set(category, categoryArray); // update the map

    // 5. Update totals
    exam.totalTests += 1;
    exam.lastUpdated = Date.now();

    await exam.save();

    res.status(201).json({ test, exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update test
const updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json(test);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete test
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.testId,
      { isActive: false },
      { new: true }
    );
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments();
    
    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get statistics
const getStatistics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalExams = await Exam.countDocuments({ isActive: true });
    const totalTests = await Test.countDocuments({ isActive: true });
    const totalTestAttempts = await TestAttempt.countDocuments({ isCompleted: true });
    
    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Popular exams
    const popularExams = await TestAttempt.aggregate([
      {
        $group: {
          _id: '$examId',
          attempts: { $sum: 1 }
        }
      },
      {
        $sort: { attempts: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $unwind: '$exam'
      },
      {
        $project: {
          name: '$exam.name',
          attempts: 1
        }
      }
    ]);
    
    res.json({
      totalUsers,
      totalExams,
      totalTests,
      totalTestAttempts,
      recentUsers,
      popularExams
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.json(tests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword ,id} = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createExam,
  updateExam,
  deleteExam,
  createTest,
  updateTest,
  deleteTest,
  getUsers,
  updateUser,
  getStatistics,
  getAllTests,
  deleteAccount,
  changePassword
};