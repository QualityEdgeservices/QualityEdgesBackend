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
// const getExamDetail = async (req, res) => {
//   try {
//     const exam = await Exam.findById(req.params.examId);
    
//     if (!exam) {
//       return res.status(404).json({ message: 'Exam not found' });
//     }
    
//     // Get tests for this exam
//     const tests = await Test.find({ 
//       examId: req.params.examId, 
//       isActive: true 
//     }).select('title category questions duration');
    
//     // Count tests by category
//     const testCounts = {
//       'Set Wise': 0,
//       'Subject Wise': 0,
//       'Topic Wise': 0
//     };
    
//     tests.forEach(test => {
//       if (testCounts.hasOwnProperty(test.category)) {
//         testCounts[test.category]++;
//       }
//     });
    
//     res.json({
//       ...exam.toObject(),
//       tests,
//       testCounts,
//       totalTests: tests.length
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };


const getExamDetail = async (req, res) => {
  try {
    const examId = req.params.examId;

    // 1. Fetch exam
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // 2. Fetch all active tests linked to this exam
    const tests = await Test.find({ examId, isActive: true })
      .select(
        'title description category duration totalQuestions questions isFree price createdAt updatedAt setWise subjectWise topicWise'
      )
      .lean();

    // 3. Count tests by category
    const categoryCounts = {
      'Set Wise': 0,
      'Subject Wise': 0,
      'Topic Wise': 0,
    };
    tests.forEach((t) => {
      if (categoryCounts.hasOwnProperty(t.category)) {
        categoryCounts[t.category]++;
      }
    });

    // 4. Free vs Paid tests
    const freeTests = tests.filter((t) => t.isFree).length;
    const paidTests = tests.length - freeTests;

    // 5. Subject distribution inside tests
    const subjectCounts = {};
    tests.forEach((test) => {
      test.questions.forEach((q) => {
        if (q.subject) {
          subjectCounts[q.subject] = (subjectCounts[q.subject] || 0) + 1;
        }
      });
    });

    // 6. Group SetWise / SubjectWise / TopicWise data
    const setWiseTests = tests.filter((t) => t.category === 'Set Wise');
    const subjectWiseTests = tests.filter((t) => t.category === 'Subject Wise');
    const topicWiseTests = tests.filter((t) => t.category === 'Topic Wise');

    // 7. Response object with all details
    res.json({
      exam,
      tests,
      testcounts: categoryCounts,
      totalTests: tests.length,
      summary: {
        totalTests: tests.length,
        categoryCounts,
        freeTests,
        paidTests,
        subjectCounts,
        lastUpdated: exam.lastUpdated,
      },
      breakdown: {
        setWise: setWiseTests,
        subjectWise: subjectWiseTests,
        topicWise: topicWiseTests,
      },
    });
  } catch (error) {
    console.error('Error fetching exam detail:', error);
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