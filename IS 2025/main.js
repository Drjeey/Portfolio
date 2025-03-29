// Import the Google Generative AI library
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Get API key from environment variables (loaded by env.php)
const API_KEY = ENV.GEMINI_API_KEY;
const MODEL_NAME = ENV.GEMINI_MODEL_NAME;

// Get username from environment variables
const username = ENV.USER_INFO.username;

// Basic system instruction without personalization
const baseSystemInstruction = `You are a helpful health information assistant. 
Your primary focus is to provide clear, factual medical information and health advice.
Always include disclaimers when appropriate, reminding users to consult healthcare professionals for personalized medical advice.
Be friendly, concise, and helpful. Focus on answering health-related questions directly and accurately.`;

// Initialize the Gemini model with base instruction (personalization will be added contextually)
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME, 
    systemInstruction: baseSystemInstruction
});

// Global variables for tracking current conversation
let currentConversationId = null;
let currentConversationTitle = "New Conversation";

document.addEventListener("DOMContentLoaded", async () => {
    // Personalize the welcome message for health information
    const welcomeMessageElement = document.getElementById('welcome-message');
    if (welcomeMessageElement) {
        welcomeMessageElement.textContent = username !== 'User' 
            ? `Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?` 
            : `Hello! I'm your health information assistant. How can I help you with your health questions today?`;
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
            // If no conversation loaded, ensure welcome message is personalized and properly formatted
            const welcomeContainer = document.querySelector(".chat-messages");
            const welcomeHtml = username !== 'User' 
                ? `<div class="model"><div class="message-content"><p>Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?</p></div></div>` 
                : `<div class="model"><div class="message-content"><p>Hello! I'm your health information assistant. How can I help you with your health questions today?</p></div></div>`;
            
            welcomeContainer.innerHTML = welcomeHtml;
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
            
            // Find and set the conversation title
            const conversationElements = document.querySelectorAll(`.conversation-item .rename-btn[data-id="${conversationId}"]`);
            if (conversationElements.length > 0) {
                const titleElement = conversationElements[0].closest('.conversation-item').querySelector('.conversation-title');
                if (titleElement) {
                    currentConversationTitle = titleElement.textContent;
                    // Update document title with conversation title
                    document.title = `${currentConversationTitle} - AI Assistant`;
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

// Add a date separator to the chat
function addDateSeparator(dateStr) {
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
        let result;
        let summaryPrompt;
        let currentSummary = "";
        let customModel;
        
        // Get conversation history for context if this is not a new conversation
        if (!isNewConversation) {
            try {
                // Fetch conversation history
                const historyResponse = await fetch(`backend.php?get_history=true&conversation_id=${currentConversationId}`);
                
                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();
                    
                    // Check if we have a summary to use
                    if (historyData.summary) {
                        currentSummary = historyData.summary;
                        
                        // For existing conversations with history, use a context-aware system instruction
                        // that doesn't need personalized greeting but focuses on medical information
                        const contextSystemInstruction = `${baseSystemInstruction}
Based on this conversation summary: "${currentSummary}", 
provide a focused healthcare response that maintains contextual relevance.`;
                        
                        // Create custom model instance with context-aware system instruction
                        customModel = genAI.getGenerativeModel({ 
                            model: MODEL_NAME, 
                            systemInstruction: contextSystemInstruction
                        });
                    } else {
                        // No summary yet, but we have history - use the base model
                        customModel = model;
                    }
                    
                    if (historyData.messages && historyData.messages.length > 0) {
                        // Create a dual-purpose prompt with summary request
                        const summaryContext = currentSummary 
                            ? `Current conversation summary: ${currentSummary}\n\n` 
                            : "There is no summary yet for this conversation. Please create one.\n\n";
                            
                        summaryPrompt = `${summaryContext}${message}\n\n===\nBased on our conversation, please provide two things:\n1. A direct response to my health question above.\n2. An updated brief summary (2-3 sentences) of our entire health-related conversation including this latest exchange.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the updated summary.`;
                        
                        // Create a chat with history
                        const chat = customModel.startChat({
                            history: historyData.messages,
                            generationConfig: {
                                maxOutputTokens: 8192,
                            },
                        });
                        
                        // Generate content with history context and summary request
                        result = await chat.sendMessage(summaryPrompt);
                    } else {
                        // No message history yet, still request a summary with the response
                        summaryPrompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the summary.`;
                        result = await customModel.generateContent(summaryPrompt);
                    }
                } else {
                    // History fetch failed, still make a dual-purpose request
                    summaryPrompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the summary.`;
                    result = await model.generateContent(summaryPrompt);
                }
            } catch (historyError) {
                console.error("Error fetching conversation history:", historyError);
                // Fallback to generating content with summary request
                summaryPrompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the updated summary.`;
                result = await model.generateContent(summaryPrompt);
            }
        } else {
            // New conversation - use personalized greeting for first-time interactions
            const personalizedSystemInstruction = `You are a helpful health information assistant talking with ${username}.
Your primary focus is to provide clear, factual medical information and health advice.
Always include disclaimers when appropriate, reminding users to consult healthcare professionals for personalized medical advice.
Since this is your first interaction, greet ${username} by name and be welcoming before providing health information.`;
            
            // Create a model with personalized first-interaction system instruction
            const firstInteractionModel = genAI.getGenerativeModel({ 
                model: MODEL_NAME, 
                systemInstruction: personalizedSystemInstruction
            });
            
            // New conversation, still request a summary with the response
            summaryPrompt = `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above, starting with a personalized greeting.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the summary.`;
            result = await firstInteractionModel.generateContent(summaryPrompt);
        }
        
        const fullResponse = await result.response.text();
        
        // Parse the response to separate the actual response from the summary
        const responsePart = extractResponsePart(fullResponse);
        const summaryPart = extractSummaryPart(fullResponse);
        
        // Remove loader before adding response
        document.querySelector(".chat-messages .loader").remove();
        
        // Only show the response part to the user, not the summary
        addMessageToUI("model", responsePart);
        
        // Save chat to database with both response and summary
        const conversationData = await saveChatToDatabase(userMessage, responsePart, summaryPart);
        
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

// Helper function to extract the response part from the AI output
function extractResponsePart(fullText) {
    // Look for "RESPONSE:" marker
    if (fullText.includes("RESPONSE:")) {
        const responsePart = fullText.split("RESPONSE:")[1].split("SUMMARY:")[0].trim();
        return responsePart;
    }
    
    // If we can't find the expected format, try a simpler approach to separate
    // response from summary (assume summary comes after a double line break)
    const parts = fullText.split(/\n\s*\n/);
    if (parts.length > 1) {
        // Return everything except what looks like a summary at the end
        const possibleSummary = parts[parts.length - 1];
        if (possibleSummary.length < 250 && (possibleSummary.includes("summary") || possibleSummary.includes("Summary"))) {
            return parts.slice(0, -1).join("\n\n");
        }
    }
    
    // Fallback - if we can't identify a clear summary, return the full text
    return fullText;
}

// Helper function to extract the summary part from the AI output
function extractSummaryPart(fullText) {
    // Look for "SUMMARY:" marker
    if (fullText.includes("SUMMARY:")) {
        return fullText.split("SUMMARY:")[1].trim();
    }
    
    // If we can't find the expected format, try to extract the last paragraph
    // if it looks like a summary
    const parts = fullText.split(/\n\s*\n/);
    if (parts.length > 1) {
        const possibleSummary = parts[parts.length - 1];
        if (possibleSummary.length < 250 && (possibleSummary.includes("summary") || possibleSummary.includes("Summary"))) {
            return possibleSummary;
        }
    }
    
    // Fallback - generate a very basic summary
    return `Conversation about ${fullText.split(' ').slice(0, 5).join(' ')}...`;
}

// ✅ Generate a title using AI for a conversation based on user's message
async function generateConversationTitle(userMessage, conversationId) {
    if (!userMessage || !conversationId) return;
    
    try {
        // Only generate titles for messages that are meaningful (more than a few words)
        if (userMessage.split(' ').length < 3) {
            // Use a simple approach for very short messages
            const shortTitle = "Health Query: " + userMessage.charAt(0).toUpperCase() + userMessage.slice(1);
            updateConversationTitle(shortTitle, conversationId);
            return;
        }
        
        // Prompt for the AI to generate a concise health-related title
        const titlePrompt = `Task: Create a short, descriptive title (3-5 words) for a conversation about a health topic based on this first message.
Message: "${userMessage}"

Requirements:
- Keep it under 5 words
- Make it descriptive of the health topic
- Focus on the medical/health aspect
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
            cleanTitle = "Health Question: " + userMessage.split(' ').slice(0, 3).join(' ');
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
        const fallbackTitle = "Health Conversation " + new Date().toLocaleTimeString();
        updateConversationTitle(fallbackTitle, conversationId);
    }
}

// Helper function to update conversation title in database
async function updateConversationTitle(title, conversationId) {
    if (!title || !conversationId) return;
    
    try {
        // First update in database
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `action=rename_conversation&conversation_id=${conversationId}&title=${encodeURIComponent(title)}`
        });
        
        const data = await response.json();
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
                if (currentConversationId === conversationId) {
                    currentConversationTitle = title;
                    
                    // Update document title
                    document.title = `${title} - AI Assistant`;
                    
                    // Show notification of title change
                    showTitleNotification(title);
                }
            }
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
async function saveChatToDatabase(userMessage, botResponse, summary = null) {
    try {
        const postData = new URLSearchParams({
            user_message: userMessage,
            bot_message: botResponse
        });
        
        // Add conversation ID if we have one
        if (currentConversationId) {
            postData.append('conversation_id', currentConversationId);
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

// ✅ Add a message to the chat UI
function addMessageToUI(sender, message) {
    // Create a new message element
    const messageDiv = document.createElement("div");
    messageDiv.className = sender;
    
    // Use marked.js to parse markdown
    // Configure marked options
    marked.setOptions({
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Interpret line breaks as <br>
        sanitize: false, // Allow HTML
        smartLists: true,
        smartypants: true
    });
    
    // Container for the formatted message
    const contentContainer = document.createElement("div");
    contentContainer.className = "message-content";
    
    try {
        // Parse the markdown
        const formattedMessage = marked.parse(message);
        contentContainer.innerHTML = formattedMessage;
        
        // Make links open in new tab
        const links = contentContainer.querySelectorAll('a');
        links.forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Add the message content container to the message div
        messageDiv.appendChild(contentContainer);
    } catch (error) {
        console.error("Error parsing markdown:", error);
        // Fallback to simple formatting
        contentContainer.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
        messageDiv.appendChild(contentContainer);
    }
    
    // Add the message to the chat container
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(messageDiv);
    
    // Scroll to the bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
            
            // Personalized welcome message using the username, focused on health
            const welcomeMessage = username !== 'User' 
                ? `<div class="model"><div class="message-content"><p>Hi ${username}! I'm your health information assistant. How can I help you with your health questions today?</p></div></div>` 
                : `<div class="model"><div class="message-content"><p>Hello! I'm your health information assistant. How can I help you with your health questions today?</p></div></div>`;
            
            // Clear chat UI and add welcome message
            document.querySelector(".chat-messages").innerHTML = welcomeMessage;
            
            // Always refresh conversation list to ensure new conversation appears 
            // and is properly highlighted
            loadConversations();
            
            // Update document title to make it clear user started a new chat
            document.title = "New Health Chat - AI Assistant";
        }
    } catch (error) {
        console.error("Error creating new conversation:", error);
    }
}

// ✅ Show error message if AI fails
function showErrorMessage() {
    addMessageToUI("model", "I apologize, but I'm having trouble processing your health question right now. Please try again or rephrase your question. Remember, for urgent medical concerns, please contact a healthcare professional directly.");
}
