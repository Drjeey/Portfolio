<?php
// Direct admin login helper for testing
session_start();
require_once 'db_config.php';

// Show a plain text info page if no action specified
if (!isset($_GET['action'])) {
    header('Content-Type: text/plain');
    echo "=== ADMIN LOGIN HELPER ===\n\n";
    echo "This script helps with admin login testing.\n";
    echo "To login as admin directly: admin_login.php?action=login\n";
    echo "To check your current admin status: admin_login.php?action=check\n";
    echo "To show all admins in the system: admin_login.php?action=list_admins\n";
    echo "To go to admin panel directly: admin_login.php?action=go_to_admin\n";
    exit;
}

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    die("Database connection failed");
}

// Check current login status
if ($_GET['action'] === 'check') {
    header('Content-Type: text/plain');
    echo "=== CURRENT LOGIN STATUS ===\n\n";
    
    if (!isset($_SESSION['user_id'])) {
        echo "Status: Not logged in\n";
        echo "Session data: " . print_r($_SESSION, true) . "\n";
        exit;
    }
    
    $user_id = $_SESSION['user_id'];
    $username = $_SESSION['username'] ?? 'Unknown';
    $is_admin = $_SESSION['is_admin'] ?? 'Not set';
    
    echo "Status: Logged in\n";
    echo "User ID: $user_id\n";
    echo "Username: $username\n";
    echo "Is Admin (Session): " . ($is_admin ? "YES" : "NO") . "\n\n";
    
    // Check database value
    $stmt = $conn->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if ($user) {
        echo "Is Admin (Database): " . ($user['is_admin'] ? "YES" : "NO") . " (Value: " . $user['is_admin'] . ")\n";
    } else {
        echo "Warning: User not found in database\n";
    }
    
    exit;
}

// List all admin users
if ($_GET['action'] === 'list_admins') {
    header('Content-Type: text/plain');
    echo "=== ADMIN USERS IN DATABASE ===\n\n";
    
    $result = $conn->query("SELECT id, username, is_admin FROM users WHERE is_admin = 1");
    
    if ($result->num_rows === 0) {
        echo "No admin users found in database\n";
    } else {
        while ($admin = $result->fetch_assoc()) {
            echo "Admin User: ID={$admin['id']}, Username={$admin['username']}, Admin Value={$admin['is_admin']}\n";
        }
    }
    
    exit;
}

// Direct link to admin panel
if ($_GET['action'] === 'go_to_admin') {
    if (!isset($_SESSION['user_id'])) {
        die("Error: You must be logged in first");
    }
    
    // Set admin flag in session to force admin access
    $_SESSION['is_admin'] = true;
    
    // Redirect to admin panel
    header("Location: admin/index.php");
    exit;
}

// Direct admin login
if ($_GET['action'] === 'login') {
    header('Content-Type: text/plain');
    
    // Find the first admin user in the database
    $result = $conn->query("SELECT id, username FROM users WHERE is_admin = 1 LIMIT 1");
    
    if ($result->num_rows === 0) {
        echo "Error: No admin users found in database. Please make a user an admin first.\n";
        exit;
    }
    
    $admin = $result->fetch_assoc();
    $admin_id = $admin['id'];
    $admin_username = $admin['username'];
    
    // Set session variables to log in as the admin user
    $_SESSION['user_id'] = $admin_id;
    $_SESSION['username'] = $admin_username;
    $_SESSION['is_admin'] = true;
    
    echo "Successfully logged in as admin user:\n";
    echo "User ID: $admin_id\n";
    echo "Username: $admin_username\n\n";
    echo "Redirecting to admin panel in 3 seconds...\n";
    
    // Redirect to admin panel after showing the message
    echo '<script>setTimeout(function() { window.location.href = "admin/index.php"; }, 3000);</script>';
}

$conn->close();
?> 