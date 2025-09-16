// controllers/testController.js
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Exam = require('../models/Exam');
const User = require('../models/User');
const Achievement = require('../models/Achievement');

// Get test details
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId)
      .populate('examId', 'name');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // For security, don't send correct answers to client
    const testWithoutAnswers = {
      ...test.toObject(),
      questions: test.questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        subject: q.subject,
        difficulty: q.difficulty,
        marks: q.marks
      }))
    };
    // console.log(testWithoutAnswers);
    res.json(testWithoutAnswers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start a test
const startTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    // Check if user has an active attempt
    const activeAttempt = await TestAttempt.findOne({
      userId: req.user._id,
      testId: req.params.testId,
      isCompleted: false
    });
    
    if (activeAttempt) {
      return res.json({
        attemptId: activeAttempt._id,
        message: 'Continuing existing test attempt'
      });
    }
    
    // Create new test attempt
    const testAttempt = await TestAttempt.create({
      userId: req.user._id,
      testId: req.params.testId,
      examId: test.examId,
      startTime: new Date(),
      totalQuestions: test.questions.length,
      responses: test.questions.map(question => ({
        questionId: question._id,
        selectedOption: null,
        isCorrect: false,
        timeSpent: 0
      }))
    });
    
    res.json({
      attemptId: testAttempt._id,
      message: 'Test started successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save test progress
const saveTestProgress = async (req, res) => {
  try {
    const { responses, currentQuestionIndex, timeSpent } = req.body;
    
    const testAttempt = await TestAttempt.findOne({
      _id: req.params.testId,
      userId: req.user._id,
      isCompleted: false
    });
    
    if (!testAttempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }
    
    // Update responses
    if (responses) {
      testAttempt.responses = responses;
    }
    
    // Update time spent
    testAttempt.timeSpent = timeSpent || testAttempt.timeSpent;
    
    await testAttempt.save();
    
    res.json({ message: 'Progress saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Submit test
const submitTest = async (req, res) => {
  try {
    const { responses } = req.body;
    
    const testAttempt = await TestAttempt.findOne({
      _id: req.params.testId,
      userId: req.user._id,
      isCompleted: false
    });
    
    if (!testAttempt) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }
    
    const test = await Test.findById(testAttempt.testId);
    
    // Calculate score
    let correctAnswers = 0;
    const updatedResponses = responses.map(response => {
      const question = test.questions.id(response.questionId);
      const isCorrect = question && response.selectedOption === question.correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        questionId: response.questionId,
        selectedOption: response.selectedOption,
        isCorrect,
        timeSpent: response.timeSpent || 0
      };
    });
    
    const score = (correctAnswers / test.questions.length) * 100;
    
    // Update test attempt
    testAttempt.responses = updatedResponses;
    testAttempt.endTime = new Date();
    testAttempt.timeSpent = Math.floor((testAttempt.endTime - testAttempt.startTime) / 1000);
    testAttempt.score = score;
    testAttempt.correctAnswers = correctAnswers;
    testAttempt.incorrectAnswers = test.questions.length - correctAnswers;
    testAttempt.accuracy = score;
    testAttempt.isCompleted = true;
    
    await testAttempt.save();
    
    // Update user stats
    const user = await User.findById(req.user._id);
    user.testsTaken += 1;
    user.avgScore = ((user.avgScore * (user.testsTaken - 1) + score) / user.testsTaken);
    user.lastTest = test.title;
    
    await user.save();
    
    // Check for achievements
    await checkAchievements(req.user._id, testAttempt);
    
    res.json({
      message: 'Test submitted successfully',
      score,
      correctAnswers,
      totalQuestions: test.questions.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get test results
const getTestResults = async (req, res) => {
  try {
    const testAttempt = await TestAttempt.findById(req.params.testId)
      .populate('testId')
      .populate('examId');
    
    if (!testAttempt || testAttempt.userId.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Test results not found' });
    }
    
    const test = await Test.findById(testAttempt.testId);
    
    // Prepare detailed results with questions and explanations
    const detailedResults = testAttempt.responses.map(response => {
      const question = test.questions.id(response.questionId);
      
      return {
        question: question.question,
        options: question.options,
        selectedOption: response.selectedOption,
        correctAnswer: question.correctAnswer,
        isCorrect: response.isCorrect,
        explanation: question.explanation,
        subject: question.subject,
        difficulty: question.difficulty,
        timeSpent: response.timeSpent
      };
    });
    
    // Calculate subject-wise performance
    const subjectPerformance = {};
    detailedResults.forEach(result => {
      if (!subjectPerformance[result.subject]) {
        subjectPerformance[result.subject] = {
          total: 0,
          correct: 0
        };
      }
      
      subjectPerformance[result.subject].total += 1;
      if (result.isCorrect) {
        subjectPerformance[result.subject].correct += 1;
      }
    });
    
    // Format subject performance
    const subjectData = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      correct: data.correct,
      total: data.total,
      percentage: ((data.correct / data.total) * 100).toFixed(2)
    }));
    
    // Calculate difficulty-wise performance
    const difficultyPerformance = {};
    detailedResults.forEach(result => {
      if (!difficultyPerformance[result.difficulty]) {
        difficultyPerformance[result.difficulty] = {
          total: 0,
          correct: 0
        };
      }
      
      difficultyPerformance[result.difficulty].total += 1;
      if (result.isCorrect) {
        difficultyPerformance[result.difficulty].correct += 1;
      }
    });
    
    // Format difficulty performance
    const difficultyData = Object.entries(difficultyPerformance).map(([difficulty, data]) => ({
      difficulty,
      correct: data.correct,
      total: data.total,
      percentage: ((data.correct / data.total) * 100).toFixed(2)
    }));
    
    // Time distribution (simplified)
    const timeDistribution = [
      { name: 'Quant', value: 35 },
      { name: 'English', value: 25 },
      { name: 'Reasoning', value: 20 },
      { name: 'GK', value: 20 }
    ];
    
    // AI insights (simulated)
    const aiInsights = [
      {
        icon: '📈',
        title: "Strong Area",
        content: "Your performance in Quantitative Aptitude is excellent. Keep practicing to maintain this strength."
      },
      {
        icon: '📉',
        title: "Weak Area",
        content: "General Knowledge needs improvement. Focus on current affairs and static GK."
      }
    ];
    
    res.json({
      testAttempt,
      detailedResults,
      subjectPerformance: subjectData,
      difficultyPerformance: difficultyData,
      timeDistribution,
      aiInsights
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to check for achievements
const checkAchievements = async (userId, testAttempt) => {
  try {
    const userAttempts = await TestAttempt.find({ userId, isCompleted: true });
    
    // Perfect Score achievement
    if (testAttempt.score === 100) {
      const exists = await Achievement.findOne({ 
        userId, 
        title: 'Perfect Score' 
      });
      
      if (!exists) {
        await Achievement.create({
          userId,
          title: 'Perfect Score',
          description: 'Scored 100% in a test',
          icon: '🏆',
          unlocked: true,
          dateUnlocked: new Date()
        });
      }
    }
    
    // Speed Master achievement (completed in half the time)
    const test = await Test.findById(testAttempt.testId);
    const halfTime = test.duration / 2;
    
    if (testAttempt.timeSpent <= halfTime) {
      const exists = await Achievement.findOne({ 
        userId, 
        title: 'Speed Master' 
      });
      
      if (!exists) {
        await Achievement.create({
          userId,
          title: 'Speed Master',
          description: 'Completed a test in half the allotted time',
          icon: '⚡',
          unlocked: true,
          dateUnlocked: new Date()
        });
      }
    }
    
    // Consistent Performer achievement (5 tests with >80% score)
    const highScoreAttempts = userAttempts.filter(attempt => attempt.score >= 80);
    
    if (highScoreAttempts.length >= 5) {
      const exists = await Achievement.findOne({ 
        userId, 
        title: 'Consistent Performer' 
      });
      
      if (!exists) {
        await Achievement.create({
          userId,
          title: 'Consistent Performer',
          description: 'Scored above 80% in 5 consecutive tests',
          icon: '📈',
          unlocked: true,
          dateUnlocked: new Date()
        });
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
};
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analysisController = {
  async analyzeTest(req, res) {
    try {
      const { testAttempt, responses } = req.body;

      // console.log(testAttempt);
      // console.log(responses);

      if (!testAttempt || !responses) {
        return res.status(400).json({ error: "Test attempt and responses are required" });
      }

      // Flexible prompt without fixed subjects
      const prompt = `
You are an AI exam performance analyst. Analyze the student's test performance.

Test Info:
- Title: ${testAttempt.testId?.title || ""}
- Exam: ${testAttempt.examId?.name || ""}
- Total Questions: ${testAttempt.totalQuestions}
- Correct Answers: ${testAttempt.correctAnswers}
- Incorrect Answers: ${testAttempt.incorrectAnswers}
- Accuracy: ${testAttempt.accuracy}%
- Score: ${testAttempt.score}

Responses:
${JSON.stringify(responses, null, 2)}

Provide your analysis strictly in valid JSON with this structure:
{
  "overallFeedback": string,   // general performance summary
  "strengths": [string],       // areas where the student did well
  "weaknesses": [string],      // areas needing improvement
  "suggestions": [string]      // practical study tips or strategy improvements
}
Only return JSON, no extra text.
`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
      });
      
      const raw = result.response.text();
      // Clean Gemini's response: remove ```json / ``` wrappers
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let analysis;
      try {
        analysis = JSON.parse(cleaned);
      } catch (e) {
        console.error("Error parsing Gemini response:", raw);
        return res.status(500).json({ error: "Invalid AI response format" });
}

      // If analysis is successful, send it back to the client
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing test:", error);
      res.status(500).json({ error: "Failed to analyze test" });
    }
  }
};



module.exports = {
  getTest,
  startTest,
  submitTest,
  getTestResults,
  saveTestProgress,
  analysisController
};