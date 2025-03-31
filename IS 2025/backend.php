<?php
// Set error handling to prevent HTML errors from being output
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Custom error handler to convert PHP errors to JSON responses
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    echo json_encode([
        "success" => false, 
        "error" => "Server error: $errstr", 
        "details" => "Error in $errfile on line $errline"
    ]);
    exit;
});

session_start(); // Start session for user authentication
header("Content-Type: application/json"); // Ensure JSON response

// Try to include database configuration
try {
    require_once 'db_config.php';
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => "Database configuration error: " . $e->getMessage()]);
    exit;
}

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

// Handle incoming JSON requests
if ($_SERVER["REQUEST_METHOD"] == "POST" && !isset($_POST['action'])) {
    // Get the JSON data
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Check if the data is valid JSON
    if ($data === null) {
        echo json_encode(["success" => false, "error" => "Invalid JSON"]);
        exit;
    }
    
    // Extract the action from the JSON data
    $action = $data['action'] ?? '';
    
    // Handle the search knowledge base action
    if ($action === 'searchKnowledgeBase') {
        $query = $data['query'] ?? '';
        $limit = $data['limit'] ?? 5;
        
        if (empty($query)) {
            echo json_encode(['success' => false, 'message' => 'Query is required']);
            exit;
        }
        
        // Search the knowledge base
        $results = searchKnowledgeBase($query, $limit);
        
        // Return the results
        echo json_encode($results);
        exit;
    }
    
    // Handle saving a message to a conversation
    if ($action === 'saveMessage') {
        $user_id = $_SESSION['user_id'] ?? 0;
        $user_message = $data['user_message'] ?? '';
        $bot_message = $data['bot_message'] ?? '';
        $conversation_id = $data['conversation_id'] ?? 'new';
        $date = date("Y-m-d H:i:s");
        
        if (empty($user_message) || empty($bot_message)) {
            echo json_encode(["success" => false, "error" => "Both user and bot messages are required"]);
            exit;
        }
        
        // If conversation_id is 'new', create a new conversation
        if ($conversation_id === 'new') {
            // Use a placeholder title that will be updated by the AI title generator
            $title = "New Nutrition Chat";
            
            $stmt = $conn->prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)");
            $stmt->bind_param("is", $user_id, $title);
            
            if (!$stmt->execute()) {
                echo json_encode(["success" => false, "error" => "Failed to create conversation: " . $stmt->error]);
                exit;
            }
            
            $conversation_id = $conn->insert_id;
            $stmt->close();
            
            // Set title flag to indicate a title was generated
            $titleGenerated = true;
        } else {
            // Check if this is the first message in an existing conversation
            $count_stmt = $conn->prepare("SELECT COUNT(*) as count FROM chats WHERE conversation_id = ?");
            $count_stmt->bind_param("i", $conversation_id);
            $count_stmt->execute();
            $result = $count_stmt->get_result();
            $count_data = $result->fetch_assoc();
            $count_stmt->close();
            
            if ($count_data['count'] == 0) {
                // This is the first message - use a placeholder title
                $title = "New Nutrition Chat";
                
                $update_title_stmt = $conn->prepare("UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?");
                $update_title_stmt->bind_param("sis", $title, $conversation_id, $user_id);
                $update_title_stmt->execute();
                $update_title_stmt->close();
                
                // Set title flag to indicate a title was generated
                $titleGenerated = true;
            } else {
                $titleGenerated = false;
            }
        }
        
        // Save the message
        $stmt = $conn->prepare("INSERT INTO chats (user_id, conversation_id, date, user_message, bot_message) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisss", $user_id, $conversation_id, $date, $user_message, $bot_message);
        
        if ($stmt->execute()) {
            // Update conversation's updated_at timestamp and summary
            $conversation_summary = null;
            if (isset($data['conversation_summary'])) {
                $conversation_summary = $data['conversation_summary'];
            }
            
            if ($conversation_summary !== null) {
                error_log("Updating conversation with summary");
                
                // Ensure the summary is properly formatted for SQL
                $summary_to_store = $conversation_summary;
                
                // If it's too long, truncate it to prevent database issues
                $max_summary_length = 16000; // Adjust based on your database field size
                if (strlen($summary_to_store) > $max_summary_length) {
                    error_log("Summary too long (" . strlen($summary_to_store) . " chars), truncating to " . $max_summary_length);
                    $summary_to_store = substr($summary_to_store, 0, $max_summary_length);
                }
                
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW(), conversation_summary = ? WHERE id = ?");
                $update_stmt->bind_param("si", $summary_to_store, $conversation_id);
                $update_result = $update_stmt->execute();
                
                // Additional logging for database errors
                if (!$update_result) {
                    error_log("MySQL Error updating summary: " . $update_stmt->error);
                    error_log("MySQL Error number: " . $update_stmt->errno);
                } else {
                    error_log("Summary successfully updated in database. Affected rows: " . $update_stmt->affected_rows);
                }
                
                error_log("Summary update result: " . ($update_result ? 'SUCCESS' : 'FAILED - ' . $update_stmt->error));
            } else {
                error_log("No summary to update, just updating timestamp");
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
                $update_stmt->bind_param("i", $conversation_id);
                $update_stmt->execute();
            }
            
            // Get the title if needed
            $currentTitle = '';
            if (isset($title)) {
                $currentTitle = $title;
            } else {
                $title_stmt = $conn->prepare("SELECT title FROM conversations WHERE id = ?");
                $title_stmt->bind_param("i", $conversation_id);
                $title_stmt->execute();
                $title_result = $title_stmt->get_result();
                if ($title_row = $title_result->fetch_assoc()) {
                    $currentTitle = $title_row['title'];
                }
                $title_stmt->close();
            }
            
            echo json_encode([
                "success" => true,
                "conversation_id" => $conversation_id,
                "title" => $currentTitle,
                "title_generated" => $titleGenerated ?? false
            ]);
        } else {
            echo json_encode(["success" => false, "error" => "Error saving message: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }
    
    // Handle new conversation creation
    if ($action === 'new_conversation') {
        $user_id = $_SESSION['user_id'] ?? 0;
        $title = $data['title'] ?? 'New Conversation';
        
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
            echo json_encode(["success" => false, "error" => "Failed to create conversation: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }
    
    // Handle generating a title
    if ($action === 'generateTitle') {
        $user_id = $_SESSION['user_id'] ?? 0;
        $conversation_id = $data['conversation_id'] ?? '';
        $user_message = $data['user_message'] ?? '';
        $bot_message = $data['bot_message'] ?? '';
        
        if (empty($user_message) || empty($conversation_id)) {
            echo json_encode(["success" => false, "error" => "User message and conversation ID are required"]);
            exit;
        }
        
        // Call Gemini to generate a descriptive title based on the user message
        $titlePrompt = "As a nutrition assistant, create a short, descriptive title (5 words or less) that captures the essence of this conversation. Don't repeat the user's question verbatim. Instead, extract the key nutrition topic or concept and create a concise, professional title.

User message: \"$user_message\"

Example transformations:
- \"What are the health benefits of eating apples?\" → \"Apple Health Benefits\"
- \"Is a keto diet good for weight loss?\" → \"Keto Diet Effectiveness\"
- \"What foods are high in protein that are vegan?\" → \"Vegan Protein Sources\"

Title:";

        // Call Gemini API for title generation
        $geminiResponse = callGeminiAPI($titlePrompt, 0.5, 50);
        
        if (isset($geminiResponse['text']) && !empty($geminiResponse['text'])) {
            // Clean up the title
            $title = trim($geminiResponse['text']);
            // Remove quotes if present
            $title = trim($title, '"\'');
            // Limit length
            if (strlen($title) > 50) {
                $title = substr($title, 0, 47) . '...';
            }
        } else {
            // Fallback title if API call fails
            $title = "Nutrition Chat " . date('g:i A');
        }
        
        // Update the conversation title
        $stmt = $conn->prepare("UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?");
        $stmt->bind_param("sis", $title, $conversation_id, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "title" => $title
            ]);
        } else {
            echo json_encode(["success" => false, "error" => "Failed to update title: " . $stmt->error]);
        }
        $stmt->close();
        exit;
    }
}

// Handle Signup & Login with form data
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['action'])) {
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
    
    // Create a new conversation (form-based version)
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
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && !isset($_POST['action']) && !isset($_GET['create_conversation']) && !isset($_GET['delete_conversation']) && !isset($_GET['rename_conversation'])) {
    $user_id = $_SESSION['user_id'];
    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    // Debug log for incoming data
    error_log("===== SAVE MESSAGE DEBUG START =====");
    error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Content type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Not set'));
    error_log("Raw request: " . file_get_contents('php://input'));
    error_log("Parsed data: " . print_r($data, true));
    
    $user_message = $data['user_message'] ?? '';
    $bot_message = $data['bot_message'] ?? '';
    $conversation_id = $data['conversation_id'] ?? 0;
    $conversation_summary = $data['conversation_summary'] ?? null;
    
    // Debug log for conversation summary specifically
    error_log("Conversation ID: " . $conversation_id);
    error_log("Summary present: " . ($conversation_summary !== null ? 'YES' : 'NO'));
    if ($conversation_summary !== null) {
        error_log("Summary content (first 100 chars): " . substr($conversation_summary, 0, 100));
        error_log("Summary length: " . strlen($conversation_summary));
    }
    
    $date = date("Y-m-d H:i:s"); // Use full timestamp
    
    // If no conversation_id is provided, create a new conversation
    if (empty($conversation_id)) {
        // Use a placeholder title that will be replaced by AI-generated title later
        $title = "New Nutrition Chat";
        
        // Set initial summary if available
        $sql = "INSERT INTO conversations (user_id, title";
        $types = "is";
        $params = array($user_id, $title);
        
        if ($conversation_summary !== null) {
            $sql .= ", conversation_summary";
            $types .= "s";
            $params[] = $conversation_summary;
            error_log("Adding summary to new conversation SQL");
        }
        
        $sql .= ") VALUES (?, ?";
        if ($conversation_summary !== null) {
            $sql .= ", ?";
        }
        $sql .= ")";
        
        error_log("SQL for new conversation: " . $sql);
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            $conversation_id = $conn->insert_id;
            error_log("Created new conversation with ID: " . $conversation_id);
        } else {
            error_log("Failed to create conversation: " . $stmt->error);
            echo json_encode(["success" => false, "error" => "Failed to create conversation"]);
            exit;
        }
        $stmt->close();
    }

    // Check if we're saving a message (both user_message and bot_message should be provided)
    if (!empty($user_message) && !empty($bot_message)) {
        $stmt = $conn->prepare("INSERT INTO chats (user_id, conversation_id, date, user_message, bot_message) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisss", $user_id, $conversation_id, $date, $user_message, $bot_message);
        if ($stmt->execute()) {
            error_log("Successfully inserted chat message");
            
            // Update the conversation's updated_at timestamp and summary
            if ($conversation_summary !== null) {
                error_log("Updating conversation with summary");
                
                // Ensure the summary is properly formatted for SQL
                $summary_to_store = $conversation_summary;
                
                // If it's too long, truncate it to prevent database issues
                $max_summary_length = 16000; // Adjust based on your database field size
                if (strlen($summary_to_store) > $max_summary_length) {
                    error_log("Summary too long (" . strlen($summary_to_store) . " chars), truncating to " . $max_summary_length);
                    $summary_to_store = substr($summary_to_store, 0, $max_summary_length);
                }
                
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW(), conversation_summary = ? WHERE id = ?");
                $update_stmt->bind_param("si", $summary_to_store, $conversation_id);
                $update_result = $update_stmt->execute();
                
                // Additional logging for database errors
                if (!$update_result) {
                    error_log("MySQL Error updating summary: " . $update_stmt->error);
                    error_log("MySQL Error number: " . $update_stmt->errno);
                } else {
                    error_log("Summary successfully updated in database. Affected rows: " . $update_stmt->affected_rows);
                }
                
                error_log("Summary update result: " . ($update_result ? 'SUCCESS' : 'FAILED - ' . $update_stmt->error));
            } else {
                error_log("No summary to update, just updating timestamp");
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
                $update_stmt->bind_param("i", $conversation_id);
                $update_stmt->execute();
            }
            $update_stmt->close();
            
            error_log("===== SAVE MESSAGE DEBUG END =====");
            
            echo json_encode([
                "success" => true,
                "conversation_id" => $conversation_id
            ]);
        } else {
            error_log("Error saving message: " . $stmt->error);
            echo json_encode(["success" => false, "error" => "Error saving message"]);
        }
        $stmt->close();
    } else {
        // Only check for message content if we're actually trying to save a message
        if (isset($data['user_message']) || isset($data['bot_message'])) {
            error_log("Missing required message content");
            echo json_encode(["success" => false, "error" => "Both user and bot messages are required"]);
        } else {
            error_log("No messages to save, just returning conversation ID");
            echo json_encode([
                "success" => true,
                "conversation_id" => $conversation_id
            ]);
        }
    }
    exit;
}

// New endpoint to get conversation history and summary for AI context
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && isset($_GET['get_history']) && isset($_GET['conversation_id'])) {
    $user_id = $_SESSION['user_id'];
    $conversation_id = $_GET['conversation_id'];
    
    // Get conversation messages for history
    $stmt = $conn->prepare("
        SELECT 
            c.user_message,
            c.bot_message,
            conv.conversation_summary
        FROM chats c
        JOIN conversations conv ON c.conversation_id = conv.id
        WHERE c.conversation_id = ? AND c.user_id = ?
        ORDER BY c.date ASC
    ");
    $stmt->bind_param("ii", $conversation_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $messages = [];
        $summary = null;
        
        // Format messages for the AI
        while ($row = $result->fetch_assoc()) {
            $messages[] = [
                "role" => "user",
                "parts" => [
                    ["text" => $row["user_message"]]
                ]
            ];
            $messages[] = [
                "role" => "model",
                "parts" => [
                    ["text" => $row["bot_message"]]
                ]
            ];
            
            // Get summary from the last row (it will be the same for all rows)
            $summary = $row["conversation_summary"];
        }
        
        $response_data = ["messages" => $messages];
        
        // Add summary to the response if available
        if (!empty($summary)) {
            $response_data["summary"] = $summary;
        }
        
        echo json_encode($response_data);
    } else {
        echo json_encode(["success" => false, "error" => "No messages found for this conversation"]);
    }
    $stmt->close();
    exit;
}

// Handle user-specific conversation list
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && (isset($_GET['list']) && $_GET['list'] === 'conversations' || isset($_GET['conversations']))) {
    $user_id = $_SESSION['user_id'];
    
    // Enhanced debugging - log everything we can
    error_log("==== CONVERSATIONS API DEBUG START ====");
    error_log("PHP Version: " . phpversion());
    error_log("Current time: " . date('Y-m-d H:i:s'));
    error_log("Request: " . $_SERVER['REQUEST_URI']);
    error_log("User ID: " . $user_id);
    error_log("Session data: " . print_r($_SESSION, true));
    
    try {
        // Check database connection status
        if (!$conn->ping()) {
            error_log("ERROR: Database connection lost, attempting to reconnect");
            $conn->close();
            $conn = getDbConnection();
            if (!$conn) {
                error_log("FATAL: Failed to reconnect to database");
                echo json_encode([
                    "success" => false, 
                    "error" => "Database connection lost",
                    "debug_info" => "See server logs for details"
                ]);
                exit;
            }
        }
        
        error_log("Database connection OK: " . $conn->host_info);
        
        // Prepare SQL statement with explicit error handling
        $sql = "
            SELECT 
                c.id, 
                c.title, 
                c.created_at as timestamp, 
                c.updated_at,
                (SELECT COUNT(*) FROM chats WHERE conversation_id = c.id) as message_count
            FROM conversations c
            WHERE c.user_id = ?
            ORDER BY c.updated_at DESC
        ";
        
        error_log("SQL query: " . $sql);
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("ERROR: SQL prepare failed: " . $conn->error);
            echo json_encode([
                "success" => false, 
                "error" => "Database query error: " . $conn->error,
                "query" => $sql
            ]);
            exit;
        }
        
        $stmt->bind_param("i", $user_id);
        
        // Execute statement with error handling
        $exec_result = $stmt->execute();
        if (!$exec_result) {
            error_log("ERROR: SQL execute failed: " . $stmt->error);
            echo json_encode([
                "success" => false, 
                "error" => "Failed to execute query: " . $stmt->error
            ]);
            exit;
        }
        
        error_log("SQL executed successfully");
        
        $result = $stmt->get_result();
        error_log("Result fetch mode: " . $result->type);
        error_log("Rows returned: " . $result->num_rows);
        
        $conversations = [];
        while ($row = $result->fetch_assoc()) {
            error_log("Row data: " . print_r($row, true));
            $conversations[] = $row;
        }
        
        $response = [
            "success" => true, 
            "conversations" => $conversations,
            "user_id" => $user_id,
            "timestamp" => time(),
            "debug" => [
                "count" => count($conversations),
                "php_version" => phpversion(),
                "mysql_version" => $conn->server_info
            ]
        ];
        
        error_log("Response prepared: " . substr(json_encode($response), 0, 500) . "...");
        error_log("==== CONVERSATIONS API DEBUG END ====");
        
        echo json_encode($response);
    } catch (Exception $e) {
        error_log("EXCEPTION: " . $e->getMessage());
        error_log("Trace: " . $e->getTraceAsString());
        
        echo json_encode([
            "success" => false, 
            "error" => "Server error: " . $e->getMessage(),
            "debug_info" => "Exception at " . $e->getFile() . ":" . $e->getLine()
        ]);
    }
    
    if (isset($stmt)) {
        $stmt->close();
    }
    exit;
}

