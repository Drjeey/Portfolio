// main.js - Main orchestrator file for the health AI chat application

// Import required modules
import * as api from './js/modules/api.js';
import * as ui from './js/modules/ui.js';
import * as chat from './js/modules/chat.js';
import * as conversation from './js/modules/conversation.js';

// Global error handling for debugging
window.addEventListener('unhandledrejection', (event) => {
    console.error('%c❌ UNHANDLED PROMISE REJECTION:', 'color: #f44336; font-weight: bold', event.promise, event.reason);
    console.error('Stack trace:', event.reason.stack);
});

window.addEventListener('error', (event) => {
    console.error('%c❌ GLOBAL ERROR EVENT:', 'color: #f44336; font-weight: bold', event.message);
    console.error('Stack trace:', event.error ? event.error.stack : 'No stack trace available');
});

// Function to check DOM for critical elements
window.checkDOM = function() {
    console.log('%c🔍 DOM STRUCTURE CHECK', 'color: #00BCD4; font-weight: bold; font-size: 14px');
    
    // Check critical elements
    const elements = [
        '.container',
        '.history-panel',
        '.history-items',
        '.chat-window',
        '.chat-messages',
        '.new-chat-btn'
    ];
    
    elements.forEach(selector => {
        const el = document.querySelector(selector);
        console.log('%c' + selector + ':', 'color: #00BCD4; font-weight: bold');
        
        if (el) {
            const style = window.getComputedStyle(el);
            console.log('- Found:', true);
            console.log('- Display:', style.display);
            console.log('- Visibility:', style.visibility);
            console.log('- Opacity:', style.opacity);
            console.log('- Height:', style.height);
            console.log('- Children Count:', el.children.length);
        } else {
            console.log('- Found:', false);
        }
    });
    
    return "DOM check complete. Check console for details.";
};

// Add diagnostics function to window for easy access
window.diagnostics = function() {
    console.log('%c🔍 DIAGNOSTICS RUNNING', 'color: #9C27B0; font-weight: bold; font-size: 14px');
    
    // Log environment variables
    console.log('%c📊 Environment Info:', 'color: #9C27B0; font-weight: bold');
    console.log('- URL:', window.location.href);
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Window Size:', window.innerWidth, 'x', window.innerHeight);
    console.log('- Current Conversation ID:', conversation.getCurrentConversationId());
    
    // Local storage diagnostics
    console.log('%c📦 Local Storage:', 'color: #9C27B0; font-weight: bold');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`- ${key}:`, localStorage.getItem(key));
    }
    
    // Emergency CSS fixes
    console.log('%c🛠️ Applying Emergency CSS Fixes', 'color: #FF5722; font-weight: bold');
    
    const historyPanel = document.querySelector('.history-panel');
    const historyItems = document.querySelector('.history-items');
    
    if (historyPanel) {
        historyPanel.classList.add('force-visible');
        console.log('- Applied force-visible class to history panel');
    }
    
    if (historyItems) {
        historyItems.classList.add('force-visible');
        console.log('- Applied force-visible class to history items');
    }
    
    // Check DOM structure
    debugSidebar();
    
    // Last resort: try to reload conversation list
    console.log('%c🔄 Reloading Conversation List', 'color: #FF5722; font-weight: bold');
    if (conversation && typeof conversation.loadConversationList === 'function') {
        conversation.loadConversationList().then(result => {
            console.log('- Conversation list reload result:', result);
        });
    }
    
    return "Diagnostics complete. Check console for details.";
};

// Expose modules to window for debugging (only in development)
window.conversation = conversation;
window.chat = chat;
window.ui = ui;
window.api = api;

// Check if ENV is defined
if (typeof window.ENV === 'undefined') {
    console.error("ERROR: Environment variables not loaded. Make sure env.php is loaded before main.js");
    window.ENV = {
        GEMINI_API_KEY: null,
        GEMINI_MODEL_NAME: null,
        USER_INFO: { username: 'User' }
    };
}

// Flag to track if event listeners have been set up
let listenersInitialized = false;

