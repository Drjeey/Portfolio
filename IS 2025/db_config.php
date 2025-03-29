<?php
// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "database";

// Create connection function
function getDbConnection() {
    global $servername, $username, $password, $dbname;
    
    $conn = new mysqli($servername, $username, $password, $dbname);
    
    // Check connection
    if ($conn->connect_error) {
        // Log error for debugging (in a production environment, you would handle this differently)
        error_log("Database connection failed: " . $conn->connect_error);
        return false;
    }
    
    return $conn;
}
?> 