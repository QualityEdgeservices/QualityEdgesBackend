// routes/exam.js
const express = require('express');
const { getAllExams, getExamDetail, searchExams } = require('../controllers/examController');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/', getAllExams);
router.get('/search', searchExams);
router.get('/:examId', getExamDetail);

module.exports = router;