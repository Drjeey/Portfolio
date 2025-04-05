// api.js - Handles API communication with backend and AI models

import * as ui from './ui.js';
import * as conversation from './conversation.js';

// Check login status
export async function checkLoginStatus() {
    console.log('%c[API] Checking login status', 'color: #9C27B0');
    
    try {
        const response = await fetch('backend.php?check_login=true');
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error checking login status:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Login status:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception checking login status:', 'color: #f44336', error);
        return { success: false, error: 'Failed to check login status' };
    }
}

// Fetch all conversations for the current user
export async function fetchConversations() {
    console.log('%c[API] Fetching conversations', 'color: #9C27B0');
    
    try {
        const response = await fetch('backend.php?conversations=true');
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error fetching conversations:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Fetched conversations successfully:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception fetching conversations:', 'color: #f44336', error);
        return { success: false, error: 'Failed to fetch conversations' };
    }
}

// Fetch a specific conversation
export async function fetchConversation(conversationId) {
    console.log('%c[API] Fetching conversation:', 'color: #9C27B0', conversationId);
    
    try {
        const response = await fetch(`backend.php?conversation_id=${conversationId}`);
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error fetching conversation:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Fetched conversation successfully:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception fetching conversation:', 'color: #f44336', error);
        return { success: false, error: 'Failed to fetch conversation' };
    }
}

// Fetch conversation history for AI context
export async function fetchConversationHistory(conversationId) {
    console.log('%c[API] Fetching conversation history for context:', 'color: #9C27B0', conversationId);
    
    try {
        const historyResponse = await fetch(`backend.php?get_history=true&conversation_id=${conversationId}`);
        if (historyResponse.ok) {
            const data = await historyResponse.json();
            
            // Log if summary is found
            if (data.summary) {
                console.log('%c[API] Conversation summary found in history response', 'color: #4CAF50');
                console.log('%c[API] Summary preview:', 'color: #4CAF50', data.summary.substring(0, 100) + '...');
            } else {
                console.log('%c[API] No conversation summary found in history response', 'color: #FFC107');
            }
            
            return data;
        } else {
            console.error('%c[API ERROR] Failed to retrieve conversation history:', 'color: #f44336', historyResponse.status);
            throw new Error("Error retrieving conversation history");
        }
    } catch (error) {
        console.error('%c[API ERROR] Exception fetching conversation history:', 'color: #f44336', error);
        throw error;
    }
}

