// routes/user.js
const express = require('express');
const {
  getProfile,
  updateProfile,
  getTestHistory,
  getPerformance,
  getSavedTests,
  getUpcomingTests,
  getAchievements
} = require('../controllers/userController');
const {protect} = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/test-history', getTestHistory);
router.get('/performance', getPerformance);
router.get('/saved-tests', getSavedTests);
router.get('/upcoming-tests', getUpcomingTests);
router.get('/achievements', getAchievements);

module.exports = router;