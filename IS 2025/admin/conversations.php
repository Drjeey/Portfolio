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

// Get pagination parameters
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$perPage = 5;

// Check if viewing conversations for a specific user
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$userName = null;

if ($userId) {
    // Get user details for the header
    $user = getUserById($conn, $userId);
    if ($user) {
        $userName = $user['username'];
    }
    
    // Get conversations for the specific user with pagination
    $conversations = getConversationsByUserId($conn, $userId, $perPage, $page);
    
    // Get total count for pagination
    $totalConversations = countTotalConversations($conn, $userId);
} else {
    // Get all conversations with pagination
    $conversations = getAllConversations($conn, $perPage, $page);
    
    // Get total count for pagination
    $totalConversations = countTotalConversations($conn);
}

// Calculate total pages
$totalPages = ceil($totalConversations / $perPage);

// Build base URL for pagination links
$baseUrl = "conversations.php?";
if ($userId) {
    $baseUrl .= "user_id=" . $userId . "&";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | Conversations</title>
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
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--dark-text);
        }
        
        .back-button {
            background-color: var(--primary-purple);
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            display: flex;
            align-items: center;
            text-decoration: none;
            transition: background-color 0.2s;
        }
        
        .back-button:hover {
            background-color: var(--secondary-purple);
        }
        
        .back-button .icon {
            margin-right: 0.5rem;
            font-size: 1.2rem;
        }
        
        /* Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .data-table th, .data-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        .data-table th {
            background-color: #f9f9f9;
            font-weight: 600;
        }
        
        .data-table tr:last-child td {
            border-bottom: none;
        }
        
        .data-table .message-preview {
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--light-text);
        }
        
        .data-table .date-cell {
            white-space: nowrap;
            color: var(--light-text);
            font-size: 0.9rem;
        }
        
        .data-table .actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .data-table .action-btn {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            font-size: 0.8rem;
        }
        
        .data-table .view-btn {
            background-color: var(--primary-purple);
        }
        
        .data-table .view-btn:hover {
            background-color: var(--secondary-purple);
        }
        
        .data-table .delete-btn {
            background-color: var(--danger-red);
        }
        
        .data-table .delete-btn:hover {
            background-color: #c0392b;
        }
        
        /* Alert Messages */
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: none;
        }
        
        .alert.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert.show {
            display: block;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin: 2rem 0;
        }
        
        .page-btn, .page-num {
            padding: 0.5rem 1rem;
            border-radius: 4px;
            background-color: white;
            color: var(--dark-text);
            text-decoration: none;
            transition: all 0.2s;
            font-size: 0.9rem;
            border: 1px solid var(--border-color);
        }
        
        .page-btn:hover, .page-num:hover {
            background-color: var(--light-purple);
            color: var(--primary-purple);
        }
        
        .page-num.active {
            background-color: var(--primary-purple);
            color: white;
            border-color: var(--primary-purple);
        }
        
        .page-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .page-ellipsis {
            padding: 0.5rem 0;
            color: var(--light-text);
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 3rem;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            color: var(--light-text);
        }
        
        .empty-state-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--dark-text);
        }
        
        .empty-state-message {
            color: var(--light-text);
            margin-bottom: 2rem;
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
                <?php if ($userId && $userName): ?>
                    <h1 class="page-title">Conversations for <?php echo htmlspecialchars($userName); ?></h1>
                    <a href="users.php" class="back-button">
                        <span class="icon">←</span>
                        <span>Back to Users</span>
                    </a>
                <?php else: ?>
                    <h1 class="page-title">NutriGuide Conversations</h1>
                <?php endif; ?>
            </div>
            
            <!-- Alert Messages -->
            <div class="alert success" id="successAlert"></div>
            <div class="alert error" id="errorAlert"></div>
            
            <?php if (empty($conversations)): ?>
                <!-- Empty State -->
                <div class="empty-state">
                    <div class="empty-state-icon">🥗</div>
                    <h3 class="empty-state-title">No Nutrition Conversations Yet</h3>
                    <p class="empty-state-message">There are no NutriGuide conversations to display.</p>
                </div>
            <?php else: ?>
                <!-- Conversations Table -->
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <?php if (!$userId): ?><th>User</th><?php endif; ?>
                            <th>Date</th>
                            <th>Message Preview</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($conversations as $convo): ?>
                        <tr>
                            <td><?php echo $convo['id']; ?></td>
                            <?php if (!$userId): ?>
                                <td><?php echo htmlspecialchars($convo['username']); ?></td>
                            <?php endif; ?>
                            <td class="date-cell"><?php echo formatDate($convo['updated_at']); ?></td>
                            <td class="message-preview">
                                <?php
                                // Get the first message for this conversation
                                $firstMsg = getFirstMessageForConversation($conn, $convo['id']);
                                echo htmlspecialchars($firstMsg ? $firstMsg['user_message'] : '');
                                ?>
                            </td>
                            <td class="actions">
                                <a href="view_conversation.php?id=<?php echo $convo['id']; ?>" class="action-btn view-btn">View</a>
                                <a href="#" class="action-btn delete-btn" onclick="deleteConversation(<?php echo $convo['id']; ?>)">Delete</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                
                <!-- Pagination -->
                <?php if ($totalPages > 1): ?>
                    <?php echo generatePagination($page, $totalPages, $baseUrl); ?>
                <?php endif; ?>
            <?php endif; ?>
        </main>
    </div>
    
    <script>
        // Alert functionality
        const successAlert = document.getElementById('successAlert');
        const errorAlert = document.getElementById('errorAlert');
        
        function showSuccessAlert(message) {
            successAlert.textContent = message;
            successAlert.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                successAlert.classList.remove('show');
            }, 3000);
        }
        
        function showErrorAlert(message) {
            errorAlert.textContent = message;
            errorAlert.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                errorAlert.classList.remove('show');
            }, 3000);
        }
        
        // Function to delete a conversation
        function deleteConversation(conversationId) {
            if (confirm(`Are you sure you want to delete this conversation? This action cannot be undone.`)) {
                fetch('functions.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=delete_conversation&conversation_id=${conversationId}`
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessAlert('Conversation deleted successfully!');
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    } else {
                        showErrorAlert(data.error || 'Failed to delete conversation');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showErrorAlert('An error occurred. Please try again.');
                });
            }
        }
    </script>
</body>
</html> 