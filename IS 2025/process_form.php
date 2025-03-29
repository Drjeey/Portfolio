<?php
session_start();

// Include database configuration
require_once 'db_config.php';

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    die("Database connection failed. Please try again later.");
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: Form.php");
    exit;
}

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $form_type = $_POST['form_type'] ?? '';
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        echo "Username and password are required!";
        exit;
    }

    if ($form_type == "signup") {
        // Check if username exists
        $check_stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
        $check_stmt->bind_param("s", $username);
        $check_stmt->execute();
        $check_stmt->store_result();
        
        if ($check_stmt->num_rows > 0) {
            echo "Username already exists. Please choose another username.";
            $check_stmt->close();
            exit;
        }
        $check_stmt->close();
        
        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt->bind_param("ss", $username, $hashed_password);

        if ($stmt->execute()) {
            // Get the newly created user_id
            $user_id = $conn->insert_id;
            $_SESSION['user_id'] = $user_id;
            $_SESSION['username'] = $username;
            header("Location: index.php");
            exit;
        } else {
            echo "Error: " . $stmt->error;
        }
        $stmt->close();
    } elseif ($form_type == "login") {
        $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $stmt->bind_result($user_id, $hashed_password);
            $stmt->fetch();

            if (password_verify($password, $hashed_password)) {
                $_SESSION['user_id'] = $user_id;
                $_SESSION['username'] = $username;
                header("Location: index.php");
                exit;
            } else {
                echo "Invalid username or password!";
            }
        } else {
            echo "Invalid username or password!";
        }
        $stmt->close();
    } else {
        echo "Invalid form type!";
    }
}

$conn->close();
?>
