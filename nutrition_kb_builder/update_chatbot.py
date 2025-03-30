#!/usr/bin/env python3
"""
Update NutriGuide Chat Application

This script updates the IS 2025 web application to integrate with Qdrant for nutritional knowledge.
"""

import os
import argparse
import shutil
from pathlib import Path

def copy_file(source, destination):
    """Copy a file and create any necessary directories"""
    dest_dir = os.path.dirname(destination)
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        
    shutil.copy2(source, destination)
    print(f"Copied: {source} -> {destination}")

def create_or_update_knowledgebase_js(js_path):
    """Create or update the knowledgeBase.js file with agentic RAG capabilities"""
    code = """/**
 * Knowledge Base integration with Qdrant Vector Database
 * This module provides advanced RAG functionality to search relevant nutrition information
 * using semantic similarity and structured metadata through Qdrant.
 */

const knowledgeBase = {
    /**
     * Search the knowledge base for relevant information
     * @param {string} query - The user's query
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Array>} Array of relevant information chunks
     */
    search: async function(query, limit = 3) {
        try {
            console.log("Searching knowledge base for:", query);
            
            // Step 1: Extract topic and intent to guide search
            const searchContext = this.analyzeQuery(query);
            console.log("Search context:", searchContext);
            
            const response = await fetch('backend.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'searchKnowledgeBase',
                    query: query,
                    topics: searchContext.topics,
                    limit: limit
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                console.error('Knowledge base search failed:', data.message);
                return [];
            }
            
            // Process and rank results
            const processedResults = this.processResults(data.results, query);
            return processedResults;
        } catch (error) {
            console.error('Error searching knowledge base:', error);
            return [];
        }
    },
    
    /**
     * Analyze the query to extract topics and intent
     * @param {string} query - The user's query
     * @returns {Object} Extracted topics and intent
     */
    analyzeQuery: function(query) {
        const lowercaseQuery = query.toLowerCase();
        const context = {
            topics: [],
            dietMentioned: null,
            isHealthQuery: false,
            requiresNutritionalInfo: false
        };
        
        // Check for specific diets
        const diets = {
            'mediterranean': ['mediterranean', 'med diet'],
            'dash': ['dash', 'dash diet', 'dietary approaches to stop hypertension'],
            'keto': ['keto', 'ketogenic', 'low carb high fat'],
            'paleo': ['paleo', 'paleolithic', 'stone age diet'],
            'plant-based': ['plant-based', 'plant based', 'vegan', 'vegetarian'],
            'intermittent fasting': ['intermittent fasting', 'if', 'time restricted eating', 'trf']
        };
        
        for (const [diet, keywords] of Object.entries(diets)) {
            if (keywords.some(k => lowercaseQuery.includes(k))) {
                context.dietMentioned = diet;
                context.topics.push(diet);
                break;
            }
        }
        
        // Check for health terms
        const healthTerms = ['health', 'benefit', 'advantage', 'effect', 'heart', 'diabetes', 
                            'blood pressure', 'weight', 'loss', 'disease', 'cholesterol'];
        
        if (healthTerms.some(term => lowercaseQuery.includes(term))) {
            context.isHealthQuery = true;
            context.topics.push('health benefits');
        }
        
        // Check for nutritional info
        const nutritionTerms = ['nutrient', 'nutrition', 'vitamin', 'mineral', 'protein', 
                              'carb', 'fat', 'calorie', 'fiber'];
        
        if (nutritionTerms.some(term => lowercaseQuery.includes(term))) {
            context.requiresNutritionalInfo = true;
            context.topics.push('nutrients');
        }
        
        return context;
    },
    
    /**
     * Process and rank results based on relevance to the query
     * @param {Array} results - Results from the backend search
     * @param {string} query - The original user query
     * @returns {Array} Processed and ranked results
     */
    processResults: function(results, query) {
        if (!results || results.length === 0) {
            return [];
        }
        
        // Calculate term frequency for query terms in results
        const queryTerms = query.toLowerCase().split(/\\s+/)
            .filter(term => term.length > 3); // Only significant terms
            
        results.forEach(result => {
            let relevanceScore = result.score; // Base score from vector similarity
            
            // Boost based on term frequency
            let termMatches = 0;
            const resultText = result.text.toLowerCase();
            
            queryTerms.forEach(term => {
                if (resultText.includes(term)) {
                    termMatches++;
                }
                
                // Extra boost for terms in title
                if (result.title.toLowerCase().includes(term)) {
                    relevanceScore += 0.05;
                }
            });
            
            // Adjust score based on term matches
            if (queryTerms.length > 0) {
                const termMatchRatio = termMatches / queryTerms.length;
                relevanceScore += termMatchRatio * 0.1;
            }
            
            // Store adjusted score
            result.adjustedScore = relevanceScore;
        });
        
        // Re-rank based on adjusted score
        results.sort((a, b) => b.adjustedScore - a.adjustedScore);
        
        return results;
    },
    
    /**
     * Format citation from knowledge base results
     * @param {Array} results - Results from knowledge base search
     * @returns {string} Formatted citation
     */
    formatCitation: function(results) {
        if (!results || results.length === 0) {
            return '';
        }
        
        return results.map(result => {
            return `[${result.title}]`;
        }).join(', ');
    },
    
    /**
     * Format source information from knowledge base results
     * @param {Array} results - Results from knowledge base search
     * @returns {string} Formatted source information
     */
    formatSources: function(results) {
        if (!results || results.length === 0) {
            return '';
        }
        
        let sources = '';
        results.forEach((result, index) => {
            sources += `Source ${index + 1}: ${result.title}\n`;
            if (result.topics && result.topics.length > 0) {
                sources += `Topics: ${result.topics.join(', ')}\n`;
            }
            sources += '\n';
        });
        
        return sources;
    },
    
    /**
     * Enhance a prompt with relevant knowledge context
     * @param {string} prompt - The original prompt
     * @param {Array} results - Results from knowledge base search
     * @returns {string} Enhanced prompt with knowledge context
     */
    enhancePromptWithKnowledge: function(prompt, results) {
        if (!results || results.length === 0) {
            return prompt;
        }
        
        let enhancedPrompt = prompt + '\n\nRelevant Information:\n';
        
        results.forEach((result, index) => {
            enhancedPrompt += `\n--- Info ${index + 1} from "${result.title}" ---\n`;
            enhancedPrompt += result.text + '\n';
        });
        
        enhancedPrompt += '\n\nRespond using ONLY the information provided above. If the information doesn\\'t answer the question, say "I don\\'t have enough information about that topic."';
        enhancedPrompt += '\n\nCite your sources at the end of your response with [Source Title].'
        
        return enhancedPrompt;
    }
};

export default knowledgeBase;
"""

    with open(js_path, 'w') as f:
        f.write(code)
    print(f"Created/Updated: {js_path}")

