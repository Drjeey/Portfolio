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
        const titlePrompt = `As a nutrition assistant, create a short, descriptive title (5 words or less) that captures the essence of this conversation. Don't repeat the user's question verbatim. Instead, extract the key nutrition topic or concept and create a concise, professional title.

User message: "${userMessage}"

Example transformations:
- "What are the health benefits of eating apples?" → "Apple Health Benefits"
- "Is a keto diet good for weight loss?" → "Keto Diet Effectiveness"
- "What foods are high in protein that are vegan?" → "Vegan Protein Sources"

Title:`;
        
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

// Format messages from API for UI display
function formatMessagesForUI(messages) {
    return messages.map(message => {
        // Handle different message formats from the API
        if (message.user_message && message.bot_message) {
            // Create separate user and model messages
            return [
                { role: 'user', content: message.user_message },
                { role: 'model', content: message.bot_message }
            ];
        } else if (message.role && message.content) {
            // Already in the correct format
            return [message];
        } else if (message.text) {
            // Simple format with role and text
            return [{ role: message.sender || 'model', content: message.text }];
        }
        
        // Default fallback if format is unrecognized
        return [{ role: 'model', content: 'Unrecognized message format' }];
    }).flat();
}

// Load a specific conversation
export async function loadConversation(conversationId) {
    console.log('%c[CONVERSATION] Loading conversation:', 'color: #673AB7', conversationId);
    
    try {
        // Call API to get conversation details
        const response = await api.fetchConversation(conversationId);
        
        if (response.success) {
            console.log('%c[CONVERSATION] Loaded conversation successfully', 'color: #4CAF50');
            
            // Format messages for UI display
            const formattedMessages = formatMessagesForUI(response.messages || []);
            
            // Update conversation state
            currentState = {
                conversationId: conversationId,
                messages: formattedMessages
            };
            
            // Update UI with conversation messages
            ui.displayMessages(formattedMessages);
            
            // Update URL with conversation ID
            ui.updateURLWithConversationId(conversationId);
            
            // Highlight the active conversation in the list
            setActiveConversation(conversationId);
            
            return true;
        } else {
            console.error('%c[CONVERSATION ERROR] Failed to load conversation:', 'color: #f44336', response.message || 'Unknown error');
            alert('Failed to load conversation: ' + (response.message || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('%c[CONVERSATION ERROR] Exception while loading conversation:', 'color: #f44336', error);
        alert('An error occurred while loading the conversation.');
        return false;
    }
}

// Rename conversation
export async function renameConversation(conversationId) {
    console.log('%c[CONVERSATION] Renaming conversation:', 'color: #673AB7', conversationId);
    
    // Prompt user for new title
    const newTitle = prompt('Enter a new name for this conversation:', '');
    
    // If user cancels or enters empty string, don't proceed
    if (newTitle === null || newTitle.trim() === '') {
        console.log('%c[CONVERSATION] Rename cancelled or empty title', 'color: #FFC107');
        return false;
    }
    
    try {
        // Call API to rename conversation
        const response = await api.renameConversation(conversationId, newTitle);
        
        if (response.success) {
            console.log('%c[CONVERSATION] Renamed conversation successfully', 'color: #4CAF50');
            
            // If this is the current conversation, update the title
            if (currentState.conversationId === conversationId) {
                ui.updateConversationTitle(newTitle);
            }
            
            // Reload the conversation list to show updated title
            await loadConversationList();
            return true;
        } else {
            console.error('%c[CONVERSATION ERROR] Failed to rename conversation:', 'color: #f44336', response.message || 'Unknown error');
            alert('Failed to rename conversation: ' + (response.message || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('%c[CONVERSATION ERROR] Exception while renaming conversation:', 'color: #f44336', error);
        alert('An error occurred while renaming the conversation.');
        return false;
    }
}

// Delete conversation
export async function deleteConversation(conversationId) {
    console.log('%c[CONVERSATION] Deleting conversation:', 'color: #E91E63', conversationId);
    
    // Safety check: Don't delete a conversation that doesn't exist
    if (!conversationId) {
        console.error('%c[CONVERSATION ERROR] Cannot delete conversation: Invalid ID', 'color: #f44336');
        return { success: false, error: 'Invalid conversation ID' };
    }
    
    try {
        // Call API to delete the conversation
        const response = await api.deleteConversation(conversationId);
        
        if (response.success) {
            console.log('%c[CONVERSATION] Deleted conversation successfully:', 'color: #4CAF50', conversationId);
            
            // Update the UI
            ui.removeConversationFromList(conversationId);
            
            // If this was the active conversation, clear the chat window
            if (currentState.conversationId == conversationId) {
                ui.updateUIForNewConversation();
                currentState.conversationId = null;
                currentState.messages = [];
                
                // Update the URL to remove the conversation ID
                ui.updateURLWithConversationId(null);
            }
            
            return { success: true };
        } else {
            console.error('%c[CONVERSATION ERROR] Failed to delete conversation:', 'color: #f44336', response.error || 'Unknown error');
            return { success: false, error: response.error || 'Unknown error' };
        }
    } catch (error) {
        console.error('%c[CONVERSATION ERROR] Exception while deleting conversation:', 'color: #f44336', error);
        return { success: false, error: 'An error occurred while deleting the conversation.' };
    }
}

// Ensure history panel is visible after loading conversations
function ensureHistoryPanelVisibility() {
    console.log('%c[VISIBILITY] Ensuring history panel visibility', 'color: #ff9800; font-weight: bold');
    
    const historyPanel = document.querySelector('.history-panel');
    const historyItems = document.querySelector('.history-items');
    
    if (historyPanel) {
        historyPanel.classList.add('force-visible');
        console.log('%c[VISIBILITY] Added force-visible class to history panel', 'color: #4CAF50');
    } else {
        console.log('%c[VISIBILITY ERROR] History panel not found', 'color: #f44336; font-weight: bold');
    }
    
    if (historyItems) {
        historyItems.classList.add('force-visible');
        console.log('%c[VISIBILITY] Added force-visible class to history items', 'color: #4CAF50');
    } else {
        console.log('%c[VISIBILITY ERROR] History items not found', 'color: #f44336; font-weight: bold');
    }
}

// Verify that conversations are loaded correctly
function verifyConversationListLoaded() {
    const historyItems = document.querySelector('.history-items');
    
    console.log('%c[VERIFY] Checking if conversation list loaded properly', 'color: #E91E63; font-weight: bold');
    
    if (!historyItems) {
        console.error('%c[VERIFY ERROR] History items container not found', 'color: #f44336; font-weight: bold');
        return false;
    }
    
    const conversationItems = historyItems.querySelectorAll('.conversation-item');
    console.log('%c[VERIFY] Found', 'color: #E91E63', conversationItems.length, 'conversation items');
    
    // If no conversations, check if the empty message is displayed
    if (conversationItems.length === 0) {
        const emptyMessage = historyItems.querySelector('.empty-conversations-message');
        if (emptyMessage) {
            console.log('%c[VERIFY] Empty conversations message is displayed', 'color: #4CAF50');
            return true;
        } else {
            console.error('%c[VERIFY ERROR] No conversations and no empty message', 'color: #f44336; font-weight: bold');
            return false;
        }
    }
    
    return conversationItems.length > 0;
}

// Update loadConversationList to pass the createConversationItem function
async function loadConversationList() {
    ensureHistoryPanelVisibility();
    
    try {
        console.log('%c[CONVERSATION] Loading conversation list...', 'color: #2196F3');
        const response = await api.fetchConversations();
        
        if (response.success) {
            const conversations = response.conversations;
            console.log('%c[CONVERSATION] Loaded', 'color: #2196F3', conversations.length, 'conversations');
            
            ui.updateConversationListSimple(conversations, createConversationItem);
            ensureHistoryPanelVisibility();
            
            // Verify that the conversation list loaded correctly
            const verified = verifyConversationListLoaded();
            if (!verified) {
                console.warn('%c[CONVERSATION WARNING] Verification failed, re-ensuring visibility', 'color: #FFC107');
                ensureHistoryPanelVisibility();
                // Try one more time to update the UI
                ui.updateConversationListSimple(conversations, createConversationItem);
            }
            
            return conversations;
        } else {
            console.error('%c[CONVERSATION ERROR] Failed to load conversations:', 'color: #f44336', response.message || 'Unknown error');
            ensureHistoryPanelVisibility();
            return [];
        }
    } catch (error) {
        console.error('%c[CONVERSATION ERROR] Exception while loading conversations:', 'color: #f44336', error);
        ensureHistoryPanelVisibility();
        return [];
    }
}

// Start a new conversation
export async function startNewConversation() {
    console.log('%c[CONVERSATION] Starting new conversation', 'color: #673AB7');
    
    // Clear the current conversation
    ui.updateUIForNewConversation();
    
    // Reset conversation state with all required properties
    currentState = {
        conversationId: null,
        conversationTitle: "New Nutrition Conversation",
        conversationSummary: null,
        titleHasBeenUpdated: false,
        messages: []
    };
    
    try {
        // Call API to create a new conversation
        const response = await api.createConversation();
        
        if (response.success) {
            const newConversationId = response.conversation_id;
            console.log('%c[CONVERSATION] Created new conversation:', 'color: #4CAF50', newConversationId);
            
            // Update state with new ID
            currentState.conversationId = newConversationId;
            if (response.title) {
                currentState.conversationTitle = response.title;
            }
            
            // Store in window for cross-module access
            window.currentConversationId = newConversationId;
            
            // Update URL with new conversation ID
            ui.updateURLWithConversationId(newConversationId);
            
            // Reload conversation list to show the new conversation
            await loadConversationList();
            
            return { success: true, conversation_id: newConversationId };
        } else {
            console.error('%c[CONVERSATION ERROR] Failed to create new conversation:', 'color: #f44336', response.error || 'Unknown error');
            return { success: false, error: response.error || 'Unknown error' };
        }
    } catch (error) {
        console.error('%c[CONVERSATION ERROR] Exception while creating new conversation:', 'color: #f44336', error);
        return { success: false, error: 'An error occurred while creating a new conversation.' };
    }
}

// Function to clear the chat window
function clearChatWindow() {
    const chatMessages = document.querySelector(".chat-messages");
    if (chatMessages) {
        chatMessages.innerHTML = "";
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

// Get message count for a conversation
export async function getConversationMessageCount(conversationId) {
    if (!conversationId) {
        console.warn("No conversation ID provided to getConversationMessageCount");
        return 0;
    }
    
    try {
        console.log(`Getting message count for conversation: ${conversationId}`);
        return await api.getMessageCount(conversationId);
    } catch (error) {
        console.error("Error getting conversation message count:", error);
        return 0;
    }
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

// Set whether the current conversation title has been updated
export function setTitleHasBeenUpdated(value) {
    currentState.titleHasBeenUpdated = !!value;
    console.log("Title has been updated flag set to:", currentState.titleHasBeenUpdated);
}

// Listen for title update events from API
document.addEventListener('conversationTitleUpdated', async (event) => {
    const { conversationId, title, requiresGeneration, userMessage } = event.detail;
    
    // Show notification about the new title
    if (typeof ui !== 'undefined' && typeof ui.showTitleNotification === 'function') {
        ui.showTitleNotification(title);
    }
    
    // If this is a new conversation or first message that needs a proper title
    if (requiresGeneration && userMessage && conversationId) {
        console.log("Title requires generation, initiating process...");
        
        try {
            // Get the current model reference from window
            const model = window.currentModel || window.ENV.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
            
            // Generate a proper title
            await generateConversationTitle(userMessage, conversationId, model);
            console.log("Generated title for new conversation via event listener");
        } catch (err) {
            console.error("Failed to generate title via event:", err);
        }
    }
    
    // Update conversation list if we're in a conversation
    if (getCurrentConversationId()) {
        await loadConversationList();
    }
});

// Debug current conversation state - helpful for troubleshooting
export function debugConversationState() {
    const state = {
        currentStateId: currentState.conversationId,
        currentWindowId: window.currentConversationId,
        currentTitle: currentState.conversationTitle,
        titleUpdated: currentState.titleHasBeenUpdated,
        summary: currentState.conversationSummary ? 
            currentState.conversationSummary.substring(0, 50) + '...' : 
            null
    };
    
    console.log("CONVERSATION STATE:", state);
    
    // Check for UI state
    const activeConvElem = document.querySelector('.conversation-item.active');
    if (activeConvElem) {
        const activeId = activeConvElem.getAttribute('data-id');
        const activeTitle = activeConvElem.querySelector('.conversation-title')?.textContent;
        console.log("ACTIVE CONVERSATION UI:", { id: activeId, title: activeTitle });
    } else {
        console.log("No active conversation in UI");
    }
    
    return state;
}

// Create a conversation item element for the history panel
export function createConversationItem(conv) {
    // Format the date
    const date = new Date(conv.timestamp);
    const formattedDate = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    // Create the conversation item
    const conversationItem = document.createElement('div');
    conversationItem.className = 'conversation-item';
    conversationItem.dataset.id = conv.id;
    
    // Create the title element
    const titleElement = document.createElement('div');
    titleElement.className = 'conversation-title';
    titleElement.textContent = conv.title || 'New Conversation';
    
    // Create the date element
    const dateElement = document.createElement('div');
    dateElement.className = 'conversation-date';
    dateElement.textContent = formattedDate;
    
    // Create the actions container
    const actionsElement = document.createElement('div');
    actionsElement.className = 'conversation-actions';
    
    // Create rename button
    const renameBtn = document.createElement('button');
    renameBtn.className = 'rename-btn';
    renameBtn.dataset.id = conv.id;
    renameBtn.title = 'Rename';
    renameBtn.textContent = '✏️';
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.id = conv.id;
    deleteBtn.title = 'Delete';
    deleteBtn.textContent = '🗑️';
    
    // Add buttons to actions
    actionsElement.appendChild(renameBtn);
    actionsElement.appendChild(deleteBtn);
    
    // Add all elements to the conversation item
    conversationItem.appendChild(titleElement);
    conversationItem.appendChild(dateElement);
    conversationItem.appendChild(actionsElement);
    
    // Add event listener for loading the conversation
    conversationItem.addEventListener('click', (e) => {
        // Only proceed if we didn't click on a button
        if (!e.target.classList.contains('rename-btn') && 
            !e.target.classList.contains('delete-btn')) {
            loadConversation(conv.id);
        }
    });
    
    // Add event listeners for the action buttons
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renameConversation(conv.id);
    });
    
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Confirm deletion first
        if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            deleteConversation(conv.id).then(result => {
                if (!result.success) {
                    console.error('[CONVERSATION ERROR] Failed to delete conversation:', result.error);
                    alert('Failed to delete conversation: ' + (result.error || 'Unknown error'));
                }
            }).catch(error => {
                console.error('[CONVERSATION ERROR] Exception while deleting conversation:', error);
                alert('An error occurred while deleting the conversation.');
            });
        } else {
            console.log('[CONVERSATION] Delete cancelled by user');
        }
    });
    
    return conversationItem;
}

// Initialize the conversation module
export function init() {
    console.log('%c[CONVERSATION] Initializing conversation module', 'color: #673AB7; font-weight: bold');
    // Check if history panel exists and is visible
    ensureHistoryPanelVisibility();
    // Load the conversation list
    return loadConversationList();
}

// Set the active conversation in the UI
export function setActiveConversation(conversationId) {
    const items = document.querySelectorAll('.conversation-item');
    let found = false;
    
    items.forEach(item => {
        if (item.dataset.id === conversationId) {
            item.classList.add('active');
            found = true;
        } else {
            item.classList.remove('active');
        }
    });
    
    return found;
}

// Export the loadConversationList function
export { loadConversationList }; 