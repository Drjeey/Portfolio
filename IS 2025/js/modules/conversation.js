// conversation.js - Manages conversation operations

import * as api from './api.js';
import * as ui from './ui.js';
import * as messageHandling from './messageHandling.js';

// Global state for current conversation
let currentState = {
    conversationId: null,
    conversationTitle: "New Conversation"
};

// Generate a title for a conversation using AI
export async function generateConversationTitle(userMessage, conversationId, model) {
    if (!userMessage || !conversationId) return;
    
    try {
        // Only generate titles for messages that are meaningful (more than a few words)
        if (userMessage.split(' ').length < 3) {
            // Use a simple approach for very short messages
            const shortTitle = "Health Query: " + userMessage.charAt(0).toUpperCase() + userMessage.slice(1);
            await updateConversationTitle(shortTitle, conversationId);
            return;
        }
        
        // Get title prompt
        const titlePrompt = messageHandling.createTitleGenerationPrompt(userMessage);
        
        // Get AI response for the title
        const result = await model.generateContent(titlePrompt);
        const titleSuggestion = await result.response.text();
        
        // Clean up the title
        const cleanTitle = messageHandling.cleanupGeneratedTitle(titleSuggestion, userMessage);
        
        console.log("Generated title:", cleanTitle);
        
        // Update the conversation title in the database
        await updateConversationTitle(cleanTitle, conversationId);
    } catch (error) {
        console.error("Error generating conversation title:", error);
        // Fallback to a simple title
        const fallbackTitle = "Health Conversation " + new Date().toLocaleTimeString();
        await updateConversationTitle(fallbackTitle, conversationId);
    }
}

// Update conversation title in database and UI
export async function updateConversationTitle(title, conversationId) {
    if (!title || !conversationId) return;
    
    try {
        // First update in database
        const data = await api.renameConversationAPI(conversationId, title);
        
        if (data.success) {
            // Update the title in the conversation list
            const titleElements = document.querySelectorAll(`.conversation-item .rename-btn[data-id="${conversationId}"]`);
            if (titleElements.length > 0) {
                titleElements.forEach(el => {
                    const titleElement = el.closest('.conversation-item').querySelector('.conversation-title');
                    if (titleElement) {
                        titleElement.textContent = title;
                    }
                });
                
                // Update the current conversation title if this is the active conversation
                if (currentState.conversationId === conversationId) {
                    currentState.conversationTitle = title;
                    
                    // Update document title
                    ui.updateDocumentTitle(title);
                    
                    // Show notification of title change
                    ui.showTitleNotification(title);
                }
            }
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
            // Update the UI with conversations
            ui.updateConversationList(
                conversations, 
                currentState.conversationId,
                (id) => loadConversation(id),
                (id) => renameConversation(id),
                (id) => deleteConversation(id)
            );
        }
    } catch (error) {
        console.error("Error loading conversations:", error);
    }
}

// Start a new conversation
export async function startNewConversation() {
    try {
        // Create a better default title with date/time
        const defaultTitle = messageHandling.createDefaultTitle();
        
        // Create a new conversation in the database
        const data = await api.createConversation(defaultTitle);
        
        if (data.success) {
            // Update current conversation
            currentState.conversationId = data.conversation_id;
            currentState.conversationTitle = data.title;
            
            // Get personalized welcome message
            const welcomeMessage = ui.getWelcomeMessageHTML(window.username);
            
            // Clear chat UI and add welcome message
            document.querySelector(".chat-messages").innerHTML = welcomeMessage;
            
            // Always refresh conversation list to ensure new conversation appears 
            // and is properly highlighted
            await loadConversationList();
            
            // Update document title to make it clear user started a new chat
            ui.updateDocumentTitle("New Health Chat");
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

// Set current conversation ID and title
export function setCurrentConversation(id, title) {
    currentState.conversationId = id;
    currentState.conversationTitle = title;
} 