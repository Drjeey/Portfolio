<?php
session_start(); // Start session for user authentication
header("Content-Type: application/json"); // Ensure JSON response

// Include database configuration
require_once 'db_config.php';

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit;
}

// Check if user is logged in for non-auth requests
if (!isset($_SESSION['user_id']) && 
    ($_SERVER['REQUEST_METHOD'] === 'GET' || 
    ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['action'])))) {
    echo json_encode(["success" => false, "error" => "Unauthorized"]);
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
            // Get the newly created user_id
            $new_user_id = $conn->insert_id;
            $_SESSION['user_id'] = $new_user_id;
            $_SESSION['username'] = $username;
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
    
    // Create a new conversation
    elseif ($action == "new_conversation") {
        $user_id = $_SESSION['user_id'];
        $title = $_POST['title'] ?? 'New Conversation';
        
        $stmt = $conn->prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)");
        $stmt->bind_param("is", $user_id, $title);
        
        if ($stmt->execute()) {
            $conversation_id = $conn->insert_id;
            echo json_encode([
                "success" => true, 
                "conversation_id" => $conversation_id,
                "title" => $title
            ]);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to create conversation"]);
        }
        $stmt->close();
        exit;
    }
    
    // Rename a conversation
    elseif ($action == "rename_conversation") {
        $user_id = $_SESSION['user_id'];
        $conversation_id = $_POST['conversation_id'] ?? 0;
        $title = $_POST['title'] ?? '';
        
        if (empty($title) || empty($conversation_id)) {
            echo json_encode(["success" => false, "error" => "Conversation ID and title are required"]);
            exit;
        }
        
        $stmt = $conn->prepare("UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("sii", $title, $conversation_id, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to rename conversation"]);
        }
        $stmt->close();
        exit;
    }
    
    // Delete a conversation
    elseif ($action == "delete_conversation") {
        $user_id = $_SESSION['user_id'];
        $conversation_id = $_POST['conversation_id'] ?? 0;
        
        if (empty($conversation_id)) {
            echo json_encode(["success" => false, "error" => "Conversation ID is required"]);
            exit;
        }
        
        $stmt = $conn->prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?");
        $stmt->bind_param("ii", $conversation_id, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to delete conversation"]);
        }
        $stmt->close();
        exit;
    }
}

// Handle chat saving with conversation tracking
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && !isset($_POST['action'])) {
    $user_id = $_SESSION['user_id'];
    $user_message = $_POST['user_message'] ?? '';
    $bot_message = $_POST['bot_message'] ?? '';
    $conversation_id = $_POST['conversation_id'] ?? 0;
    $date = date("Y-m-d H:i:s"); // Use full timestamp
    
    // If no conversation_id is provided, create a new conversation
    if (empty($conversation_id)) {
        $title = substr($user_message, 0, 30) . (strlen($user_message) > 30 ? '...' : '');
        $stmt = $conn->prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)");
        $stmt->bind_param("is", $user_id, $title);
        
        if ($stmt->execute()) {
            $conversation_id = $conn->insert_id;
        } else {
            echo json_encode(["success" => false, "error" => "Failed to create conversation"]);
            exit;
        }
        $stmt->close();
    }

    if (!empty($user_message) && !empty($bot_message)) {
        $stmt = $conn->prepare("INSERT INTO chats (user_id, conversation_id, date, user_message, bot_message) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisss", $user_id, $conversation_id, $date, $user_message, $bot_message);
        if ($stmt->execute()) {
            // Update the conversation's updated_at timestamp
            $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
            $update_stmt->bind_param("i", $conversation_id);
            $update_stmt->execute();
            $update_stmt->close();
            
            echo json_encode([
                "success" => true,
                "conversation_id" => $conversation_id
            ]);
        } else {
            echo json_encode(["success" => false, "error" => "Error saving message"]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "error" => "Both user and bot messages are required"]);
    }
    exit;
}

// Handle user-specific conversation list
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && isset($_GET['list']) && $_GET['list'] === 'conversations') {
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("
        SELECT 
            c.id, 
            c.title, 
            c.created_at, 
            c.updated_at,
            (SELECT COUNT(*) FROM chats WHERE conversation_id = c.id) as message_count
        FROM conversations c
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
    ");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $conversations[] = $row;
    }
    
    echo json_encode(["success" => true, "conversations" => $conversations]);
    exit;
}

// Handle retrieving messages for a specific conversation
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && isset($_GET['conversation_id'])) {
    $user_id = $_SESSION['user_id'];
    $conversation_id = $_GET['conversation_id'];
    
    $stmt = $conn->prepare("
        SELECT 
            c.id,
            c.date,
            c.user_message,
            c.bot_message
        FROM chats c
        WHERE c.user_id = ? AND c.conversation_id = ?
        ORDER BY c.date ASC
    ");
    $stmt->bind_param("ii", $user_id, $conversation_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    
    echo json_encode(["success" => true, "messages" => $messages]);
    exit;
}

// Handle user-specific chat retrieval with grouping by conversation
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && !isset($_GET['list']) && !isset($_GET['conversation_id'])) {
    $user_id = $_SESSION['user_id'];
    
    // Get the most recent conversation
    $recent_stmt = $conn->prepare("
        SELECT id, title
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT 1
    ");
    $recent_stmt->bind_param("i", $user_id);
    $recent_stmt->execute();
    $recent_result = $recent_stmt->get_result();
    
    if ($recent_result->num_rows > 0) {
        $recent_conversation = $recent_result->fetch_assoc();
        $conversation_id = $recent_conversation['id'];
        
        // Get messages for this conversation
        $stmt = $conn->prepare("
            SELECT 
                date,
                user_message,
                bot_message
            FROM chats
            WHERE user_id = ? AND conversation_id = ?
            ORDER BY date ASC
        ");
        $stmt->bind_param("ii", $user_id, $conversation_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $messages = [];
        while ($row = $result->fetch_assoc()) {
            $date = date('Y-m-d', strtotime($row['date']));
            if (!isset($messages[$date])) {
                $messages[$date] = [];
            }
            $messages[$date][] = ["user" => $row["user_message"], "bot" => $row["bot_message"]];
        }
        
        echo json_encode([
            "success" => true, 
            "conversation_id" => $conversation_id,
            "title" => $recent_conversation['title'],
            "messages" => $messages
        ]);
    } else {
        // No conversations yet
        echo json_encode(["success" => true, "messages" => []]);
    }
    exit;
}

$conn->close();
?>
