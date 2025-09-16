const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatSessions = new Map(); 

const geminiController = {
  // Initialize a new chat session
  async startChat(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      // Create a new model instance
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Start a new chat session
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{text: "You are an exam preparation assistant. Help students with study tips, exam patterns, and effective learning strategies. Be supportive and educational."}]
          },
          {
            role: "model",
            parts: [{text: "Hello! I'm your exam preparation assistant. I can help you with study techniques, exam patterns, time management, and effective learning strategies. How can I assist you today?"}]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });
      
      // Store the chat session
      chatSessions.set(userId, chat);
      
      res.json({ 
        success: true, 
        message: "Chat session started successfully",
        initialMessage: "Hello! I'm your exam preparation assistant. How can I help you with your studies today?"
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      res.status(500).json({ error: "Failed to start chat session" });
    }
  },

  // Send a message to the chatbot
  // async sendMessage(req, res) {
  //   try {
  //     const { userId, message } = req.body;
      


  //     if (!userId || !message) {
  //       return res.status(400).json({ error: "User ID and message are required" });
  //     }
      
  //     // Get the chat session
  //     const chat = chatSessions.get(userId);
  //     console.log(chatSessions);
      
  //     if (!chat) {
  //       return res.status(404).json({ error: "Chat session not found. Please start a new chat." });
  //     }
      
  //     // Send message to Gemini
  //     const result = await chat.sendMessage(message);
  //     console.log(result , "Result");
  //     const response = await result.response;
  //     const text = response.text();
      
  //     res.json({ 
  //       success: true, 
  //       message: text 
  //     });
  //   } catch (error) {
  //     console.error("Error sending message:", error);
  //     res.status(500).json({ error: "Failed to process message" });
  //   }
  // },

  async sendMessage(req, res) {
    try {
      const { userId, message } = req.body;

      if (!userId || !message) {
        return res.status(400).json({ error: "User ID and message are required" });
      }

      // Create a new model instance every time
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Start a temporary chat for this message
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              {
                text: "You are an exam preparation assistant. Help students with study tips, exam patterns, and effective learning strategies. Be supportive and educational."
              }
            ]
          },
          {
            role: "model",
            parts: [
              {
                text: "Hello! I'm your exam preparation assistant. I can help you with study techniques, exam patterns, time management, and effective learning strategies. How can I assist you today?"
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      });

      // Send the user’s message
      const result = await chat.sendMessage(message);

      // Extract text safely
      const text = result.response.text();

      res.json({
        success: true,
        message: text,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  },

  // Clear chat history
  async clearChat(req, res) {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      
      // Remove the chat session
      chatSessions.delete(userId);
      
      res.json({ 
        success: true, 
        message: "Chat history cleared successfully" 
      });
    } catch (error) {
      console.error("Error clearing chat:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  }
};



module.exports = geminiController;