// ui.js - Handles UI interactions and DOM manipulations

// We need to access marked from the global scope since it's loaded in index.php
// This is safer than trying to import it directly in the module
const marked = window.marked;

// Add a message to the chat UI
export function addMessageToUI(sender, message) {
    // Create a new message element
    const messageDiv = document.createElement("div");
    messageDiv.className = sender;
    
    // Format message content using marked.js
    let formattedContent;
    
    try {
        // Configure marked options
        marked.setOptions({
            gfm: true, // GitHub Flavored Markdown
            breaks: true, // Convert line breaks to <br>
            sanitize: false, // Allow HTML
            smartLists: true
        });
        
        // Parse markdown
        formattedContent = marked.parse(message);
    } catch (error) {
        console.error("Error parsing markdown:", error);
        // Fallback to basic formatting
        formattedContent = `<p>${message.replace(/\n/g, '<br>')}</p>`;
    }
    
    // Use standard paragraph for user messages
    if (sender === "user") {
        messageDiv.innerHTML = `<p>${message}</p>`;
    } else {
        // For model responses, use marked to handle rich formatting
        messageDiv.innerHTML = formattedContent;
    }
    
    // Add the message to the chat container
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add a date separator to the chat
export function addDateSeparator(dateStr) {
    const chatContainer = document.querySelector(".chat-messages");
    
    // Check if we already have this date in the chat
    if (document.querySelector(`.chat-date[data-date="${dateStr}"]`)) {
        return;
    }
    
    // Format the date
    const dateParts = dateStr.split('-');
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const today = new Date();
    
    // Check if this is today
    let displayDate;
    if (dateObj.toDateString() === today.toDateString()) {
        displayDate = "Today";
    } else {
        // Format as Month Day, Year
        displayDate = dateObj.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    // Create date separator element that's not inside a message bubble
    const dateDiv = document.createElement("div");
    dateDiv.className = "chat-date";
    dateDiv.setAttribute("data-date", dateStr);
    dateDiv.textContent = displayDate;
    
    chatContainer.appendChild(dateDiv);
}

// Show loading indicator while waiting for AI response
export function showLoadingIndicator() {
    const chatContainer = document.querySelector(".chat-messages");
    const loaderDiv = document.createElement("div");
    loaderDiv.className = "loader";
    loaderDiv.textContent = "Thinking...";
    chatContainer.appendChild(loaderDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loaderDiv;
}

// Remove loading indicator
export function removeLoadingIndicator() {
    const loader = document.querySelector(".chat-messages .loader");
    if (loader) {
        loader.remove();
    }
}

// Show error message if AI fails
export function showErrorMessage() {
    const messageDiv = document.createElement("div");
    messageDiv.className = "model";
    messageDiv.innerHTML = "<p>I apologize, but I'm having trouble processing your health question right now. Please try again or rephrase your question. Remember, for urgent medical concerns, please contact a healthcare professional directly.</p>";
    
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show notification when AI generates a title
export function showTitleNotification(title) {
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

// Update UI with conversation list
export function updateConversationList(conversations, currentConversationId, onConversationClick, onRenameClick, onDeleteClick) {
    const historyContainer = document.querySelector(".history-items");
    historyContainer.innerHTML = ""; // Clear previous history
    
    conversations.forEach(conversation => {
        const dateObj = new Date(conversation.updated_at);
        let formattedDate;
        
        // Format the date
        const today = new Date();
        if (dateObj.toDateString() === today.toDateString()) {
            formattedDate = "Today";
        } else {
            formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        
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
            onConversationClick(conversation.id);
        });
        
        historyContainer.appendChild(conversationItem);
    });
    
    // Add event listeners for conversation actions
    document.querySelectorAll(".rename-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onRenameClick(btn.dataset.id);
        });
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDeleteClick(btn.dataset.id);
        });
    });
}

// Update UI when a conversation is loaded
export function displayConversation(messages, messagesByDate) {
    // Clear chat area
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.innerHTML = "";
    
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
}

// Set active conversation in sidebar
export function setActiveConversation(conversationId) {
    document.querySelectorAll(".conversation-item").forEach(item => {
        item.classList.remove("active");
        if (item.querySelector(`.rename-btn[data-id="${conversationId}"]`)) {
            item.classList.add("active");
        }
    });
}

// Update document title
export function updateDocumentTitle(title) {
    document.title = `${title} - AI Assistant`;
}

// Get welcome message HTML
export function getWelcomeMessageHTML(username) {
    return username !== 'User' 
        ? `<div class="model"><p>Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?</p></div>` 
        : `<div class="model"><p>Hello! I'm your health information assistant. How can I help you with your health questions today?</p></div>`;
} 