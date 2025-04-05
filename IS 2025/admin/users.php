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

// Handle user deletion
if (isset($_GET['delete']) && !empty($_GET['delete'])) {
    $delete_id = intval($_GET['delete']);
    
    // Don't allow deleting your own account
    if ($delete_id == $user_id) {
        $error_message = "You cannot delete your own account.";
    } else {
        $delete_stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $delete_stmt->bind_param("i", $delete_id);
        
        if ($delete_stmt->execute()) {
            $success_message = "User deleted successfully.";
        } else {
            $error_message = "Failed to delete user: " . $delete_stmt->error;
        }
        
        $delete_stmt->close();
    }
}

// Handle adding a new user
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['action']) && $_POST['action'] == 'add_user') {
    $new_username = trim($_POST['username']);
    $new_password = trim($_POST['password']);
    $is_admin_val = isset($_POST['is_admin']) ? 1 : 0;
    
    if (empty($new_username) || empty($new_password)) {
        $error_message = "Username and password are required.";
    } else {
        // Check if username exists
        $check_stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $check_stmt->bind_param("s", $new_username);
        $check_stmt->execute();
        $check_stmt->store_result();
        
        if ($check_stmt->num_rows > 0) {
            $error_message = "Username already exists.";
            $check_stmt->close();
        } else {
            $check_stmt->close();
            
            // Insert new user
            $insert_stmt = $conn->prepare("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)");
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
            $insert_stmt->bind_param("ssi", $new_username, $hashed_password, $is_admin_val);
            
            if ($insert_stmt->execute()) {
                $success_message = "User added successfully.";
            } else {
                $error_message = "Failed to add user: " . $insert_stmt->error;
            }
            
            $insert_stmt->close();
        }
    }
}

// Fetch all users
$users = [];
$query = "SELECT id, username, is_admin FROM users ORDER BY id";
$result = $conn->query($query);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $result->free();
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management | NutriGuide Admin</title>
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
        
        .add-user-form {
            background-color: #f8f8f8;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .form-group input[type="text"],
        .form-group input[type="password"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .form-actions {
            margin-top: 15px;
        }
        
        .btn {
            padding: 8px 15px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        
        .btn-primary {
            background-color: #665CAC;
            color: white;
        }
        
        .btn-danger {
            background-color: #dc3545;
            color: white;
        }
        
        .alert {
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        
        .alert-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .checkbox-group {
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-header">
            <h1>User Management</h1>
            <div class="admin-nav">
                <a href="index.php">Dashboard</a>
                <a href="users.php">Users</a>
                <a href="conversations.php">Conversations</a>
                <a href="../index.php">Back to App</a>
                <a href="../process_form.php?logout=true">Logout</a>
            </div>
        </div>
        
        <?php if (isset($success_message)): ?>
            <div class="alert alert-success"><?= $success_message ?></div>
        <?php endif; ?>
        
        <?php if (isset($error_message)): ?>
            <div class="alert alert-danger"><?= $error_message ?></div>
        <?php endif; ?>
        
        <div class="admin-content">
            <h2>User List</h2>
            
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Admin Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($users)): ?>
                        <tr>
                            <td colspan="4">No users found.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($users as $u): ?>
                            <tr>
                                <td><?= $u['id'] ?></td>
                                <td><?= htmlspecialchars($u['username']) ?></td>
                                <td><?= $u['is_admin'] ? 'Admin' : 'User' ?></td>
                                <td>
                                    <?php if ($u['id'] != $user_id): ?>
                                        <a href="?delete=<?= $u['id'] ?>" class="btn btn-danger" onclick="return confirm('Are you sure you want to delete this user?')">Delete</a>
                                    <?php else: ?>
                                        <em>Current User</em>
                                    <?php endif; ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        
        <div class="admin-content">
            <h2>Add New User</h2>
            
            <form class="add-user-form" method="post" action="">
                <input type="hidden" name="action" value="add_user">
                
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <div class="checkbox-group">
                    <input type="checkbox" id="is_admin" name="is_admin">
                    <label for="is_admin">Make this user an admin</label>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Add User</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html> 