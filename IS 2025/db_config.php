<?php
// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "database";
$port = 3307; // Specify the custom MySQL port

// Create connection function
function getDbConnection() {
    global $servername, $username, $password, $dbname, $port;
    
    try {
        $conn = new mysqli($servername, $username, $password, $dbname, $port);
        
        // Check connection
        if ($conn->connect_error) {
            // Log error for debugging
            error_log("Database connection failed: " . $conn->connect_error);
            return false;
        }
        
        return $conn;
    } catch (Exception $e) {
        error_log("Database exception: " . $e->getMessage());
        return false;
    }
}
?> 