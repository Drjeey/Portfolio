<?php
// Start session to access user info
session_start();

// Set the content type to JavaScript
header('Content-Type: application/javascript');

// Add no-cache headers to ensure we always get fresh environment data
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Function to read .env file
function loadEnv($path) {
    if (!file_exists($path)) {
        error_log("Env file not found at $path");
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        error_log("Failed to read .env file at $path");
        return false;
    }
    
    $env = [];
    
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Only process lines with an equal sign
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            
            // Remove quotes if they exist
            if ((strpos($value, '"') === 0 && substr($value, -1) === '"') || 
                (strpos($value, "'") === 0 && substr($value, -1) === "'")) {
                $value = substr($value, 1, -1);
            }
            
            $env[$name] = $value;
        }
    }
    
    return $env;
}

// Define path to .env file
$envPath = __DIR__ . '/.env';

// Load environment variables
$env = loadEnv($envPath);

// Get current username from session if available
$username = isset($_SESSION['username']) ? $_SESSION['username'] : 'User';

// Output debug info as comments in the JS
echo "/* Environment loading diagnostic info */\n";
echo "/* .env path: " . $envPath . " */\n";
echo "/* .env file exists: " . (file_exists($envPath) ? 'Yes' : 'No') . " */\n";
echo "/* API key found: " . ($env && !empty($env['GEMINI_API_KEY']) ? 'Yes' : 'No') . " */\n";

// Create JavaScript environment object with default fallbacks
echo "window.ENV = " . json_encode([
    'GEMINI_API_KEY' => $env && isset($env['GEMINI_API_KEY']) ? $env['GEMINI_API_KEY'] : null,
    'GEMINI_MODEL_NAME' => $env && isset($env['GEMINI_MODEL_NAME']) ? $env['GEMINI_MODEL_NAME'] : 'gemini-1.5-flash',
    'USER_INFO' => [
        'username' => $username
    ],
    'DEBUG_INFO' => [
        'env_file_exists' => file_exists($envPath),
        'vars_loaded' => ($env !== false),
        'php_version' => PHP_VERSION,
        'time' => date('Y-m-d H:i:s')
    ]
]) . ";\n";

// Add a console.log for debugging
echo "console.log('Environment variables loaded', window.ENV.DEBUG_INFO);\n";
?> 