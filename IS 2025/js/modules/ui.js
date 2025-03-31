// ui.js - Handles UI interactions and DOM manipulations

// We need to access marked from the global scope since it's loaded in index.php
// This is safer than trying to import it directly in the module
const marked = window.marked;

// Get chat container element
const chatMessages = document.querySelector(".chat-messages");

// Add a message to the chat UI
export function addMessageToUI(sender, message) {
    // Log addition for debugging
    console.log(`Adding ${sender} message`);
    
    // Create message container
    const messageDiv = document.createElement('div');
    messageDiv.className = sender;
    
    // Create message content container
    const contentDiv = document.createElement('div');
    contentDiv.className = "message-content";
    
    try {
        // Configure marked options for rendering markdown
        marked.setOptions({
            gfm: true, // GitHub Flavored Markdown
            breaks: true, // Convert line breaks to <br>
            sanitize: false, // Allow HTML
            smartLists: true
        });
        
        // For user messages, keep it simple
        if (sender === "user") {
            // Escape special characters for user messages
            contentDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
        } else {
            // For model messages, parse markdown
            const hasSourceSection = message.includes('---') || 
                                   message.includes('**Sources:**') || 
                                   message.includes('<div class="sources-container">') || 
                                   message.includes('<h3>Sources:</h3>') ||
                                   message.includes('Sources:');
            
            if (hasSourceSection) {
                console.log("Message contains source section");
                
                // Split the message into content and sources
                let mainContent, sourcesContent;
                
                // Check if we have a formatted HTML source section
                if (message.includes('<div class="sources-container">')) {
                    const parts = message.split('<div class="sources-container">');
                    mainContent = parts[0];
                    sourcesContent = parts.length > 1 ? '<div class="sources-container">' + parts[1] : '';
                    
                    // Render main content with markdown
                    contentDiv.innerHTML = marked.parse(mainContent);
                    
                    // Add HTML sources directly if present
                    if (sourcesContent) {
                        console.log("Using pre-formatted HTML sources section");
                        const sourcesDiv = document.createElement('div');
                        sourcesDiv.className = 'message-sources';
                        sourcesDiv.innerHTML = sourcesContent;
                        contentDiv.appendChild(sourcesDiv);
                    }
                } 
                // Try different splitting patterns for text-based sources
                else if (message.includes('---')) {
                    const parts = message.split(/---+/);
                    mainContent = parts[0];
                    sourcesContent = parts.length > 1 ? parts[1] : '';
                    
                    // Render main content with markdown
                    const renderedContent = marked.parse(mainContent);
                    contentDiv.innerHTML = renderedContent;
                    
                    // Add sources section if present
                    if (sourcesContent) {
                        processTextBasedSources(sourcesContent, contentDiv);
                    }
                } else if (message.includes('Sources:')) {
                    // Look for Sources: with or without markdown formatting
                    const srcPattern = /(\*\*)?Sources:(\*\*)?/;
                    const parts = message.split(srcPattern);
                    
                    // The parts will be [content before, **, "Sources:", **, content after]
                    // or simply [content before, undefined, "Sources:", undefined, content after]
                    mainContent = parts[0];
                    sourcesContent = parts.length > 4 ? `Sources:${parts[4]}` : '';
                    
                    // Render main content with markdown
                    const renderedContent = marked.parse(mainContent);
                    contentDiv.innerHTML = renderedContent;
                    
                    // Add sources section if present
                    if (sourcesContent) {
                        processTextBasedSources(sourcesContent, contentDiv);
                    }
                } else {
                    mainContent = message;
                    sourcesContent = '';
                    
                    // Just render the whole thing as markdown
                    const renderedContent = marked.parse(mainContent);
                    contentDiv.innerHTML = renderedContent;
                }
            } else {
                // Regular markdown parsing for model messages
                const renderedContent = marked.parse(message);
                contentDiv.innerHTML = renderedContent;
            }
        }
    } catch (error) {
        console.error("Error parsing markdown:", error);
        // Fallback to plain text if parsing fails
        contentDiv.innerHTML = `<p>${message}</p>`;
    }
    
    // Append content to message container
    messageDiv.appendChild(contentDiv);
    
    // Append message to chat container
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Helper function to process text-based source sections
function processTextBasedSources(sourcesContent, contentDiv) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'message-sources';
    
    try {
        console.log("Processing text-based sources");
        
        // Parse the sources content to look for numbered sources
        const sourceLines = sourcesContent.split('\n').filter(line => line.trim());
        
        // Create a new HTML block for sources with proper IDs for linking
        let enhancedSourcesHtml = '<div class="sources-container"><h3>Sources:</h3><ul>';
        
        // Track the sources we've processed to handle renumbering
        let processedSources = [];
        
        // First pass: extract source titles from different formats
        for (const line of sourceLines) {
            // Skip lines that don't look like source entries
            if (!line.trim() || line.includes("Sources:") && !line.match(/\d+\.\s+/)) continue;
            
            // Try to match different source line formats
            // Format 1: 1. Source Title
            const numberedFormat = line.match(/^\s*(\d+)\.\s+(.+)$/);
            // Format 2: - Source Title
            const bulletFormat = line.match(/^\s*[-•]\s+(.+)$/);
            // Format 3: Source Title (no prefix)
            const plainFormat = !numberedFormat && !bulletFormat && line.trim();
            
            let sourceTitle = '';
            
            if (numberedFormat) {
                sourceTitle = numberedFormat[2].trim();
            } else if (bulletFormat) {
                sourceTitle = bulletFormat[1].trim();
            } else if (plainFormat) {
                sourceTitle = line.trim();
                // Remove "Sources:" prefix if present
                if (sourceTitle.startsWith("Sources:")) {
                    sourceTitle = sourceTitle.substring(8).trim();
                }
            }
            
            if (sourceTitle) {
                processedSources.push(sourceTitle);
            }
        }
        
        // Second pass: build the HTML with proper IDs for the renumbered sources
        processedSources.forEach((sourceTitle, index) => {
            const sourceNumber = index + 1;
            
            // Look for matching file in NUTRITION_SOURCES
            let foundUrl = null;
            
            // Access sources object properly based on the structure
            if (window.NUTRITION_SOURCES) {
                const sourcesData = window.NUTRITION_SOURCES.sources || window.NUTRITION_SOURCES;
                
                // Try to find a match for the source title
                // Convert to filename format
                const possibleFilename = sourceTitle.replace(/\s+/g, '_') + '.txt';
                if (sourcesData[possibleFilename]) {
                    foundUrl = sourcesData[possibleFilename];
                } else {
                    // Try another format with colons removed
                    const altFilename = sourceTitle.replace(/:/g, '').replace(/\s+/g, '_') + '.txt';
                    if (sourcesData[altFilename]) {
                        foundUrl = sourcesData[altFilename];
                    } else {
                        // Try fuzzy matching
                        const sourceKeys = Object.keys(sourcesData);
                        const matchingKey = sourceKeys.find(key => 
                            key.toLowerCase().includes(sourceTitle.toLowerCase().replace(/\s+/g, '_')) || 
                            sourceTitle.toLowerCase().includes(key.replace(/_/g, ' ').replace('.txt', '').toLowerCase())
                        );
                        
                        if (matchingKey) {
                            foundUrl = sourcesData[matchingKey];
                        }
                    }
                }
            }
            
            // Add source list item with ID for linking from citations
            if (foundUrl) {
                enhancedSourcesHtml += `<li id="source-${sourceNumber}"><a href="${foundUrl}" target="_blank">${sourceTitle}</a></li>`;
                console.log(`Added link for source ${sourceNumber}: ${sourceTitle}`);
            } else {
                enhancedSourcesHtml += `<li id="source-${sourceNumber}">${sourceTitle}</li>`;
                console.log(`No link found for source ${sourceNumber}: ${sourceTitle}`);
            }
        });
        
        enhancedSourcesHtml += '</ul></div>';
        sourcesDiv.innerHTML = enhancedSourcesHtml;
        console.log("Sources processed successfully");
    } catch (error) {
        console.error("Error processing sources:", error);
        // Fallback to regular markdown if processing fails
        sourcesDiv.innerHTML = marked.parse(sourcesContent);
    }
    
    contentDiv.appendChild(sourcesDiv);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add date separator to chat
export function addDateSeparator(dateStr) {
    const separator = document.createElement('div');
    separator.className = 'chat-date';
    separator.textContent = dateStr;
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(separator);
}

// Show loading indicator while waiting for AI response
export function showLoadingIndicator() {
    const chatContainer = document.querySelector(".chat-messages");
    const loaderDiv = document.createElement("div");
    loaderDiv.className = "loader";
    loaderDiv.textContent = "NutriGuide is thinking...";
    chatContainer.appendChild(loaderDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loaderDiv;
}

// Remove loading indicator
export function removeLoadingIndicator() {
    const loader = document.querySelector(".chat-messages .loader");
    if (loader) {
        loader.remove();
    }
}

// Show error message if AI fails
export function showErrorMessage() {
    const messageDiv = document.createElement("div");
    messageDiv.className = "model";
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerHTML = "<p>I apologize, but I'm having trouble processing your nutrition question right now. Please try again or rephrase your question.</p>";
    
    messageDiv.appendChild(contentDiv);
    
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show notification when AI generates a title
export function showTitleNotification(title) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.title-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'title-notification';
        const container = document.getElementById('notification-container') || document.body;
        container.appendChild(notification);
    }
    
    // Set notification text
    notification.textContent = `Conversation titled: "${title}"`;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Update UI with conversation list
export function updateConversationList(conversations, currentConversationId, onConversationClick, onRenameClick, onDeleteClick) {
    console.group("%c🖌️ UI: UPDATE CONVERSATION LIST - START", "background: #009688; color: white; padding: 2px 5px; border-radius: 3px;");
    
    // Get the history container
    const historyContainer = document.querySelector(".history-items");
    console.log("%c🔍 UI: History container lookup", "color: #607D8B");
    console.log("Container found:", !!historyContainer);
    console.log("Container selector:", ".history-items");
    
    if (!historyContainer) {
        console.error("%c❌ UI ERROR: Cannot find history container element (.history-items)", "color: #f44336; font-weight: bold;");
        console.log("Available elements with similar class:", document.querySelectorAll("[class*='history']"));
        console.log("DOM structure:", document.body.innerHTML.substring(0, 500) + "...");
        console.groupEnd();
        return;
    }
    
    console.log("%c🔄 UI: Clearing previous history", "color: #2196F3");
    const previousContent = historyContainer.innerHTML;
    console.log("Previous content:", previousContent);
    
    // Clear previous history
    historyContainer.innerHTML = "";
    
    // Force visibility
    historyContainer.style.display = "block";
    historyContainer.style.visibility = "visible";
    historyContainer.style.opacity = "1";
    
    // Log detailed debugging information
    console.log("%c📊 UI: Conversation data received", "color: #9C27B0");
    console.log("Conversations count:", conversations ? conversations.length : 0);
    console.log("Current conversation ID:", currentConversationId);
    console.log("Callback functions provided:", {
        onConversationClick: typeof onConversationClick === 'function',
        onRenameClick: typeof onRenameClick === 'function',
        onDeleteClick: typeof onDeleteClick === 'function'
    });
    
    // Ensure conversations is an array
    const conversationList = Array.isArray(conversations) ? conversations : [];
    
    // If conversations is empty or undefined, show a placeholder
    if (!conversationList.length) {
        console.log("%c⚠️ UI: No conversations to display, showing empty state", "color: #FF9800");
        const emptyState = document.createElement("div");
        emptyState.className = "empty-history";
        emptyState.textContent = "No conversations yet. Start a new chat!";
        historyContainer.appendChild(emptyState);
        
        console.log("Empty state added:", emptyState.outerHTML);
        console.groupEnd();
        return;
    }
    
    // Convert currentConversationId to string for comparison
    const currentIdStr = currentConversationId ? String(currentConversationId) : null;
    console.log(`%c🔍 UI: Current ID for comparison: ${currentIdStr || "none"}`, "color: #607D8B");
    
    console.log("%c🔄 UI: Creating conversation items", "color: #2196F3");
    
    // Create and append conversation items
    conversationList.forEach((conversation, index) => {
        console.log(`Processing conversation ${index + 1}:`, conversation);
        
        // Check if conversation has required properties
        if (!conversation || !conversation.id) {
            console.warn(`%c⚠️ UI: Invalid conversation object at index ${index}`, "color: #FF9800");
            console.warn("Conversation data:", conversation);
            return;
        }
        
        // Convert conversation ID to string for comparison
        const convIdStr = String(conversation.id);
        console.log(`Creating item for conversation ID: ${convIdStr}`);
        
        // Format the date
        let formattedDate = "Unknown date";
        try {
            // Try to parse the date - handle both ISO format and SQL timestamps
            let dateObj;
            
            // Check if we have valid date strings
            if (conversation.updated_at && conversation.updated_at !== "0000-00-00 00:00:00") {
                // Try to parse as ISO or SQL timestamp
                dateObj = new Date(conversation.updated_at);
            } else if (conversation.created_at && conversation.created_at !== "0000-00-00 00:00:00") {
                dateObj = new Date(conversation.created_at);
            } else {
                // If no valid dates, use current time
                dateObj = new Date();
            }
            
            // Check if the date is valid
            if (isNaN(dateObj.getTime())) {
                console.warn("Invalid date format for conversation:", convIdStr, conversation.updated_at || conversation.created_at);
                dateObj = new Date(); // Fallback to current date
            }
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (dateObj.toDateString() === today.toDateString()) {
                // Format time only for today
                formattedDate = "Today, " + dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                });
            } else if (dateObj.toDateString() === yesterday.toDateString()) {
                formattedDate = "Yesterday";
            } else {
                // Full date for older conversations
                formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
        } catch (e) {
            console.warn(`%c⚠️ UI: Error formatting date for conversation ${convIdStr}`, "color: #FF9800");
            console.warn("Error:", e);
        }
        
        // Create conversation item element
        const conversationItem = document.createElement("div");
        conversationItem.className = "conversation-item";
        
        // Add data-id attribute for easy selection
        conversationItem.setAttribute('data-id', convIdStr);
        
        // Determine if this is the active conversation
        const isActive = currentIdStr && convIdStr === currentIdStr;
        
        if (isActive) {
            conversationItem.classList.add("active");
            console.log(`%c✅ UI: Marking conversation as active: ${convIdStr}`, "color: #4CAF50");
        }
        
        // Set the item's HTML content
        conversationItem.innerHTML = `
            <div class="conversation-title">${conversation.title || "Untitled Conversation"}</div>
            <div class="conversation-date">${formattedDate}</div>
            <div class="conversation-actions">
                <button class="rename-btn" data-id="${convIdStr}" title="Rename">✏️</button>
                <button class="delete-btn" data-id="${convIdStr}" title="Delete">🗑️</button>
            </div>
        `;
        
        console.log(`Created conversation item HTML: ${conversationItem.outerHTML.substring(0, 100)}...`);
        
        // Add click event to load this conversation
        conversationItem.addEventListener("click", (e) => {
            // Ignore clicks on the action buttons
            if (e.target.classList.contains("rename-btn") || 
                e.target.classList.contains("delete-btn")) {
                return;
            }
            console.log(`%c🖱️ UI: Clicked conversation: ${convIdStr}`, "color: #795548");
            if (typeof onConversationClick === 'function') {
                onConversationClick(convIdStr);
            } else {
                console.warn("%c⚠️ UI: onConversationClick is not a function", "color: #FF9800");
            }
        });
        
        // Add to the history container
        historyContainer.appendChild(conversationItem);
        console.log(`Added conversation item ${index + 1} to container`);
    });
    
    console.log("%c✅ UI: Added conversations to sidebar", "color: #4CAF50");
    console.log("Total items added:", conversationList.length);
    console.log("Container children count:", historyContainer.children.length);
    
    // Add event listeners for conversation actions
    console.log("%c🔄 UI: Setting up action button event listeners", "color: #2196F3");
    
    const renameButtons = document.querySelectorAll(".rename-btn");
    console.log(`Found ${renameButtons.length} rename buttons`);
    
    renameButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const btnId = btn.dataset.id;
            console.log(`%c🖱️ UI: Clicked rename button for conversation: ${btnId}`, "color: #795548");
            if (typeof onRenameClick === 'function') {
                onRenameClick(btnId);
            } else {
                console.warn("%c⚠️ UI: onRenameClick is not a function", "color: #FF9800");
            }
        });
    });
    
    const deleteButtons = document.querySelectorAll(".delete-btn");
    console.log(`Found ${deleteButtons.length} delete buttons`);
    
    deleteButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const btnId = btn.dataset.id;
            console.log(`%c🖱️ UI: Clicked delete button for conversation: ${btnId}`, "color: #795548");
            if (typeof onDeleteClick === 'function') {
                onDeleteClick(btnId);
            } else {
                console.warn("%c⚠️ UI: onDeleteClick is not a function", "color: #FF9800");
            }
        });
    });
    
    console.log("%c🔍 UI: Final DOM state", "color: #607D8B");
    console.log("Container HTML:", historyContainer.innerHTML.substring(0, 200) + "...");
    console.log("Container style:", {
        display: window.getComputedStyle(historyContainer).display,
        visibility: window.getComputedStyle(historyContainer).visibility,
        height: window.getComputedStyle(historyContainer).height,
        overflow: window.getComputedStyle(historyContainer).overflow
    });
    
    console.log("%c🖌️ UI: UPDATE CONVERSATION LIST - COMPLETE", "background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;");
    console.groupEnd();
}

