// routes/admin.js
const express = require('express');
const { createExam, updateExam, deleteExam, createTest, updateTest, deleteTest, getUsers, updateUser, getStatistics } = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/auth');
const router = express.Router();

router.use(protect, admin);

router.post('/exams', createExam);
router.put('/exams/:examId', updateExam);
router.delete('/exams/:examId', deleteExam);
router.post('/tests', createTest);
router.put('/tests/:testId', updateTest);
router.delete('/tests/:testId', deleteTest);
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.get('/statistics', getStatistics);

module.exports = router;