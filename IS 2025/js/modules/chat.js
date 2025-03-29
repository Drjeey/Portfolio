// chat.js - Manages the AI chat functionality

import * as api from './api.js';
import * as ui from './ui.js';
import * as messageHandling from './messageHandling.js';
import * as conversation from './conversation.js';

// Access ENV from global window object
const ENV = window.ENV;

// Initialize AI model with system instruction
export function initializeAI(apiKey, modelName, systemInstruction) {
    return api.initializeAI(apiKey, modelName, systemInstruction);
}

// Send a message to the AI model
export async function sendMessage(message, model, baseSystemInstruction, username) {
    if (!message.trim()) return;

    // Add user message to UI
    ui.addMessageToUI("user", message);

    // Flag to track if this is the first message in a new conversation
    const isNewConversation = !conversation.getCurrentConversationId();
    const userMessage = message; // Store for later use in title generation

    // Show loading indicator
    const loader = ui.showLoadingIndicator();

    try {
        let result;
        let summaryPrompt;
        let currentSummary = "";
        let customModel;
        
        // Get conversation history for context if this is not a new conversation
        if (!isNewConversation) {
            try {
                // Fetch conversation history
                const historyData = await api.fetchConversationHistory(conversation.getCurrentConversationId());
                
                // Check if we have a summary to use
                if (historyData.summary) {
                    currentSummary = historyData.summary;
                    
                    // Create custom model instance with context-aware system instruction
                    const contextSystemInstruction = messageHandling.createSystemInstructions(
                        baseSystemInstruction, 
                        username, 
                        false, 
                        currentSummary
                    );
                    
                    customModel = api.initializeAI(ENV.GEMINI_API_KEY, ENV.GEMINI_MODEL_NAME, contextSystemInstruction);
                } else {
                    // No summary yet, but we have history - use the base model
                    customModel = model;
                }
                
                if (historyData.messages && historyData.messages.length > 0) {
                    // Create prompt with summary request
                    summaryPrompt = messageHandling.createSummaryRequestPrompt(message, currentSummary);
                    
                    // Create a chat with history
                    const chat = customModel.startChat({
                        history: historyData.messages,
                        generationConfig: {
                            maxOutputTokens: 8192,
                        },
                    });
                    
                    // Generate content with history context and summary request
                    result = await chat.sendMessage(summaryPrompt);
                } else {
                    // No message history yet, still request a summary with the response
                    summaryPrompt = messageHandling.createSummaryRequestPrompt(message);
                    result = await customModel.generateContent(summaryPrompt);
                }
            } catch (historyError) {
                console.error("Error fetching conversation history:", historyError);
                // Fallback to generating content with summary request
                summaryPrompt = messageHandling.createSummaryRequestPrompt(message);
                result = await model.generateContent(summaryPrompt);
            }
        } else {
            // New conversation - use personalized greeting for first-time interactions
            const personalizedSystemInstruction = messageHandling.createSystemInstructions(
                baseSystemInstruction, 
                username, 
                true
            );
            
            // Create a model with personalized first-interaction system instruction
            const firstInteractionModel = api.initializeAI(ENV.GEMINI_API_KEY, ENV.GEMINI_MODEL_NAME, personalizedSystemInstruction);
            
            // New conversation, still request a summary with the response
            summaryPrompt = messageHandling.createSummaryRequestPrompt(message);
            summaryPrompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above, starting with a personalized greeting.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the summary.`;
            result = await firstInteractionModel.generateContent(summaryPrompt);
        }
        
        const fullResponse = await result.response.text();
        
        // Parse the response to separate the actual response from the summary
        const responsePart = messageHandling.extractResponsePart(fullResponse);
        const summaryPart = messageHandling.extractSummaryPart(fullResponse);
        
        // Remove loader before adding response
        ui.removeLoadingIndicator();
        
        // Only show the response part to the user, not the summary
        ui.addMessageToUI("model", responsePart);
        
        // Save chat to database with both response and summary
        const conversationData = await api.saveChatMessages(
            userMessage, 
            responsePart, 
            conversation.getCurrentConversationId(), 
            summaryPart
        );
        
        // If this was a new conversation, generate a title for it
        if (isNewConversation && conversationData && conversationData.conversation_id) {
            // Update current conversation state
            conversation.setCurrentConversation(
                conversationData.conversation_id,
                conversationData.title || "New Conversation"
            );
            
            // Generate title based on first message
            await conversation.generateConversationTitle(userMessage, conversationData.conversation_id, model);
            
            // Refresh conversation list
            await conversation.loadConversationList();
        }
        
    } catch (error) {
        console.error("AI Response Error:", error);
        ui.removeLoadingIndicator();
        ui.showErrorMessage();
    }
} 