// Update UI when a conversation is loaded
export function displayConversation(messages, messagesByDate) {
    // Clear chat area
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.innerHTML = "";
    
    // Add messages grouped by date
    for (const date in messagesByDate) {
        addDateSeparator(date);
        messagesByDate[date].forEach(message => {
            addMessageToUI("user", message.user_message);
            addMessageToUI("model", message.bot_message);
        });
    }
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Set active conversation in sidebar
export function setActiveConversation(conversationId) {
    if (!conversationId) {
        console.warn("No conversation ID provided to setActiveConversation");
        return;
    }
    
    // Convert to string for consistent comparison
    const idStr = String(conversationId);
    
    console.log("Setting active conversation in UI:", idStr);
    
    // Remove active class from all conversations
    document.querySelectorAll(".conversation-item").forEach(item => {
        item.classList.remove("active");
    });
    
    // First try with data-id attribute (preferred method)
    const targetItem = document.querySelector(`.conversation-item[data-id="${idStr}"]`);
    
    if (targetItem) {
        targetItem.classList.add("active");
        console.log("Successfully set active conversation:", idStr);
        
        // Ensure it's visible in the sidebar (scroll to it if needed)
        targetItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
    }
    
    // Fallback to rename button's data-id if direct approach failed
    const itemWithRenameBtn = document.querySelector(`.conversation-item .rename-btn[data-id="${idStr}"]`);
    if (itemWithRenameBtn) {
        const parentItem = itemWithRenameBtn.closest('.conversation-item');
        if (parentItem) {
            parentItem.classList.add("active");
            console.log("Set active conversation using fallback method:", idStr);
            parentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Add the data-id to the parent for future use
            if (!parentItem.getAttribute('data-id')) {
                parentItem.setAttribute('data-id', idStr);
                console.log("Added missing data-id attribute to conversation item");
            }
            return true;
        }
    }
    
    console.warn("Could not find conversation item with ID:", idStr);
    console.log("Available conversation items:", 
        Array.from(document.querySelectorAll('.conversation-item')).map(item => 
            item.getAttribute('data-id') || 'no-id'));
    
    return false;
}

// Update document title
export function updateDocumentTitle(title) {
    document.title = `${title} - NutriGuide`;
}

// Get welcome message HTML
export function getWelcomeMessageHTML(username) {
    return username !== 'User' 
        ? `<div class="model"><div class="message-content"><p>Hi ${username}! I'm NutriGuide, your personal nutrition assistant. How can I help you with your dietary and nutrition questions today?</p></div></div>` 
        : `<div class="model"><div class="message-content"><p>Hello! I'm NutriGuide, your personal nutrition assistant. How can I help you with your dietary and nutrition questions today?</p></div></div>`;
}

// Display conversation history
export function loadConversationHistory(messages) {
    // Clear existing messages
    const chatContainer = document.querySelector(".chat-messages");
    chatContainer.innerHTML = '';
    
    // Group messages by date
    const messagesByDate = {};
    
    messages.forEach(message => {
        const date = new Date(message.timestamp * 1000).toLocaleDateString();
        if (!messagesByDate[date]) {
            messagesByDate[date] = [];
        }
        messagesByDate[date].push(message);
    });
    
    // For each date, add a separator and then the messages
    Object.keys(messagesByDate).forEach(date => {
        addDateSeparator(date);
        messagesByDate[date].forEach(message => {
            addMessageToUI("user", message.user_message);
            addMessageToUI("model", message.bot_message);
        });
    });
}

// Simple debug function for synthesized answers
export function showDebugSynthesizedAnswer(answer, sources) {
    alert(`Synthesized Answer: ${answer}\n\nSources: ${sources.join(', ')}`);
}

export function updateConversationListSimple(conversations, createItemFunction) {
    const historyItems = document.querySelector('.history-items');
    if (!historyItems) {
        console.error('%c[UI ERROR] History items container not found for updating conversation list', 'color: #f44336; font-weight: bold');
        return;
    }
    
    // Ensure the history panel and items are visible
    const historyPanel = document.querySelector('.history-panel');
    if (historyPanel) {
        historyPanel.classList.add('force-visible');
    }
    historyItems.classList.add('force-visible');
    
    // Clear the current list
    historyItems.innerHTML = '';
    
    console.log('%c[UI] Updating conversation list with', 'color: #2196F3', conversations.length, 'conversations');
    
    // Add conversation items to the list
    if (conversations && conversations.length > 0) {
        conversations.forEach(conv => {
            // Use the passed-in function to create conversation items
            const conversationItem = createItemFunction(conv);
            historyItems.appendChild(conversationItem);
        });
        console.log('%c[UI] Conversation list updated successfully', 'color: #4CAF50');
    } else {
        console.log('%c[UI] No conversations to display', 'color: #FFC107');
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-conversations-message';
        emptyMessage.textContent = 'No conversations yet. Start a new one!';
        historyItems.appendChild(emptyMessage);
    }
}

// Update the UI for a new conversation
export function updateUIForNewConversation() {
    console.log('%c[UI] Updating UI for new conversation', 'color: #2196F3');
    
    // Clear chat messages
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        
        // Add welcome message
        addSimpleMessageToUI('model', 'Hello! I\'m NutriGuide, your personal nutrition assistant. How can I help you with your dietary and nutrition questions today?');
    } else {
        console.error('%c[UI ERROR] Chat messages container not found', 'color: #f44336');
    }
    
    // Clear active state from all conversation items
    const conversationItems = document.querySelectorAll('.conversation-item');
    conversationItems.forEach(item => {
        item.classList.remove('active');
    });
}

