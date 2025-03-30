// knowledgeBase.js - Interface to the nutrition knowledge base in Qdrant

/**
 * Queries the nutrition knowledge base for information related to a query
 * @param {string} query - User's health/nutrition query
 * @returns {Promise<Array>} - Array of relevant knowledge chunks with sources
 */
export async function searchNutritionKnowledge(query) {
    try {
        // Call backend endpoint that connects to Qdrant
        const response = await fetch('backend.php?action=search_knowledge_base&query=' + encodeURIComponent(query));
        
        if (!response.ok) {
            throw new Error(`Failed to search knowledge base: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results) {
            return data.results;
        } else {
            console.error('Knowledge base search failed:', data.error || 'Unknown error');
            return [];
        }
    } catch (error) {
        console.error('Error searching knowledge base:', error);
        return [];
    }
}

/**
 * Formats knowledge search results into a citation string
 * @param {Array} results - Array of knowledge search results
 * @returns {string} - Formatted citation text
 */
export function formatCitations(results) {
    if (!results || results.length === 0) {
        return '';
    }
    
    return results.map(result => {
        const { title, source, url } = result.payload;
        return `Source: ${source} - [${title}](${url})`;
    }).join('\n\n');
}

/**
 * Adds knowledge context to a prompt for the AI
 * @param {string} basePrompt - Original prompt
 * @param {Array} knowledgeResults - Knowledge search results
 * @returns {string} - Enhanced prompt with knowledge context
 */
export function enhancePromptWithKnowledge(basePrompt, knowledgeResults) {
    if (!knowledgeResults || knowledgeResults.length === 0) {
        return basePrompt;
    }
    
    // Extract the relevant content from knowledge results
    const relevantContent = knowledgeResults
        .map(result => result.payload.content)
        .join('\n\n');
    
    // Create a context-enhanced prompt
    return `Based on the following health information:
    
${relevantContent}

${basePrompt}

Include information from these sources when applicable, and cite them appropriately.`;
}

/**
 * Determines if a query is likely about nutrition or diet
 * @param {string} query - User's health query
 * @returns {boolean} - True if query is nutrition-related
 */
export function isNutritionQuery(query) {
    // If the query is empty, default to treating it as nutrition-related
    if (!query || query.trim() === '') return true;
    
    const lowerQuery = query.toLowerCase();
    
    // Special handling for meta-questions about the bot's capabilities
    if (lowerQuery.includes('what can you help with') || 
        lowerQuery.includes('what can you do') || 
        lowerQuery.includes('what can you tell me') ||
        lowerQuery.includes('what can we talk about') ||
        lowerQuery.includes('examples of things') ||
        lowerQuery.includes('what topics')) {
        return true;
    }
    
    // List of non-nutrition topics to filter out
    const nonNutritionTopics = [
        'politics', 'news', 'weather', 'sports', 'game', 'movie', 'film', 'tv show',
        'invest', 'stock market', 'cryptocurrency', 'bitcoin', 'coding', 'programming',
        'mathematics', 'physics', 'geography', 'history', 'war', 'conflict',
        'religion', 'travel', 'vacation', 'write me', 'write a', 'legal advice'
    ];
    
    // If query contains explicit non-nutrition topics, return false
    if (nonNutritionTopics.some(topic => lowerQuery.includes(topic))) {
        return false;
    }
    
    // Comprehensive list of nutrition, diet, and food-related keywords
    const nutritionKeywords = [
        // General nutrition terms
        'nutrition', 'diet', 'food', 'eating', 'meal', 'cook', 'cooking', 'recipe',
        'vitamin', 'nutrient', 'dietary', 'calories', 'calorie', 'macro', 'macros',
        'protein', 'carbohydrate', 'carb', 'fat', 'consume', 'consumption', 'digest',
        'digestion', 'appetite', 'hunger', 'hungry', 'full', 'satiety', 'satiated',
        
        // Food groups
        'fruit', 'vegetable', 'vegetarian', 'vegan', 'meat', 'dairy', 'grain', 'nut',
        'seed', 'legume', 'bean', 'pulse', 'fish', 'seafood', 'poultry', 'beef', 'pork',
        
        // Nutrients
        'fiber', 'supplement', 'mineral', 'antioxidant', 'amino acid', 'fatty acid',
        'omega-3', 'omega-6', 'omega', 'iron', 'calcium', 'zinc', 'magnesium', 'potassium',
        'sodium', 'folate', 'vitamin a', 'vitamin b', 'vitamin c', 'vitamin d', 'vitamin e',
        
        // Health conditions related to nutrition
        'weight', 'obesity', 'overweight', 'underweight', 'metabolism', 'diabetes',
        'cholesterol', 'blood sugar', 'glycemic', 'heart health', 'cardiovascular',
        'blood pressure', 'hypertension', 'gut', 'digestion', 'ibs', 'celiac',
        
        // Dietary patterns
        'vegetarian', 'vegan', 'keto', 'ketogenic', 'paleo', 'mediterranean', 
        'dash diet', 'low carb', 'high protein', 'intermittent fast', 'fasting',
        
        // Life stages
        'pregnancy', 'pregnant', 'breastfeeding', 'infant', 'baby', 'formula',
        'child', 'children', 'adolescent', 'teen', 'elderly', 'aging'
    ];
    
    // Check if the query contains any nutrition-related keywords
    for (const keyword of nutritionKeywords) {
        if (lowerQuery.includes(keyword)) {
            return true;
        }
    }
    
    // If we don't find any nutrition-related keywords, default to false
    return false;
} 