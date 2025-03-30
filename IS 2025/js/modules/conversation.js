// conversation.js - Manages conversation operations

import * as api from './api.js';
import * as ui from './ui.js';
import * as messageHandling from './messageHandling.js';

// Global state for current conversation
let currentState = {
    conversationId: null,
    conversationTitle: "New Nutrition Conversation",
    conversationSummary: null,
    titleHasBeenUpdated: false // Track if the title has been updated from default
};

// Generate a title for a conversation using AI
export async function generateConversationTitle(userMessage, conversationId, model) {
    if (!userMessage || !conversationId) return;
    
    try {
        // Check if model is available
        if (!model) {
            throw new Error("NutriGuide model not initialized for title generation");
        }
        
        // Only generate titles for messages that are meaningful (more than a few words)
        if (userMessage.split(' ').length < 3) {
            // Use a simple approach for very short messages
            const shortTitle = "Nutrition Query: " + userMessage.charAt(0).toUpperCase() + userMessage.slice(1);
            await updateConversationTitle(shortTitle, conversationId);
            return;
        }
        
        // Get title prompt - specifically for nutrition topics
        const titlePrompt = `Please generate a short, descriptive title (5 words or less) for a nutrition conversation that starts with this message: "${userMessage}". Focus on the nutrition or dietary aspect of the question.`;
        
        // Get AI response for the title using the new API format through our proxy
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: window.ENV.GEMINI_MODEL_NAME || 'Nourish-1.0',
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
        
        // Clean up the title - remove quotes, markdown, and limit length
        titleSuggestion = cleanupTitle(titleSuggestion);
        
        console.log("Generated title:", titleSuggestion);
        
        // Update the conversation title in the database and UI
        await updateConversationTitle(titleSuggestion, conversationId);
        
        // Mark title as updated
        currentState.titleHasBeenUpdated = true;
        console.log("Title has been updated flag set to:", currentState.titleHasBeenUpdated);
    } catch (error) {
        console.error("Error generating conversation title:", error);
        // Fallback to a simple title
        const fallbackTitle = "NutriGuide Chat " + new Date().toLocaleTimeString();
        await updateConversationTitle(fallbackTitle, conversationId);
        
        // Even with fallback, mark as updated
        currentState.titleHasBeenUpdated = true;
    }
}

