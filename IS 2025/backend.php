<?php
session_start(); // Start session for user authentication
header("Content-Type: application/json"); // Ensure JSON response

// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "chatbot_system"; // Keeping original database name

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "error" => "Database connection failed: " . $conn->connect_error]);
    exit;
}

// Handle Signup & Login
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $action = $_POST['action'] ?? '';

    if ($action == "signup") {
        $username = trim($_POST['username']);
        $password = trim($_POST['password']);

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
            exit;
        }
        $stmt->close();

        // Insert new user
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
        $stmt->bind_param("ss", $username, $hashed_password);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Signup successful!"]);
        } else {
            echo json_encode(["success" => false, "error" => "Error signing up: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    } 
    
    elseif ($action == "login") {
        $username = trim($_POST['username']);
        $password = trim($_POST['password']);

        if (empty($username) || empty($password)) {
            echo json_encode(["success" => false, "error" => "Username and password are required!"]);
            exit;
        }

        // Verify user
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
                echo json_encode(["success" => true, "message" => "Login successful!"]);
            } else {
                echo json_encode(["success" => false, "error" => "Invalid username or password!"]);
            }
        } else {
            echo json_encode(["success" => false, "error" => "Invalid username or password!"]);
        }
        $stmt->close();
        exit;
    }
}

// Handle chat saving with date tracking
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $user_message = $_POST['user_message'] ?? '';
    $bot_message = $_POST['bot_message'] ?? '';
    $date = date("Y-m-d"); // Add date tracking

    if (!empty($user_message) && !empty($bot_message)) {
        $stmt = $conn->prepare("INSERT INTO chats (user_id, date, user_message, bot_message) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("isss", $user_id, $date, $user_message, $bot_message);
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "error" => "Error saving message"]);
        }
        $stmt->close();
    }
    exit;
}

// Handle user-specific chat retrieval with grouping by date
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT date, user_message, bot_message FROM chats WHERE user_id = ? ORDER BY date DESC");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $chats = [];
    while ($row = $result->fetch_assoc()) {
        $date = $row['date'];
        if (!isset($chats[$date])) {
            $chats[$date] = [];
        }
        $chats[$date][] = ["user" => $row["user_message"], "bot" => $row["bot_message"]];
    }

    echo json_encode($chats);
    exit;
}

$conn->close();
?>