// Handle retrieving messages for a specific conversation
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id']) && isset($_GET['conversation_id']) && !isset($_GET['get_history']) && !isset($_GET['get_message_count'])) {
    $user_id = $_SESSION['user_id'];
    $conversation_id = $_GET['conversation_id'];
    
    // First, get the conversation details including summary
    $conv_stmt = $conn->prepare("
        SELECT 
            conversation_summary
        FROM conversations
        WHERE id = ? AND user_id = ?
    ");
    $conv_stmt->bind_param("ii", $conversation_id, $user_id);
    $conv_stmt->execute();
    $conv_result = $conv_stmt->get_result();
    $conversation_data = $conv_result->fetch_assoc();
    $conv_stmt->close();
    
    // Then get the messages for this conversation
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
    
    // Include conversation summary in the response
    echo json_encode([
        "success" => true, 
        "messages" => $messages,
        "conversation_summary" => $conversation_data['conversation_summary'] ?? null
    ]);
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

// Handle request to get message count for a conversation
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['get_message_count']) && isset($_GET['conversation_id']) && isset($_SESSION['user_id'])) {
    $conversation_id = intval($_GET['conversation_id']);
    $user_id = $_SESSION['user_id'];
    
    // Verify the conversation belongs to the user
    $verify_stmt = $conn->prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?");
    $verify_stmt->bind_param("ii", $conversation_id, $user_id);
    $verify_stmt->execute();
    $verify_stmt->store_result();
    
    if ($verify_stmt->num_rows === 0) {
        echo json_encode(["success" => false, "error" => "Conversation not found"]);
        exit;
    }
    $verify_stmt->close();
    
    // Get the count of messages
    $count_stmt = $conn->prepare("SELECT COUNT(*) as count FROM chats WHERE conversation_id = ?");
    $count_stmt->bind_param("i", $conversation_id);
    $count_stmt->execute();
    $result = $count_stmt->get_result();
    $count_data = $result->fetch_assoc();
    $count_stmt->close();
    
    echo json_encode([
        "success" => true,
        "count" => $count_data['count']
    ]);
    exit;
}

