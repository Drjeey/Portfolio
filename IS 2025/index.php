<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | Your Personal Nutrition Assistant</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥗</text></svg>">
    <meta name="description" content="NutriGuide - Your personal AI nutrition assistant powered by Nourish 1.0">
</head>
<body onload="checkLogin()">
    <div class="container">
        <aside class="history-panel">
            <h3>Chat History</h3>
            <button class="new-chat-btn sidebar-btn">
                <span class="btn-icon">💬</span> New Conversation
            </button>
            <div class="history-items">
                <!-- Chat history will be populated by JavaScript -->
            </div>
            <a href="process_form.php?logout=true" class="logout-btn sidebar-btn">
                <span class="logout-icon">⏻</span> Logout
            </a>
        </aside>
        
        <section class="chat-window">
            <div class="chat-header">
                <h2><span class="logo-icon">🥗</span> NutriGuide</h2>
                <div class="model-name">Powered by Nourish 1.0</div>
            </div>
            <div class="chat-messages">
                <div class="model">
                    <div class="message-content">
                        <p id="welcome-message">Hello! I'm NutriGuide, your personal nutrition assistant. How can I help you with your dietary and nutrition questions today?</p>
                    </div>
                </div>
            </div>
            <div class="input-area">
                <input type="text" placeholder="Ask NutriGuide about nutrition..." class="message-input">
                <button class="send-btn">
                    <span style="font-size: 18px;">➤</span>
                </button>
            </div>
        </section>
    </div>
    <!-- Notification container (will be populated by JavaScript) -->
    <div id="notification-container"></div>

    <!-- Hidden debug controls - for development only -->
    <div class="debug-controls" style="position: fixed; right: 10px; bottom: 10px; z-index: 9999; display: none;">
        <button id="debug-conversation-btn" style="background: #665CAC; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Debug Conversations</button>
    </div>

    <script defer>
        function checkLogin() {
                fetch("backend.php")
                .then(response => response.json())
                .then(data => {
                    if (data.success === false && data.error === "Unauthorized") {
                        window.location.href = "Form.php"; // Corrected to Form.php
                    }
                })
                .catch(() => window.location.href = "Form.php"); // Corrected to Form.php
            }
    </script>
    <!-- Load sources data first to ensure it's available -->
    <script src="js/data/sources-preloader.js"></script>

    <!-- Load environment variables and main scripts -->
    <script src="env.php?v=<?php echo time(); ?>"></script>
    
    <!-- Wait for environment to be loaded before loading the app code -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.ENV === 'undefined' || !window.ENV.GEMINI_API_KEY) {
                console.error('Environment variables not loaded properly');
                document.querySelector('.chat-messages').innerHTML += '<div class="model"><div class="message-content"><p>Error: Unable to connect to AI service. Please try again later.</p></div></div>';
            }
        });
    </script>
    
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <!-- Import and use main.js as a module with cache busting -->
    <script type="module" src="main.js?v=<?php echo time(); ?>"></script>

    <script>
        // Development debug helpers
        document.addEventListener('DOMContentLoaded', function() {
            // Enable debug controls with keyboard shortcut (Ctrl+Shift+D)
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                    const debugControls = document.querySelector('.debug-controls');
                    if (debugControls) {
                        debugControls.style.display = debugControls.style.display === 'none' ? 'block' : 'none';
                    }
                }
            });
            
            // Add click handler for debug button
            const debugBtn = document.getElementById('debug-conversation-btn');
            if (debugBtn) {
                debugBtn.addEventListener('click', function() {
                    if (window.conversation && typeof window.conversation.debugConversationState === 'function') {
                        window.conversation.debugConversationState();
                    } else {
                        console.log("Conversation module or debug function not available");
                        console.log("window.currentConversationId =", window.currentConversationId);
                    }
                });
            }
        });
    </script>

    <!-- Preload nutrition sources -->
    <script>
        // Preload nutrition sources
        async function preloadNutritionSources() {
            try {
                const response = await fetch('js/data/nutrition_sources.json');
                if (response.ok) {
                    const data = await response.json();
                    window.NUTRITION_SOURCES = data;
                    console.log("Successfully preloaded nutrition sources:", Object.keys(data.sources || data).length, "sources");
                    return true;
                } else {
                    console.warn("Failed to preload nutrition sources, will try again later");
                    return false;
                }
            } catch (error) {
                console.error("Error preloading nutrition sources:", error);
                return false;
            }
        }

        // Initialize app after preloading resources
        async function initApp() {
            // Try to preload nutrition sources
            await preloadNutritionSources();
            
            // Continue with app initialization
            document.addEventListener('DOMContentLoaded', function() {
                // Initialize the app when the DOM is fully loaded
                console.log("DOM fully loaded, initializing app");
                if (typeof initChatApp === 'function') {
                    initChatApp();
                }
            });
        }

        // Start initialization
        initApp();
    </script>

    <!-- JavaScript Libraries -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/4.0.2/marked.min.js"></script>
</body>
</html>