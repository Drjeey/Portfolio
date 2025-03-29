// messageHandling.js - Processes AI responses and conversation summaries

// Helper function to extract the response part from the AI output
export function extractResponsePart(fullText) {
    // Look for "RESPONSE:" marker
    if (fullText.includes("RESPONSE:")) {
        const responsePart = fullText.split("RESPONSE:")[1].split("SUMMARY:")[0].trim();
        return responsePart;
    }
    
    // If we can't find the expected format, try a simpler approach to separate
    // response from summary (assume summary comes after a double line break)
    const parts = fullText.split(/\n\s*\n/);
    if (parts.length > 1) {
        // Return everything except what looks like a summary at the end
        const possibleSummary = parts[parts.length - 1];
        if (possibleSummary.length < 250 && (possibleSummary.includes("summary") || possibleSummary.includes("Summary"))) {
            return parts.slice(0, -1).join("\n\n");
        }
    }
    
    // Fallback - if we can't identify a clear summary, return the full text
    return fullText;
}

// Helper function to extract the summary part from the AI output
export function extractSummaryPart(fullText) {
    // Look for "SUMMARY:" marker
    if (fullText.includes("SUMMARY:")) {
        return fullText.split("SUMMARY:")[1].trim();
    }
    
    // If we can't find the expected format, try to extract the last paragraph
    // if it looks like a summary
    const parts = fullText.split(/\n\s*\n/);
    if (parts.length > 1) {
        const possibleSummary = parts[parts.length - 1];
        if (possibleSummary.length < 250 && (possibleSummary.includes("summary") || possibleSummary.includes("Summary"))) {
            return possibleSummary;
        }
    }
    
    // Fallback - generate a very basic summary
    return `Conversation about ${fullText.split(' ').slice(0, 5).join(' ')}...`;
}

// Create prompt for getting an AI response with summary request
export function createSummaryRequestPrompt(message, currentSummary = "") {
    if (currentSummary) {
        const summaryContext = `Current conversation summary: ${currentSummary}\n\n`;
        return `${summaryContext}${message}\n\n===\nBased on our conversation, please provide two things:\n1. A direct response to my health question above.\n2. An updated brief summary (2-3 sentences) of our entire health-related conversation including this latest exchange.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the updated summary.`;
    } else {
        // No summary yet
        return `${message}\n\n===\nPlease provide two things:\n1. A direct response to my health question above.\n2. A brief summary (1-2 sentences) of what we've just discussed related to health.\n\nFormat your answer with "RESPONSE:" followed by your response, then "SUMMARY:" followed by the summary.`;
    }
}

// Create prompt for generating a conversation title
export function createTitleGenerationPrompt(userMessage) {
    return `Task: Create a short, descriptive title (3-5 words) for a conversation about a health topic based on this first message.
Message: "${userMessage}"

Requirements:
- Keep it under 5 words
- Make it descriptive of the health topic
- Focus on the medical/health aspect
- No quotes or punctuation
- No explanations, just the title

Title:`;
}

// Clean up generated title
export function cleanupGeneratedTitle(titleSuggestion, userMessage) {
    // Clean up the title (remove quotes, periods, new lines, etc.)
    let cleanTitle = titleSuggestion
        .replace(/["""'''.?!]/g, '')  // Remove punctuation
        .replace(/^\s+|\s+$/g, '')    // Trim whitespace
        .replace(/\n/g, '')           // Remove newlines
        .replace(/Title:?\s*/i, '')   // Remove "Title:" prefix if present
        .replace(/^(About|Regarding|RE:|On)\s/i, ''); // Remove common prefixes
    
    // Limit length
    if (cleanTitle.length > 40) {
        cleanTitle = cleanTitle.substring(0, 37) + '...';
    } else if (cleanTitle.length < 1) {
        // Fallback if we get an empty title
        cleanTitle = "Health Question: " + userMessage.split(' ').slice(0, 3).join(' ');
        if (cleanTitle.length > 40) {
            cleanTitle = cleanTitle.substring(0, 37) + '...';
        }
    }
    
    // Capitalize first letter of each word for a cleaner look
    cleanTitle = cleanTitle.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return cleanTitle;
}

// Create system instructions for AI
export function createSystemInstructions(baseSystemInstruction, username, isFirstInteraction = false, currentSummary = "") {
    if (isFirstInteraction) {
        // Personalized system instruction for first-time interactions
        return `You are a helpful health information assistant talking with ${username}.
Your primary focus is to provide clear, factual medical information and health advice.
Always include disclaimers when appropriate, reminding users to consult healthcare professionals for personalized medical advice.
Since this is your first interaction, greet ${username} by name and be welcoming before providing health information.`;
    } else if (currentSummary) {
        // Context-aware system instruction for existing conversations
        return `${baseSystemInstruction}
Based on this conversation summary: "${currentSummary}", 
provide a focused healthcare response that maintains contextual relevance.`;
    }
    
    // Default to base instruction
    return baseSystemInstruction;
}

// Create a default title for new conversations
export function createDefaultTitle() {
    const now = new Date();
    return `New Chat ${now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`;
} 