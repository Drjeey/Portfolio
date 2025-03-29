const API_KEY = "Gemini-Api key"; // Replace with actual API Key
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const businessInfo = `
  Company Name: ABC Corp
  Address: 123 Main St
  Phone: (555) 123-4567
`; // Business information

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    systemInstruction: businessInfo
});

// Global variables for tracking current conversation
let currentConversationId = null;
let currentConversationTitle = "New Conversation";

document.addEventListener("DOMContentLoaded", async () => {
    await checkLogin(); // Ensure only logged-in users access this page
    loadConversations(); // Load conversation list
    
    document.querySelector(".send-btn").addEventListener("click", sendMessage);
    document.querySelector(".message-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    document.querySelector(".new-chat-btn").addEventListener("click", startNewConversation);
});

// ✅ Check if the user is logged in, redirect if not
async function checkLogin() {
    try {
        const response = await fetch("backend.php");
        const data = await response.json();
        if (!data.success) {
            window.location.href = "Form.php";
        } else if (data.conversation_id) {
            // Set the current conversation
            currentConversationId = data.conversation_id;
            currentConversationTitle = data.title;
            
            // Load the messages for this conversation
            const chatContainer = document.querySelector(".chat-messages");
            chatContainer.innerHTML = ""; // Clear previous messages
            
            for (const date in data.messages) {
                addDateSeparator(date);
                data.messages[date].forEach(({ user, bot }) => {
                    addMessageToUI("user", user);
                    addMessageToUI("model", bot);
                });
            }
        }
    } catch {
        window.location.href = "Form.php";
    }
}

// ✅ Load conversations for the sidebar
async function loadConversations() {
    try {
        const response = await fetch("backend.php?list=conversations");
        const { success, conversations } = await response.json();
        
        if (success && conversations) {
            const historyContainer = document.querySelector(".history-items");
            historyContainer.innerHTML = ""; // Clear previous history
            
            conversations.forEach(conversation => {
                const dateObj = new Date(conversation.updated_at);
                const formattedDate = formatDate(dateObj);
                
                const conversationItem = document.createElement("div");
                conversationItem.className = "conversation-item";
                if (conversation.id === currentConversationId) {
                    conversationItem.classList.add("active");
                }
                
                conversationItem.innerHTML = `
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-date">${formattedDate}</div>
                    <div class="conversation-actions">
                        <button class="rename-btn" data-id="${conversation.id}" title="Rename">✏️</button>
                        <button class="delete-btn" data-id="${conversation.id}" title="Delete">🗑️</button>
                    </div>
                `;
                
                // Add click event to load this conversation
                conversationItem.addEventListener("click", (e) => {
                    // Ignore clicks on the action buttons
                    if (e.target.classList.contains("rename-btn") || 
                        e.target.classList.contains("delete-btn")) {
                        return;
                    }
                    loadConversation(conversation.id);
                });
                
                historyContainer.appendChild(conversationItem);
            });
            
            // Add event listeners for conversation actions
            document.querySelectorAll(".rename-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    renameConversation(btn.dataset.id);
                });
            });
            
            document.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    deleteConversation(btn.dataset.id);
                });
            });
        }
    } catch (error) {
        console.error("Error loading conversations:", error);
    }
}

// ✅ Load a specific conversation
async function loadConversation(conversationId) {
    try {
        const response = await fetch(`backend.php?conversation_id=${conversationId}`);
        const data = await response.json();
        
        if (data.success && data.messages) {
            // Clear chat area
            const chatContainer = document.querySelector(".chat-messages");
            chatContainer.innerHTML = "";
            
            // Set current conversation
            currentConversationId = conversationId;
            
            // Group messages by date
            const messagesByDate = {};
            data.messages.forEach(message => {
                const dateStr = message.date.split(' ')[0]; // Get just the date part
                if (!messagesByDate[dateStr]) {
                    messagesByDate[dateStr] = [];
                }
                messagesByDate[dateStr].push(message);
            });
            
            // Add messages grouped by date
            for (const date in messagesByDate) {
                addDateSeparator(date);
                messagesByDate[date].forEach(message => {
                    addMessageToUI("user", message.user_message);
                    addMessageToUI("model", message.bot_message);
                });
            }
            
            // Scroll to bottom
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            // Update active conversation in sidebar
            document.querySelectorAll(".conversation-item").forEach(item => {
                item.classList.remove("active");
                if (item.querySelector(`.rename-btn[data-id="${conversationId}"]`)) {
                    item.classList.add("active");
                }
            });
        }
    } catch (error) {
        console.error("Error loading conversation:", error);
    }
}