// Handle POST JSON payload for searchKnowledgeBase
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_SERVER["CONTENT_TYPE"]) && 
    (strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false)) {
    // Get the raw POST data and decode it
    $jsonData = file_get_contents('php://input');
    $data = json_decode($jsonData, true);
    
    // Check if this is a knowledge base search request
    if (isset($data['action']) && $data['action'] === 'searchKnowledgeBase') {
        $query = $data['query'] ?? '';
        $limit = $data['limit'] ?? 5;
        
        if (empty($query)) {
            echo json_encode(['success' => false, 'message' => 'Query is required']);
            exit;
        }
        
        error_log("POST JSON request for knowledge base search: $query");
        
        // Directly call the search function
        $results = searchKnowledgeBase($query, intval($limit));
        
        // Return the results
        echo json_encode($results);
        exit;
    }
}

// Test Qdrant connectivity (for debugging)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['test_qdrant'])) {
    header('Content-Type: application/json');
    
    $qdrantUrl = getenv('QDRANT_URL');
    $qdrantApiKey = getenv('QDRANT_API_KEY');
    $collectionName = getenv('COLLECTION_NAME');
    
    $debug = [
        'env_vars' => [
            'QDRANT_URL' => $qdrantUrl ? 'Set (' . $qdrantUrl . ')' : 'Not set',
            'QDRANT_API_KEY' => $qdrantApiKey ? 'Set (hidden for security)' : 'Not set',
            'COLLECTION_NAME' => $collectionName ?: 'Not set'
        ],
        'connection_test' => null
    ];
    
    // Test connection to Qdrant if we have the URL and API key
    if ($qdrantUrl && $qdrantApiKey) {
        $ch = curl_init();
        
        // Clean the URL
        $qdrantUrl = rtrim($qdrantUrl, '/');
        $collectionEndpoint = "{$qdrantUrl}/collections";
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $collectionEndpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'api-key: ' . $qdrantApiKey
            ]
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_errno($ch)) {
            $debug['connection_test'] = [
                'success' => false,
                'error' => 'cURL error: ' . curl_error($ch)
            ];
        } else {
            $debug['connection_test'] = [
                'success' => $httpCode === 200,
                'http_code' => $httpCode,
                'response' => json_decode($response, true)
            ];
        }
        
        curl_close($ch);
    } else {
        $debug['connection_test'] = [
            'success' => false,
            'error' => 'Missing Qdrant URL or API key'
        ];
    }
    
    echo json_encode($debug, JSON_PRETTY_PRINT);
    exit;
}

