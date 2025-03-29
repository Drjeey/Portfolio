// main.js - Main orchestrator file for the health AI chat application

// Import modules
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";
import * as api from './js/modules/api.js';
import * as ui from './js/modules/ui.js';
import * as chat from './js/modules/chat.js';
import * as conversation from './js/modules/conversation.js';

// Get API key from environment variables (loaded by env.php)
const API_KEY = ENV.GEMINI_API_KEY;
const MODEL_NAME = ENV.GEMINI_MODEL_NAME;

// Get username from environment variables
const username = ENV.USER_INFO.username;
window.username = username; // Make username available globally

// Basic system instruction without personalization
const baseSystemInstruction = `You are a helpful health information assistant. 
Your primary focus is to provide clear, factual medical information and health advice.
Always include disclaimers when appropriate, reminding users to consult healthcare professionals for personalized medical advice.
Be friendly, concise, and helpful. Focus on answering health-related questions directly and accurately.`;

// Initialize the Gemini model with base instruction
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME, 
    systemInstruction: baseSystemInstruction
});

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    // Personalize the welcome message for health information
    const welcomeMessageElement = document.getElementById('welcome-message');
    if (welcomeMessageElement) {
        welcomeMessageElement.textContent = username !== 'User' 
            ? `Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?` 
            : `Hello! I'm your health information assistant. How can I help you with your health questions today?`;
    }

    // Check login status and initialize app
    await initializeApp();
    
    // Set up event listeners
    document.querySelector(".send-btn").addEventListener("click", handleSendMessage);
    document.querySelector(".message-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSendMessage();
    });

    document.querySelector(".new-chat-btn").addEventListener("click", conversation.startNewConversation);
});

// Initialize the application
async function initializeApp() {
    try {
        // Check if user is logged in
        const loginData = await api.checkLoginStatus();
        
        if (!loginData.success) {
            // Redirect to login page if not logged in
            window.location.href = "Form.php";
            return;
        }
        
        if (loginData.conversation_id) {
            // Set current conversation
            conversation.setCurrentConversation(
                loginData.conversation_id,
                loginData.title || "Conversation"
            );
            
            // Display conversation messages
            const chatContainer = document.querySelector(".chat-messages");
            chatContainer.innerHTML = ""; // Clear previous messages
            
            // Group messages by date
            const messagesByDate = {};
            for (const date in loginData.messages) {
                messagesByDate[date] = loginData.messages[date].map(({ user, bot }) => ({
                    user_message: user,
                    bot_message: bot,
                    date: date
                }));
            }
            
            // Add date separators and messages
            for (const date in messagesByDate) {
                ui.addDateSeparator(date);
                messagesByDate[date].forEach(({ user_message, bot_message }) => {
                    ui.addMessageToUI("user", user_message);
                    ui.addMessageToUI("model", bot_message);
                });
            }
        } else {
            // If no conversation loaded, ensure welcome message is personalized
            const welcomeMessageElement = document.getElementById('welcome-message');
            if (welcomeMessageElement) {
                welcomeMessageElement.textContent = username !== 'User' 
                    ? `Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?` 
                    : `Hello! I'm your health information assistant. How can I help you with your health questions today?`;
            }
        }
        
        // Load conversation list for sidebar
        await conversation.loadConversationList();
    } catch (error) {
        console.error("Error initializing app:", error);
        window.location.href = "Form.php";
    }
}

// Handle send message button click
function handleSendMessage() {
    const input = document.querySelector(".message-input");
    const message = input.value.trim();
    if (!message) return;

    // Clear input field
    input.value = "";
    
    // Send message to AI
    chat.sendMessage(message, model, baseSystemInstruction, username);
}
