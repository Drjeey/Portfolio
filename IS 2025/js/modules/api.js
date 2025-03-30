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
    try {
        const historyResponse = await fetch(`backend.php?get_history=true&conversation_id=${conversationId}`);
        if (historyResponse.ok) {
            return await historyResponse.json();
        } else {
            throw new Error("Error retrieving conversation history");
        }
    } catch (error) {
        console.error("Error fetching conversation history:", error);
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
        
        const response = await fetch('backend.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'saveMessage',
                user_message: userMessage,
                bot_message: botMessage,
                conversation_id: convId
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
        
        const systemInstruction = "You are NutriGuide, a specialized nutrition assistant powered by Nourish 1.0.";
        const aiResponse = await callGeminiProxy(message, systemInstruction);
        
        // Now we have the AI response, handle saving it
        if (!conversationId || conversationId === 'new' || conversationId === 'null' || conversationId === 'undefined') {
            console.log('%c[API] Creating new conversation with initial message', 'color: #9C27B0');
            
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
                    conversation_id: 'new'
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
    
    // Build the prompt based on knowledge base results
    if (knowledgeResults && knowledgeResults.results && knowledgeResults.results.length > 0) {
        console.log('%c[API] Using knowledge base results to enhance prompt', 'color: #9C27B0');
        
        // Start with system instruction
        enhancedPrompt = systemInstruction + "\n\n";
        
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
        enhancedPrompt += "Based on the nutrition information above, please provide a helpful response. Include references to the sources when appropriate.";
    } else {
        // Just use the basic prompt
        enhancedPrompt = `${systemInstruction}\n\nUser query: ${message}`;
    }
    
    // Clear the knowledge results for the next request
    window.lastKnowledgeResults = null;
    
    const response = await fetch('gemini-proxy.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: window.ENV.GEMINI_MODEL_NAME || 'Nourish-1.0',
            contents: enhancedPrompt,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Proxy error: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    return data.text || "I apologize, but I couldn't generate a response at this time.";
} 