// Handle searchKnowledgeBase GET request 
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'searchKnowledgeBase') {
    header('Content-Type: application/json');
    
    $query = $_GET['query'] ?? '';
    $limit = $_GET['limit'] ?? 5;
    
    if (empty($query)) {
        echo json_encode(['success' => false, 'message' => 'Query is required']);
        exit;
    }
    
    error_log("GET request for knowledge base search: $query");
    
    // Perform the search with proper params
    $results = searchKnowledgeBase($query, intval($limit));
    
    // Return the results directly
    echo json_encode($results);
    exit;
}

// Handle creating a new conversation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && isset($_GET['create_conversation'])) {
    header('Content-Type: application/json');
    $user_id = $_SESSION['user_id'];
    
    // Get request body
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    // Default title if not provided
    $title = isset($data['title']) ? $data['title'] : 'New Conversation';
    
    // Debug logging
    error_log("Creating new conversation with title: " . $title . " for user: " . $user_id);
    
    // Make sure database connection is valid
    if (!$conn->ping()) {
        error_log("Database connection lost, attempting to reconnect");
        $conn->close();
        $conn = getDbConnection();
        if (!$conn) {
            error_log("Failed to reconnect to database");
            echo json_encode(['success' => false, 'error' => 'Database connection error']);
            exit;
        }
    }
    
    // Prepare statement
    $stmt = $conn->prepare("INSERT INTO conversations (user_id, title, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
    
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param('is', $user_id, $title);
    
    // Execute statement
    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $stmt->error]);
        exit;
    }
    
    $conversation_id = $stmt->insert_id;
    $stmt->close();
    
    // Return the new conversation ID
    echo json_encode([
        'success' => true,
        'conversation_id' => $conversation_id,
        'title' => $title
    ]);
    exit;
}

