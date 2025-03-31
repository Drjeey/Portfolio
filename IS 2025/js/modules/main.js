// Initialize conversation module
await conversation.init();
console.log("Conversation module initialized");

// Debug log for title generation
console.log("Current conversation state:", {
    id: conversation.getCurrentConversationId(),
    title: conversation.getCurrentConversationTitle(),
    titleUpdated: conversation.getTitleHasBeenUpdated(),
    hasSummary: !!conversation.getCurrentConversationSummary()
}); 