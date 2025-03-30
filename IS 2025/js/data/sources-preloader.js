/**
 * Nutrition Sources Preloader
 * This script loads the nutrition_sources.json file before the main application starts
 * to ensure the sources are available for linking in the knowledge base responses.
 */

// Create a global variable to store the sources
window.NUTRITION_SOURCES = null;

// Function to load the sources data
async function loadNutritionSources() {
    console.log("Preloading nutrition sources data...");
    
    const sourcesUrls = [
        'js/data/nutrition_sources.json',
        '/js/data/nutrition_sources.json',
        '/IS 2025/js/data/nutrition_sources.json',
        './js/data/nutrition_sources.json'
    ];
    
    let loaded = false;
    
    // Try all possible paths one by one
    for (const url of sourcesUrls) {
        try {
            console.log(`Trying to load sources from: ${url}`);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                window.NUTRITION_SOURCES = data;
                console.log("Successfully loaded nutrition sources from " + url + ":", window.NUTRITION_SOURCES);
                loaded = true;
                break;
            } else {
                console.warn(`Failed to load from ${url}, status: ${response.status}`);
            }
        } catch (error) {
            console.warn(`Error loading from ${url}:`, error);
        }
    }
    
    if (!loaded) {
        console.error("CRITICAL ERROR: Failed to load nutrition sources from any location. References will not have links.");
        console.error("Please ensure the nutrition_sources.json file exists in one of these locations: ", sourcesUrls);
        
        // Create minimal sources object for debugging, but clearly mark it as a fallback
        window.NUTRITION_SOURCES = {
            sources: {},
            _isFallback: true
        };
        
        console.error("Using empty sources object as fallback. This will affect application functionality.");
    }
    
    // Dispatch an event to notify that sources are loaded
    window.dispatchEvent(new CustomEvent('nutrition-sources-loaded', {
        detail: {
            sources: window.NUTRITION_SOURCES,
            loaded: loaded,
            fallback: !loaded
        }
    }));
}

// Run the loader to check if files are accessible
document.addEventListener('DOMContentLoaded', loadNutritionSources); 