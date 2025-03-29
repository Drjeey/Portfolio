// Import the Google Generative AI library
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Get API key from environment variables (loaded by env.php)
const API_KEY = ENV.GEMINI_API_KEY;
const MODEL_NAME = ENV.GEMINI_MODEL_NAME;

// Get username from environment variables
const username = ENV.USER_INFO.username;

// Create personalized system instruction
const systemInstruction = `You are a helpful AI assistant having a conversation with ${username}. 
When responding, address ${username} by name occasionally to create a personalized experience.
Be friendly, concise, and helpful. Always focus on answering questions directly.`;

// Initialize the Gemini model
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME, 
    systemInstruction: systemInstruction
});

// Global variables for tracking current conversation
let currentConversationId = null;
let currentConversationTitle = "New Conversation";

document.addEventListener("DOMContentLoaded", async () => {
    // Personalize the welcome message
    const welcomeMessageElement = document.getElementById('welcome-message');
    if (welcomeMessageElement) {
        welcomeMessageElement.textContent = username !== 'User' 
            ? `Hi ${username}! How can I help you today?` 
            : `Hi there! How can I help you today?`;
    }

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
        } else {
            // If no conversation loaded, ensure welcome message is personalized
            const welcomeMessageElement = document.getElementById('welcome-message');
            if (welcomeMessageElement) {
                welcomeMessageElement.textContent = username !== 'User' 
                    ? `Hi ${username}! How can I help you today?` 
                    : `Hi there! How can I help you today?`;
            }
        }
    } catch (error) {
        console.error("Error checking login:", error);
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

    // Flag to track if this is the first message in a new conversation
    const isNewConversation = !currentConversationId;
    const userMessage = message; // Store for later use in title generation

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
        
        // Save chat to database and get the conversation ID
        const conversationData = await saveChatToDatabase(userMessage, response);
        
        // If this was a new conversation, generate a title for it
        if (isNewConversation && conversationData && conversationData.conversation_id) {
            generateConversationTitle(userMessage, conversationData.conversation_id);
        }
        
    } catch (error) {
        console.error("AI Response Error:", error);
        document.querySelector(".chat-messages .loader").remove();
        showErrorMessage();
    }
}

