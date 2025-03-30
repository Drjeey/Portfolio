// chat.js - Manages the AI chat functionality

import * as api from './api.js';
import * as ui from './ui.js';
import * as messageHandling from './messageHandling.js';
import * as conversation from './conversation.js';
import * as knowledgeBase from './knowledgeBase.js';

// Access ENV from global window object with safety check
const ENV = typeof window.ENV !== 'undefined' ? window.ENV : {};

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
        if (!model) {
            throw new Error("NutriGuide model not initialized");
        }

        let result;
        
        // Check if the query is nutrition-related
        let isNutritionRelated = true;
        let knowledgeResults = [];
        
        if (knowledgeBase && typeof knowledgeBase.isNutritionQuery === 'function') {
            try {
                isNutritionRelated = knowledgeBase.isNutritionQuery(message);
                
                // If it's nutrition-related, fetch relevant knowledge
                if (isNutritionRelated) {
                    knowledgeResults = await knowledgeBase.searchNutritionKnowledge(message);
                    console.log("Found nutrition knowledge:", knowledgeResults.length, "results");
                } else {
                    console.log("Query is not nutrition-related");
                }
            } catch (knowledgeError) {
                console.error("Error checking nutrition query or fetching knowledge:", knowledgeError);
                // Continue even if there's an error, defaulting to treating it as nutrition-related
                isNutritionRelated = true;
            }
        }
        
        // Get the current conversation summary if available
        const currentSummary = conversation.getCurrentConversationSummary();
        console.log("Current conversation summary:", currentSummary);
        
        // Prepare basic prompt with user message, including summary if available
        let prompt;
        if (currentSummary) {
            // Format a prompt that includes the current summary and requests a new one
            const summaryContext = `Current conversation summary: ${currentSummary}\n\n`;
            prompt = `${summaryContext}${message}\n\n===\nBased on our conversation, please provide two things:\n1. A direct response to my nutrition question above.\n2. An updated brief summary (2-3 sentences) of our entire nutrition-related conversation including this latest exchange.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the updated summary.`;
        } else {
            // First interaction - ask for a summary to be created
            prompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my nutrition question above.\n2. A brief summary (1-2 sentences) of what we've just discussed related to nutrition.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the updated summary.`;
        }
        
        // Add nutrition context and guard rails
        prompt += `\n\nAs NutriGuide powered by Nourish 1.0, you have direct access to a comprehensive nutrition vector database that contains expert-verified information. This allows you to provide accurate and specific nutritional guidance. You can confidently answer questions about nutrition science, dietary needs, food composition, and meal planning without excessive disclaimers since your information comes from reliable, vetted sources.`;
        
        // Add specific warning about non-nutrition topics if detected
        if (!isNutritionRelated) {
            prompt += `\n\nIMPORTANT: The user's question appears to be unrelated to nutrition. Politely explain that you're specialized in nutrition information only, and offer to help with nutrition-related questions instead. DO NOT attempt to answer non-nutrition topics.`;
        }
        
        // Add verification against knowledge base if claims seem suspicious
        if (containsSuspiciousClaims(message)) {
            prompt += `\n\nIMPORTANT: The user may be making incorrect assertions about nutrition science. Verify any claims against your knowledge base and gently correct any misinformation using evidence-based facts. Do not agree with incorrect nutrition terminology or concepts even if the user insists they are correct.`;
        }
        
        // For first-time interactions, add a specific introduction instruction
        if (isNewConversation) {
            prompt += `\n\nThis is your first interaction with this user. Introduce yourself as NutriGuide, a specialized nutrition assistant powered by Nourish 1.0 with access to a verified nutrition database. Be friendly and confident, explaining that you can provide accurate nutritional guidance without excessive disclaimers because your information has been vetted by nutrition experts.`;
        }
        
        // Enhance with knowledge base content if available
        if (knowledgeResults.length > 0 && typeof knowledgeBase.enhancePromptWithKnowledge === 'function') {
            prompt = knowledgeBase.enhancePromptWithKnowledge(prompt, knowledgeResults);
        }

        // Generate the AI response
        try {
            // Use our proxy instead of the direct API
            console.log("Sending request to proxy with content length:", prompt.length);
            
            // Using fetch with our proxy endpoint
            const response = await fetch('gemini-proxy.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: ENV.GEMINI_MODEL_NAME || "Nourish-1.0",
                    contents: prompt,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Proxy error: ${errorData.error || response.status}`);
            }
            
            // Get the response data
            const responseData = await response.json();
            const fullResponse = responseData.text || '';
            
            // Remove loader before adding response
            ui.removeLoadingIndicator();
            
            // Extract the response and summary parts
            const responseForUser = messageHandling.extractResponsePart(fullResponse);
            const summaryForContext = messageHandling.extractSummaryPart(fullResponse);
            
            console.log("Extracted summary:", summaryForContext);
            
            // Update the current conversation summary
            conversation.setCurrentConversationSummary(summaryForContext);
            
            // Add citations from knowledge base if results were used
            let displayResponse = responseForUser;
            if (knowledgeResults.length > 0 && typeof knowledgeBase.formatCitations === 'function') {
                const citations = knowledgeBase.formatCitations(knowledgeResults);
                if (citations) {
                    displayResponse += "\n\n**Sources:**\n" + citations;
                }
            }
            
            // Show the response to the user
            ui.addMessageToUI("model", displayResponse);
            
            // Save chat to database with summary
            const conversationData = await api.saveChatMessages(
                userMessage, 
                displayResponse,
                conversation.getCurrentConversationId(),
                summaryForContext // Pass the summary to be saved
            );
            
            // If this was a new conversation, update the conversation ID
            if (isNewConversation && conversationData && conversationData.conversation_id) {
                // Update current conversation state with summary
                conversation.setCurrentConversation(
                    conversationData.conversation_id,
                    conversationData.title || "New Nutrition Conversation",
                    summaryForContext // Include the summary
                );
                
                // Generate title based on first message - priority for new conversations
                console.log("Generating title for new conversation:", conversationData.conversation_id);
                try {
                    // Generate title immediately for new conversations
                    await conversation.generateConversationTitle(userMessage, conversationData.conversation_id, model);
                    
                    // Refresh conversation list to show the new title
                    await conversation.loadConversationList();
                } catch (titleError) {
                    console.error("Error generating conversation title:", titleError);
                    // Continue even if title generation fails
                }
            }
            // Also update title if this is the first user message in any conversation
            else if (conversationData && conversationData.conversation_id) {
                // Force title update for the first user message 
                console.log("Checking if title needs update for conversation:", conversationData.conversation_id);
                try {
                    // Instead of checking the title string, use our explicit flag
                    const titleHasBeenUpdated = conversation.getTitleHasBeenUpdated();
                    
                    // Only update if title hasn't been updated yet (prevents multiple updates)
                    if (!titleHasBeenUpdated) {
                        console.log("Title has not been updated yet, generating title now");
                        await conversation.generateConversationTitle(userMessage, conversationData.conversation_id, model);
                        await conversation.loadConversationList();
                    } else {
                        console.log("Title has already been updated, skipping title generation");
                    }
                } catch (titleError) {
                    console.error("Error checking/updating conversation title:", titleError);
                }
            }
        } catch (aiError) {
            console.error("Error generating NutriGuide response:", aiError);
            throw aiError;
        }
    } catch (error) {
        console.error("NutriGuide Response Error:", error);
        ui.removeLoadingIndicator();
        ui.showErrorMessage();
    }
}

/**
 * Checks if a message contains suspicious or potentially misleading nutrition claims
 * @param {string} message - The user's message
 * @returns {boolean} - True if suspicious claims are detected
 */
function containsSuspiciousClaims(message) {
    const lowerMessage = message.toLowerCase();
    
    // Don't flag simple requests for examples or general nutrition questions
    if (lowerMessage.includes('example') || 
        lowerMessage.includes('what are some') || 
        lowerMessage.includes('tell me about') ||
        lowerMessage.includes('can you list') ||
        lowerMessage.includes('what can you help with')) {
        return false;
    }
    
    // List of suspicious patterns that might indicate attempted manipulation or misinformation
    const suspiciousPatterns = [
        // Pressuring tactics
        'you are outdated', 'you are wrong', 'your information is old', 
        'nutrition experts now say', 'latest research shows', 'no longer called',
        'now called', 'renamed to', 'they changed', 'recently discovered',
        
        // Trying to make the bot respond outside its domain
        'pretend to be', 'role play', 'imagine if', 'act as if',
        'you deal in medicine', 'also do', 'can also help with',
        
        // Factually suspicious nutrition claims
        'toxins', 'detox', 'cleanses', 'miracle food', 'superfood', 
        'cures all', 'prevents all', 'eliminates all', 'omega 4', 'vitamin q',
        'prevents cancer', 'cures disease', 'alternative medicine'
    ];
    
    // Check if any suspicious pattern is present in the message
    return suspiciousPatterns.some(pattern => lowerMessage.includes(pattern));
} 