// ✅ Rename a conversation
async function renameConversation(conversationId) {
    const newTitle = prompt("Enter a new title for this conversation:");
    if (!newTitle || newTitle.trim() === "") return;
    
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=rename_conversation&conversation_id=${conversationId}&title=${encodeURIComponent(newTitle.trim())}`
        });
        
        const data = await response.json();
        if (data.success) {
            loadConversations(); // Refresh the conversation list
            if (conversationId === currentConversationId) {
                currentConversationTitle = newTitle.trim();
            }
        }
    } catch (error) {
        console.error("Error renaming conversation:", error);
    }
}

// ✅ Delete a conversation
async function deleteConversation(conversationId) {
    if (!confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
        return;
    }
    
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=delete_conversation&conversation_id=${conversationId}`
        });
        
        const data = await response.json();
        if (data.success) {
            if (conversationId === currentConversationId) {
                // We deleted the current conversation, so start a new one
                startNewConversation();
            } else {
                loadConversations(); // Just refresh the conversation list
            }
        }
    } catch (error) {
        console.error("Error deleting conversation:", error);
    }
}

// ✅ Add date separator to the chat UI
function addDateSeparator(dateStr) {
    const chatContainer = document.querySelector(".chat-messages");
    const dateHeader = document.createElement("div");
    dateHeader.className = "chat-date";
    
    // Format the date
    const formattedDate = formatDate(new Date(dateStr));
    dateHeader.textContent = formattedDate;
    
    chatContainer.appendChild(dateHeader);
}

// ✅ Send message to AI model & save to database
async function sendMessage() {
    const input = document.querySelector(".message-input");
    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessageToUI("user", message);

    // ✅ Add loader while waiting for AI response
    const chatContainer = document.querySelector(".chat-messages");
    const loaderDiv = document.createElement("div");
    loaderDiv.className = "loader";
    loaderDiv.textContent = "Thinking...";
    chatContainer.appendChild(loaderDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const result = await model.generateContent(message);
        const response = await result.response.text();

        // Remove loader before adding response
        document.querySelector(".chat-messages .loader").remove();
        addMessageToUI("model", response);
        saveChatToDatabase(message, response);
    } catch (error) {
        console.error("AI Response Error:", error);
        document.querySelector(".chat-messages .loader").remove();
        showErrorMessage();
    }
}

// ✅ Save user message & AI response to the database
async function saveChatToDatabase(userMessage, botResponse) {
    try {
        const postData = new URLSearchParams({
            user_message: userMessage,
            bot_message: botResponse
        });
        
        // Add conversation ID if we have one
        if (currentConversationId) {
            postData.append('conversation_id', currentConversationId);
        }
        
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: postData
        });
        
        const data = await response.json();
        if (data.success) {
            // If this created a new conversation, update our current conversation ID
            if (data.conversation_id && !currentConversationId) {
                currentConversationId = data.conversation_id;
                loadConversations(); // Refresh the conversation list
            }
        }
    } catch (error) {
        console.error("Error saving chat:", error);
    }
}

// ✅ Add message to chat UI
function addMessageToUI(sender, message) {
    const chatContainer = document.querySelector(".chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message", sender);
    messageDiv.innerHTML = `<p>${message}</p>`;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ✅ Start a new conversation (Clears UI but keeps history in DB)
async function startNewConversation() {
    try {
        // Create a new conversation in the database
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=new_conversation&title=New Conversation`
        });
        
        const data = await response.json();
        if (data.success) {
            // Update current conversation
            currentConversationId = data.conversation_id;
            currentConversationTitle = data.title;
            
            // Clear chat UI
            document.querySelector(".chat-messages").innerHTML = `
                <div class="model"><p>Hi, how can I help you today?</p></div>
            `;
            
            // Refresh conversation list
            loadConversations();
        }
    } catch (error) {
        console.error("Error creating new conversation:", error);
    }
}

// ✅ Format date helper
function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
        return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

// ✅ Show error message if AI fails
function showErrorMessage() {
    addMessageToUI("model", "Oops! Something went wrong. Please try again.");
}
