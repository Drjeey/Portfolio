const API_KEY = "Gemini-Api key"; // Replace with actual API Key
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

const businessInfo = `
  Company Name: ABC Corp
  Address: 123 Main St
  Phone: (555) 123-4567
`; // Business information

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    systemInstruction: businessInfo
});

document.addEventListener("DOMContentLoaded", async () => {
    await checkLogin(); // Ensure only logged-in users access this page
    loadChatHistory(); // Load chat history for the logged-in user
    
    // Call fetchChatHistory separately in case loadChatHistory fails
    if (document.querySelector(".history-items").children.length === 0) {
        fetchChatHistory();
    }

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
        if (data.success === false && data.error === "Unauthorized") {
            window.location.href = "Form.html";
        }
    } catch {
        window.location.href = "Form.html";
    }
}

// ✅ Load user-specific chat history
async function loadChatHistory() {
    try {
        const response = await fetch("backend.php");
        const chatData = await response.json();

        const chatContainer = document.querySelector(".chat-messages");
        chatContainer.innerHTML = ""; // Clear previous messages

        // Add default welcome message if no history
        if (Object.keys(chatData).length === 0) {
            const modelDiv = document.createElement("div");
            modelDiv.classList.add("model");
            modelDiv.innerHTML = "<p>Hi, how can I help you today?</p>";
            chatContainer.appendChild(modelDiv);
            return;
        }

        // Add the most recent conversation to chat window
        const latestDate = Object.keys(chatData)[0];
        const latestChats = chatData[latestDate];
        
        latestChats.forEach(({ user, bot }) => {
            addMessageToUI("user", user);
            addMessageToUI("model", bot);
        });
        
        // Also populate the history panel
        fetchChatHistory(chatData);
    } catch (error) {
        console.error("Error loading chat history:", error);
    }
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
        const response = await fetch("backend.php", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `user_message=${encodeURIComponent(userMessage)}&bot_message=${encodeURIComponent(botResponse)}`
        });
        console.log("Chat saved:", await response.json());
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

// ✅ Fetch and display chat history in a separate section
function fetchChatHistory(chatData = null) {
    if (!chatData) {
        fetch("backend.php")
            .then(response => response.json())
            .then(data => {
                renderHistoryPanel(data);
            })
            .catch(error => console.error("Error fetching history:", error));
    } else {
        renderHistoryPanel(chatData);
    }
}

function renderHistoryPanel(data) {
    const historyContainer = document.querySelector(".history-items");
    historyContainer.innerHTML = "";

    for (const [date, chats] of Object.entries(data)) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "history-day";
        
        // Format the date to be more readable
        const formattedDate = formatDate(date);
        dayDiv.innerHTML = `<h4>${formattedDate}</h4>`;

        // Show preview of first message in this day's chats
        if (chats.length > 0) {
            const previewItem = document.createElement("div");
            previewItem.className = "history-chat";
            
            // Truncate message if too long
            const userMsg = chats[0].user.length > 30 ? 
                chats[0].user.substring(0, 27) + "..." : 
                chats[0].user;
                
            previewItem.innerHTML = `<p>You: ${userMsg}</p>`;
            
            // Add click event to load this conversation
            previewItem.addEventListener("click", () => {
                loadSpecificConversation(date, chats);
            });
            
            dayDiv.appendChild(previewItem);
        }

        historyContainer.appendChild(dayDiv);
    }
}

// Format date from YYYY-MM-DD to a more readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
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

// Load a specific conversation when clicked from history
function loadSpecificConversation(date, chats) {
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.innerHTML = ""; // Clear current chat
    
    // Add date header
    const dateHeader = document.createElement("div");
    dateHeader.classList.add("chat-date");
    dateHeader.textContent = formatDate(date);
    chatContainer.appendChild(dateHeader);
    
    // Add messages
    chats.forEach(({ user, bot }) => {
        addMessageToUI("user", user);
        addMessageToUI("model", bot);
    });
}

// ✅ Start a new conversation (Clears UI but keeps history in DB)
function startNewConversation() {
    document.querySelector(".chat-messages").innerHTML = `
        <div class="model"><p>Hi, how can I help you today?</p></div>
    `;
    
    // Refresh the chat history panel
    fetchChatHistory();
}

// ✅ Show error message if AI fails
function showErrorMessage() {
    addMessageToUI("model", "Oops! Something went wrong. Please try again.");
}
