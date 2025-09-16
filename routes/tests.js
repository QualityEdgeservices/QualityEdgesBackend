// routes/test.js
const express = require('express');
const { getTest, startTest, submitTest, getTestResults, saveTestProgress , analysisController } = require('../controllers/testController');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.use(protect);

router.get('/:testId', getTest);
router.post('/:testId/start', startTest);
router.post('/:testId/submit', submitTest);
router.get('/:testId/results', getTestResults);
router.put('/:testId/progress', saveTestProgress);
router.post('/:testId/analysis', analysisController.analyzeTest);

module.exports = router;