def update_chat_js(js_path):
    """Update chat.js to integrate with knowledge base"""
    if not os.path.exists(js_path):
        print(f"Error: {js_path} not found!")
        return False
        
    with open(js_path, 'r') as f:
        content = f.read()
    
    # Check if knowledge base integration is already in place
    if "searchKnowledgeBase" in content:
        print(f"{js_path} already has knowledge base integration")
        return True
    
    # Identify and update the sendMessageToAI function
    if "async function sendMessageToAI(" in content:
        # Identify the existing function
        function_start = content.find("async function sendMessageToAI(")
        function_end = content.find("}", function_start)
        while content.count("{", function_start, function_end) != content.count("}", function_start, function_end):
            function_end = content.find("}", function_end + 1)
        function_end += 1
        
        original_function = content[function_start:function_end]
        
        # Create the new function with knowledge base integration
        new_function = '''async function sendMessageToAI(message, conversationSummary = "", conversationId = null) {
    console.log("Sending message to AI:", message);
    
    let isNutritionQuery = isNutritionRelated(message);
    let knowledgeContext = "";
    let sources = [];
    
    // For nutrition-related queries, search the knowledge base
    if (isNutritionQuery) {
        try {
            console.log("Searching knowledge base for nutrition information");
            const knowledgeResults = await knowledgeBase.search(message);
            
            if (knowledgeResults && knowledgeResults.length > 0) {
                console.log("Found relevant nutrition information:", knowledgeResults);
                
                // Format the knowledge context
                knowledgeContext = formatKnowledgeContext(knowledgeResults);
                sources = knowledgeResults;
            } else {
                console.log("No relevant nutrition information found");
            }
        } catch (error) {
            console.error("Error searching knowledge base:", error);
        }
    }
    
    // Prepare the prompt
    const userMessage = {
        role: "user",
        content: message
    };
    
    let prompt = [];
    
    // Add system instructions
    prompt.push({
        role: "system", 
        content: baseSystemInstruction
    });
    
    // Add conversation summary if available
    if (conversationSummary) {
        prompt.push({
            role: "system", 
            content: `Conversation summary so far: ${conversationSummary}`
        });
    }
    
    // Add knowledge context if available
    if (knowledgeContext) {
        prompt.push({
            role: "system", 
            content: `Relevant nutrition knowledge to help you answer: ${knowledgeContext}`
        });
        
        // Add instructions for using knowledge
        prompt.push({
            role: "system", 
            content: `Please use the above nutrition information to provide an accurate, evidence-based response. 
            
1. Synthesize the information into a COHERENT and UNIFIED answer that directly addresses the user's question
2. DO NOT list information as bullet points unless the format specifically calls for it
3. Write in a conversational, helpful tone as a nutrition expert
4. Focus on the most relevant information to the user's specific question
5. DO NOT repeat the same information multiple times
6. You MUST base your nutrition advice ONLY on the provided information, not on your general knowledge
7. If there's not enough information to answer confidently, acknowledge that limitation
8. Your answer should flow naturally like human speech - not feel like disconnected facts
9. DO NOT use phrases like "Based on the provided information" or "According to the information"
10. Focus primarily on answering the specific question, not listing everything you know
11. If multiple sources provide contradictory information, acknowledge this and present both perspectives`
        });
    }
    
    // Add the user message
    prompt.push(userMessage);
    
    try {
        // Show thinking indicator
        showThinkingIndicator();
        
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: prompt,
                conversation_id: conversationId
            })
        });
        
        // Hide thinking indicator
        hideThinkingIndicator();
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error from AI service:', errorText);
            return {
                role: "assistant",
                content: "I'm having trouble connecting to my AI services. Please try again in a moment."
            };
        }
        
        const data = await response.json();
        
        if (!data.success) {
            console.error('Error generating response:', data.message);
            return {
                role: "assistant",
                content: `I'm having trouble generating a response: ${data.message}`
            };
        }
        
        // Format the response with source attribution if needed
        let formattedContent = data.content;
        if (sources && sources.length > 0) {
            formattedContent = ui.formatSourceAttribution(formattedContent, sources);
        }
        
        return {
            role: "assistant",
            content: formattedContent
        };
    } catch (error) {
        console.error('Error sending message to AI:', error);
        hideThinkingIndicator();
        return {
            role: "assistant",
            content: "I encountered an error while processing your request. Please try again."
        };
    }
}

/**
 * Format knowledge context for inclusion in the prompt
 * @param {Array} results - Knowledge base search results
 * @returns {string} Formatted knowledge context
 */
function formatKnowledgeContext(results) {
    if (!results || results.length === 0) {
        return "";
    }
    
    let context = "NUTRITION INFORMATION:\\n\\n";
    
    // Add the top results with clear section markers
    results.forEach((result, index) => {
        context += `[Information ${index + 1}] `;
        context += `Title: ${result.title}\\n`;
        
        // Include topics as keywords
        if (result.topics && result.topics.length > 0) {
            context += `Topics: ${result.topics.join(", ")}\\n`;
        }
        
        // Add the text content
        context += `${result.text}\\n\\n`;
    });
    
    return context;
}'''
        
        # Replace the function
        content = content.replace(original_function, new_function)
    
    # Update the isNutritionRelated function if it exists
    if "function isNutritionRelated(" in content:
        # Find the existing function
        function_start = content.find("function isNutritionRelated(")
        function_end = content.find("}", function_start)
        while content.count("{", function_start, function_end) != content.count("}", function_start, function_end):
            function_end = content.find("}", function_end + 1)
        function_end += 1
        
        # Replace with enhanced version
        new_function = '''function isNutritionRelated(message) {
    const lowerMessage = message.toLowerCase();
    
    // List of nutrition-related keywords
    const nutritionKeywords = [
        'diet', 'food', 'eat', 'nutrition', 'nutrient', 'meal', 'vitamin', 
        'mineral', 'protein', 'carb', 'fat', 'fiber', 'calorie', 'weight',
        'health', 'healthy', 'mediterranean', 'vegan', 'vegetarian', 'keto',
        'paleo', 'gluten', 'dairy', 'sugar', 'cholesterol', 'heart', 'diabetes',
        'blood pressure', 'allergy', 'intolerance', 'supplement', 'macro',
        'vegetable', 'fruit', 'meat', 'fish', 'egg', 'milk', 'breakfast',
        'lunch', 'dinner', 'snack', 'meal plan', 'recipe'
    ];
    
    // Check if any of the keywords are in the message
    return nutritionKeywords.some(keyword => 
        lowerMessage.includes(keyword) || 
        lowerMessage.split(/\\s+/).includes(keyword)
    );
}'''
        
        content = content.replace(content[function_start:function_end], new_function)
    
    # Write the updated content back to the file
    with open(js_path, 'w') as f:
        f.write(content)
    
    print(f"Updated: {js_path}")
    return True

