const express = require('express');
const router = express.Router();
const geminiController = require('../controllers/chatbotController');

// Start a new chat session
router.post('/start', geminiController.startChat);

// Send a message to the chatbot
router.post('/message', geminiController.sendMessage);

// Clear chat history
router.post('/clear', geminiController.clearChat);

module.exports = router;