// chat.js - Manages the AI chat functionality

import * as api from './api.js';
import * as ui from './ui.js';
import * as messageHandling from './messageHandling.js';
import * as conversation from './conversation.js';
import knowledgeBase, { displayRawResults } from './knowledgeBase.js';
import { showDebugSynthesizedAnswer } from './ui.js';

// Access ENV from global window object with safety check
const ENV = typeof window.ENV !== 'undefined' ? window.ENV : {};

// Function to send message to backend API
export async function sendMessage(message) {
    // Basic validation
    if (!message || !message.trim()) {
        console.warn('%c[CHAT] Attempted to send empty message, ignoring', 'color: #FFC107');
        return;
    }
    
    console.log('%c[CHAT] Sending message:', 'color: #FF5722', message);
    
    // Add the user message to the UI
    ui.addSimpleMessageToUI('user', message);
    
    // Get the current conversation ID
    let conversationId = conversation.getCurrentConversationId();
    console.log('%c[CHAT] Current conversation ID:', 'color: #FF5722', conversationId);
    
    // Also check window object as a fallback
    if (!conversationId && window.currentConversationId) {
        conversationId = window.currentConversationId;
        console.log('%c[CHAT] Using window.currentConversationId:', 'color: #FF5722', conversationId);
    }
    
    // If no conversation ID exists, create a new conversation first
    if (!conversationId) {
        console.log('%c[CHAT] No active conversation, creating a new one', 'color: #FF5722');
        try {
            const result = await conversation.startNewConversation();
            if (result.success) {
                conversationId = result.conversation_id;
                console.log('%c[CHAT] Created new conversation:', 'color: #4CAF50', conversationId);
                
                // Store in window object as well
                window.currentConversationId = conversationId;
            } else {
                console.error('%c[CHAT ERROR] Failed to create conversation:', 'color: #f44336', result.error);
                ui.addMessageToUI('model', 'Sorry, I was unable to create a new conversation. Please try again.');
                return;
            }
        } catch (error) {
            console.error('%c[CHAT ERROR] Exception creating conversation:', 'color: #f44336', error);
            ui.addMessageToUI('model', 'Sorry, an error occurred while creating a new conversation. Please try again.');
            return;
        }
    }
    
    // Show typing indicator
    ui.showTypingIndicator();
    
    try {
        console.log('%c[CHAT] Calling API to send message', 'color: #FF5722', {
            conversationId: conversationId, 
            message: message
        });
        
        // First search the knowledge base - this will be used in the sendChatMessage function
        const knowledgeResults = await searchNutritionKnowledge(message);
        if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
            console.log('%c[CHAT] Found knowledge base results:', 'color: #4CAF50', knowledgeResults.results.length);
            // Store results globally for the API to use
            window.lastKnowledgeResults = knowledgeResults;
        }
        
        // Send the message to the API using the sendChatMessage function
        const response = await api.sendChatMessage(conversationId, message);
        
        // Hide typing indicator
        ui.hideTypingIndicator();
        
        console.log('%c[CHAT] API response:', 'color: #FF5722', response);
        
        if (response.success) {
            console.log('%c[CHAT] Received successful response:', 'color: #4CAF50', response);
            
            // Make sure the conversation ID is stored in both places
            if (response.conversation_id) {
                conversation.setCurrentConversation(response.conversation_id, response.title || 'New Conversation');
                window.currentConversationId = response.conversation_id;
                console.log('%c[CHAT] Updated conversation ID:', 'color: #4CAF50', response.conversation_id);
            }
            
            // Prepare response with sources if available
            let displayResponse = response.ai_message;
            
            // Add sources if we have knowledge base results
            if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
                try {
                    console.log("Adding sources to response");
                    const sourcesHtml = await knowledgeBase.formatSources(knowledgeResults);
                    if (sourcesHtml) {
                        displayResponse = response.ai_message + '\n\n---\n\n' + sourcesHtml;
                    }
                } catch (error) {
                    console.error("Error formatting sources:", error);
                }
            }
            
            // Add the AI response to the UI with full markdown rendering
            ui.addMessageToUI('model', displayResponse);
            
            // Update the conversation title if this is the first message
            if (response.title_generated || response.title_updated) {
                await conversation.loadConversationList();
            }
            
            return response;
        } else {
            console.error('%c[CHAT ERROR] API Error:', 'color: #f44336', response.error || 'Unknown error');
            ui.addMessageToUI('model', 'Sorry, there was an error processing your message: ' + (response.error || 'Unknown error'));
            return response;
        }
    } catch (error) {
        // Hide typing indicator
        ui.hideTypingIndicator();
        
        console.error('%c[CHAT ERROR] Exception during message send:', 'color: #f44336', error);
        ui.addMessageToUI('model', 'Sorry, an unexpected error occurred. Please try again.');
        return { success: false, error: error.message };
    }
}

