<?php
session_start();

// Include necessary files
require_once '../db_config.php';
require_once 'functions.php';

// Verify admin access
verifyAdminAccess();

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    die("Database connection failed");
}

// Get conversation ID
$conversation_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($conversation_id <= 0) {
    // Invalid conversation ID, redirect to conversations list
    header("Location: conversations.php");
    exit;
}

// Get conversation details
$stmt = $conn->prepare("
    SELECT c.id, c.user_id, c.title, c.created_at, c.updated_at, c.conversation_summary, u.username
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
");
$stmt->bind_param("i", $conversation_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Conversation not found, redirect to conversations list
    header("Location: conversations.php");
    exit;
}

$conversation = $result->fetch_assoc();
$stmt->close();

// Get user information
$user = getUserById($conn, $conversation['user_id']);
if (!$user) {
    $user = ['username' => 'Unknown User'];
}

// Get all messages in this conversation
$chats = getChatsByConversationId($conn, $conversation_id);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | View Conversation</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>��</text></svg>">
    <style>
        :root {
            --primary-purple: #665CAC;
            --secondary-purple: #8678c5;
            --light-purple: #f1eeff;
            --dark-text: #333;
            --light-text: #777;
            --success-green: #27ae60;
            --warning-yellow: #f39c12;
            --danger-red: #e74c3c;
            --border-color: #ddd;
            --user-message-bg: #f1f1f1;
            --bot-message-bg: var(--light-purple);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Raleway', sans-serif;
        }
        
        body {
            background-color: #f5f7fb;
            color: var(--dark-text);
            line-height: 1.6;
        }
        
        .container {
            display: block;
            min-height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            background-color: var(--primary-purple);
            color: white;
            padding: 2rem 1rem;
            position: fixed;
            height: 100vh;
            width: 250px;
            overflow-y: auto;
        }
        
        .logo {
            display: flex;
            align-items: center;
            margin-bottom: 2rem;
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .logo-icon {
            font-size: 2rem;
            margin-right: 0.5rem;
        }
        
        .sidebar-nav {
            list-style: none;
        }
        
        .sidebar-nav li {
            margin-bottom: 0.5rem;
        }
        
        .sidebar-nav a {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.2s;
        }
        
        .sidebar-nav a:hover, .sidebar-nav a.active {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-nav .icon {
            margin-right: 0.75rem;
            font-size: 1.2rem;
        }
        
        .logout-link {
            position: absolute;
            bottom: 2rem;
            left: 1rem;
            width: calc(250px - 2rem);
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            display: flex;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.1);
            transition: background-color 0.2s;
        }
        
        .logout-link:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .logout-icon {
            margin-right: 0.75rem;
        }
        
        /* Main Content */
        .main-content {
            padding: 2rem;
            margin-left: 250px;
            overflow-y: auto;
            min-height: 100vh;
            box-sizing: border-box;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .page-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--dark-text);
        }
        
        .back-btn {
            display: flex;
            align-items: center;
            color: var(--primary-purple);
            text-decoration: none;
            font-weight: bold;
        }
        
        .back-btn:hover {
            text-decoration: underline;
        }
        
        .back-icon {
            margin-right: 0.5rem;
        }
        
        /* Conversation Details */
        .conversation-details {
            background-color: white;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .detail-row {
            display: flex;
            margin-bottom: 1rem;
        }
        
        .detail-label {
            width: 150px;
            font-weight: bold;
            color: var(--light-text);
        }
        
        .detail-value {
            flex: 1;
            color: var(--dark-text);
        }
        
        /* Conversation Messages */
        .conversation-messages {
            margin-top: 2rem;
        }
        
        .message-heading {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        
        .message-container {
            margin-bottom: 2rem;
            background-color: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .message-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.9rem;
            color: var(--light-text);
        }
        
        .message-date {
            font-style: italic;
        }
        
        .message-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .user-message, .bot-message {
            padding: 1rem;
            border-radius: 8px;
        }
        
        .user-message {
            background-color: var(--user-message-bg);
        }
        
        .bot-message {
            background-color: var(--bot-message-bg);
        }
        
        .message-label {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: var(--dark-text);
        }
        
        .raw-output {
            margin-top: 1rem;
            border-top: 1px solid var(--border-color);
            padding-top: 1rem;
        }
        
        .raw-output-toggle {
            background: none;
            border: none;
            color: var(--primary-purple);
            font-weight: bold;
            cursor: pointer;
            padding: 0.5rem 0;
            text-align: left;
            width: 100%;
            display: flex;
            align-items: center;
        }
        
        .raw-output-toggle:hover {
            text-decoration: underline;
        }
        
        .toggle-icon {
            margin-right: 0.5rem;
            transition: transform 0.2s;
        }
        
        .raw-output-content {
            display: none;
            background-color: #f8f8f8;
            padding: 1rem;
            border-radius: 8px;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 0.9rem;
            margin-top: 0.5rem;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .raw-output-content.active {
            display: block;
        }
        
        .no-messages {
            text-align: center;
            padding: 3rem;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            color: var(--light-text);
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <span class="logo-icon">🥗</span>
                <span>NutriGuide Admin</span>
            </div>
            
            <ul class="sidebar-nav">
                <li>
                    <a href="dashboard.php">
                        <span class="icon">📊</span>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="users.php">
                        <span class="icon">👥</span>
                        <span>User Management</span>
                    </a>
                </li>
                <li>
                    <a href="conversations.php" class="active">
                        <span class="icon">💬</span>
                        <span>Conversations</span>
                    </a>
                </li>
            </ul>
            
            <a href="auth.php?logout=true" class="logout-link">
                <span class="logout-icon">⏻</span>
                <span>Logout</span>
            </a>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <div class="page-header">
                <a href="conversations.php" class="back-btn">
                    <span class="icon">←</span>
                    <span>Back to All Conversations</span>
                </a>
            </div>
            
            <h1 class="page-title">NutriGuide Conversation with <?php echo htmlspecialchars($user['username']); ?></h1>
            
            <!-- Conversation Details -->
            <div class="conversation-details">
                <div class="detail-row">
                    <div class="detail-label">ID:</div>
                    <div class="detail-value"><?php echo $conversation['id']; ?></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">User:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($user['username']); ?> (ID: <?php echo $conversation['user_id']; ?>)</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Created:</div>
                    <div class="detail-value"><?php echo formatDate($conversation['created_at']); ?></div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Last Updated:</div>
                    <div class="detail-value"><?php echo formatDate($conversation['updated_at']); ?></div>
                </div>
                <?php if (!empty($conversation['conversation_summary'])): ?>
                <div class="detail-row">
                    <div class="detail-label">Summary:</div>
                    <div class="detail-value"><?php echo nl2br(htmlspecialchars($conversation['conversation_summary'])); ?></div>
                </div>
                <?php endif; ?>
            </div>
            
            <!-- Conversation Messages -->
            <div class="conversation-messages">
                <h2 class="message-heading">Conversation Messages</h2>
                
                <?php if (count($chats) > 0): ?>
                    <?php foreach ($chats as $index => $chat): ?>
                        <div class="message-container">
                            <div class="message-info">
                                <div class="message-number">Message #<?php echo ($index + 1); ?></div>
                                <div class="message-date"><?php echo formatDate($chat['date']); ?></div>
                            </div>
                            <div class="message-content">
                                <div class="user-message">
                                    <div class="message-label">User Message:</div>
                                    <?php echo nl2br(htmlspecialchars($chat['user_message'])); ?>
                                </div>
                                <div class="bot-message">
                                    <div class="message-label">Bot Response:</div>
                                    <?php echo nl2br(htmlspecialchars($chat['bot_message'])); ?>
                                </div>
                                
                                <?php if (isset($chat['raw_model_output']) && !empty($chat['raw_model_output'])): ?>
                                <div class="raw-output">
                                    <button class="raw-output-toggle" onclick="toggleRawOutput(<?php echo $index; ?>)">
                                        <span class="toggle-icon">▶</span> Show Raw Model Output
                                    </button>
                                    <div class="raw-output-content" id="raw-output-<?php echo $index; ?>">
                                        <?php echo htmlspecialchars($chat['raw_model_output']); ?>
                                    </div>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="no-messages">No messages found in this conversation.</div>
                <?php endif; ?>
            </div>
        </main>
    </div>
    
    <script>
        // Function to toggle raw output visibility
        function toggleRawOutput(index) {
            const contentElement = document.getElementById(`raw-output-${index}`);
            const toggleButton = contentElement.previousElementSibling;
            const toggleIcon = toggleButton.querySelector('.toggle-icon');
            
            if (contentElement.classList.contains('active')) {
                contentElement.classList.remove('active');
                toggleButton.innerHTML = '<span class="toggle-icon">▶</span> Show Raw Model Output';
            } else {
                contentElement.classList.add('active');
                toggleButton.innerHTML = '<span class="toggle-icon">▼</span> Hide Raw Model Output';
            }
        }
    </script>
</body>
</html> 