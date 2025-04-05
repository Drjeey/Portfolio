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

// Debug information
error_log("ADMIN PAGE: Checking admin status for user ID " . $_SESSION['user_id']);

$user_id = $_SESSION['user_id'];
$stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows == 0) {
    // User not found
    error_log("ADMIN PAGE: User not found in database");
    header("Location: ../Form.php");
    exit;
}

$stmt->bind_result($is_admin);
$stmt->fetch();
$stmt->close();

// Log the admin status
error_log("ADMIN PAGE: User admin status = " . ($is_admin ? 'true' : 'false') . " (value: $is_admin)");

if (!$is_admin) {
    // User is not an admin
    error_log("ADMIN PAGE: User is not an admin, redirecting to index.php");
    header("Location: ../index.php");
    exit;
}

// Get total counts for dashboard
$total_users = 0;
$total_conversations = 0;
$total_messages = 0;

// Count users
$query = "SELECT COUNT(*) as count FROM users";
$result = $conn->query($query);
if ($result) {
    $row = $result->fetch_assoc();
    $total_users = $row['count'];
}

// Count conversations
$query = "SELECT COUNT(*) as count FROM conversations";
$result = $conn->query($query);
if ($result) {
    $row = $result->fetch_assoc();
    $total_conversations = $row['count'];
}

// Count messages
$query = "SELECT COUNT(*) as count FROM chats";
$result = $conn->query($query);
if ($result) {
    $row = $result->fetch_assoc();
    $total_messages = $row['count'];
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | NutriGuide</title>
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
        
        .admin-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #665CAC;
            margin: 10px 0;
        }
        
        .admin-content {
            background-color: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-header">
            <h1>NutriGuide Admin Dashboard</h1>
            <div class="admin-nav">
                <a href="index.php">Dashboard</a>
                <a href="users.php">Users</a>
                <a href="conversations.php">Conversations</a>
                <a href="../index.php">Back to App</a>
                <a href="../process_form.php?logout=true">Logout</a>
            </div>
        </div>
        
        <div class="admin-stats">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="stat-number"><?= $total_users ?></div>
            </div>
            <div class="stat-card">
                <h3>Total Conversations</h3>
                <div class="stat-number"><?= $total_conversations ?></div>
            </div>
            <div class="stat-card">
                <h3>Total Messages</h3>
                <div class="stat-number"><?= $total_messages ?></div>
            </div>
        </div>
        
        <div class="admin-content">
            <h2>Welcome to the Admin Dashboard</h2>
            <p>This is the administration area for NutriGuide. Here you can manage users and view conversations.</p>
            <p>Use the navigation links above to access different sections of the admin panel.</p>
            
            <h3>Quick Links</h3>
            <ul>
                <li><a href="users.php">Manage Users</a> - Add, edit or delete user accounts</li>
                <li><a href="conversations.php">View Conversations</a> - Browse user conversations and see raw model outputs</li>
            </ul>
        </div>
    </div>
</body>
</html> 