// Wrapper function to search the nutrition knowledge base
async function searchNutritionKnowledge(message) {
    if (!message || !message.trim()) return null;
    
    console.log('%c[CHAT] Searching nutrition knowledge for:', 'color: #FF5722', message);
    
    try {
        if (knowledgeBase && typeof knowledgeBase.isNutritionQuery === 'function') {
            const isNutritionRelated = knowledgeBase.isNutritionQuery(message);
            
            if (isNutritionRelated) {
                console.log('%c[CHAT] Query is nutrition-related, searching knowledge base...', 'color: #FF5722');
                return await knowledgeBase.searchNutritionKnowledge(message);
            } else {
                console.log('%c[CHAT] Query is not nutrition-related, skipping knowledge base search', 'color: #FF5722');
                return null;
            }
        } else {
            console.warn('%c[CHAT] Knowledge base or isNutritionQuery function not available', 'color: #FFC107');
            return null;
        }
    } catch (error) {
        console.error('%c[CHAT ERROR] Error searching nutrition knowledge:', 'color: #f44336', error);
        return null;
    }
}

// Function to handle knowledge base search
export async function searchKnowledgeBase(query) {
    try {
        console.log("Searching knowledge base for:", query);
        
        const response = await fetch("backend.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "searchKnowledgeBase",
                query: query,
                limit: 5
            })
        });

        if (!response.ok) {
            console.error("Error searching knowledge base:", response.status);
            return null;
        }

        const data = await response.json();
        console.log("Knowledge base search results:", data);
        
        // Debug the structure
        console.log("Knowledge base response structure:", JSON.stringify(data, null, 2));
        
        if (data.results && data.results.length > 0) {
            console.log(`Found ${data.results.length} results from knowledge base`);
            
            // Log filenames for debugging
            data.results.forEach((result, index) => {
                console.log(`Result ${index + 1} filename: ${result.filename || 'No filename'}, title: ${result.title || 'No title'}`);
            });
            
            return data;
        } else {
            console.log("No results found in knowledge base");
            return null;
        }
    } catch (error) {
        console.error("Error searching knowledge base:", error);
        return null;
    }
}