def update_backend_php(php_path):
    """Update the backend.php file to handle knowledge base searches with enhanced RAG"""
    if not os.path.exists(php_path):
        print(f"Error: {php_path} not found!")
        return False
        
    with open(php_path, 'r') as f:
        content = f.read()
    
    # Check if the knowledge base code is already in place
    if "function searchKnowledgeBase" in content:
        print(f"{php_path} already has knowledge base integration")
        return True
    
    # Add required imports to the top of the file
    if not "use Google\\Generative" in content:
        content = """<?php
// Load environment variables
require_once(__DIR__ . "/../vendor/autoload.php");
$dotenv = Dotenv\\Dotenv::createImmutable(__DIR__);
$dotenv->load();

""" + content.lstrip('<?php')
    
    # Add the knowledge base function to the switch statement
    if "switch ($data['action'])" in content:
        knowledge_search_case = """
        case 'searchKnowledgeBase':
            if (!isset($data['query'])) {
                echo json_encode(['success' => false, 'message' => 'No query provided']);
                exit;
            }
            
            $limit = isset($data['limit']) ? (int)$data['limit'] : 3;
            $topics = isset($data['topics']) ? $data['topics'] : [];
            $results = searchKnowledgeBase($data['query'], $limit, $topics);
            
            echo json_encode([
                'success' => true,
                'results' => $results
            ]);
            break;
"""
        # Find the last case in the switch statement
        last_case_pos = content.rfind('case');
        last_break_pos = content.find('break;', last_case_pos);
        if last_break_pos > 0:
            insert_pos = last_break_pos + 7;  # After 'break;'
            content = content[:insert_pos] + knowledge_search_case + content[insert_pos:]
    
    # Add the knowledge base functions at the end of the file
    knowledge_base_functions = """

/**
 * Search the knowledge base for relevant information with enhanced RAG
 * 
 * @param string $query The search query
 * @param int $limit The maximum number of results to return
 * @param array $topics Optional topics to prioritize in search
 * @return array An array of relevant information chunks
 */
function searchKnowledgeBase($query, $limit = 3, $topics = []) {
    // Get configuration from environment variables
    $qdrantUrl = $_ENV['QDRANT_URL'] ?? '';
    $qdrantApiKey = $_ENV['QDRANT_API_KEY'] ?? '';
    $geminiApiKey = $_ENV['GEMINI_API_KEY'] ?? '';
    $collectionName = $_ENV['COLLECTION_NAME'] ?? 'nutrition_knowledge';
    
    // Validate configuration
    if (empty($qdrantUrl) || empty($qdrantApiKey) || empty($geminiApiKey)) {
        error_log("Missing configuration for knowledge base search");
        return [];
    }
    
    // Expand the query with variations to improve search
    $expandedQueries = expandQuery($query);
    
    // Get embedding for each query variation
    $allResults = [];
    
    foreach ($expandedQueries as $expandedQuery) {
        $embedding = getGeminiEmbedding($expandedQuery, $geminiApiKey);
        if (empty($embedding)) {
            error_log("Failed to get embedding for query variation: $expandedQuery");
            continue;
        }
        
        // Search in Qdrant with the expanded query
        $filter = buildQdrantFilter($topics);
        $results = searchQdrant($embedding, $limit * 2, $qdrantUrl, $qdrantApiKey, $collectionName, $filter);
        
        // Add the query that found these results
        foreach ($results as &$result) {
            $result['found_by_query'] = $expandedQuery;
        }
        
        $allResults = array_merge($allResults, $results);
    }
    
    // Deduplicate results
    $allResults = deduplicateResults($allResults);
    
    // Re-rank results
    $rankedResults = rankResults($allResults, $query, $topics);
    
    // Return top results
    return array_slice($rankedResults, 0, $limit);
}

/**
 * Expand a query into multiple related queries
 * 
 * @param string $query The original query
 * @return array List of expanded queries
 */
function expandQuery($query) {
    $expandedQueries = [$query];
    
    // Diet terms and variations
    $dietTerms = [
        'mediterranean' => ['mediterranean diet', 'med diet', 'mediterranean eating'],
        'dash' => ['dash diet', 'dietary approaches to stop hypertension'],
        'keto' => ['ketogenic diet', 'keto diet', 'low carb high fat'],
        'paleo' => ['paleolithic diet', 'paleo diet', 'stone age diet'],
        'plant-based' => ['plant based diet', 'vegan diet', 'vegetarian diet'],
        'intermittent fasting' => ['intermittent fasting', 'time restricted eating', 'fasting diet']
    ];
    
    $healthTerms = ['benefits', 'health effects', 'advantages', 'health impact', 'nutrition'];
    
    // Check if query mentions a specific diet
    foreach ($dietTerms as $diet => $variations) {
        foreach ($variations as $variation) {
            if (stripos($query, $variation) !== false) {
                // Found a diet mention, add health-related expansions
                foreach ($healthTerms as $healthTerm) {
                    if (stripos($query, $healthTerm) === false) {
                        $expandedQueries[] = "$variation $healthTerm";
                    }
                }
                
                // Add diet-specific health topics
                if ($diet === 'mediterranean') {
                    $expandedQueries[] = "$variation heart health";
                    $expandedQueries[] = "$variation longevity";
                } else if ($diet === 'dash') {
                    $expandedQueries[] = "$variation blood pressure";
                    $expandedQueries[] = "$variation hypertension";
                } else if ($diet === 'keto') {
                    $expandedQueries[] = "$variation weight loss";
                    $expandedQueries[] = "$variation epilepsy";
                }
                
                break 2; // Found a diet, no need to check others
            }
        }
    }
    
    // Limit to 5 queries maximum
    $uniqueQueries = array_unique($expandedQueries);
    return array_slice($uniqueQueries, 0, 5);
}

/**
 * Build a filter for Qdrant search based on topics
 * 
 * @param array $topics Topics to filter on
 * @return array|null Filter object or null if no topics
 */
function buildQdrantFilter($topics) {
    if (empty($topics)) {
        return null;
    }
    
    $should = [];
    foreach ($topics as $topic) {
        $should[] = [
            "key" => "payload.topics",
            "match" => [
                "value" => $topic
            ]
        ];
    }
    
    return [
        "should" => $should
    ];
}

/**
 * Deduplicate results by filename and chunk index
 * 
 * @param array $results The search results
 * @return array Deduplicated results
 */
function deduplicateResults($results) {
    $seen = [];
    $unique = [];
    
    foreach ($results as $result) {
        $key = $result['filename'] . ':' . $result['chunk_index'];
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $unique[] = $result;
        }
    }
    
    return $unique;
}

/**
 * Rank results based on relevance to original query and topics
 * 
 * @param array $results The search results
 * @param string $query The original query
 * @param array $topics The topics of interest
 * @return array Ranked results
 */
function rankResults($results, $query, $topics) {
    // Extract significant terms from query
    $queryTerms = array_filter(
        explode(' ', strtolower($query)),
        function($term) { return strlen($term) > 3; }
    );
    
    foreach ($results as &$result) {
        $score = $result['score']; // Base score from vector search
        
        // Boost score based on term frequency
        $resultText = strtolower($result['text']);
        $termMatches = 0;
        
        foreach ($queryTerms as $term) {
            if (strpos($resultText, $term) !== false) {
                $termMatches++;
            }
            
            // Extra boost for terms in title
            if (strpos(strtolower($result['title']), $term) !== false) {
                $score += 0.05;
            }
        }
        
        // Adjust score based on term matches
        if (count($queryTerms) > 0) {
            $termMatchRatio = $termMatches / count($queryTerms);
            $score += $termMatchRatio * 0.1;
        }
        
        // Boost score based on topic matches
        foreach ($topics as $topic) {
            if (in_array($topic, $result['topics'])) {
                $score += 0.15;
            }
        }
        
        $result['score'] = $score;
    }
    
    // Sort by score
    usort($results, function($a, $b) {
        return $b['score'] <=> $a['score'];
    });
    
    return $results;
}

/**
 * Get embedding vector from Gemini API
 * 
 * @param string $text The text to embed
 * @param string $apiKey The Gemini API key
 * @return array The embedding vector
 */
function getGeminiEmbedding($text, $apiKey) {
    $url = "https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key=$apiKey";
    
    // Trim text if too long (API has limits)
    if (strlen($text) > 25000) {
        $text = substr($text, 0, 25000);
    }
    
    $payload = [
        "model" => "models/embedding-001",
        "content" => [
            "parts" => [
                ["text" => $text]
            ]
        ]
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status != 200) {
        error_log("Error getting embedding: $response");
        return null;
    }
    
    $result = json_decode($response, true);
    
    if (isset($result['embedding']) && isset($result['embedding']['values'])) {
        return $result['embedding']['values'];
    } else {
        error_log("Unexpected response format from Gemini API");
        return null;
    }
}

/**
 * Search in Qdrant vector database
 * 
 * @param array $vector The query embedding vector
 * @param int $limit The maximum number of results
 * @param string $qdrantUrl The Qdrant API URL
 * @param string $qdrantApiKey The Qdrant API key
 * @param string $collectionName The collection name
 * @param array|null $filter Optional filter to apply
 * @return array An array of search results
 */
function searchQdrant($vector, $limit, $qdrantUrl, $qdrantApiKey, $collectionName, $filter = null) {
    $url = "$qdrantUrl/collections/$collectionName/points/search";
    
    $payload = [
        "vector" => $vector,
        "limit" => $limit,
        "with_payload" => true,
        "with_vectors" => false
        // No score_threshold to ensure we get reliable results
    ];
    
    // Add filter if provided
    if ($filter !== null) {
        $payload["filter"] = $filter;
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "api-key: $qdrantApiKey"
    ]);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status != 200) {
        error_log("Error searching Qdrant: $response");
        return [];
    }
    
    $results = json_decode($response, true);
    
    // Handle different response formats
    $hits = [];
    if (isset($results['result'])) {
        $hits = $results['result'];
    } elseif (isset($results['hits'])) {
        $hits = $results['hits'];
    }
    
    if (empty($hits)) {
        error_log("No hits found in Qdrant response");
        return [];
    }
    
    // Format results
    $formattedResults = [];
    foreach ($hits as $hit) {
        if (isset($hit['payload'])) {
            $formattedResults[] = [
                "score" => $hit['score'] ?? 0,
                "title" => $hit['payload']['title'] ?? 'Unknown',
                "filename" => $hit['payload']['filename'] ?? '',
                "topics" => $hit['payload']['topics'] ?? [],
                "text" => $hit['payload']['text'] ?? '',
                "chunk_index" => $hit['payload']['chunk_index'] ?? 0
            ];
        }
    }
    
    return $formattedResults;
}
"""
    
    # Add the knowledge base functions at the end of the file
    if content.endswith("?>"):
        content = content[:-2] + knowledge_base_functions + "\n?>"
    else:
        content = content + knowledge_base_functions
    
    # Write the updated content back to the file
    with open(php_path, 'w') as f:
        f.write(content)
    
    print(f"Updated: {php_path}")
    return True