// Handle deleting a conversation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && isset($_GET['delete_conversation'])) {
    header('Content-Type: application/json');
    $user_id = $_SESSION['user_id'];
    
    // Get request body
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    // Check required parameters
    if (!isset($data['conversation_id'])) {
        echo json_encode(['success' => false, 'error' => 'Missing conversation_id parameter']);
        exit;
    }
    
    $conversation_id = $data['conversation_id'];
    
    // Debug logging
    error_log("Deleting conversation " . $conversation_id . " for user: " . $user_id);
    
    // Make sure database connection is valid
    if (!$conn->ping()) {
        error_log("Database connection lost, attempting to reconnect");
        $conn->close();
        $conn = getDbConnection();
        if (!$conn) {
            error_log("Failed to reconnect to database");
            echo json_encode(['success' => false, 'error' => 'Database connection error']);
            exit;
        }
    }
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // First delete messages in the conversation
        $stmt = $conn->prepare("DELETE FROM chats WHERE conversation_id = ? AND user_id = ?");
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param('ii', $conversation_id, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $stmt->close();
        
        // Then delete the conversation
        $stmt = $conn->prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?");
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param('ii', $conversation_id, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        // Check if the conversation was deleted
        if ($stmt->affected_rows == 0) {
            throw new Exception("Conversation not found or not owned by user");
        }
        
        $stmt->close();
        
        // Commit transaction
        $conn->commit();
        
        // Return success
        echo json_encode([
            'success' => true,
            'conversation_id' => $conversation_id
        ]);
    } catch (Exception $e) {
        // Rollback transaction
        $conn->rollback();
        
        error_log("Error deleting conversation: " . $e->getMessage());
        
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    
    exit;
}

// Handle renaming a conversation
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && isset($_GET['rename_conversation'])) {
    header('Content-Type: application/json');
    $user_id = $_SESSION['user_id'];
    
    // Get request body
    $requestBody = file_get_contents('php://input');
    $data = json_decode($requestBody, true);
    
    // Check required parameters
    if (!isset($data['conversation_id']) || !isset($data['title'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
        exit;
    }
    
    $conversation_id = $data['conversation_id'];
    $title = $data['title'];
    
    // Debug logging
    error_log("Renaming conversation " . $conversation_id . " to: " . $title . " for user: " . $user_id);
    
    // Make sure database connection is valid
    if (!$conn->ping()) {
        error_log("Database connection lost, attempting to reconnect");
        $conn->close();
        $conn = getDbConnection();
        if (!$conn) {
            error_log("Failed to reconnect to database");
            echo json_encode(['success' => false, 'error' => 'Database connection error']);
            exit;
        }
    }
    
    // Prepare statement to update conversation title
    $stmt = $conn->prepare("UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
    
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param('sii', $title, $conversation_id, $user_id);
    
    // Execute statement
    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $stmt->error]);
        exit;
    }
    
    // Check if the conversation was updated
    if ($stmt->affected_rows == 0) {
        echo json_encode(['success' => false, 'error' => 'Conversation not found or not owned by user']);
        exit;
    }
    
    $stmt->close();
    
    // Return success
    echo json_encode([
        'success' => true,
        'conversation_id' => $conversation_id,
        'title' => $title
    ]);
    exit;
}

