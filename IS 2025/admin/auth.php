<?php
// Start session
session_start();

// Set error handling
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set content type to JSON
header('Content-Type: application/json');

// Include necessary files
require_once '../db_config.php';
require_once 'functions.php';

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit;
}

// Handle POST requests
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $action = isset($_POST['action']) ? $_POST['action'] : '';

    // Admin login
    if ($action == "admin_login") {
        $username = isset($_POST['username']) ? trim($_POST['username']) : '';
        $password = isset($_POST['password']) ? trim($_POST['password']) : '';

        if (empty($username) || empty($password)) {
            echo json_encode(["success" => false, "error" => "Username and password are required!"]);
            exit;
        }

        // Verify admin user
        $stmt = $conn->prepare("SELECT id, password, is_admin FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            
            if (password_verify($password, $user['password'])) {
                // Check if the user is an admin
                if ($user['is_admin'] == 1) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $username;
                    $_SESSION['is_admin'] = 1;
                    echo json_encode(["success" => true, "message" => "Admin login successful!"]);
                } else {
                    echo json_encode(["success" => false, "error" => "You do not have admin privileges!"]);
                }
            } else {
                echo json_encode(["success" => false, "error" => "Invalid username or password!"]);
            }
        } else {
            echo json_encode(["success" => false, "error" => "Invalid username or password!"]);
        }
        $stmt->close();
        exit;
    }
    
    // Create new user (for admin)
    elseif ($action == "create_user") {
        // Check if logged in as admin
        if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] != 1) {
            echo json_encode(["success" => false, "error" => "Unauthorized access!"]);
            exit;
        }

        $username = trim($_POST['username'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $is_admin = (int)($_POST['is_admin'] ?? 0);

        if (empty($username) || empty($password)) {
            echo json_encode(["success" => false, "error" => "Username and password are required!"]);
            exit;
        }

        // Check if username exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            echo json_encode(["success" => false, "error" => "Username already exists!"]);
            $stmt->close();
            exit;
        }
        $stmt->close();

        // Insert new user
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $username, $hashed_password, $is_admin);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "User created successfully!"]);
        } else {
            echo json_encode(["success" => false, "error" => "Error creating user: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }
    
    // Delete user
    elseif ($action == "delete_user") {
        // Check if logged in as admin
        if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] != 1) {
            echo json_encode(["success" => false, "error" => "Unauthorized access!"]);
            exit;
        }

        $user_id = (int)($_POST['user_id'] ?? 0);

        if ($user_id == 0) {
            echo json_encode(["success" => false, "error" => "Invalid user ID!"]);
            exit;
        }

        // Prevent deleting yourself
        if ($user_id == $_SESSION['user_id']) {
            echo json_encode(["success" => false, "error" => "You cannot delete your own account!"]);
            exit;
        }

        // Delete user
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "User deleted successfully!"]);
        } else {
            echo json_encode(["success" => false, "error" => "Error deleting user: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }
}

// Handle Admin Logout
if (isset($_GET['logout']) && $_GET['logout'] == 'true') {
    // Clear session variables
    $_SESSION = array();
    
    // Destroy the session
    session_destroy();
    
    // Redirect to admin login
    header("Location: index.php");
    exit;
}

// If no valid action was provided
echo json_encode(["success" => false, "error" => "Invalid request"]);
?> 