def update_ui_js(js_path):
    """Update the UI to show knowledge base results with improved formatting"""
    if not os.path.exists(js_path):
        print(f"Error: {js_path} not found!")
        return False
        
    with open(js_path, 'r') as f:
        content = f.read()
    
    # Check if the knowledge base UI is already in place
    if "formatSourceAttribution" in content:
        print(f"{js_path} already has knowledge base UI code")
        return True
    
    # Add formatSourceAttribution function
    if "const ui = {" in content:
        source_attribution_function = """    /**
     * Format source attribution for AI responses with better styling
     * @param {string} text - The AI response text
     * @param {Array} sources - The sources from knowledge base (if any)
     * @returns {string} Formatted message with source attribution
     */
    formatSourceAttribution: function(text, sources) {
        if (!sources || sources.length === 0) {
            return text;
        }
        
        // Check if text already has citation style format [Source]
        const hasCitations = /\\[([^\\]]+)\\]/.test(text);
        
        let sourceAttribution = '\\n\\n<div class="source-attribution">';
        
        if (!hasCitations) {
            // No citations in text, add a generic attribution
            sourceAttribution += '<strong>Sources:</strong>';
            sources.forEach((source, index) => {
                sourceAttribution += `<br>[${index + 1}] ${source.title}`;
            });
        } else {
            // Text has citations, create detailed attribution with links
            sourceAttribution += '<strong>References:</strong><ul>';
            sources.forEach((source, index) => {
                sourceAttribution += `<li><strong>${source.title}</strong>`;
                if (source.topics && source.topics.length > 0) {
                    sourceAttribution += ` — <em>${source.topics.join(', ')}</em>`;
                }
                sourceAttribution += '</li>';
            });
            sourceAttribution += '</ul>';
        }
        
        sourceAttribution += '</div>';
        
        return text + sourceAttribution;
    },
"""
        function_insert_pos = content.find("const ui = {") + 12
        content = content[:function_insert_pos] + source_attribution_function + content[function_insert_pos:]
    
    # Add CSS for source attribution
    css_code = """
/* Add this to your styles.css */
.source-attribution {
    margin-top: 15px;
    font-size: 0.85em;
    color: #555;
    background-color: #f8f9fa;
    padding: 10px 15px;
    border-radius: 5px;
    border-left: 3px solid #3498db;
}

.source-attribution strong {
    color: #333;
}

.source-attribution ul {
    margin-top: 5px;
    margin-bottom: 5px;
    padding-left: 20px;
}

.source-attribution li {
    margin-bottom: 4px;
}

.message.ai-message .source-attribution {
    background-color: rgba(52, 152, 219, 0.1);
}
"""
    print("Don't forget to add this CSS to your styles.css:")
    print(css_code)
    
    # Write the updated content back to the file
    with open(js_path, 'w') as f:
        f.write(content)
    
    print(f"Updated: {js_path}")
    return True