// Send a message to the AI model
export async function sendMessageToModel(message, model, baseSystemInstruction, username, skipKnowledgeSearch = false) {
    if (!message.trim()) return;

    // Get the current conversation ID - ensure we're using the correct one
    const currentConversationId = conversation.getCurrentConversationId() || window.currentConversationId;
    
    // Flag to track if this is the first message in a new conversation
    const isNewConversation = !currentConversationId || currentConversationId === 'new';
    console.log("Current conversation ID:", currentConversationId, "Is new?", isNewConversation);
    
    const userMessage = message; // Store for later use in title generation

    // Show loading indicator
    const loader = ui.showLoadingIndicator();

    try {
        if (!model) {
            throw new Error("NutriGuide model not initialized");
        }
        
        // Check if the query is nutrition-related
        let isNutritionRelated = true;
        let knowledgeResults = null;
        
        // Only search knowledge base if not skipped (prevents double searches)
        if (!skipKnowledgeSearch && knowledgeBase && typeof knowledgeBase.isNutritionQuery === 'function') {
            try {
                isNutritionRelated = knowledgeBase.isNutritionQuery(message);
                
                // If it's nutrition-related, fetch relevant knowledge
                if (isNutritionRelated) {
                    console.log("Query is nutrition-related, searching knowledge base...");
                    knowledgeResults = await knowledgeBase.searchNutritionKnowledge(message);
                    
                    // Add comprehensive debugging output
                    console.log("============= KNOWLEDGE SEARCH RESULTS =============");
                    console.log("Raw Knowledge Search Results:", JSON.stringify(knowledgeResults, null, 2));
                    console.log("synthesizedAnswer:", knowledgeResults.synthesizedAnswer || "NOT FOUND");
                    console.log("Results count:", knowledgeResults.results ? knowledgeResults.results.length : 0);
                    console.log("Sources:", knowledgeResults.sources || "NOT FOUND");
                    console.log("=============================================================");
                    
                    // Log the full structure of the knowledge results
                    console.log("Knowledge results structure:", JSON.stringify(knowledgeResults, null, 2));
                    
                    if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
                        console.log(`Found ${knowledgeResults.results.length} relevant knowledge results`);
                        
                        // Log each result's filename and title for debugging
                        knowledgeResults.results.forEach((result, index) => {
                            console.log(`Result ${index + 1}: title="${result.title}", filename="${result.filename || 'not set'}"`);
                        });
                    } else {
                        console.log("No relevant knowledge results found");
                    }
                } else {
                    console.log("Query is not nutrition-related");
                }
            } catch (knowledgeError) {
                console.error("Error checking nutrition query or fetching knowledge:", knowledgeError);
                // Continue even if there's an error, defaulting to treating it as nutrition-related
                isNutritionRelated = true;
            }
        } else if (skipKnowledgeSearch) {
            console.log("Skipping knowledge base search as it was already performed");
        }
        
        // Get the current conversation summary if available
        const currentSummary = conversation.getCurrentConversationSummary();
        console.log("Current conversation summary:", currentSummary);
        
        // If we have a synthesized answer from the knowledge base, use it directly
        let skipModelCall = false;
        let synthesizedAnswer = '';
        let responseForUser = '';
        let summaryForContext = '';
        let displayResponse = '';

        if (knowledgeResults && knowledgeResults.synthesizedAnswer) {
            console.log("Using synthesized answer from knowledge base");
            synthesizedAnswer = knowledgeResults.synthesizedAnswer;
            
            // If we have a good synthesized answer, skip the model call
            if (synthesizedAnswer && synthesizedAnswer.length > 50) {
                skipModelCall = true;
                responseForUser = synthesizedAnswer;
                
                // Generate a simple summary if this is a new conversation
                if (!currentSummary) {
                    summaryForContext = `Discussed ${message.substring(0, 50)}${message.length > 50 ? '...' : ''} with nutrition information from our knowledge base.`;
                } else {
                    // Keep the existing summary
                    summaryForContext = currentSummary;
                }
            }
        }

        // Proceed with normal flow if we don't have a synthesized answer
        if (!skipModelCall) {
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
            if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0 && 
                typeof knowledgeBase.enhancePromptWithKnowledge === 'function') {
                prompt = knowledgeBase.enhancePromptWithKnowledge(prompt, knowledgeResults.results);
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
                responseForUser = messageHandling.extractResponsePart(fullResponse);
                summaryForContext = messageHandling.extractSummaryPart(fullResponse);
                
                console.log("Extracted summary:", summaryForContext);
                
                // Update the current conversation summary
                conversation.setCurrentConversationSummary(summaryForContext);
                
                // Add citations from knowledge base if results were used
                displayResponse = responseForUser;
                if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
                    try {
                        console.log("Adding sources to response");
                        // IMPORTANT: Check if already has sources section and remove it (avoiding duplicates)
                        const removeDuplicateSources = (text) => {
                            // Check for various formats of source sections
                            const patterns = [
                                /\n+\*?\*?Sources:?\*?\*?[\s\S]*$/i,  // Matches "Sources:" or "**Sources:**" to the end
                                /\n+Sources:[\s\S]*$/i  // Matches "Sources:" to the end
                            ];
                            
                            let cleanedText = text;
                            for (const pattern of patterns) {
                                if (pattern.test(cleanedText)) {
                                    console.log("Removing duplicate sources section");
                                    cleanedText = cleanedText.replace(pattern, '');
                                }
                            }
                            return cleanedText;
                        };

                        // Clean the response first to remove any existing sources section
                        displayResponse = removeDuplicateSources(responseForUser);
                        // Use the async formatSources method to get HTML with links
                        const sourcesHtml = await knowledgeBase.formatSources(knowledgeResults);
                        if (sourcesHtml) {
                            displayResponse = displayResponse + '\n\n---\n\n' + sourcesHtml;
                        }
                    } catch (error) {
                        console.error("Error formatting sources:", error);
                    }
                }
            } catch (aiError) {
                console.error("Error generating NutriGuide response:", aiError);
                throw aiError;
            }
        } else {
            // Direct use of synthesized answer from knowledge base
            // Remove loader before adding response
            ui.removeLoadingIndicator();
            
            displayResponse = responseForUser;
            
            // Add sources from knowledge base
            if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
                try {
                    console.log("Adding sources to synthesized answer");
                    console.log("Results filenames for synthesized answer:", knowledgeResults.results.map(r => r.filename));
                    
                    // Add the formatted sources
                    const sourcesHtml = await knowledgeBase.formatSources(knowledgeResults);
                    console.log("Sources HTML for synthesized answer:", sourcesHtml);
                    
                    if (sourcesHtml) {
                        // Use the same format as the regular responses for consistency
                        displayResponse = responseForUser + `\n\n---\n\n${sourcesHtml}`;
                        console.log("Added sources HTML to synthesized answer");
                    } else {
                        console.warn("No sources HTML was returned for synthesized answer");
                        
                        // Force inclusion of basic sources if HTML formatting fails
                        const sourceNames = knowledgeResults.sources || 
                                         (knowledgeResults.results ? knowledgeResults.results.map(r => r.title) : []);
                        displayResponse += "\n\n**Sources:**\n" + sourceNames.join(', ');
                        console.log("Added basic sources to synthesized answer as fallback");
                    }
                } catch (sourceError) {
                    console.error("Error formatting sources for synthesized answer:", sourceError);
                    // Fallback to simple source list
                    const sourceNames = knowledgeResults.sources || 
                                       (knowledgeResults.results ? knowledgeResults.results.map(r => r.title) : []);
                    displayResponse += "\n\n**Sources:**\n" + sourceNames.join(', ');
                    console.log("Added basic sources to synthesized answer after error");
                }
            }
        }
        
        // Display raw results for debugging
        displayRawResults(knowledgeResults);

        // Add debug button for synthesized answer
        if (knowledgeResults && knowledgeResults.synthesizedAnswer) {
            // Add debug button to the UI for synthesized answer debugging
            const debugButton = document.createElement('button');
            debugButton.textContent = 'Debug Synthesized Answer';
            debugButton.style.position = 'fixed';
            debugButton.style.bottom = '10px';
            debugButton.style.left = '10px';
            debugButton.style.zIndex = '1000';
            debugButton.style.padding = '5px 10px';
            debugButton.style.background = '#007BFF';
            debugButton.style.color = 'white';
            debugButton.style.border = 'none';
            debugButton.style.borderRadius = '4px';
            debugButton.style.cursor = 'pointer';
            
            debugButton.onclick = () => {
                const sources = knowledgeResults.results 
                    ? knowledgeResults.results.map(r => r.title)
                    : [];
                showDebugSynthesizedAnswer(knowledgeResults.synthesizedAnswer, sources);
            };
            
            document.body.appendChild(debugButton);
            
            // Remove button after 30 seconds
            setTimeout(() => {
                if (document.body.contains(debugButton)) {
                    document.body.removeChild(debugButton);
                }
            }, 30000);
        }

        // Debug log the synthesized response
        console.log("SYNTHESIZED RESPONSE:", responseForUser);
        console.log("SOURCES:", knowledgeResults.results ? knowledgeResults.results.map(r => r.title).join(", ") : "None");

        // Override displayResponse to always show sources
        displayResponse = responseForUser + 
            "\n\n---\n\n**Sources:** " + 
            (knowledgeResults.results ? knowledgeResults.results.map(r => r.title).join(", ") : "No sources found");
        
        // If we have a synthesized answer, log it prominently
        if (knowledgeResults && knowledgeResults.synthesizedAnswer) {
            console.log('%c SYNTHESIZED ANSWER FOUND ', 'background: #4CAF50; color: white; font-size: 20px;');
            console.log('%c' + knowledgeResults.synthesizedAnswer, 'color: #4CAF50; font-size: 16px;');
            console.log('%c WITH SOURCES ', 'background: #4CAF50; color: white; font-size: 16px;');
            console.log('%c' + (knowledgeResults.results ? knowledgeResults.results.map(r => r.title).join(", ") : "No sources"), 'color: #4CAF50; font-size: 14px;');
            
            // IMPORTANT: Use the synthesized answer directly
            displayResponse = knowledgeResults.synthesizedAnswer + 
                "\n\n---\n\n**Sources:** " + 
                (knowledgeResults.results ? knowledgeResults.results.map(r => r.title).join(", ") : "No sources found");
        }
        
        // Save chat to database with summary (for both paths)
        const conversationData = await api.saveChatMessages(
            userMessage, 
            displayResponse,
            currentConversationId,
            summaryForContext // Pass the summary to be saved
        );

        // Debug log for summary being saved
        console.log('%c[CHAT] Saving message with summary:', 'color: #E91E63', { 
            summaryLength: summaryForContext ? summaryForContext.length : 0,
            summaryExcerpt: summaryForContext ? summaryForContext.substring(0, 50) + '...' : 'None',
            conversationId: currentConversationId || 'new'
        });
        
        // If this was a new conversation, update the conversation ID and title
        if (isNewConversation && conversationData && conversationData.conversation_id) {
            // Update current conversation state with summary
            conversation.setCurrentConversation(
                conversationData.conversation_id,
                conversationData.title || "New Nutrition Chat",
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
            // Check if title needs to be updated 
            console.log("Checking if title needs update for conversation:", conversationData.conversation_id);
            try {
                // Get message count for the conversation
                const messageCount = await conversation.getConversationMessageCount(conversationData.conversation_id);
                
                // Only update title if this is one of the first messages (indicates a new conversation)
                if (messageCount <= 2) { 
                    console.log("New conversation detected, generating title now");
                    await conversation.generateConversationTitle(userMessage, conversationData.conversation_id, model);
                    await conversation.loadConversationList();
                } else {
                    console.log("Not a new conversation, skipping title generation");
                }
            } catch (titleError) {
                console.error("Error checking/updating conversation title:", titleError);
            }
        }
        
        // Return the response text so the caller can display it
        return { 
            text: displayResponse, 
            summary: summaryForContext 
        };
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

// Helper function to extract filename from title
function extractFilenameFromTitle(title) {
    if (!title) return '';
    return title.replace(/\s+/g, '_') + '.txt';
}

// Process user message and bot response, then update UI
export async function processUserMessage(userMessage, botResponse, conversationId, username) {
    try {
        // Add user message to UI immediately
        ui.addMessageToUI(userMessage, "user", username);
        
        // Format the bot response
        let formattedBotResponse = botResponse;
        
        // Check for knowledge base response with synthesized answer
        // and format it appropriately with sources
        const knowledgeResponse = window.lastKnowledgeResponse;
        if (knowledgeResponse) {
            console.log("Processing knowledge response for UI display:", knowledgeResponse);
            
            // Use the synthesized answer if available
            if (knowledgeResponse.answer && knowledgeResponse.answer.length > 0) {
                console.log("Using synthesized answer from knowledge response");
                formattedBotResponse = knowledgeResponse.answer;
                
                // Add sources section if not already present
                if (knowledgeResponse.results && knowledgeResponse.results.length > 0) {
                    if (!formattedBotResponse.includes("Sources:") && !formattedBotResponse.includes("**Sources:**")) {
                        formattedBotResponse += "\n\n**Sources:**\n";
                        knowledgeResponse.results.forEach((result, index) => {
                            formattedBotResponse += `${index + 1}. ${result.title || result.filename || "Unknown source"}\n`;
                        });
                    }
                }
            } 
            // Fallback to synthesizedAnswer if answer is not available
            else if (knowledgeResponse.synthesizedAnswer && knowledgeResponse.synthesizedAnswer.length > 0) {
                console.log("Using synthesizedAnswer from knowledge response");
                formattedBotResponse = knowledgeResponse.synthesizedAnswer;
                
                // Add sources section if not already present
                if (knowledgeResponse.results && knowledgeResponse.results.length > 0) {
                    if (!formattedBotResponse.includes("Sources:") && !formattedBotResponse.includes("**Sources:**")) {
                        formattedBotResponse += "\n\n**Sources:**\n";
                        knowledgeResponse.results.forEach((result, index) => {
                            formattedBotResponse += `${index + 1}. ${result.title || result.filename || "Unknown source"}\n`;
                        });
                    }
                }
            }
            // Last resort: Craft an answer from the results if no synthesized answer is available
            else if (knowledgeResponse.results && knowledgeResponse.results.length > 0) {
                console.log("Crafting answer from knowledge results");
                
                // Extract key insights rather than showing full content
                formattedBotResponse = "Based on the nutrition information available:\n\n";
                
                // Add a condensed version of key points from each source
                knowledgeResponse.results.forEach((result, index) => {
                    if (result.text && result.text.length > 0) {
                        // Extract first 1-2 sentences or a short excerpt
                        const excerpt = result.text.split('.')[0] + 
                            (result.text.split('.').length > 1 ? '.' + result.text.split('.')[1] : '') + '.';
                        
                        formattedBotResponse += `• ${excerpt}\n\n`;
                    }
                });
                
                // Add citation section
                formattedBotResponse += "\n**Sources:**\n";
                knowledgeResponse.results.forEach((result, index) => {
                    formattedBotResponse += `${index + 1}. ${result.title || result.filename || "Unknown source"}\n`;
                });
            }
        }

        // Add bot message to UI
        ui.addMessageToUI(formattedBotResponse, "bot");
        
        // Always call generateTitle for the first message in a conversation
        // This will help ensure titles are always generated properly
        try {
            if (conversationId) {
                const messageCount = await conversation.getConversationMessageCount(conversationId);
                console.log("Message count for conversation", conversationId, ":", messageCount);
                
                // Generate title if this is one of the first messages
                if (messageCount <= 2) {
                    console.log("Generating title for conversation from processUserMessage");
                    await generateTitle(userMessage, botResponse, conversationId);
                }
            }
        } catch (titleError) {
            console.error("Error handling title generation:", titleError);
        }
        
        return true;
    } catch (error) {
        console.error("Error processing message:", error);
        ui.showErrorMessage(error.message);
        return false;
    }
}

// Function to save messages to conversation history
export async function saveMessageToHistory(userMessage, botResponse) {
    try {
        // Get the current conversation ID
        const conversationId = conversation.getCurrentConversationId() || 'new';
        console.log("Saving messages to conversation:", conversationId);
        
        // Save the message pair
        const response = await api.saveChatMessages(userMessage, botResponse, conversationId);
        
        if (!response.success) {
            console.error("Error saving messages:", response.error);
            return false;
        }
        
        console.log("Messages saved successfully. Conversation ID:", response.conversation_id);
        
        // If this is a new conversation or the first message, make sure we set it as current
        if (conversationId === 'new' || response.isFirstMessage) {
            console.log("Setting current conversation:", response.conversation_id, response.title);
            conversation.setCurrentConversation(
                response.conversation_id,
                response.title || "New Nutrition Chat"
            );
            
            // Make sure the conversation is visible in the list
            await conversation.loadConversationList();
            
            // Generate a title if it's a new conversation
            await generateTitle(userMessage, botResponse, response.conversation_id);
        }
        
        return true;
    } catch (error) {
        console.error("Error saving message to history:", error);
        return false;
    }
}

// Generate a title for a new conversation
export async function generateTitle(userMessage, botResponse, conversationId) {
    try {
        if (!conversationId) {
            console.error("Cannot generate title: No current conversation ID");
            return;
        }
        
        console.log("Generating title for conversation:", conversationId);
        
        // FIXED: Don't check if conversation has a title since that's preventing 
        // title generation for new conversations. Instead, always generate for new 
        // conversations or when message count is low.
        const messageCount = await conversation.getConversationMessageCount(conversationId);
        console.log("Current message count:", messageCount);
        
        // Only generate title for new conversations or ones with very few messages
        if (messageCount > 2) {
            console.log("Conversation already has enough messages, skipping title generation");
            return;
        }
        
        // Ensure a minimum length user message to get a good title
        if (userMessage.trim().length < 5) {
            console.log("User message too short for good title generation");
            return;
        }
        
        // Log that we're actually proceeding with title generation
        console.log("Proceeding with title generation for conversation:", conversationId);
        
        // CHANGED: Instead of using backend.php, call Gemini directly like in conversation.js
        // This avoids issues with the backend implementation
        const titlePrompt = `As a nutrition assistant, create a short, descriptive title (5 words or less) that captures the essence of this conversation. Don't repeat the user's question verbatim. Instead, extract the key nutrition topic or concept and create a concise, professional title.

User message: "${userMessage}"

Example transformations:
- "What are the health benefits of eating apples?" → "Apple Health Benefits"
- "Is a keto diet good for weight loss?" → "Keto Diet Effectiveness"
- "What foods are high in protein that are vegan?" → "Vegan Protein Sources"

Title:`;

        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: window.ENV.GEMINI_MODEL_NAME || 'gemini-1.5-flash',
                contents: titlePrompt,
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 100
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Proxy error for title generation: ${errorData.error || response.status}`);
        }

        // Get the response data
        const responseData = await response.json();
        let titleSuggestion = responseData.text || '';
        
        // Clean up the title using the function from conversation.js
        titleSuggestion = cleanupTitleText(titleSuggestion);
        
        console.log("Generated title suggestion:", titleSuggestion);

        if (titleSuggestion) {
            // Now update the title in the database
            const updateResponse = await api.updateConversationTitle(titleSuggestion, conversationId);
            
            if (updateResponse.success) {
                console.log("Title updated successfully:", titleSuggestion);
                ui.showTitleNotification(titleSuggestion);
                
                // Force a refresh of the conversation list to show the new title
                await conversation.loadConversationList();
                
                // Update the document title as well
                ui.updateDocumentTitle(titleSuggestion);
                
                // Set the title updated flag
                conversation.setTitleHasBeenUpdated(true);
            } else {
                console.error("Failed to update title in database:", updateResponse.error);
            }
        }
    } catch (error) {
        console.error("Error generating title:", error);
    }
}

// Helper function to clean up title text (copied from conversation.js)
function cleanupTitleText(title) {
    if (!title) return "Nutrition Query";
    
    // Remove markdown formatting (bold, italic, etc.)
    let cleanTitle = title
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
        .replace(/\*(.*?)\*/g, '$1')     // Remove italic *text*
        .replace(/\_\_(.*?)\_\_/g, '$1') // Remove bold __text__
        .replace(/\_(.*?)\_/g, '$1')     // Remove italic _text_
        .replace(/\`(.*?)\`/g, '$1')     // Remove code `text`
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links [text](url)
        .replace(/\#\s+/g, '')           // Remove heading markers # 
        .replace(/\n/g, ' ')             // Replace newlines with spaces
        .replace(/["'"]/g, '')           // Remove quotes
        .replace(/^\s+|\s+$/g, '')       // Trim whitespace
        .replace(/\s+/g, ' ');           // Normalize spacing
    
    // Remove any remaining specifiers like "Title: " that the model might add
    cleanTitle = cleanTitle
        .replace(/^(Title|Topic|Subject|Conversation|Chat|About|Re):\s*/i, '')
        .replace(/^["""''']|["""''']$/g, ''); // Remove quotes at start/end
    
    // Limit length
    if (cleanTitle.length > 50) {
        cleanTitle = cleanTitle.substring(0, 47) + '...';
    }
    
    // Capitalize first letter of each word
    cleanTitle = cleanTitle.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return cleanTitle || "Nutrition Query";
} 