// Handle get_message_count action
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_message_count') {
    header('Content-Type: application/json');
    $user_id = $_SESSION['user_id'] ?? 0;
    $conversation_id = $_GET['conversation_id'] ?? '';
    
    if (empty($conversation_id)) {
        echo json_encode(['success' => false, 'error' => 'Conversation ID is required']);
        exit;
    }
    
    // Make sure database connection is valid
    if (!$conn->ping()) {
        error_log("Database connection lost, attempting to reconnect");
        $conn->close();
        $conn = getDbConnection();
        if (!$conn) {
            error_log("Failed to reconnect to database");
            echo json_encode(['success' => false, 'error' => 'Database connection error']);
            exit;
        }
    }
    
    // Get message count
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM chats WHERE conversation_id = ? AND user_id = ?");
    
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $conn->error]);
        exit;
    }
    
    $stmt->bind_param('ii', $conversation_id, $user_id);
    
    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $stmt->error]);
        exit;
    }
    
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $count = $row['count'];
    
    $stmt->close();
    
    // Return the count
    echo json_encode([
        'success' => true,
        'count' => (int)$count
    ]);
    exit;
}

$conn->close();

/**
 * Search the nutrition knowledge base
 * 
 * @param string $query User's query
 * @param int $limit Maximum number of results to return
 * @return array Search results
 */
function searchKnowledgeBase($query, $topK = 5) {
    error_log("INFO: Starting knowledge base search for query: " . $query);
    
    // Initialize return data structure
    $data = [
        'results' => [],
        'answer' => '',
        'query' => $query
    ];
    
    // Get configuration from environment variables
    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        $envVars = parse_ini_file($envFile);
        foreach ($envVars as $key => $value) {
            putenv("$key=$value");
        }
        error_log("INFO: Loaded environment variables from .env file");
    } else {
        error_log("WARNING: No .env file found at $envFile, using existing environment");
    }
    
    // Qdrant configuration parameters from ENV
    $qdrantUrl = getenv('QDRANT_URL');
    $qdrantApiKey = getenv('QDRANT_API_KEY');
    $geminiApiKey = getenv('GEMINI_API_KEY');
    $collectionName = getenv('COLLECTION_NAME');
    
    // Log configuration for debugging
    error_log("CONFIG: Qdrant URL: " . ($qdrantUrl ? $qdrantUrl : "NOT SET"));
    error_log("CONFIG: Qdrant API Key: " . ($qdrantApiKey ? "PROVIDED" : "NOT SET"));
    error_log("CONFIG: Gemini API Key: " . ($geminiApiKey ? "PROVIDED" : "NOT SET"));
    error_log("CONFIG: Collection Name: " . ($collectionName ? $collectionName : "NOT SET"));
    
    // Check if configuration is complete
    if (!$qdrantUrl) {
        error_log("ERROR: Qdrant URL not set. Check environment variables.");
        return $data;
    }
    
    if (!$qdrantApiKey) {
        error_log("ERROR: Qdrant API key not set. Check environment variables.");
        return $data;
    }
    
    if (!$geminiApiKey) {
        error_log("ERROR: Gemini API key not set. Check environment variables.");
        return $data;
    }
    
    if (!$collectionName) {
        error_log("INFO: Collection name not set, using default 'nutrition_knowledge'");
        $collectionName = "nutrition_knowledge";
    }
    
    // Ensure Qdrant URL has no trailing slash
    $qdrantUrl = rtrim($qdrantUrl, '/');
    
    // Step 1: Get embedding for query using Gemini API
    error_log("INFO: Getting embedding for query...");
    $embedding = getGeminiEmbedding($query);
    
    if (!$embedding) {
        error_log("ERROR: Failed to get embedding for query");
        return $data;
    }
    
    error_log("INFO: Got embedding with " . count($embedding) . " dimensions");
    
    // Step 2: Search Qdrant with the embedding - closely match Python implementation
    error_log("INFO: Searching Qdrant collection: " . $collectionName);
    
    $searchUrl = "{$qdrantUrl}/collections/{$collectionName}/points/search";
    error_log("INFO: Search URL: " . $searchUrl);
    
    $searchPayload = [
        'vector' => $embedding,
        'limit' => $topK,
        'with_payload' => true
    ];
    
    $headers = [
        'Content-Type: application/json'
    ];
    
    // Add API key if provided - exactly like the Python code
    if ($qdrantApiKey) {
        $headers[] = 'api-key: ' . $qdrantApiKey;
    }
    
    error_log("INFO: Search payload: vector size=" . count($embedding) . ", limit=" . $topK);
    error_log("INFO: Headers: " . implode(', ', $headers));
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $searchUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($searchPayload),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 30
    ]);
    
    // Enable verbose logging
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Get verbose log
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    error_log("VERBOSE CURL: " . $verboseLog);
    
    // Check for errors
    if ($httpCode !== 200) {
        error_log("ERROR: Qdrant search failed with HTTP code " . $httpCode);
        error_log("ERROR: Response: " . substr($response, 0, 1000));
        
        if (curl_errno($ch)) {
            error_log("ERROR: cURL error: " . curl_error($ch));
        }
        
        curl_close($ch);
        return $data;
    }
    
    curl_close($ch);
    
    // Parse response
    $searchResult = json_decode($response, true);
    
    if (!$searchResult) {
        error_log("ERROR: Failed to parse Qdrant response: " . substr($response, 0, 1000));
        error_log("ERROR: JSON decode error: " . json_last_error_msg());
        return $data;
    }
    
    // Extract results - check both 'result' and 'hits' like the Python code
    $hits = [];
    if (isset($searchResult['result'])) {
        $hits = $searchResult['result'];
        error_log("INFO: Found results in 'result' field");
    } elseif (isset($searchResult['hits'])) {
        $hits = $searchResult['hits'];
        error_log("INFO: Found results in 'hits' field");
    } else {
        error_log("ERROR: No results field found in response. Keys: " . implode(', ', array_keys($searchResult)));
        error_log("ERROR: Response structure: " . json_encode($searchResult, JSON_PRETTY_PRINT));
        return $data;
    }
    
    $resultCount = count($hits);
    error_log("INFO: Found " . $resultCount . " results from Qdrant search");
    
    if ($resultCount === 0) {
        error_log("INFO: No results found for query: " . $query);
        return $data;
    }
    
    // Process the results
    $processedResults = [];
    
    foreach ($hits as $hit) {
        $resultData = ['score' => $hit['score'] ?? 0];
        
        if (isset($hit['payload'])) {
            $payload = $hit['payload'];
            
            foreach ($payload as $key => $value) {
                $resultData[$key] = $value;
                if ($key === 'title') {
                    error_log("INFO: Found result with title: " . $value);
                }
            }
            
            // Skip results with no text
            if (!isset($resultData['text']) || empty($resultData['text'])) {
                error_log("WARN: Skipping result with no text");
                continue;
            }
            
            // If no title but has text, create a title from text
            if (!isset($resultData['title']) && isset($resultData['text'])) {
                $resultData['title'] = substr($resultData['text'], 0, 50) . "...";
            }
            
            $processedResults[] = $resultData;
        } else {
            error_log("WARN: Result has no payload");
        }
    }
    
    // Update the results in the return data
    $data['results'] = $processedResults;
    
    // Step 3: Synthesize an answer if we have results
    if (count($processedResults) > 0) {
        error_log("INFO: Synthesizing answer from " . count($processedResults) . " results");
        
        // Construct context from search results
        $context = '';
        foreach ($processedResults as $index => $result) {
            $context .= "Source " . ($index + 1) . " (from " . $result['title'] . "):\n" . $result['text'] . "\n\n";
        }
        
        $answer = synthesizeAnswer($query, $context, $processedResults);
        
        if ($answer) {
            $data['answer'] = $answer;
            error_log("INFO: Successfully synthesized answer");
        } else {
            error_log("ERROR: Failed to synthesize answer");
        }
    }
    
    return $data;
}