def create_env_file(is2025_dir, env_file_path):
    """Create a .env file for the IS 2025 project"""
    if os.path.exists(env_file_path):
        print(f"Warning: {env_file_path} already exists. Skipping creation.")
        return
        
    env_content = """# Qdrant Configuration
QDRANT_URL="https://YOUR-QDRANT-INSTANCE.api.qdrant.tech/v1"
QDRANT_API_KEY="your_qdrant_api_key_here"

# Google Gemini API Configuration
GEMINI_API_KEY="your_gemini_api_key_here"

# Collection Settings
COLLECTION_NAME="nutrition_knowledge"
"""
    
    with open(env_file_path, 'w') as f:
        f.write(env_content)
    
    print(f"Created: {env_file_path}")
    
    # Check if composer.json exists, and if not, create it
    composer_path = os.path.join(is2025_dir, "composer.json")
    if not os.path.exists(composer_path):
        composer_content = """{
    "require": {
        "vlucas/phpdotenv": "^5.5"
    }
}
"""
        with open(composer_path, 'w') as f:
            f.write(composer_content)
        
        print(f"Created: {composer_path}")
        print("Remember to run 'composer install' in the IS 2025 directory to install the dotenv package.")

def main():
    """Main function to update the IS 2025 application"""
    parser = argparse.ArgumentParser(description="Update IS 2025 with Qdrant integration")
    parser.add_argument("--is2025", type=str, default="../IS 2025", help="Path to IS 2025 directory")
    args = parser.parse_args()
    
    is2025_dir = args.is2025
    if not os.path.isdir(is2025_dir):
        print(f"Error: {is2025_dir} is not a valid directory")
        return 1
    
    # Create relevant paths
    js_modules_dir = os.path.join(is2025_dir, "js", "modules")
    kb_js_path = os.path.join(js_modules_dir, "knowledgeBase.js")
    chat_js_path = os.path.join(js_modules_dir, "chat.js")
    ui_js_path = os.path.join(js_modules_dir, "ui.js")
    backend_php_path = os.path.join(is2025_dir, "backend.php")
    env_file_path = os.path.join(is2025_dir, ".env")
    
    # Create or ensure the modules directory exists
    os.makedirs(js_modules_dir, exist_ok=True)
    
    # Update the files
    create_or_update_knowledgebase_js(kb_js_path)
    update_chat_js(chat_js_path)
    update_ui_js(ui_js_path)
    update_backend_php(backend_php_path)
    create_env_file(is2025_dir, env_file_path)
    
    print("\nUpdates complete! 🎉")
    print("\nNext steps:")
    print("1. Configure the .env file in the IS 2025 directory with your API keys")
    print("2. Install the PHP dotenv package by running 'composer install' in the IS 2025 directory")
    print("3. Update styles.css with the source attribution CSS")
    print("4. Run the nutrition_embedder.py script to populate Qdrant with nutrition knowledge")
    
    return 0

if __name__ == "__main__":
    main() 