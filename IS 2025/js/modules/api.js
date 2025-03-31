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
    if (!conversationId) return 0;
    
    try {
        const response = await fetch(`backend.php?get_message_count=true&conversation_id=${conversationId}`);
        if (response.ok) {
            const data = await response.json();
            return data.count || 0;
        } else {
            console.error("Error getting message count");
            return 0;
        }
    } catch (error) {
        console.error("Error getting message count:", error);
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
export async function saveMessage(userMessage, botMessage, conversationId) {
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
            // Clear the pending summary
            window.pendingConversationSummary = null;
        }
        
        const response = await fetch('backend.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveMessage',
                user_message: userMessage,
                bot_message: botMessage,
                conversation_id: convId,
                conversation_summary: conversationSummary
            })
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
        
        // If this is a new conversation or title was generated, log it
        if ((convId === 'new' || data.title_generated) && data.title) {
            console.log(`Conversation titled: "${data.title}"`);
            
            // Trigger a custom event that other modules can listen for
            const titleEvent = new CustomEvent('conversationTitleUpdated', {
                detail: {
                    conversationId: data.conversation_id,
                    title: data.title
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
export async function saveChatMessages(userMessage, botMessage, conversationId, conversationSummary = null) {
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
        const result = await saveMessage(userMessage, botMessage, convId);
        
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
        
        const aiResponse = await callGeminiProxy(message, systemInstruction);
        
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
            
            const response = await saveMessage(message, aiResponse, conversationId);
            
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
    if (conversationId && conversationId !== 'new' && conversationId !== 'null' && conversationId !== 'undefined') {
        // Try to get the conversation summary
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
        enhancedPrompt = systemInstruction + "\n\n" + citationInstruction + "\n\n";
        
        // Add conversation summary if available
        if (conversationSummary) {
            enhancedPrompt += "Conversation context/summary:\n" + conversationSummary + "\n\n";
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
        enhancedPrompt = systemInstruction + "\n\n";
        
        // Add conversation summary if available
        if (conversationSummary) {
            enhancedPrompt += "Conversation context/summary:\n" + conversationSummary + "\n\n";
        }
        
        // Add user query
        enhancedPrompt += "User query: " + message;
    }
    
    // Clear the knowledge results for the next request
    window.lastKnowledgeResults = null;
    
    // Request configuration - ask the AI to generate a new conversation summary
    const requestConfig = {
        model: window.ENV.GEMINI_MODEL_NAME || 'Nourish-1.0',
        contents: enhancedPrompt,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
        }
    };
    
    // If we have a conversation summary, let's add a special instruction to update it
    if (conversationSummary) {
        requestConfig.contents += "\n\nAfter answering the user's query, please generate an updated conversation summary that captures the key points of the entire conversation so far, including this new exchange. The summary should include enough detail to help you remember what was discussed, including specific questions asked and information provided. Format it as: [SUMMARY] your comprehensive summary text [/SUMMARY]";
    } else {
        requestConfig.contents += "\n\nAfter answering the user's query, please generate a brief conversation summary that captures the key points of this exchange. The summary should include the user's question and the main points of your response to help you recall this conversation later. Format it as: [SUMMARY] your summary text [/SUMMARY]";
    }
    
    const response = await fetch('gemini-proxy.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestConfig)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Proxy error: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    let aiResponse = data.text || "I apologize, but I couldn't generate a response at this time.";
    
    // Extract and store the summary if it exists
    if (aiResponse.includes('[SUMMARY]') && aiResponse.includes('[/SUMMARY]')) {
        const summaryRegex = /\[SUMMARY\](.*?)\[\/SUMMARY\]/s;
        const match = aiResponse.match(summaryRegex);
        
        if (match && match[1]) {
            // Extract the new summary
            const newSummary = match[1].trim();
            console.log('%c[API] Extracted new conversation summary', 'color: #4CAF50');
            
            // Remove the summary from the visible response
            aiResponse = aiResponse.replace(summaryRegex, '').trim();
            
            // Store the summary in conversation state
            if (conversationModule && typeof conversationModule.setCurrentConversationSummary === 'function') {
                conversationModule.setCurrentConversationSummary(newSummary);
                
                // Add the summary to saveMessage when it gets called later
                window.pendingConversationSummary = newSummary;
            }
        }
    }
    
    return aiResponse;
} 