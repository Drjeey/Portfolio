const API_KEY = "AIzaSyAKwYcTuFbGXgprfJx_OG6MyotzxI5jTto"; // Replace with actual API Key
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

        for (const date in chatData) {
            const dateHeader = document.createElement("div");
            dateHeader.classList.add("chat-date");
            dateHeader.textContent = date;
            chatContainer.appendChild(dateHeader);

            chatData[date].forEach(({ user, bot }) => {
                addMessageToUI("user", user);
                addMessageToUI("model", bot);
            });
        }
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
function fetchChatHistory() {
    fetch("backend.php")
        .then(response => response.json())
        .then(data => {
            const historyContainer = document.querySelector(".history-items");
            historyContainer.innerHTML = "";

            for (const [date, chats] of Object.entries(data)) {
                const dayDiv = document.createElement("div");
                dayDiv.className = "history-day";
                dayDiv.innerHTML = `<h4>${date}</h4>`;

                chats.forEach(chat => {
                    const chatItem = document.createElement("div");
                    chatItem.className = "history-chat";
                    chatItem.innerHTML = `<p><b>You:</b> ${chat.user}</p><p><b>AI:</b> ${chat.bot}</p>`;
                    dayDiv.appendChild(chatItem);
                });

                historyContainer.appendChild(dayDiv);
            }
        })
        .catch(error => console.error("Error fetching history:", error));
}

// ✅ Start a new conversation (Clears UI but keeps history in DB)
function startNewConversation() {
    document.querySelector(".chat-messages").innerHTML = `
        <div class="model"><p>Hi, how can I help you today?</p></div>
    `;
}

// ✅ Show error message if AI fails
function showErrorMessage() {
    addMessageToUI("model", "Oops! Something went wrong. Please try again.");
}
