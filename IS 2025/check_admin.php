<?php
// Start session to check admin status
session_start();

// Include database configuration
require_once 'db_config.php';

// Print headers for cleaner output
header('Content-Type: text/plain');

echo "===== ADMIN STATUS CHECK =====\n\n";

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo "❌ ERROR: No user logged in\n";
    echo "Current session data: " . print_r($_SESSION, true) . "\n";
    exit;
}

// Get DB connection
$conn = getDbConnection();
if (!$conn) {
    echo "❌ ERROR: Database connection failed\n";
    exit;
}

// Get user details including admin status
$user_id = $_SESSION['user_id'];
echo "🔍 Checking admin status for user ID: $user_id\n";

$stmt = $conn->prepare("SELECT username, is_admin FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo "❌ ERROR: User not found in database\n";
    exit;
}

$user = $result->fetch_assoc();
echo "👤 Username: " . $user['username'] . "\n";
echo "🔑 Is Admin: " . ($user['is_admin'] ? "YES" : "NO") . " (value: " . $user['is_admin'] . ")\n\n";

// Check admin users in database
echo "===== ALL ADMIN USERS =====\n";
$admin_result = $conn->query("SELECT id, username, is_admin FROM users WHERE is_admin = 1");

if ($admin_result->num_rows === 0) {
    echo "⚠️ WARNING: No admin users found in database\n";
} else {
    while ($admin = $admin_result->fetch_assoc()) {
        echo "👑 Admin User: ID={$admin['id']}, Username={$admin['username']}, Admin Value={$admin['is_admin']}\n";
    }
}

// Display session data 
echo "\n===== SESSION DATA =====\n";
echo print_r($_SESSION, true) . "\n";

$conn->close();
?> 