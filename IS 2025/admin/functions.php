<?php
// Admin specific functions

// Get all users with pagination and filtering
function getAllUsers($conn, $page = 1, $perPage = 10, $filterAdmin = null) {
    $offset = ($page - 1) * $perPage;
    
    $query = "SELECT id, username, is_admin FROM users";
    $params = [];
    $types = "";
    
    // Add filter condition if specified
    if ($filterAdmin !== null) {
        $query .= " WHERE is_admin = ?";
        $params[] = (int)$filterAdmin;
        $types .= "i";
    }
    
    $query .= " ORDER BY id DESC LIMIT ? OFFSET ?";
    $params[] = $perPage;
    $params[] = $offset;
    $types .= "ii";
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    $stmt->close();
    return $users;
}

// Count total users for pagination
function countTotalUsers($conn, $filterAdmin = null) {
    $query = "SELECT COUNT(*) as count FROM users";
    $params = [];
    $types = "";
    
    // Add filter condition if specified
    if ($filterAdmin !== null) {
        $query .= " WHERE is_admin = ?";
        $params[] = (int)$filterAdmin;
        $types .= "i";
    }
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return $row['count'];
}

// Get user by ID
function getUserById($conn, $user_id) {
    $stmt = $conn->prepare("SELECT id, username, is_admin FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $stmt->close();
        return $user;
    }
    
    $stmt->close();
    return null;
}

// Get all conversations with pagination
function getAllConversations($conn, $limit = 10, $page = 1) {
    $offset = ($page - 1) * $limit;
    
    $stmt = $conn->prepare("
        SELECT c.id, c.user_id, c.title, c.created_at, c.updated_at, u.username
        FROM conversations c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.updated_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param("ii", $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $conversations[] = $row;
    }
    
    $stmt->close();
    return $conversations;
}

// Count total conversations for pagination
function countTotalConversations($conn, $user_id = null) {
    $query = "SELECT COUNT(*) as count FROM conversations";
    $params = [];
    $types = "";
    
    if ($user_id !== null) {
        $query .= " WHERE user_id = ?";
        $params[] = (int)$user_id;
        $types .= "i";
    }
    
    $stmt = $conn->prepare($query);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return $row['count'];
}

// Get conversations by user ID with pagination
function getConversationsByUserId($conn, $user_id, $limit = 10, $page = 1) {
    $offset = ($page - 1) * $limit;
    
    $stmt = $conn->prepare("
        SELECT c.id, c.user_id, c.title, c.created_at, c.updated_at, u.username
        FROM conversations c
        JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ?
        ORDER BY c.updated_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param("iii", $user_id, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $conversations[] = $row;
    }
    
    $stmt->close();
    return $conversations;
}

// Get chats by conversation ID
function getChatsByConversationId($conn, $conversation_id) {
    $stmt = $conn->prepare("
        SELECT id, user_id, conversation_id, date, user_message, bot_message, raw_model_output
        FROM chats
        WHERE conversation_id = ?
        ORDER BY date
    ");
    $stmt->bind_param("i", $conversation_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $chats = [];
    while ($row = $result->fetch_assoc()) {
        $chats[] = $row;
    }
    
    $stmt->close();
    return $chats;
}

// Generate pagination HTML
function generatePagination($currentPage, $totalPages, $baseUrl) {
    $html = '<div class="pagination">';
    
    // Previous button
    if ($currentPage > 1) {
        $html .= '<a href="' . $baseUrl . '&page=' . ($currentPage - 1) . '" class="page-btn">&laquo; Previous</a>';
    } else {
        $html .= '<span class="page-btn disabled">&laquo; Previous</span>';
    }
    
    // Page numbers
    $startPage = max(1, $currentPage - 2);
    $endPage = min($totalPages, $currentPage + 2);
    
    if ($startPage > 1) {
        $html .= '<a href="' . $baseUrl . '&page=1" class="page-num">1</a>';
        if ($startPage > 2) {
            $html .= '<span class="page-ellipsis">...</span>';
        }
    }
    
    for ($i = $startPage; $i <= $endPage; $i++) {
        if ($i == $currentPage) {
            $html .= '<span class="page-num active">' . $i . '</span>';
        } else {
            $html .= '<a href="' . $baseUrl . '&page=' . $i . '" class="page-num">' . $i . '</a>';
        }
    }
    
    if ($endPage < $totalPages) {
        if ($endPage < $totalPages - 1) {
            $html .= '<span class="page-ellipsis">...</span>';
        }
        $html .= '<a href="' . $baseUrl . '&page=' . $totalPages . '" class="page-num">' . $totalPages . '</a>';
    }
    
    // Next button
    if ($currentPage < $totalPages) {
        $html .= '<a href="' . $baseUrl . '&page=' . ($currentPage + 1) . '" class="page-btn">Next &raquo;</a>';
    } else {
        $html .= '<span class="page-btn disabled">Next &raquo;</span>';
    }
    
    $html .= '</div>';
    
    return $html;
}

// Get total users count
function getTotalUsersCount($conn) {
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM users");
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return $row['count'];
}

// Get total conversations count
function getTotalConversationsCount($conn) {
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM conversations");
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return $row['count'];
}

// Get total chats count
function getTotalChatsCount($conn) {
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM chats");
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return $row['count'];
}

// Format date for display
function formatDate($dateString) {
    $date = new DateTime($dateString);
    return $date->format('M j, Y g:i A');
}

// Check if user is admin
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] == 1;
}

// Verify admin access
function verifyAdminAccess() {
    if (!isAdmin()) {
        header("Location: index.php");
        exit;
    }
}

// Truncate text to a certain length
function truncateText($text, $length = 100) {
    if (strlen($text) <= $length) {
        return $text;
    }
    
    return substr($text, 0, $length) . '...';
}

/**
 * Delete a conversation and all its messages
 * 
 * @param mysqli $conn Database connection
 * @param int $conversation_id The ID of the conversation to delete
 * @return array Success status and message
 */
function deleteConversation($conn, $conversation_id) {
    try {
        // Start a transaction
        $conn->begin_transaction();
        
        // Delete all messages in the conversation
        $stmt = $conn->prepare("DELETE FROM chats WHERE conversation_id = ?");
        $stmt->bind_param("i", $conversation_id);
        $stmt->execute();
        
        // Delete the conversation
        $stmt = $conn->prepare("DELETE FROM conversations WHERE id = ?");
        $stmt->bind_param("i", $conversation_id);
        $stmt->execute();
        
        // Commit the transaction
        $conn->commit();
        
        return array('success' => true);
    } catch (Exception $e) {
        // Roll back the transaction if something failed
        $conn->rollback();
        
        return array('success' => false, 'error' => 'Error deleting conversation: ' . $e->getMessage());
    }
}

// Process AJAX requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $conn = getDbConnection();
    
    if ($_POST['action'] === 'delete_conversation' && isset($_POST['conversation_id'])) {
        $conversation_id = (int)$_POST['conversation_id'];
        
        // Delete the conversation
        $result = deleteConversation($conn, $conversation_id);
        
        // Return the result as JSON
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
    }
}

// Get the first message for a conversation
function getFirstMessageForConversation($conn, $conversation_id) {
    $stmt = $conn->prepare("
        SELECT user_message, bot_message 
        FROM chats 
        WHERE conversation_id = ? 
        ORDER BY date ASC 
        LIMIT 1
    ");
    $stmt->bind_param("i", $conversation_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    $stmt->close();
    return null;
}
?> 