// Initialize the chat application
function initChatApp() {
    console.log("%c🚀 MAIN: Initializing chat app", "color: #4CAF50; font-weight: bold");
    
    // Apply force-visible class to history elements on startup
    const historyPanel = document.querySelector('.history-panel');
    const historyItems = document.querySelector('.history-items');
    
    if (historyPanel) {
        historyPanel.classList.add('force-visible');
        console.log("%c✅ MAIN: Added force-visible class to history panel", "color: #4CAF50");
    }
    
    if (historyItems) {
        historyItems.classList.add('force-visible');
        console.log("%c✅ MAIN: Added force-visible class to history items", "color: #4CAF50");
    }
    
    // Initialize conversation
    conversation.init();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial UI setup
    ui.updateUIForNewConversation();
    
    // Debug the sidebar state
    debugSidebar();
}

// Setup event listeners for the UI
function setupEventListeners() {
    console.log("%c🔄 MAIN: Setting up event listeners", "color: #4CAF50");
    
    // Send button click
    const sendButton = document.querySelector('.send-btn');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const userInput = document.querySelector('.message-input');
            const message = userInput.value.trim();
            
            if (message) {
                chat.sendMessage(message);
                userInput.value = '';
            }
        });
    }
    
    // User input keypress (Enter to send)
    const userInput = document.querySelector('.message-input');
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = userInput.value.trim();
                
                if (message) {
                    chat.sendMessage(message);
                    userInput.value = '';
                }
            }
        });
    }
    
    // New chat button
    const newChatButton = document.querySelector('.new-chat-btn');
    if (newChatButton) {
        newChatButton.addEventListener('click', () => {
            conversation.startNewConversation();
        });
    }
}

// Debug function for the sidebar
function debugSidebar() {
    const historyPanel = document.querySelector('.history-panel');
    const historyItems = document.querySelector('.history-items');
    
    console.log("%c📊 SIDEBAR DEBUG INFO:", "color: #2196F3; font-weight: bold");
    console.log("%c- History panel exists:", "color: #2196F3", !!historyPanel);
    console.log("%c- History items exists:", "color: #2196F3", !!historyItems);
    
    if (historyPanel) {
        const style = window.getComputedStyle(historyPanel);
        console.log("%c- History panel display:", "color: #2196F3", style.display);
        console.log("%c- History panel visibility:", "color: #2196F3", style.visibility);
        console.log("%c- History panel opacity:", "color: #2196F3", style.opacity);
        console.log("%c- History panel width:", "color: #2196F3", style.width);
    }
    
    if (historyItems) {
        console.log("%c- History items children:", "color: #2196F3", historyItems.children.length);
        const style = window.getComputedStyle(historyItems);
        console.log("%c- History items display:", "color: #2196F3", style.display);
        console.log("%c- History items visibility:", "color: #2196F3", style.visibility);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("%c🚀 DOM loaded, checking login status", "color: #4CAF50");
    
    api.checkLoginStatus()
        .then(response => {
            console.log("%c👉 Login check response:", "color: #FF9800", response);
            
            if (response.success) {
                // Check if user is admin and redirect if needed
                if (response.is_admin) {
                    console.log("%c👑 Admin user detected, redirecting to admin panel", "color: #FF9800");
                    console.log("%c🔄 Current location:", "color: #FF9800", window.location.href);
                    console.log("%c🔄 Redirecting to:", "color: #FF9800", "admin/index.php");
                    
                    // Force redirect with no caching
                    window.location.replace("admin/index.php");
                    return; // Stop execution
                } else {
                    console.log("%c👤 Regular user detected, initializing app", "color: #4CAF50");
                    initChatApp();
                }
            } else {
                console.log("%c⚠️ User not authenticated, redirecting to login", "color: #FFC107");
                window.location.href = "Form.php";
            }
        })
        .catch(error => {
            console.error("%c❌ Login check failed", "color: #f44336", error);
            alert("Failed to check login status. Please refresh the page.");
        });
});