// Helper function to sanitize a string for use as a filename
function sanitizeFilename($string) {
    // Replace spaces with underscores and remove special characters
    $string = preg_replace('/[^a-zA-Z0-9\s]/', '', $string);
    $string = str_replace(' ', '_', $string);
    $string = strtolower($string);
    return $string;
}

/**
 * Synthesize an answer from search results using Gemini API
 * 
 * @param string $query The user's original query
 * @param string $context The context from search results
 * @param array $results List of search result objects with text and metadata
 * @return string Synthesized answer with source citations
 */
function synthesizeAnswer($query, $context, $results) {
    $geminiApiKey = getenv('GEMINI_API_KEY');
    
    if (!$geminiApiKey) {
        error_log("ERROR: Gemini API key not configured for answer synthesis");
        return null;
    }
    
    // Handle case where no results are found
    if (empty($results)) {
        error_log("WARNING: No knowledge base results found for query: $query");
        return "I don't have specific information about that in my nutrition knowledge base. Could you please ask a different nutrition-related question, or rephrase your current question?";
    }
    
    // Create system prompt with instructions for answer formatting
    $systemPrompt = <<<EOD
You are NutriGuide, a specialized nutritional assistant. Your task is to answer questions about nutrition accurately, using only information from the provided context. Format your response in clear, concise markdown.

IMPORTANT INSTRUCTIONS:
1. Use ONLY information from the provided context to answer the question.
2. If you cannot answer the question from the context, say "I don't have enough information about that topic."
3. Your answers should be thorough, detailed and comprehensive while remaining readable.
4. DO NOT mention that you're using a specific context or that your knowledge comes from specific sources in the main answer.
5. DO NOT use first-person language like "In the provided context" or "Based on the information I have."
6. Format your response in proper markdown with sections and bullet points where appropriate.
7. DO NOT include inline citations (like [1], [2]) in your answer text.
8. DO NOT include a "Sources:" section - the system will add this automatically.

FORMAT YOUR ANSWER AS FOLLOWS:
1. Main answer with proper markdown formatting - make it thorough and comprehensive
2. No sources section - this will be added by the system

Remember to be friendly and helpful, but focus on providing detailed nutrition information that's backed by the sources provided.
EOD;

    // Construct prompt for Gemini API
    $messages = [
        [
            "role" => "system",
            "content" => $systemPrompt
        ],
        [
            "role" => "user",
            "content" => "Here is nutrition information from sources:\n\n$context\n\nQuestion: $query\n\nRemember to cite your sources."
        ]
    ];
    
    // Prepare request payload
    $payload = [
        "contents" => $messages,
        "generationConfig" => [
            "temperature" => 0.2,
            "topP" => 0.8,
            "topK" => 40,
            "maxOutputTokens" => 800,
        ]
    ];
    
    // Initialize cURL session
    $ch = curl_init();
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=" . $geminiApiKey);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    // Enable verbose output for debugging
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    
    // Execute cURL request
    $response = curl_exec($ch);
    
    // Get verbose information
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    error_log("DEBUG: cURL verbose output (synthesize): " . $verboseLog);
    
    // Check for cURL errors
    if (curl_errno($ch)) {
        error_log("ERROR: Gemini API request failed: " . curl_error($ch));
        curl_close($ch);
        return null;
    }
    
    // Get HTTP status code
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Check if request was successful
    if ($statusCode !== 200) {
        error_log("ERROR: Gemini API returned status code $statusCode: $response");
        return null;
    }
    
    // Parse response
    $responseData = json_decode($response, true);
    
    // Check if response is valid
    if (!$responseData || !isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
        error_log("ERROR: Invalid response from Gemini API: " . print_r($response, true));
        return null;
    }
    
    // Extract answer text
    $answerText = $responseData['candidates'][0]['content']['parts'][0]['text'];
    
    error_log("INFO: Successfully synthesized answer");
    return $answerText;
}