// Get message count for a conversation
export async function getMessageCount(conversationId) {
    try {
        if (!conversationId || conversationId === 'new' || conversationId === 'null' || conversationId === 'undefined') {
            console.log('%c[API] Invalid conversation ID for message count:', 'color: #FFC107', conversationId);
            return 0;
        }
        
        console.log('%c[API] Getting message count for conversation:', 'color: #9C27B0', conversationId);
        
        const response = await fetch(`backend.php?action=get_message_count&conversation_id=${conversationId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error getting message count:', 'color: #f44336', response.status);
            return 0;
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('%c[API] Message count for conversation:', 'color: #4CAF50', data.count);
            return data.count;
        } else {
            console.error('%c[API ERROR] Backend error getting message count:', 'color: #f44336', data.error);
            return 0;
        }
    } catch (error) {
        console.error('%c[API ERROR] Exception getting message count:', 'color: #f44336', error);
        return 0;
    }
}

// Create a new conversation
export async function createConversation() {
    console.log('%c[API] Creating new conversation', 'color: #9C27B0');
    
    try {
        const response = await fetch('backend.php?create_conversation=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: 'New Nutrition Chat' })
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error creating conversation:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Created conversation successfully:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception creating conversation:', 'color: #f44336', error);
        return { success: false, error: 'Failed to create conversation' };
    }
}

// Rename a conversation
export async function renameConversation(conversationId, newTitle) {
    console.log('%c[API] Renaming conversation:', 'color: #9C27B0', conversationId, 'to', newTitle);
    
    try {
        const response = await fetch('backend.php?rename_conversation=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conversation_id: conversationId, title: newTitle })
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error renaming conversation:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Renamed conversation successfully:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception renaming conversation:', 'color: #f44336', error);
        return { success: false, error: 'Failed to rename conversation' };
    }
}

// Delete a conversation
export async function deleteConversation(conversationId) {
    console.log('%c[API] Deleting conversation:', 'color: #9C27B0', conversationId);
    
    try {
        const response = await fetch('backend.php?delete_conversation=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conversation_id: conversationId })
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error deleting conversation:', 'color: #f44336', response.status, response.statusText);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        console.log('%c[API] Deleted conversation successfully:', 'color: #4CAF50', data);
        
        return data;
    } catch (error) {
        console.error('%c[API ERROR] Exception deleting conversation:', 'color: #f44336', error);
        return { success: false, error: 'Failed to delete conversation' };
    }
}

// Save a user and bot message pair to a conversation
export async function saveMessage(userMessage, botMessage, conversationId, rawBotMessage = null) {
    try {
        // Validate conversation ID
        if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
            console.error("Invalid conversation ID provided to saveMessage:", conversationId);
            return { success: false, error: "Invalid conversation ID" };
        }
        
        // Convert to string for consistency
        const convId = String(conversationId);
        
        console.log(`Saving message to conversation ${convId}`);
        
        // Check if we have a pending conversation summary
        const conversationSummary = window.pendingConversationSummary || null;
        if (conversationSummary) {
            console.log('%c[API] Including conversation summary with message save', 'color: #4CAF50');
            console.log('%c[API] Summary content:', 'color: #4CAF50', conversationSummary.substring(0, 100) + '...');
            console.log('%c[API] Summary length:', 'color: #4CAF50', conversationSummary.length);
            // Clear the pending summary
            window.pendingConversationSummary = null;
        } else {
            console.log('%c[API] No pending conversation summary found', 'color: #FF9800');
        }
        
        // Create request payload
        const payload = {
            action: 'saveMessage',
            user_message: userMessage,
            bot_message: botMessage,
            raw_bot_message: rawBotMessage || botMessage,
            conversation_id: convId
        };
        
        // Only add the summary if it exists and is a valid string
        // This fixes issues where null, undefined, or other types might be passed
        if (conversationSummary !== null && 
            conversationSummary !== undefined && 
            typeof conversationSummary === 'string' &&
            conversationSummary.trim().length > 0) {
            
            payload.conversation_summary = conversationSummary;
            console.log('%c[API] Added valid conversation_summary to payload', 'color: #4CAF50');
        } else if (conversationSummary !== null && conversationSummary !== undefined) {
            console.warn('%c[API] Summary exists but is not a valid string:', 'color: #FF9800', typeof conversationSummary);
        }
        
        // Convert payload to JSON string for transmission
        const payloadString = JSON.stringify(payload);
        console.log('%c[API] Final payload length:', 'color: #2196F3', payloadString.length);
        
        // Double-check that the summary is in the payload if it should be
        if (conversationSummary && !payloadString.includes('conversation_summary')) {
            console.error('%c[API] CRITICAL ERROR: Summary not included in payload!', 'color: #F44336');
        }
        
        const response = await fetch('backend.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: payloadString
        });
        
        if (!response.ok) {
            console.error(`Failed to save message: ${response.status}`);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        
        if (!data.success) {
            console.error("Error from server when saving message:", data.error || "Unknown error");
            return data;
        }
        
        console.log("Message saved successfully to conversation:", data.conversation_id);
        
        // If this is a new conversation or title was generated, log it and trigger title generation
        if ((convId === 'new' || data.title_generated) && data.title) {
            console.log(`Conversation titled: "${data.title}"`);
            
            // IMPORTANT: If it's a new conversation or first message, ensure we generate a proper title
            const titleData = {
                isNew: convId === 'new',
                requiresTitle: data.title_generated,
                conversationId: data.conversation_id,
                title: data.title,
                userMessage: userMessage
            };
            
            // Store this data for later title generation
            window.pendingTitleGeneration = titleData;
            
            // Trigger a custom event that other modules can listen for
            const titleEvent = new CustomEvent('conversationTitleUpdated', {
                detail: {
                    conversationId: data.conversation_id,
                    title: data.title,
                    requiresGeneration: true,
                    userMessage: userMessage
                }
            });
            document.dispatchEvent(titleEvent);
        }
        
        return data;
    } catch (error) {
        console.error('Error saving message:', error);
        return { success: false, error: error.message };
    }
}

// Save chat messages with conversation summary
export async function saveChatMessages(userMessage, botMessage, conversationId, conversationSummary = null, rawBotMessage = null) {
    try {
        // Log that we're using the more comprehensive saving function
        console.log('%c[API] Using saveChatMessages with conversation summary', 'color: #9C27B0');
        
        // If no conversation ID, treat as new conversation
        const convId = conversationId || 'new';
        
        // Save the summary in a global variable if it's provided
        if (conversationSummary) {
            window.pendingConversationSummary = conversationSummary;
            console.log('%c[API] Set pending conversation summary for save', 'color: #4CAF50');
        }
        
        // Use the existing saveMessage function to handle the actual save
        const result = await saveMessage(userMessage, botMessage, convId, rawBotMessage);
        
        // Add flag to indicate it's the first message if it's a new conversation
        if (result.success && convId === 'new') {
            result.isFirstMessage = true;
        }
        
        return result;
    } catch (error) {
        console.error('%c[API ERROR] Exception in saveChatMessages:', 'color: #f44336', error);
        return { success: false, error: error.message };
    }
}

// Update conversation title
export async function updateConversationTitle(newTitle, conversationId) {
    try {
        // Use the JSON format for consistency with other API calls
        console.log("Updating conversation title in database:", newTitle, "for ID:", conversationId);
        
        const response = await fetch('backend.php?rename_conversation=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conversation_id: conversationId, title: newTitle })
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error updating conversation title:', 'color: #f44336', response.status);
            return { success: false, error: `Server error: ${response.status}` };
        }
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('%c[API ERROR] Error updating title:', 'color: #f44336', data.error);
            return data;
        }
        
        return data;
    } catch (error) {
        console.error("Error updating conversation title:", error);
        return { success: false, error: 'Failed to update title' };
    }
}

// Send a chat message to the AI
export async function sendChatMessage(conversationId, message) {
    console.log('%c[API] Sending chat message:', 'color: #9C27B0', message, 'to conversation:', conversationId);
    
    // Debug objects to verify state
    const stateDebug = {
        messageProvided: !!message,
        messageTrimmed: message ? message.trim().length > 0 : false,
        conversationId: conversationId,
        conversationIdType: typeof conversationId
    };
    console.log('%c[API DEBUG] Message state:', 'color: #673AB7', stateDebug);
    
    try {
        // Because of potential circular dependencies between chat.js and api.js,
        // we'll use a simpler approach here. We'll call the AI directly and then save the message.
        
        // Call the AI service using the proxy
        console.log('%c[API] Calling AI service through proxy', 'color: #9C27B0');
        
        // Enhanced system instruction with context awareness guidance
        const systemInstruction = "You are NutriGuide, a specialized nutrition assistant powered by Nourish 1.0. While nutrition is your primary focus, you can engage in normal conversation as well. You have access to conversation context in the form of summaries, which means you can remember previous exchanges in this conversation. If asked about memories or what was discussed before, you should acknowledge that you can recall previous messages in the current conversation based on the provided context/summary. If this is the first message in a conversation (no summary provided), you can explain that this is the beginning of your conversation together.";
        
        const aiResult = await callGeminiProxy(message, systemInstruction);
        const aiResponse = aiResult.text;
        const rawResponse = aiResult.raw_text || aiResponse;
        
        // Now we have the AI response, handle saving it
        if (!conversationId || conversationId === 'new' || conversationId === 'null' || conversationId === 'undefined') {
            console.log('%c[API] Creating new conversation with initial message', 'color: #9C27B0');
            
            // Check if we have a pending conversation summary
            const conversationSummary = window.pendingConversationSummary || null;
            if (conversationSummary) {
                console.log('%c[API] Including conversation summary with new conversation', 'color: #4CAF50');
                // Clear the pending summary after we use it
                window.pendingConversationSummary = null;
            }
            
            // For new conversations, use the 'saveMessage' action with 'new' as the conversation_id
            // This tells the backend to create a new conversation and add this message to it
            const response = await fetch('backend.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'saveMessage',
                    user_message: message,
                    bot_message: aiResponse,
                    raw_bot_message: rawResponse,
                    conversation_id: 'new',
                    conversation_summary: conversationSummary
                })
            });
            
            if (!response.ok) {
                console.error('%c[API ERROR] Error creating conversation with message:', 'color: #f44336', response.status);
                return { success: false, error: `Server error: ${response.status}` };
            }
            
            const data = await response.json();
            console.log('%c[API] Created conversation with message:', 'color: #4CAF50', data);
            
            if (data.success) {
                // Add AI message to response
                data.ai_message = aiResponse;
                window.currentConversationId = data.conversation_id;
                return data;
            } else {
                console.error('%c[API ERROR] Backend error:', 'color: #f44336', data.error);
                return { success: false, error: data.error || 'Unknown error' };
            }
        } else {
            // For existing conversations, simply save the message
            console.log('%c[API] Adding message to existing conversation', 'color: #9C27B0', conversationId);
            
            const response = await saveMessage(message, aiResponse, conversationId, rawResponse);
            
            if (response.success) {
                // Add AI message to response
                response.ai_message = aiResponse;
                window.currentConversationId = conversationId;
                return response;
            } else {
                console.error('%c[API ERROR] Error saving message:', 'color: #f44336', response.error);
                return { success: false, error: response.error || 'Failed to save message' };
            }
        }
    } catch (error) {
        console.error('%c[API ERROR] Exception sending message:', 'color: #f44336', error);
        return { success: false, error: 'Failed to send message: ' + error.message };
    }
}

// Helper function to call the Gemini proxy
async function callGeminiProxy(message, systemInstruction) {
    // Check if we have knowledge base results
    const knowledgeResults = window.lastKnowledgeResults;
    let enhancedPrompt = '';
    
    // Get conversation summary if available
    let conversationSummary = null;
    
    // Import conversation module functions to get the summary
    const conversationModule = await import('./conversation.js');
    
    // Check for existing conversation ID
    const conversationId = conversationModule.getCurrentConversationId();
    let isNewConversation = !conversationId || conversationId === 'new' || conversationId === 'null' || conversationId === 'undefined';
    
    // Get the message count to determine if this is actually a first message
    let messageCount = 0;
    if (!isNewConversation) {
        try {
            messageCount = await conversationModule.getConversationMessageCount(conversationId);
            console.log(`%c[API] Conversation message count: ${messageCount}`, 'color: #9C27B0');
            // Override isNewConversation if this is the first or second message
            if (messageCount <= 1) {
                isNewConversation = true;
                console.log(`%c[API] Treating as new conversation based on message count`, 'color: #9C27B0');
            }
        } catch (error) {
            console.error('%c[API ERROR] Error getting conversation message count:', 'color: #f44336', error);
        }
    }
    
    // IMPORTANT: Log conversation state for debugging title/context issues
    console.log('%c[API] Conversation state:', 'color: #4CAF50', { 
        id: conversationId,
        isNew: isNewConversation,
        messageCount,
        titleUpdated: conversationModule.getTitleHasBeenUpdated ? 
                     conversationModule.getTitleHasBeenUpdated() : 'unknown'
    });
    
    // If not a new conversation, try to get the conversation summary
    if (!isNewConversation) {
        try {
            console.log('%c[API] Getting conversation summary for context', 'color: #9C27B0');
            // First check if it's already in memory
            conversationSummary = conversationModule.getCurrentConversationSummary();
            
            // If not in memory, try to fetch it
            if (!conversationSummary) {
                console.log('%c[API] Fetching conversation summary from server', 'color: #9C27B0');
                conversationSummary = await conversationModule.fetchConversationSummary(conversationId);
            }
            
            if (conversationSummary) {
                console.log('%c[API] Found conversation summary for context', 'color: #4CAF50');
            }
        } catch (error) {
            console.error('%c[API ERROR] Error getting conversation summary:', 'color: #f44336', error);
            // Continue without summary if there's an error
        }
    }
    
    // Enhanced context instructions that explicitly explain the conversational state
    let contextInstruction;
    
    if (isNewConversation) {
        contextInstruction = `This is a NEW CONVERSATION. This is the first message from the user, so you DO NOT have any conversation history or context to work with. If the user asks about previous messages or what you remember, clearly explain that this is the beginning of your conversation.`;
    } else if (conversationSummary) {
        contextInstruction = `This is an ONGOING CONVERSATION. You have access to the conversation history through the summary provided below. You CAN reference previous messages and acknowledge things you've discussed before.`;
    } else {
        contextInstruction = `This appears to be an ongoing conversation, but no specific context is available. Respond appropriately without referencing previous messages unless you're certain about the context.`;
    }
    
    // Enhanced citation instructions for consistent formatting
    const citationInstruction = `
DO NOT use inline citations in your response. 
Instead, provide a comprehensive answer using the information from the sources.
At the end of your response, list all sources you referenced under a "Sources:" section.
Make your response thorough and informative while keeping the writing natural and readable.
`;
    
    // Build the prompt based on knowledge base results
    if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
        console.log('%c[API] Using knowledge base results to enhance prompt', 'color: #9C27B0');
        
        // Start with system instruction
        enhancedPrompt = systemInstruction + "\n\n" + contextInstruction + "\n\n" + citationInstruction + "\n\n";
        
        // Add conversation summary if available and not a new conversation
        if (!isNewConversation && conversationSummary) {
            enhancedPrompt += "Conversation summary:\n" + conversationSummary + "\n\n";
        }
        
        // Add knowledge context
        enhancedPrompt += "Relevant information from the nutrition database:\n\n";
        
        // Add each result to the prompt
        knowledgeResults.results.forEach((result, index) => {
            enhancedPrompt += `--- Source ${index + 1}: ${result.title || 'Untitled'} ---\n`;
            enhancedPrompt += result.text || result.content || '';
            enhancedPrompt += "\n\n";
        });
        
        // Add the user query
        enhancedPrompt += "User query: " + message + "\n\n";
        enhancedPrompt += "Based on the nutrition information above, please provide a thorough, comprehensive response that addresses the query in detail. DO NOT include a 'Sources:' section at the end - this will be added automatically by the system.";
    } else {
        // Start with system instruction
        enhancedPrompt = systemInstruction + "\n\n" + contextInstruction + "\n\n";
        
        // Add conversation summary if available and not a new conversation
        if (!isNewConversation && conversationSummary) {
            enhancedPrompt += "Conversation summary:\n" + conversationSummary + "\n\n";
        }
        
        // Add the user query
        enhancedPrompt += "User query: " + message;
    }
    
    console.log('%c[API] Sending request to Gemini proxy', 'color: #9C27B0');

    // Reset knowledge results
    window.lastKnowledgeResults = null;

    try {
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: window.ENV && window.ENV.GEMINI_MODEL_NAME ? window.ENV.GEMINI_MODEL_NAME : 'gemini-pro',
                contents: enhancedPrompt
            })
        });
        
        if (!response.ok) {
            console.error('%c[API ERROR] Error from Gemini proxy:', 'color: #f44336', response.status);
            throw new Error(`Gemini proxy error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('%c[API] Received response from Gemini proxy', 'color: #4CAF50');
        
        if (!data.text) {
            console.error('%c[API ERROR] No text in response from Gemini proxy', 'color: #f44336', data);
            throw new Error('No text in response from Gemini proxy');
        }
        
        // Handle summary extraction
        if (data.text.includes('[SUMMARY]') && data.text.includes('[/SUMMARY]')) {
            const summaryPattern = /\[SUMMARY\](.*?)\[\/SUMMARY\]/s;
            const match = data.text.match(summaryPattern);
            
            if (match && match[1]) {
                const extractedSummary = match[1].trim();
                console.log('%c[API] Extracted conversation summary from response', 'color: #4CAF50');
                window.pendingConversationSummary = extractedSummary;
                
                // Remove the summary from the response
                const cleanedResponse = data.text.replace(summaryPattern, '').trim();
                
                // Return the cleaned response
                return {
                    text: cleanedResponse,
                    raw_text: data.raw_text || data.text
                };
            }
        }
        
        // If no summary extraction, return the raw response
        return {
            text: data.text,
            raw_text: data.raw_text || data.text
        };
    } catch (error) {
        console.error('%c[API ERROR] Exception in callGeminiProxy:', 'color: #f44336', error);
        throw error;
    }
} 