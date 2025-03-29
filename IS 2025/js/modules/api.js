// api.js - Handles API communication with backend and AI models

// Export GoogleGenerativeAI initialization
export function initializeAI(apiKey, modelName, systemInstruction) {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ 
        model: modelName, 
        systemInstruction: systemInstruction
    });
}

// Check login status
export async function checkLoginStatus() {
    try {
        const response = await fetch("backend.php");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error checking login:", error);
        throw error;
    }
}

// Load all conversations for the sidebar
export async function fetchConversations() {
    try {
        const response = await fetch("backend.php?list=conversations");
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error loading conversations:", error);
        throw error;
    }
}

// Load a specific conversation by ID
export async function fetchConversation(conversationId) {
    try {
        const response = await fetch(`backend.php?conversation_id=${conversationId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error loading conversation:", error);
        throw error;
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

// Rename a conversation
export async function renameConversationAPI(conversationId, newTitle) {
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=rename_conversation&conversation_id=${conversationId}&title=${encodeURIComponent(newTitle.trim())}`
        });
        
        return await response.json();
    } catch (error) {
        console.error("Error renaming conversation:", error);
        throw error;
    }
}

// Delete a conversation
export async function deleteConversationAPI(conversationId) {
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=delete_conversation&conversation_id=${conversationId}`
        });
        
        return await response.json();
    } catch (error) {
        console.error("Error deleting conversation:", error);
        throw error;
    }
}

// Create a new conversation
export async function createConversation(title) {
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=new_conversation&title=${encodeURIComponent(title)}`
        });
        
        return await response.json();
    } catch (error) {
        console.error("Error creating new conversation:", error);
        throw error;
    }
}

// Save chat messages to database
export async function saveChatMessages(userMessage, botResponse, conversationId, summary = null) {
    try {
        const postData = new URLSearchParams({
            user_message: userMessage,
            bot_message: botResponse
        });
        
        // Add conversation ID if we have one
        if (conversationId) {
            postData.append('conversation_id', conversationId);
        }
        
        // Add the summary if we have one
        if (summary) {
            postData.append('conversation_summary', summary);
        }
        
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: postData
        });
        
        return await response.json();
    } catch (error) {
        console.error("Error saving chat:", error);
        throw error;
    }
} 