// Helper function to clean up title text - remove markdown, quotes, etc.
function cleanupTitle(title) {
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

// Update conversation title in the database and UI
export async function updateConversationTitle(newTitle, conversationId) {
    if (!newTitle || !conversationId) {
        console.error("Cannot update title: missing title or conversation ID");
        return;
    }
    
    try {
        // Update title in the database
        const result = await api.updateConversationTitle(newTitle, conversationId);
        
        if (result.success) {
            // Update the current conversation state
            if (conversationId === currentState.conversationId) {
                currentState.conversationTitle = newTitle;
                // Mark the title as having been updated
                currentState.titleHasBeenUpdated = true;
            }
            
            // Find and update all matching conversation title elements in the UI
            const conversationItems = document.querySelectorAll(`.conversation-item[data-id="${conversationId}"] .conversation-title`);
            
            if (conversationItems.length > 0) {
                conversationItems.forEach(titleElement => {
                    titleElement.textContent = newTitle;
                });
                console.log("Updated title elements in UI:", conversationItems.length);
                
                // Also update the document title if this is the current conversation
                if (conversationId === currentState.conversationId) {
                    ui.updateDocumentTitle(newTitle);
                }
            } else {
                // If we can't find any elements with the title, refresh the conversation list
                console.log("No title elements found for conversation, refreshing list");
                await loadConversationList();
            }
            
            // Make sure the active conversation stays highlighted
            ui.setActiveConversation(conversationId);
        } else {
            console.error("Failed to update conversation title:", result.error || "Unknown error");
        }
    } catch (error) {
        console.error("Error updating conversation title:", error);
    }
}

// Load a conversation by ID
export async function loadConversation(conversationId) {
    try {
        const data = await api.fetchConversation(conversationId);
        
        if (data.success && data.messages) {
            // Clear chat area
            const chatContainer = document.querySelector(".chat-messages");
            chatContainer.innerHTML = "";
            
            // Set current conversation
            currentState.conversationId = conversationId;
            
            // Find and set the conversation title
            const conversationElements = document.querySelectorAll(`.conversation-item .rename-btn[data-id="${conversationId}"]`);
            if (conversationElements.length > 0) {
                const titleElement = conversationElements[0].closest('.conversation-item').querySelector('.conversation-title');
                if (titleElement) {
                    currentState.conversationTitle = titleElement.textContent;
                    // Update document title with conversation title
                    ui.updateDocumentTitle(currentState.conversationTitle);
                }
            }
            
            // Set the conversation summary from the response
            if (data.conversation_summary) {
                console.log("Setting conversation summary from API response:", data.conversation_summary);
                currentState.conversationSummary = data.conversation_summary;
            } else {
                // If no summary in the direct response, try fetching it
                try {
                    await fetchConversationSummary(conversationId);
                } catch (summaryError) {
                    console.error("Error fetching conversation summary:", summaryError);
                    // Continue without summary if there's an error
                    currentState.conversationSummary = null;
                }
            }
            
            // Group messages by date
            const messagesByDate = {};
            data.messages.forEach(message => {
                const dateStr = message.date.split(' ')[0]; // Get just the date part
                if (!messagesByDate[dateStr]) {
                    messagesByDate[dateStr] = [];
                }
                messagesByDate[dateStr].push(message);
            });
            
            // Display conversation in UI
            ui.displayConversation(data.messages, messagesByDate);
            
            // Update active conversation in sidebar
            ui.setActiveConversation(conversationId);
        }
    } catch (error) {
        console.error("Error loading conversation:", error);
    }
}

// Rename conversation
export async function renameConversation(conversationId) {
    const newTitle = prompt("Enter a new title for this conversation:");
    if (!newTitle || newTitle.trim() === "") return;
    
    try {
        const data = await api.renameConversationAPI(conversationId, newTitle.trim());
        
        if (data.success) {
            // Refresh the conversation list
            await loadConversationList();
            
            if (conversationId === currentState.conversationId) {
                currentState.conversationTitle = newTitle.trim();
            }
        }
    } catch (error) {
        console.error("Error renaming conversation:", error);
    }
}

// Delete conversation
export async function deleteConversation(conversationId) {
    if (!confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
        return;
    }
    
    try {
        const data = await api.deleteConversationAPI(conversationId);
        
        if (data.success) {
            if (conversationId === currentState.conversationId) {
                // We deleted the current conversation, so start a new one
                await startNewConversation();
            } else {
                // Just refresh the conversation list
                await loadConversationList();
            }
        }
    } catch (error) {
        console.error("Error deleting conversation:", error);
    }
}

// Load conversation list
export async function loadConversationList() {
    try {
        const { success, conversations } = await api.fetchConversations();
        
        if (success && conversations) {
            // Check if our current conversation is in the list
            let currentConversationFound = false;
            if (currentState.conversationId) {
                currentConversationFound = conversations.some(conv => conv.id === currentState.conversationId);
            }
            
            // Update the UI with conversations
            ui.updateConversationList(
                conversations, 
                currentState.conversationId,
                (id) => loadConversation(id),
                (id) => renameConversation(id),
                (id) => deleteConversation(id)
            );
            
            // If we have a current conversation that's not in the list (race condition),
            // force a UI update for it
            if (currentState.conversationId && !currentConversationFound) {
                console.log("Current conversation not found in list, forcing UI update");
                ui.setActiveConversation(currentState.conversationId);
            }
        }
    } catch (error) {
        console.error("Error loading conversations:", error);
    }
}

// Start a new conversation
export async function startNewConversation() {
    try {
        // Create a better default title with date/time - focused on nutrition
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const defaultTitle = `NutriGuide Chat ${formattedTime}`;
        
        // Create a new conversation in the database
        const data = await api.createConversation(defaultTitle);
        
        if (data.success) {
            // Update current conversation
            currentState.conversationId = data.conversation_id;
            currentState.conversationTitle = defaultTitle;
            currentState.conversationSummary = null; // Reset summary for new conversation
            currentState.titleHasBeenUpdated = false; // Explicitly mark title as not updated
            
            // Get personalized welcome message
            const welcomeMessage = ui.getWelcomeMessageHTML(window.username);
            
            // Clear chat UI and add welcome message
            document.querySelector(".chat-messages").innerHTML = welcomeMessage;
            
            // Always refresh conversation list to ensure new conversation appears 
            // and is properly highlighted
            await loadConversationList();
            
            // Update document title to make it clear user started a new chat
            ui.updateDocumentTitle("New NutriGuide Chat");
        }
    } catch (error) {
        console.error("Error creating new conversation:", error);
    }
}

// Get current conversation ID
export function getCurrentConversationId() {
    return currentState.conversationId;
}

// Get current conversation title
export function getCurrentConversationTitle() {
    return currentState.conversationTitle;
}

// Get current conversation summary
export function getCurrentConversationSummary() {
    return currentState.conversationSummary;
}

// Set current conversation summary
export function setCurrentConversationSummary(summary) {
    currentState.conversationSummary = summary;
}

// Set current conversation ID and title
export function setCurrentConversation(id, title, summary = null) {
    currentState.conversationId = id;
    currentState.conversationTitle = title;
    currentState.conversationSummary = summary;
    // Reset the title update flag when setting a new conversation
    currentState.titleHasBeenUpdated = false;
}

// Fetch current conversation summary
export async function fetchConversationSummary(conversationId) {
    if (!conversationId) return null;
    
    try {
        const historyData = await api.fetchConversationHistory(conversationId);
        if (historyData && historyData.summary) {
            currentState.conversationSummary = historyData.summary;
            return historyData.summary;
        }
        return null;
    } catch (error) {
        console.error("Error fetching conversation summary:", error);
        return null;
    }
}

// Get whether the current conversation title has been updated from default
export function getTitleHasBeenUpdated() {
    return currentState.titleHasBeenUpdated;
} 