/**
 * Get embedding vector for text using Gemini API
 * 
 * @param string $text The text to get the embedding for
 * @return array|null The embedding vector or null on error
 */
function getGeminiEmbedding($text) {
    $apiKey = getenv('GEMINI_API_KEY');
    
    if (!$apiKey) {
        error_log("ERROR: Gemini API key not configured.");
        return null;
    }
    
    // Ensure text length doesn't exceed API limits (20,000 chars)
    if (strlen($text) > 20000) {
        $text = substr($text, 0, 20000);
        error_log("WARNING: Text too long for embedding, trimmed to 20,000 chars");
    }
    
    error_log("INFO: Getting Gemini embedding for text: " . substr($text, 0, 50) . "...");
    
    $url = "https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key=" . $apiKey;
    
    $data = [
        "model" => "models/embedding-001",
        "content" => [
            "parts" => [
                ["text" => $text]
            ]
        ]
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json'
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    // Enable verbose logging for debugging
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    // Get verbose log
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    error_log("VERBOSE: " . $verboseLog);
    
    if ($httpCode !== 200) {
        error_log("ERROR: Gemini API returned status " . $httpCode . ": " . $response);
        
        if (curl_errno($ch)) {
            error_log("ERROR: cURL error: " . curl_error($ch));
        }
        
        curl_close($ch);
        return null;
    }
    
    curl_close($ch);
    
    $jsonResponse = json_decode($response, true);
    
    if (!$jsonResponse || !isset($jsonResponse['embedding']) || !isset($jsonResponse['embedding']['values'])) {
        error_log("ERROR: Unexpected response format from Gemini: " . print_r($response, true));
        return null;
    }
    
    $embedding = $jsonResponse['embedding']['values'];
    error_log("INFO: Successfully got embedding with " . count($embedding) . " dimensions");
    
    return $embedding;
}

// Helper function to update conversation history (now directly in conversations table)
function updateConversationSummary($conn, $conversation_id, $newSummary = null) {
    if ($newSummary === null) {
        return null; // If no summary provided, nothing to update
    }
    
    // Update the conversation summary
    $update_stmt = $conn->prepare("
        UPDATE conversations 
        SET conversation_summary = ? 
        WHERE id = ?
    ");
    $update_stmt->bind_param("si", $newSummary, $conversation_id);
    $update_stmt->execute();
    $update_stmt->close();
    
    return $newSummary;
}

/**
 * Helper function to call Gemini API for text generation
 * 
 * @param string $prompt The text prompt to send to the API
 * @param float $temperature Temperature setting (0.0-1.0)
 * @param int $maxTokens Maximum tokens to generate
 * @return array|null Response with text or null on error
 */
function callGeminiAPI($prompt, $temperature = 0.7, $maxTokens = 800) {
    $apiKey = getenv('GEMINI_API_KEY');
    
    if (!$apiKey) {
        error_log("ERROR: Gemini API key not configured for text generation");
        return null;
    }
    
    // Prepare request payload
    $payload = [
        "contents" => [
            [
                "role" => "user",
                "parts" => [
                    ["text" => $prompt]
                ]
            ]
        ],
        "generationConfig" => [
            "temperature" => $temperature,
            "topP" => 0.8,
            "topK" => 40,
            "maxOutputTokens" => $maxTokens,
        ]
    ];
    
    // Initialize cURL session
    $ch = curl_init();
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=" . $apiKey);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    // Execute cURL request
    $response = curl_exec($ch);
    
    // Check for cURL errors
    if (curl_errno($ch)) {
        error_log("ERROR: Gemini API request failed: " . curl_error($ch));
        curl_close($ch);
        return null;
    }
    
    // Get HTTP status code
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Check if request was successful
    if ($statusCode !== 200) {
        error_log("ERROR: Gemini API returned status code $statusCode: $response");
        return null;
    }
    
    // Parse response
    $responseData = json_decode($response, true);
    
    // Check if response is valid
    if (!$responseData || !isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
        error_log("ERROR: Invalid response from Gemini API: " . print_r($response, true));
        return null;
    }
    
    // Extract answer text
    $answerText = $responseData['candidates'][0]['content']['parts'][0]['text'];
    
    return ['text' => $answerText];
}
?>
