/**
 * Knowledge Base integration with Qdrant Vector Database
 * This module provides advanced RAG functionality to search relevant nutrition information
 * using semantic similarity and structured metadata through Qdrant.
 */

const knowledgeBase = {
    // Cache for source URLs
    sourceUrls: null,

    /**
     * Load source URLs from the nutrition_sources.json file
     * @returns {Promise<Object>} Object mapping filenames to URLs
     */
    loadSourceUrls: async function() {
        console.log("Loading source URLs...");
        
        // First check if we already have preloaded source URLs
        if (window.NUTRITION_SOURCES) {
            console.log("Using preloaded nutrition sources:", Object.keys(window.NUTRITION_SOURCES.sources || window.NUTRITION_SOURCES).length);
            this.sourceUrls = window.NUTRITION_SOURCES.sources || window.NUTRITION_SOURCES;
            return this.sourceUrls;
        }
        
        // If not preloaded, try to fetch from the file
        const pathsToTry = [
            'js/data/nutrition_sources.json',
            '/js/data/nutrition_sources.json',
            '/IS 2025/js/data/nutrition_sources.json',
            './js/data/nutrition_sources.json'
        ];
        
        for (const path of pathsToTry) {
            try {
                console.log(`Attempting to load source URLs from: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    const data = await response.json();
                    // Check if the data has a nested 'sources' property
                    this.sourceUrls = data.sources || data;
                    console.log(`Successfully loaded source URLs from ${path}:`, Object.keys(this.sourceUrls).length);
                    
                    // Save to window for future use
                    window.NUTRITION_SOURCES = data;
                    return this.sourceUrls;
                }
            } catch (error) {
                console.warn(`Failed to load source URLs from ${path}:`, error);
            }
        }
        
        console.error("Failed to load source URLs from any path. Using empty object as fallback.");
        return {};
    },

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
     * Determine if a query is nutrition-related
     * @param {string} query - The user's query
     * @returns {boolean} True if the query is nutrition-related
     */
    isNutritionQuery: function(query) {
        const lowercaseQuery = query.toLowerCase();
        
        // List of non-nutrition topics to exclude
        const nonNutritionTopics = [
            'weather', 'sports', 'politics', 'news', 'movie', 'film',
            'music', 'song', 'artist', 'actor', 'celebrity', 'game',
            'gaming', 'technology', 'coding', 'programming', 'travel',
            'geography', 'history', 'mathematics', 'physics'
        ];
        
        // Check if the query contains non-nutrition topics
        if (nonNutritionTopics.some(topic => lowercaseQuery.includes(topic))) {
            return false;
        }
        
        // Check for nutrition-related keywords
        const nutritionKeywords = [
            'food', 'diet', 'nutrition', 'eat', 'meal', 'health', 'healthy',
            'vitamin', 'mineral', 'protein', 'carb', 'fat', 'calorie',
            'nutrient', 'supplement', 'weight', 'energy', 'metabolism'
        ];
        
        // Return true if any nutrition keyword is found
        return nutritionKeywords.some(keyword => lowercaseQuery.includes(keyword)) || 
               this.analyzeQuery(query).topics.length > 0;
    },
    
    /**
     * Search for nutrition knowledge based on a query
     * @param {string} query - The user's query
     * @param {number} limit - Maximum number of results to return
     * @returns {Promise<Object>} Object with results and synthesized answer
     */
    searchNutritionKnowledge: async function(query, limit = 5) {
        try {
            // Get search context to refine results
            const searchContext = this.analyzeQuery(query);
            console.log("Nutrition search context:", searchContext);
            
            // Prepare search payload
            const searchPayload = {
                action: 'searchKnowledgeBase',
                query: query,
                limit: limit
            };
            
            console.log("Searching nutrition knowledge with payload:", searchPayload);
            
            // Call the backend to search the knowledge base
            const response = await fetch('backend.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchPayload)
            });
            
            if (!response.ok) {
                throw new Error(`Knowledge base search failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Knowledge base search response:", data);
            
            // Format and enhance the data for easier access
            const enhancedData = {
                ...data,  // Keep all original properties
                query: query,
                context: searchContext
            };
            
            // Add sources array for easy reference if not present
            if (!enhancedData.sources && enhancedData.results && Array.isArray(enhancedData.results)) {
                enhancedData.sources = enhancedData.results.map(r => r.title || r.filename || "Unknown source");
                console.log("Extracted sources:", enhancedData.sources);
            }
            
            // Store the processed knowledge response globally for other components to use
            window.lastKnowledgeResponse = enhancedData;
            
            // Log the detailed structure of the response
            console.log("Enhanced knowledge response:", JSON.stringify(enhancedData, null, 2));
            
            // Check if we have valid results
            if (enhancedData.results && enhancedData.results.length > 0) {
                console.log(`Found ${enhancedData.results.length} nutrition results`);
                
                // Check for synthesized answer
                if (enhancedData.answer) {
                    console.log("Response includes synthesized answer:", enhancedData.answer.substring(0, 100) + "...");
                } else if (enhancedData.synthesizedAnswer) {
                    console.log("Response includes legacy synthesized answer:", enhancedData.synthesizedAnswer.substring(0, 100) + "...");
                    // For compatibility with both formats
                    enhancedData.answer = enhancedData.synthesizedAnswer;
                } else {
                    console.log("No synthesized answer in response");
                }
                
                // Preload source URLs if not already loaded
                if (!this.sourceUrls) {
                    await this.loadSourceUrls();
                }
                
                return enhancedData;
            } else {
                console.log("No nutrition knowledge results found");
                return { results: [], query: query };
            }
        } catch (error) {
            console.error('Error searching nutrition knowledge:', error);
            return { error: error.message, results: [] };
        }
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
        const queryTerms = query.toLowerCase().split(/\s+/)
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
     * Format citations from knowledge base results with clickable links
     * @param {Array} results - Results from knowledge base search
     * @returns {string} HTML formatted citations with links
     */
    formatCitations: async function(results) {
        if (!results || results.length === 0) {
            return '';
        }
        
        // Load source URLs
        const sourceUrls = await this.loadSourceUrls();
        
        // Create HTML links for each source
        const citations = results.map(result => {
            const filename = result.filename || this.extractFilenameFromTitle(result.title);
            const url = sourceUrls[filename];
            
            if (url) {
                return `<a href="${url}" target="_blank">${result.title}</a>`;
            } else {
                return result.title;
            }
        });
        
        // Return unique citations only
        return [...new Set(citations)].join(', ');
    },
    
    /**
     * Extract a likely filename from a title
     * @param {string} title - The document title
     * @returns {string} Probable filename
     */
    extractFilenameFromTitle: function(title) {
        if (!title) return '';
        
        // Convert title to filename format (replace spaces with underscores)
        return title.replace(/\s+/g, '_') + '.txt';
    },
    
    /**
     * Format sources for display
     * @param {Object} knowledgeData - Knowledge base response
     * @returns {string} Formatted sources
     */
    formatSources: async function(knowledgeData) {
        if (!knowledgeData || !knowledgeData.results || !Array.isArray(knowledgeData.results) || knowledgeData.results.length === 0) {
            console.log("No knowledge data results to format sources from");
            return '';
        }
        
        // Make sure we have source URLs loaded
        if (!this.sourceUrls) {
            await this.loadSourceUrls();
        }
        
        console.log("Formatting sources for display from results:", knowledgeData.results.length);
        
        // Create Markdown-formatted list of sources
        let sourcesMarkdown = "**Sources:**\n";
        
        // Deduplicate sources by title to avoid repetition
        const seenTitles = new Set();
        
        knowledgeData.results.forEach((result, index) => {
            const title = result.title || result.filename || `Source ${index + 1}`;
            
            // Skip duplicates
            if (seenTitles.has(title)) {
                return;
            }
            seenTitles.add(title);
            
            // Format the source item
            sourcesMarkdown += `${index + 1}. ${title}\n`;
        });
        
        console.log("Formatted sources markdown:", sourcesMarkdown);
        return sourcesMarkdown;
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
        
        enhancedPrompt += '\n\nRespond using ONLY the information provided above. If the information doesn\'t answer the question, say "I don\'t have enough information about that topic."';
        enhancedPrompt += '\n\nCite your sources at the end of your response with [Source Title].';
        
        return enhancedPrompt;
    },
    
    /**
     * Get the synthesized answer with source reference
     * @param {Object} knowledgeData - Object with results and synthesized answer
     * @returns {string} Formatted answer text
     */
    getSynthesizedAnswer: function(knowledgeData) {
        if (!knowledgeData || !knowledgeData.synthesizedAnswer) {
            return '';
        }
        
        return knowledgeData.synthesizedAnswer;
    },
    
    /**
     * Test function to diagnose issues with source URL loading
     * Call from browser console: knowledgeBase.testSourceUrlLoading()
     */
    testSourceUrlLoading: async function() {
        console.log("=== TESTING SOURCE URL LOADING ===");
        
        // Check if there's cached data
        if (this.sourceUrls) {
            console.log("Cached source URLs:", this.sourceUrls);
        } else {
            console.log("No cached source URLs found");
        }
        
        // Check if preloaded data exists
        if (window.NUTRITION_SOURCES) {
            console.log("Preloaded NUTRITION_SOURCES found:", window.NUTRITION_SOURCES);
        } else {
            console.log("No preloaded NUTRITION_SOURCES found in window");
        }
        
        // Test all possible fetch paths
        console.log("Testing all possible fetch paths...");
        
        // Test relative path
        try {
            const relResponse = await fetch('js/data/nutrition_sources.json');
            console.log("Relative path (js/data/nutrition_sources.json) status:", relResponse.status);
            if (relResponse.ok) {
                const data = await relResponse.json();
                console.log("Relative path data:", data);
            }
        } catch (e) {
            console.error("Relative path fetch error:", e);
        }
        
        // Test absolute path
        try {
            const absResponse = await fetch('/js/data/nutrition_sources.json');
            console.log("Absolute path (/js/data/nutrition_sources.json) status:", absResponse.status);
            if (absResponse.ok) {
                const data = await absResponse.json();
                console.log("Absolute path data:", data);
            }
        } catch (e) {
            console.error("Absolute path fetch error:", e);
        }
        
        // Test project path
        try {
            const projResponse = await fetch('/IS 2025/js/data/nutrition_sources.json');
            console.log("Project path (/IS 2025/js/data/nutrition_sources.json) status:", projResponse.status);
            if (projResponse.ok) {
                const data = await projResponse.json();
                console.log("Project path data:", data);
            }
        } catch (e) {
            console.error("Project path fetch error:", e);
        }
        
        // Try to actually load the sources
        try {
            console.log("Attempting to load sources via loadSourceUrls()...");
            const sources = await this.loadSourceUrls();
            console.log("Loaded sources:", sources);
            
            // Test with a specific filename
            const testFilename = "Popular_Dietary_Patterns.txt";
            console.log(`Testing lookup for filename: ${testFilename}`);
            const url = sources[testFilename];
            console.log(`URL for ${testFilename}:`, url);
            
            if (!url) {
                console.error(`No URL found for ${testFilename}`);
                console.log("Available filenames:", Object.keys(sources));
            }
        } catch (e) {
            console.error("Error loading sources:", e);
        }
        
        console.log("=== SOURCE URL LOADING TEST COMPLETE ===");
    },
    
    // Helper to generate filename from title
    generateFilenameFromTitle: function(title) {
        if (!title) return null;
        return title
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special chars
            .replace(/\s+/g, '_')    // Replace spaces with underscores
            .replace(/_+/g, '_')     // Remove duplicate underscores
            .trim();
    }
};

// Make knowledgeBase accessible from the global window object for debugging
window.knowledgeBase = knowledgeBase;

export default knowledgeBase;

// Function to display raw results for debugging
export function displayRawResults(knowledgeData) {
    console.log("RAW RESULTS:", knowledgeData);
    
    // Create a debug output 
    const debugOutput = document.createElement('div');
    debugOutput.style.position = 'fixed';
    debugOutput.style.top = '10px';
    debugOutput.style.right = '10px';
    debugOutput.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugOutput.style.color = 'white';
    debugOutput.style.padding = '10px';
    debugOutput.style.borderRadius = '5px';
    debugOutput.style.maxWidth = '80%';
    debugOutput.style.maxHeight = '80%';
    debugOutput.style.overflow = 'auto';
    debugOutput.style.zIndex = '10000';
    debugOutput.style.fontSize = '12px';
    debugOutput.style.fontFamily = 'monospace';
    
    // Format the results
    let debugHtml = '<h3>Knowledge Search Results</h3>';
    
    if (knowledgeData && knowledgeData.results && knowledgeData.results.length > 0) {
        debugHtml += `<p><strong>Found ${knowledgeData.results.length} results</strong></p>`;
        
        knowledgeData.results.forEach((result, i) => {
            debugHtml += `<details>
                <summary>Result ${i+1}: ${result.title}</summary>
                <div style="margin-left: 10px;">
                    <p>Score: ${result.score}</p>
                    <p>Text: ${result.text}</p>
                    <p>Filename: ${result.filename}</p>
                </div>
            </details>`;
        });
        
        if (knowledgeData.synthesizedResponse) {
            debugHtml += `<h4>Synthesized Response:</h4>
                <pre>${knowledgeData.synthesizedResponse}</pre>`;
        }
        
        if (knowledgeData.sources) {
            debugHtml += `<h4>Sources:</h4>
                <pre>${JSON.stringify(knowledgeData.sources, null, 2)}</pre>`;
        }
    } else {
        debugHtml += '<p>No results found or invalid data structure</p>';
    }
    
    // Add close button
    debugHtml += '<button id="close-debug" style="margin-top: 10px;">Close</button>';
    
    debugOutput.innerHTML = debugHtml;
    document.body.appendChild(debugOutput);
    
    // Add event listener to close button
    document.getElementById('close-debug').addEventListener('click', () => {
        document.body.removeChild(debugOutput);
    });
}

/**
 * Search the knowledge base for information
 * 
 * @param {string} query - User's query
 * @returns {Promise<Object|null>} - Search results or null if no results
 */
export async function searchKnowledgeBase(query) {
    console.log("Starting knowledge base search for query:", query);
    
    try {
        // Send POST request (matching Python implementation more closely)
        const searchPayload = {
            action: 'searchKnowledgeBase',
            query: query,
            limit: 5
        };
        
        console.log("Sending POST request with payload:", searchPayload);
        
        const response = await fetch("backend.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(searchPayload)
        });
        
        if (!response.ok) {
            console.error("Knowledge base search failed with status:", response.status);
            return null;
        }
        
        // Try to parse JSON response
        try {
            const data = await response.json();
            console.log("Knowledge base search returned:", data);
            
            // Check if response contains results or answer
            if (data && ((data.results && data.results.length > 0) || (data.answer && data.answer.trim()))) {
                console.log("Found valid response from knowledge base");
                
                if (data.results && data.results.length > 0) {
                    console.log("Found", data.results.length, "results in knowledge base");
                    // Log each result for debugging
                    data.results.forEach((result, index) => {
                        console.log(`Result ${index + 1}:`, result.title || "Untitled", 
                                    "Score:", result.score || "N/A");
                    });
                }
                
                if (data.answer) {
                    console.log("Found synthesized answer from knowledge base");
                }
                
                return data;
            } else {
                console.log("No usable results or answer found in knowledge base response");
                return null;
            }
        } catch (jsonError) {
            console.error("Failed to parse knowledge base response as JSON:", jsonError);
            return null;
        }
    } catch (error) {
        console.error("Error searching knowledge base:", error);
        return null;
    }
}