// ✅ Generate a title using AI for a conversation based on user's message
async function generateConversationTitle(userMessage, conversationId) {
    if (!userMessage || !conversationId) return;
    
    try {
        // Only generate titles for messages that are meaningful (more than a few words)
        if (userMessage.split(' ').length < 3) {
            // Use a simple approach for very short messages
            const shortTitle = userMessage.charAt(0).toUpperCase() + userMessage.slice(1);
            updateConversationTitle(shortTitle, conversationId);
            return;
        }
        
        // Prompt for the AI to generate a concise title
        const titlePrompt = `Task: Create a short, descriptive title (3-5 words) for a conversation based on this first message.
Message: "${userMessage}"

Requirements:
- Keep it under 5 words
- Make it descriptive and specific
- No quotes or punctuation
- No explanations, just the title

Title:`;
        
        // Get AI response for the title
        const result = await model.generateContent(titlePrompt);
        const titleSuggestion = await result.response.text();
        
        // Clean up the title (remove quotes, periods, new lines, etc.)
        let cleanTitle = titleSuggestion
            .replace(/["""'''.?!]/g, '')  // Remove punctuation
            .replace(/^\s+|\s+$/g, '')    // Trim whitespace
            .replace(/\n/g, '')           // Remove newlines
            .replace(/Title:?\s*/i, '')   // Remove "Title:" prefix if present
            .replace(/^(About|Regarding|RE:|On)\s/i, ''); // Remove common prefixes
        
        // Limit length
        if (cleanTitle.length > 40) {
            cleanTitle = cleanTitle.substring(0, 37) + '...';
        } else if (cleanTitle.length < 1) {
            // Fallback if we get an empty title
            cleanTitle = "Question about " + userMessage.split(' ').slice(0, 3).join(' ');
            if (cleanTitle.length > 40) {
                cleanTitle = cleanTitle.substring(0, 37) + '...';
            }
        }
        
        // Capitalize first letter of each word for a cleaner look
        cleanTitle = cleanTitle.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        console.log("Generated title:", cleanTitle);
        
        // Update the conversation title in the database
        updateConversationTitle(cleanTitle, conversationId);
    } catch (error) {
        console.error("Error generating conversation title:", error);
        // Fallback to a simple title
        const fallbackTitle = "Conversation " + new Date().toLocaleTimeString();
        updateConversationTitle(fallbackTitle, conversationId);
    }
}

// Helper function to update conversation title in database
async function updateConversationTitle(title, conversationId) {
    if (!title || !conversationId) return;
    
    try {
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=rename_conversation&conversation_id=${conversationId}&title=${encodeURIComponent(title)}`
        });
        
        const data = await response.json();
        if (data.success) {
            // Update current title and refresh conversation list
            if (conversationId === currentConversationId) {
                currentConversationTitle = title;
            }
            
            // Show title update notification
            showTitleNotification(title);
            
            loadConversations();
        }
    } catch (error) {
        console.error("Error updating conversation title:", error);
    }
}

// ✅ Show notification when AI generates a title
function showTitleNotification(title) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.title-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'title-notification';
        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(notification);
    }
    
    // Set notification text
    notification.textContent = `Conversation titled: "${title}"`;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
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
                return data; // Return data for title generation
            }
        }
        return null;
    } catch (error) {
        console.error("Error saving chat:", error);
        return null;
    }
}

// ✅ Add message to chat UI
function addMessageToUI(sender, message) {
    const chatContainer = document.querySelector(".chat-messages");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message", sender);
    
    // Special handling for model responses, which may have complex formatting
    if (sender === "model") {
        // First, handle paragraphs by splitting on double newlines
        const paragraphs = message.split(/\n\s*\n/);
        
        const formattedParagraphs = paragraphs.map(paragraph => {
            // Format this individual paragraph
            return formatParagraph(paragraph);
        });
        
        // Join paragraphs with proper spacing
        messageDiv.innerHTML = formattedParagraphs.join('<br><br>');
    } else {
        // For user messages, simple formatting is sufficient
        let formattedMessage = message
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
            
        messageDiv.innerHTML = `<p>${formattedMessage}</p>`;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper function to format individual paragraphs with lists, quotes, etc.
function formatParagraph(paragraph) {
    // Check if this paragraph is a list
    if (/^\s*(\d+\.\s|\*\s|-\s)/.test(paragraph)) {
        return formatAsList(paragraph);
    }
    
    // Regular paragraph formatting
    let formatted = paragraph
        // Convert URLs to clickable links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
        
        // Convert asterisk bullet points to list items
        .replace(/^(\s*)\*\s(.+)$/gm, '<li>$2</li>')
        
        // Convert dash bullet points to list items
        .replace(/^(\s*)-\s(.+)$/gm, '<li>$2</li>')
        
        // Convert numbered bullet points to list items
        .replace(/^(\s*)\d+\.\s(.+)$/gm, '<li>$2</li>')
        
        // Convert newlines to breaks
        .replace(/\n/g, '<br>');
    
    // Handle quoted text
    formatted = formatted.replace(/[""]([^""]+)[""]/g, '<span class="quoted-text">"$1"</span>');
    
    // Wrap in paragraph if it doesn't contain list items
    if (!formatted.includes('<li>')) {
        formatted = `<p>${formatted}</p>`;
    } else {
        // If it has list items, wrap them in a ul
        formatted = `<ul>${formatted}</ul>`;
    }
    
    return formatted;
}

// Helper function to format text as a list
function formatAsList(text) {
    // Split into lines
    const lines = text.split('\n');
    
    // Check if this is a numbered or bullet list
    const isNumbered = /^\s*\d+\./.test(lines[0]);
    
    // Format each line as a list item
    const listItems = lines.map(line => {
        // Remove the bullet/number prefix and convert to list item
        return `<li>${line.replace(/^\s*(\d+\.\s|\*\s|-\s)/, '')}</li>`;
    });
    
    // Join and wrap in the appropriate list type
    return isNumbered ? 
        `<ol>${listItems.join('')}</ol>` : 
        `<ul>${listItems.join('')}</ul>`;
}

// ✅ Start a new conversation (Clears UI but keeps history in DB)
async function startNewConversation() {
    try {
        // Create a better default title with date/time
        const now = new Date();
        const defaultTitle = `New Chat ${now.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
        
        // Create a new conversation in the database
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=new_conversation&title=${encodeURIComponent(defaultTitle)}`
        });
        
        const data = await response.json();
        if (data.success) {
            // Update current conversation
            currentConversationId = data.conversation_id;
            currentConversationTitle = data.title;
            
            // Personalized welcome message using the username
            const welcomeMessage = username !== 'User' 
                ? `<div class="model"><p>Hi ${username}! How can I help you today?</p></div>` 
                : `<div class="model"><p>Hi there! How can I help you today?</p></div>`;
            
            // Clear chat UI and add welcome message
            document.querySelector(".chat-messages").innerHTML = welcomeMessage;
            
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