// Display messages in the chat window
export function displayMessages(messages) {
    console.log('%c[UI] Displaying', 'color: #2196F3', messages.length, 'messages');
    
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.error('%c[UI ERROR] Chat messages container not found', 'color: #f44336');
        return;
    }
    
    // Clear existing messages
    chatMessages.innerHTML = '';
    
    // Display each message
    messages.forEach(message => {
        addMessageToUI(message.role, message.content);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

// Add a single message to the UI (simple version without markdown parsing)
export function addSimpleMessageToUI(role, content) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.error('%c[UI ERROR] Chat messages container not found', 'color: #f44336');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = role; // 'user' or 'model'
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<p>${content}</p>`;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
}

// Scroll chat to bottom
export function scrollToBottom() {
    const chatWindow = document.querySelector('.chat-window');
    if (chatWindow) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

// Update URL with conversation ID
export function updateURLWithConversationId(conversationId) {
    if (!conversationId) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('conversation_id', conversationId);
    window.history.pushState({}, '', url.toString());
    console.log('%c[UI] Updated URL with conversation ID:', 'color: #2196F3', conversationId);
}

// Update conversation title
export function updateConversationTitle(title) {
    // Update document title
    document.title = `${title} - NutriGuide`;
    console.log('%c[UI] Updated conversation title to:', 'color: #2196F3', title);
}

// Show typing indicator in the chat
export function showTypingIndicator() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.error('%c[UI ERROR] Chat messages container not found', 'color: #f44336');
        return;
    }
    
    // Check if typing indicator already exists
    let typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        // Indicator already exists, make sure it's visible
        typingIndicator.style.display = 'flex';
        return;
    }
    
    // Create typing indicator
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'model typing-indicator';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <div class="dot-typing">
            <span></span><span></span><span></span>
        </div>
    `;
    
    typingIndicator.appendChild(contentDiv);
    chatMessages.appendChild(typingIndicator);
    
    // Scroll to bottom
    scrollToBottom();
}

// Hide typing indicator in the chat
export function hideTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Remove a conversation from the history panel
export function removeConversationFromList(conversationId) {
    console.log('%c[UI] Removing conversation from list:', 'color: #FF9800', conversationId);
    
    // Find the conversation item with the matching ID
    const item = document.querySelector(`.conversation-item[data-id="${conversationId}"]`);
    
    if (item) {
        // Remove the item from the DOM
        item.remove();
        console.log('%c[UI] Conversation removed from list', 'color: #4CAF50');
    } else {
        console.warn('%c[UI] Conversation not found in list:', 'color: #FFC107', conversationId);
    }
} 