<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Assistant</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
</head>
<body onload="checkLogin()">
    <div class="container">
        <aside class="history-panel">
            <h3>Chat History</h3>
            <div class="history-items">
                <!-- Chat history will be populated by JavaScript -->
            </div>
        </aside>
        
        <section class="chat-window">
            <div class="chat-header">
                <h2>AI Assistant</h2>
                <button class="new-chat-btn">New Conversation</button>
                <a href="process_form.php?logout=true" class="logout-btn">Logout</a>
            </div>
            <div class="chat-messages">
                <div class="model">
                    <p>Hi, how can I help you today?</p>
                </div>
            </div>
            <div class="input-area">
                <input type="text" placeholder="Type your message..." class="message-input">
                <button class="send-btn">
                    <img src="send.png" alt="Send">
                </button>
            </div>
        </section>
    </div>
    <!-- Notification container (will be populated by JavaScript) -->
    <div id="notification-container"></div>
<script>
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
    <!-- Load environment variables first -->
    <script src="env.php"></script>
    <!-- Then load the main application code -->
    <script type="module" src="main.js"></script>
</body>
</html>