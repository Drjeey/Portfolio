<?php
// Start session for authentication
session_start();

// Ensure user is authenticated
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// Set content type to JSON
header('Content-Type: application/json');

// Load environment variables
require_once 'db_config.php';
$env = loadEnv(__DIR__ . '/.env');

// Helper function to load environment variables from .env
function loadEnv($path) {
    if (!file_exists($path)) {
        return false;
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (strpos($value, '"') === 0 || strpos($value, "'") === 0) {
            $value = substr($value, 1, -1);
        }
        
        $env[$name] = $value;
    }
    
    return $env;
}

// Get API key
$apiKey = $env['GEMINI_API_KEY'] ?? '';
if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode(["error" => "API key not configured"]);
    exit;
}

// Make sure this is a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Get the request body
$requestBody = file_get_contents('php://input');
$requestData = json_decode($requestBody, true);

if (!$requestData) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid request data"]);
    exit;
}

// Extract model and prompt from request
$model = $requestData['model'] ?? 'gemini-2.0-flash';
$contents = $requestData['contents'] ?? '';
$generationConfig = $requestData['generationConfig'] ?? [];

if (empty($contents)) {
    http_response_code(400);
    echo json_encode(["error" => "No content provided"]);
    exit;
}

// Build the request to the Gemini API
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

// Prepare the request payload
$payload = [
    "contents" => [
        ["parts" => [["text" => 
            "You are a specialized nutrition expert with access to a comprehensive nutrition vector database. Your knowledge has been vetted by healthcare professionals and nutritionists. When users ask nutrition-related questions, you search this database to provide accurate, evidence-based information. This enables you to answer with high confidence and precision about dietary needs, nutritional content, meal planning, and nutrition science.\n\n" .
            "Since your knowledge comes from a verified nutrition database, you don't need to include excessive disclaimers when discussing nutrition topics. You can confidently provide nutritional guidance while still acknowledging appropriate limitations regarding medical diagnoses or treatment plans.\n\n" . 
            $contents
        ]]]
    ]
];

// Add generation config if provided
if (!empty($generationConfig)) {
    $payload["generationConfig"] = $generationConfig;
}

// Initialize cURL session
$ch = curl_init($apiUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Check for errors
if (curl_errno($ch)) {
    http_response_code(500);
    echo json_encode(["error" => "cURL error: " . curl_error($ch)]);
    exit;
}

// Close cURL session
curl_close($ch);

// If we got a non-200 response, return the error
if ($httpCode != 200) {
    http_response_code($httpCode);
    echo $response; // Pass through the error from Gemini
    exit;
}

// Log raw response for debugging
error_log("Raw response: " . json_encode($response));

// Parse the response
$responseData = json_decode($response, true);

// Extract the generated text
$generatedText = '';
if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $generatedText = $responseData['candidates'][0]['content']['parts'][0]['text'];
}

// Return the response in the format expected by the frontend
echo json_encode([
    "text" => $generatedText,
    "raw_text" => $generatedText
]);

// Log response for debugging
if (strpos($generatedText, '[SUMMARY]') !== false && strpos($generatedText, '[/SUMMARY]') !== false) {
    $summaryPattern = '/\[SUMMARY\](.*?)\[\/SUMMARY\]/s';
    if (preg_match($summaryPattern, $generatedText, $matches)) {
        $extractedSummary = trim($matches[1]);
        error_log("Extracted conversation summary: " . substr($extractedSummary, 0, 100) . "...");
    } else {
        error_log("Summary format found but could not extract with regex");
    }
} else {
    error_log("No summary format found in response");
}
?> 