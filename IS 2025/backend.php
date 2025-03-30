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

// Handle chat saving with conversation tracking
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SESSION['user_id']) && !isset($_POST['action'])) {
    $user_id = $_SESSION['user_id'];
    $user_message = $_POST['user_message'] ?? '';
    $bot_message = $_POST['bot_message'] ?? '';
    $conversation_id = $_POST['conversation_id'] ?? 0;
    $conversation_summary = $_POST['conversation_summary'] ?? null;
    $date = date("Y-m-d H:i:s"); // Use full timestamp
    
    // If no conversation_id is provided, create a new conversation
    if (empty($conversation_id)) {
        // Generate a better title from the user message
        if (strlen($user_message) <= 40) {
            // Use the entire message if it's short
            $title = $user_message;
        } else {
            // Try to extract the main topic/question from the first sentence
            $firstSentence = preg_split('/[.!?]/', $user_message)[0];
            if (strlen($firstSentence) <= 40) {
                $title = $firstSentence;
            } else {
                // Just take the first 37 characters and add ellipsis
                $title = substr($user_message, 0, 37) . '...';
            }
        }
        
        // Set initial summary if available
        $sql = "INSERT INTO conversations (user_id, title";
        $types = "is";
        $params = array($user_id, $title);
        
        if ($conversation_summary !== null) {
            $sql .= ", conversation_summary";
            $types .= "s";
            $params[] = $conversation_summary;
        }
        
        $sql .= ") VALUES (?, ?";
        if ($conversation_summary !== null) {
            $sql .= ", ?";
        }
        $sql .= ")";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        
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
            // Update the conversation's updated_at timestamp and summary
            if ($conversation_summary !== null) {
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW(), conversation_summary = ? WHERE id = ?");
                $update_stmt->bind_param("si", $conversation_summary, $conversation_id);
            } else {
                $update_stmt = $conn->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?");
                $update_stmt->bind_param("i", $conversation_id);
            }
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

// Handle knowledge base search request
if (isset($_GET['action']) && $_GET['action'] === 'search_knowledge_base' && isset($_GET['query'])) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'error' => 'User not logged in']);
        exit;
    }
    
    $query = $_GET['query'];
    $results = searchKnowledgeBase($query);
    
    echo json_encode(['success' => true, 'results' => $results]);
    exit;
}

$conn->close();

/**
 * Search the nutrition knowledge base
 * 
 * @param string $query User's query
 * @return array Search results
 */
function searchKnowledgeBase($query) {
    // Qdrant configuration
    $qdrantUrl = getenv('QDRANT_URL');
    $qdrantApiKey = getenv('QDRANT_API_KEY');
    $collectionName = getenv('COLLECTION_NAME') ?: 'nutrition_knowledge';
    
    // Get embedding for query using Gemini API
    $embedding = getGeminiEmbedding($query);
    
    if (!$embedding) {
        return [];
    }
    
    // Search Qdrant using the embedding
    $searchData = [
        'vector' => $embedding,
        'limit' => 3, // Return top 3 results
        'with_payload' => true
    ];
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $qdrantUrl . "/collections/{$collectionName}/points/search",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($searchData),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Api-Key: ' . $qdrantApiKey
        ]
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode != 200) {
        error_log("Qdrant search failed with HTTP {$httpCode}: {$response}");
        return [];
    }
    
    $searchResult = json_decode($response, true);
    
    if ($searchResult && isset($searchResult['result'])) {
        return $searchResult['result'];
    }
    
    return [];
}

/**
 * Get embedding for text using Gemini API
 * 
 * @param string $text The text to embed
 * @return array|null Vector embedding or null on failure
 */
function getGeminiEmbedding($text) {
    $geminiApiKey = getenv('GEMINI_API_KEY');
    if (!$geminiApiKey) {
        error_log("Gemini API key not configured");
        return null;
    }
    
    // Trim text to avoid API limits
    if (strlen($text) > 25000) {
        $text = substr($text, 0, 25000);
    }
    
    $url = "https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key={$geminiApiKey}";
    
    $data = [
        'model' => 'models/embedding-001',
        'content' => [
            'parts' => [
                ['text' => $text]
            ]
        ]
    ];
    
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode != 200) {
        error_log("Gemini embedding request failed with HTTP {$httpCode}: {$response}");
        return null;
    }
    
    $result = json_decode($response, true);
    
    if ($result && isset($result['embedding']) && isset($result['embedding']['values'])) {
        return $result['embedding']['values'];
    }
    
    error_log("Unexpected Gemini embedding response: " . print_r($result, true));
    return null;
}
?>
