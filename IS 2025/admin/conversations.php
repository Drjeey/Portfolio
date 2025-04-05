<?php
// Start session to check admin status
session_start();

// Include database configuration
require_once '../db_config.php';

// Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: ../Form.php");
    exit;
}

// Check if user is an admin
$conn = getDbConnection();
if (!$conn) {
    die("Database connection failed. Please try again later.");
}

$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows == 0) {
    // User not found
    header("Location: ../Form.php");
    exit;
}

$stmt->bind_result($is_admin);
$stmt->fetch();
$stmt->close();

if (!$is_admin) {
    // User is not an admin
    header("Location: ../index.php");
    exit;
}

// Get conversation ID if viewing a specific conversation
$conversation_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Fetch conversations or messages for a specific conversation
$conversations = [];
$messages = [];
$conversation_title = '';
$conversation_user = '';

if ($conversation_id > 0) {
    // Get conversation details
    $stmt = $conn->prepare("
        SELECT c.title, u.username 
        FROM conversations c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->bind_param("i", $conversation_id);
    $stmt->execute();
    $stmt->bind_result($conversation_title, $conversation_user);
    $stmt->fetch();
    $stmt->close();
    
    // Get messages for the conversation
    $stmt = $conn->prepare("
        SELECT c.id, c.date, c.user_message, c.bot_message, c.raw_model_output 
        FROM chats c
        WHERE c.conversation_id = ?
        ORDER BY c.date ASC
    ");
    $stmt->bind_param("i", $conversation_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    
    $stmt->close();
} else {
    // Get all conversations
    $query = "
        SELECT c.id, c.title, u.username, c.created_at, c.updated_at,
        (SELECT COUNT(*) FROM chats WHERE conversation_id = c.id) as message_count
        FROM conversations c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.updated_at DESC
    ";
    $result = $conn->query($query);
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $conversations[] = $row;
        }
        $result->free();
    }
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $conversation_id > 0 ? 'View Conversation' : 'Conversations' ?> | NutriGuide Admin</title>
    <link rel="stylesheet" href="../styles.css">
    <style>
        /* Admin specific styles */
        .admin-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #ddd;
        }
        
        .admin-nav {
            display: flex;
            gap: 20px;
        }
        
        .admin-nav a {
            text-decoration: none;
            color: #665CAC;
            font-weight: bold;
            padding: 5px 10px;
            border-radius: 4px;
        }
        
        .admin-nav a:hover {
            background-color: #f0f0f0;
        }
        
        .admin-content {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .admin-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .admin-table th, .admin-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .admin-table th {
            background-color: #f8f8f8;
            font-weight: bold;
        }
        
        .conversation-header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .message-container {
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .message-header {
            background-color: #f8f8f8;
            padding: 10px 15px;
            font-weight: bold;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
        }
        
        .message-content {
            padding: 15px;
        }
        
        .user-message, .bot-message {
            margin-bottom: 20px;
        }
        
        .user-message h4, .bot-message h4 {
            color: #665CAC;
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .raw-output {
            background-color: #f8f8f8;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            white-space: pre-wrap;
        }
        
        .toggle-raw {
            background-color: #665CAC;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .hidden {
            display: none;
        }
        
        .back-button {
            display: inline-block;
            margin-bottom: 20px;
            text-decoration: none;
            color: #665CAC;
            font-weight: bold;
        }
        
        .back-button:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-header">
            <h1><?= $conversation_id > 0 ? 'View Conversation' : 'Conversations' ?></h1>
            <div class="admin-nav">
                <a href="index.php">Dashboard</a>
                <a href="users.php">Users</a>
                <a href="conversations.php">Conversations</a>
                <a href="../index.php">Back to App</a>
                <a href="../process_form.php?logout=true">Logout</a>
            </div>
        </div>
        
        <?php if ($conversation_id > 0): ?>
            <a href="conversations.php" class="back-button">← Back to Conversations List</a>
            
            <div class="admin-content">
                <div class="conversation-header">
                    <h2><?= htmlspecialchars($conversation_title) ?></h2>
                    <p>User: <?= htmlspecialchars($conversation_user) ?></p>
                </div>
                
                <?php if (empty($messages)): ?>
                    <p>No messages found in this conversation.</p>
                <?php else: ?>
                    <?php foreach ($messages as $index => $message): ?>
                        <div class="message-container">
                            <div class="message-header">
                                <span>Message #<?= $index + 1 ?></span>
                                <span><?= date('F j, Y, g:i a', strtotime($message['date'])) ?></span>
                            </div>
                            <div class="message-content">
                                <div class="user-message">
                                    <h4>User Message:</h4>
                                    <p><?= nl2br(htmlspecialchars($message['user_message'])) ?></p>
                                </div>
                                <div class="bot-message">
                                    <h4>Bot Response:</h4>
                                    <div class="message-buttons">
                                        <button class="toggle-raw" onclick="toggleRaw(<?= $message['id'] ?>)">Toggle Raw Output</button>
                                    </div>
                                    <p><?= nl2br(htmlspecialchars($message['bot_message'])) ?></p>
                                    <div id="raw-<?= $message['id'] ?>" class="raw-output hidden">
                                        <h4>Raw Model Output:</h4>
                                        <pre><?= htmlspecialchars($message['raw_model_output'] ?? $message['bot_message']) ?></pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="admin-content">
                <h2>Conversations List</h2>
                
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>User</th>
                            <th>Created</th>
                            <th>Last Updated</th>
                            <th>Messages</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($conversations)): ?>
                            <tr>
                                <td colspan="7">No conversations found.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($conversations as $c): ?>
                                <tr>
                                    <td><?= $c['id'] ?></td>
                                    <td><?= htmlspecialchars($c['title']) ?></td>
                                    <td><?= htmlspecialchars($c['username']) ?></td>
                                    <td><?= date('M j, Y, g:i a', strtotime($c['created_at'])) ?></td>
                                    <td><?= date('M j, Y, g:i a', strtotime($c['updated_at'])) ?></td>
                                    <td><?= $c['message_count'] ?></td>
                                    <td>
                                        <a href="?id=<?= $c['id'] ?>">View</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
    
    <script>
        function toggleRaw(messageId) {
            const rawOutput = document.getElementById(`raw-${messageId}`);
            rawOutput.classList.toggle('hidden');
        }
    </script>
</body>
</html> 