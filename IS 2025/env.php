<?php
// Start session to access user info
session_start();

// Set the content type to JavaScript
header('Content-Type: application/javascript');

// Function to read .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        // Remove quotes if they exist
        if (strpos($value, '"') === 0 || strpos($value, "'") === 0) {
            $value = substr($value, 1, -1);
        }
        
        $env[$name] = $value;
    }
    
    return $env;
}

// Load environment variables
$env = loadEnv(__DIR__ . '/.env');

// Get current username from session if available
$username = isset($_SESSION['username']) ? $_SESSION['username'] : 'User';

// Create JavaScript environment object with default fallbacks
echo 'const ENV = ' . json_encode([
    'GEMINI_API_KEY' => $env['GEMINI_API_KEY'] ?? 'demo-api-key',
    'GEMINI_MODEL_NAME' => $env['GEMINI_MODEL_NAME'] ?? 'gemini-1.5-flash',
    'USER_INFO' => [
        'username' => $username
    ]
]) . ';';
?> 