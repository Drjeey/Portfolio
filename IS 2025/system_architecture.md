# NutriGuide: System Architecture Overview

## 1. Introduction

NutriGuide is a comprehensive web-based AI-powered nutrition assistant designed to provide personalized nutrition guidance to users. The system leverages Google's Gemini AI model to offer evidence-based nutrition information and advice through an intuitive conversational interface. This document provides a detailed analysis of the system architecture, components, data flow patterns, and technical considerations implemented in the NutriGuide application.

The primary goal of NutriGuide is to democratize access to high-quality nutrition information by combining modern web technologies with advanced AI capabilities. The system is designed with scalability, security, and user experience as core principles, making it suitable for both individual users seeking personal nutrition advice and potential institutional deployment.

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                 │
│                                                                         │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    │
│   │  Login/Signup   │    │  Chat Interface  │    │ History Panel   │    │
│   │    (Form.php)   │    │   (index.php)    │    │  (main.js)      │    │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    │
└────────────│─────────────────────│─────────────────────│───────────────┘
             │                     │                     │
             │                     │                     │
             ▼                     ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             SERVER                                      │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Authentication Layer                        │  │
│  │           (User Registration, Login, Session Management)         │  │
│  └───────────────────────────────┬─────────────────────────────────┘  │
│                                  │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Business Logic Layer                        │  │
│  │                         (backend.php)                            │  │
│  │                                                                  │  │
│  │     ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   │  │
│  │     │ Conversation  │   │  User Data    │   │  Context      │   │  │
│  │     │  Management   │   │  Processing   │   │  Management   │   │  │
│  │     └───────────────┘   └───────────────┘   └───────────────┘   │  │
│  └────────────────────────────────┬────────────────────────────────┘  │
│                                   │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     AI Integration Layer                         │  │
│  │                      (gemini-proxy.php)                          │  │
│  └────────────────────────────────┬────────────────────────────────┘  │
│                                   │                                    │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Data Access Layer                           │  │
│  │                       (db_config.php)                            │  │
│  └────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                               │
│                                                                         │
│   ┌─────────────────┐             ┌─────────────────────────────────┐  │
│   │  MySQL Database │             │      Google Gemini AI API       │  │
│   │                 │             │                                 │  │
│   │  ┌───────────┐  │             │      ┌─────────────────┐        │  │
│   │  │ Users     │  │             │      │   NLP Engine    │        │  │
│   │  └───────────┘  │             │      └─────────────────┘        │  │
│   │  ┌───────────┐  │             │      ┌─────────────────┐        │  │
│   │  │Conversations│ │             │      │ Nutrition Model │        │  │
│   │  └───────────┘  │             │      └─────────────────┘        │  │
│   │  ┌───────────┐  │             │                                 │  │
│   │  │ Messages  │  │             │                                 │  │
│   │  └───────────┘  │             │                                 │  │
│   └─────────────────┘             └─────────────────────────────────┘  │
│                                                                         │
│   ┌───────────────────────────┐                                         │
│   │ Qdrant Vector Database    │                                         │
│   │     (Optional)            │                                         │
│   └───────────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. System Overview

NutriGuide implements a modern web application architecture that combines several key technologies and design patterns:

- **Frontend Technologies**: The user interface is built using a combination of semantic HTML5, CSS3 with responsive design principles, and modular JavaScript. The frontend follows a component-based architecture that separates concerns between display logic and data management. The application uses vanilla JavaScript for core functionality with strategic use of libraries for specific features like markdown rendering.

- **Backend Framework**: The server-side implementation uses PHP 7.4+ without relying on a heavy framework, instead adopting a modular approach with clearly defined responsibility boundaries. This approach allows for great flexibility while maintaining a clean separation of concerns between authentication, business logic, AI integration, and data access.

- **Database System**: MySQL 5.7+ is used as the primary data store, implementing a normalized schema design with optimized indices for conversation retrieval and user authentication. The database schema is designed to efficiently store conversation history while maintaining referential integrity.

- **AI Integration**: The system integrates with Google's Gemini AI through a carefully designed proxy layer that handles authentication, prompt engineering, and response processing. The AI model is specialized for nutrition-related queries with custom prompt engineering that frames the AI as a nutrition expert.

- **Vector Database (Optional)**: An optional integration with Qdrant provides semantic search capabilities for knowledge base embedding, enabling more accurate retrieval of nutrition information.

## 4. Component Architecture

### 4.1 Frontend Components

#### 4.1.1 User Interface Layer

The UI layer implements a single-page application (SPA) design pattern with the following key components:

- **Chat Interface**: Located in `index.php`, this is the primary user interaction point featuring:
  - A message display area that supports rich formatting through markdown
  - An input area with real-time typing indicators and submit functionality
  - Dynamic message rendering with loading states and error handling
  - Automatic scrolling behavior to follow conversation flow

- **Authentication Forms**: Implemented in `Form.php`, providing:
  - Username and password-based authentication
  - Client-side validation for immediate user feedback
  - Toggling between login and signup modes
  - Error messaging with contextual hints
  - Success confirmation for account creation

- **History Panel**: A sidebar component displaying:
  - Chronologically ordered conversation history
  - Title-based navigation between saved conversations
  - New conversation initiation button
  - Logout functionality
  - Session persistence across browser refreshes

#### 4.1.2 Client-Side Features

- **Real-time Messaging**: Implemented in `main.js`, this component:
  - Manages the asynchronous communication with the backend
  - Implements a queue system for message processing
  - Handles network failures with retry logic
  - Updates UI states based on message status (sending, sent, failed)

- **Conversation Management**: The frontend:
  - Tracks active conversation context
  - Maintains conversation state in browser storage
  - Provides history navigation without page reloads
  - Implements pagination for long conversation histories

- **Markdown Rendering**: Using the Marked.js library, the system:
  - Transforms AI-generated markdown into formatted HTML
  - Sanitizes output to prevent XSS vulnerabilities
  - Supports common nutrition-related formatting like tables, lists, and emphasis

- **Session Handling**: Client-side session management includes:
  - Persistent login state through browser sessions
  - Automatic session validation on page load
  - Graceful session expiration handling
  - Secure token management

### 4.2 Backend Components

#### 4.2.1 Authentication System

The authentication system implemented across `process_form.php` and `backend.php` provides:

- **User Registration**: 
  - Username uniqueness validation
  - Password strength requirements
  - Secure password hashing using PHP's `password_hash` function with bcrypt
  - User record creation with appropriate timestamps

- **Login Processing**:
  - Credential validation against database records
  - Password verification using `password_verify`
  - Session initialization with secure settings
  - Protection against brute force attacks

- **Session Management**:
  - PHP session-based authentication with secure cookies
  - Configurable session timeout settings
  - Protection against session fixation attacks
  - Forced re-authentication for sensitive operations

#### 4.2.2 API Layer

The API layer, primarily implemented in `backend.php`, provides:

- **RESTful Endpoints**:
  - User authentication endpoints (/login, /signup)
  - Conversation management endpoints (/conversations/*)
  - Message processing endpoints (/messages)
  - AI interaction endpoints (/generate)

- **Response Formatting**:
  - Consistent JSON response structure
  - Status codes following HTTP standards
  - Error objects with meaningful messages
  - Success responses with appropriate payloads

- **Error Handling**:
  - Comprehensive error trapping
  - Graceful degradation for API failures
  - Detailed logging for debugging
  - User-friendly error messages that abstract implementation details

#### 4.2.3 Business Logic Layer

The business logic in `backend.php` implements:

- **Conversation Management**:
  - Creation of new conversation threads
  - Retrieval of existing conversations
  - Deletion and archiving of conversations
  - Conversation metadata management

- **User Data Processing**:
  - Profile information management
  - User preference storage
  - Access control enforcement
  - Data validation and sanitization

- **AI Prompt Formatting**:
  - Context assembly from conversation history
  - System prompt engineering for nutrition expertise
  - Parameter optimization for response quality
  - Token limit management

#### 4.2.4 AI Integration Layer

The AI integration layer in `gemini-proxy.php` manages:

- **Gemini API Communication**:
  - API key management and rotation
  - Request formatting according to Gemini specifications
  - Response parsing and error handling
  - Rate limiting and quota management

- **Model Configuration**:
  - Selection of appropriate Gemini model variant (gemini-2.0-flash)
  - Parameter tuning for response characteristics
  - Temperature and sampling settings for balanced responses
  - Maximum token configuration

- **Response Processing**:
  - Extraction of response content
  - Formatting for frontend display
  - Metadata extraction for conversation tracking
  - Fallback handling for API unavailability

#### 4.2.5 Data Access Layer

The data access layer in `db_config.php` provides:

- **Database Connection Management**:
  - Connection pooling and reuse
  - Configurable timeout and retry logic
  - Environment-specific connection parameters
  - Error reporting with actionable information

- **CRUD Operations**:
  - Parameterized queries for all database operations
  - Transaction support for multi-step operations
  - Result set processing and transformation
  - Error handling with specific database error codes

- **Query Optimization**:
  - Efficient query structure for performance
  - Appropriate use of indices
  - Pagination for large result sets
  - Query caching where appropriate

### 4.3 Database Schema

The database schema consists of three primary tables with the following detailed structure:

#### 4.3.1 Users Table

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSON NULL
);
```

This table stores:
- Unique user identifiers and authentication credentials
- Account creation and last login timestamps
- Account status indicators
- User preferences in JSON format for flexible configuration

#### 4.3.2 Conversations Table

```sql
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) DEFAULT 'New Conversation',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    conversation_summary TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

This table manages:
- Conversation metadata including titles and timestamps
- User ownership through foreign key relationships
- Archiving status for conversation management
- Summary text for conversation context and preview

#### 4.3.3 Messages Table

```sql
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    is_user BOOLEAN NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tokens_used INT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

This table stores:
- Individual message content from both user and AI
- Message direction indicator (user vs. AI)
- Timestamp for message ordering
- Token usage metrics for AI-generated responses
- Referential integrity with conversation context

### 4.4 External Integrations

#### 4.4.1 Google Gemini AI

The integration with Google's Gemini AI model is a core component, providing:

- **Natural Language Processing**:
  - Intent recognition for nutrition queries
  - Entity extraction for food items and nutrition concepts
  - Context-aware response generation
  - Multi-turn conversation handling

- **Nutrition Expertise**:
  - Access to trained nutrition knowledge
  - Evidence-based response generation
  - Personalized recommendations based on user context
  - Recognition of dietary patterns and nutritional concepts

- **Content Formatting**:
  - Markdown-formatted responses for rich text display
  - Structured information presentation when appropriate
  - Citation handling for nutrition claims
  - Visual formatting for improved readability

The integration is implemented through `gemini-proxy.php`, which handles:
- API authentication using the key stored in `.env`
- Request formatting with appropriate system prompts
- Response parsing and error handling
- Session context maintenance

#### 4.4.2 Vector Database (Optional)

The optional Qdrant vector database integration provides:

- **Semantic Search**:
  - Vector embeddings of nutrition knowledge
  - Similarity-based query matching
  - Retrieval of relevant nutrition information
  - Enhanced response accuracy for specialized queries

- **Knowledge Base Management**:
  - Storage of nutrition facts and relationships
  - Regular updates with new nutritional information
  - Structured data organization by nutrition categories
  - Fast retrieval through optimized vector indices

## 5. Data Flow

### 5.1 User Authentication Flow

The authentication process follows these detailed steps:

1. **Initialization**:
   - User navigates to application and is redirected to `Form.php` if no active session exists
   - The login form is presented with username and password fields
   - Client-side validation is initialized for form fields

2. **Credential Submission**:
   - User enters credentials and submits the form
   - Client-side JavaScript performs initial validation
   - An AJAX request is sent to `backend.php` with the login action and credentials
   - Loading indicators show processing status

3. **Server-side Validation**:
   - `backend.php` receives the login request
   - Credentials are sanitized and validated
   - Username is checked against the database using prepared statements
   - If found, the password hash is compared using `password_verify()`

4. **Session Establishment**:
   - Upon successful validation, a new PHP session is created
   - User ID and username are stored in session variables
   - Last login time is updated in the database
   - Success response is returned to the client

5. **Redirection**:
   - Client receives success response
   - JavaScript redirects the user to the main application interface
   - The application loads with the user's existing conversations
   - Session cookie is used for subsequent requests

### 5.2 Conversation Flow

The conversation interaction process follows these steps:

1. **Message Initiation**:
   - User types a message in the input field
   - JavaScript captures the message on submit/enter
   - Client-side validation ensures non-empty content
   - UI updates to show the message as "sending"

2. **Request Processing**:
   - JavaScript in `main.js` constructs a request payload with:
     - The message content
     - Current conversation ID (or request for new conversation)
     - Session information
   - Payload is sent to `backend.php` via AJAX POST request

3. **Server-side Processing**:
   - `backend.php` validates the session and request parameters
   - If needed, a new conversation record is created
   - User message is stored in the messages table
   - Conversation context is assembled from previous messages
   - A request payload is constructed for the AI model

4. **AI Interaction**:
   - The assembled payload is sent to `gemini-proxy.php`
   - Proxy adds the API key and formats according to Gemini requirements
   - Request is sent to the Google Gemini API
   - Response is received and parsed
   - Any errors are handled appropriately

5. **Response Processing**:
   - Successful AI response is extracted from the Gemini API response
   - Response is stored in the messages table
   - Conversation record is updated with new timestamps
   - If new, a meaningful title is generated from the conversation
   - Response is formatted and returned to the client

6. **Client Display**:
   - Frontend receives the AI response
   - Markdown is rendered using the Marked.js library
   - Response is displayed in the chat interface
   - Chat window scrolls to show the new message
   - UI updates to ready state for next interaction

### 5.3 History Management Flow

The conversation history management process includes:

1. **History Loading**:
   - Upon successful login, JavaScript requests conversation history
   - `backend.php` queries the database for the user's conversations
   - Results are sorted by most recent activity
   - A limited set (e.g., 20 most recent) are returned initially

2. **Sidebar Population**:
   - Frontend receives conversation list
   - JavaScript populates the sidebar with conversation entries
   - Each entry shows title and last update time
   - Active conversation is highlighted

3. **Conversation Switching**:
   - User clicks on a conversation in the sidebar
   - JavaScript sends a request for that conversation's messages
   - `backend.php` retrieves all messages for the selected conversation
   - Messages are returned in chronological order

4. **Conversation Display**:
   - Frontend clears current chat display
   - Messages are rendered in sequence with appropriate styling
   - Chat window scrolls to the most recent message
   - Conversation context is updated for continuity
   - Input area focus is set for immediate interaction

## 6. Security Architecture

### 6.1 Authentication Security

The system implements multiple layers of authentication security:

- **Password Management**:
  - Passwords are never stored in plain text
  - Bcrypt hashing via PHP's `password_hash` with appropriate cost factors
  - Salt generation and management handled automatically by PHP
  - Hash verification through `password_verify` without timing attacks

- **Session Security**:
  - Session cookies configured with:
    - `httponly` flag to prevent JavaScript access
    - `secure` flag when HTTPS is available
    - `samesite` attribute for CSRF protection
  - Session IDs regenerated on privilege changes
  - Server-side session validation for all authenticated requests
  - Session timeout with configurable inactivity periods

- **CSRF Protection**:
  - Token-based protection for state-changing operations
  - Tokens generated per session and validated on requests
  - Token refreshing on successful authentication
  - Header validation for AJAX requests

### 6.2 Data Protection

The application implements comprehensive data protection measures:

- **SQL Injection Prevention**:
  - Exclusive use of prepared statements for all database operations
  - Parameter binding for all user-influenced queries
  - Type enforcement for query parameters
  - Minimal privilege database user accounts

- **Input Validation**:
  - Server-side validation of all user inputs
  - Type checking and constraint enforcement
  - Whitelist-based validation where applicable
  - Length and format restrictions on inputs

- **Output Sanitization**:
  - Context-aware output encoding
  - HTML entity encoding for displayed content
  - JavaScript escaping for dynamically generated code
  - JSON encoding for API responses

- **Error Handling**:
  - Custom error handlers that prevent information disclosure
  - Generic error messages for users
  - Detailed logging for administrators
  - Graceful failure modes that protect system integrity

### 6.3 API Security

External API interactions are secured through multiple mechanisms:

- **API Key Protection**:
  - Gemini API key stored securely in `.env` file
  - Key never exposed to client-side code
  - Server-side validation before key usage
  - Rate limiting to prevent abuse

- **Environment Management**:
  - Sensitive configuration in environment variables
  - Different configurations for development and production
  - Restricted access to configuration files
  - Exclusion of sensitive files from version control

- **Request Validation**:
  - Authentication check for all API endpoints
  - Parameter validation before processing
  - Request origin verification
  - Request rate limiting per user

## 7. Deployment Architecture

### 7.1 Web Server Configuration

The system is designed to be deployed on standard web server configurations:

- **Apache/Nginx Setup**:
  - Virtual host configuration for domain isolation
  - URL rewriting for clean endpoints
  - HTTPS configuration with modern cipher suites
  - Content security policies

- **PHP Runtime**:
  - PHP 7.4+ with appropriate extensions:
    - PDO for database connectivity
    - JSON for data formatting
    - OpenSSL for secure operations
    - cURL for API communication
  - Optimized `php.ini` settings for performance
  - OPcache for bytecode caching
  - Memory limits appropriate for conversation processing

- **Database Server**:
  - MySQL 5.7+ or compatible MariaDB
  - InnoDB storage engine for transaction support
  - Optimized buffer and cache settings
  - Regular backup scheduling

### 7.2 Development Environment

The development environment is configured to mirror production while enabling efficient development:

- **Local Setup**:
  - XAMPP/WAMP/MAMP stack for cross-platform development
  - Custom MySQL port configuration (3307) to avoid conflicts
  - Git workflow for version control
  - Automated deployment scripts

- **Environment Configurations**:
  - Separate `.env` files for different environments
  - Example configuration in `.env.example`
  - Development-specific debugging tools
  - Production error handling that prioritizes user experience

## 8. Scalability Considerations

### 8.1 Horizontal Scaling

The application architecture supports horizontal scaling through:

- **Stateless Backend Design**:
  - No server-side session state reliance
  - Database-stored sessions for multi-server setups
  - Shared nothing architecture between request handlers
  - Load balancer compatibility

- **Database Optimization**:
  - Connection pooling for efficient resource usage
  - Read/write splitting capability for high-load scenarios
  - Indexing strategy optimized for common queries
  - Potential for sharding by user ID for extreme scale

### 8.2 Vertical Scaling

Performance optimization at the individual server level includes:

- **Query Optimization**:
  - Efficient SQL query design
  - Strategic use of database indices
  - Query result caching
  - Delayed writes for non-critical updates

- **AI Integration Efficiency**:
  - Prompt design optimized for token efficiency
  - Response caching for common queries
  - Batch processing where appropriate
  - Asynchronous processing for non-blocking operations

## 9. Future Architecture Enhancements

### 9.1 Real-time Features

Planned enhancements for real-time capabilities include:

- **WebSocket Integration**:
  - Real-time message delivery without polling
  - Typing indicators and read receipts
  - Server-push notifications
  - Presence awareness

- **Push Notifications**:
  - Browser-based notifications for new messages
  - Mobile device integration
  - Scheduled notification capabilities
  - Customizable notification preferences

### 9.2 Enhanced AI Capabilities

AI functionality enhancements on the roadmap include:

- **Nutrition-Specific Model**:
  - Fine-tuned model variant for nutrition domain
  - Training on specialized nutrition corpus
  - Enhanced understanding of dietary requirements
  - Improved recognition of nutritional terminology

- **Multi-modal Support**:
  - Food image recognition and analysis
  - Meal photo nutritional estimation
  - Barcode scanning for packaged foods
  - Visual meal planning assistance

### 9.3 Advanced Analytics

Future analytics capabilities include:

- **User Behavior Tracking**:
  - Conversation pattern analysis
  - Topic clustering and trend identification
  - Session duration and engagement metrics
  - Feature usage tracking for optimization

- **Nutrition Trend Analysis**:
  - Aggregate analysis of nutrition concerns
  - Seasonal trend identification
  - Geographic variation in nutrition questions
  - Emerging nutrition topic detection

- **Personalized Recommendations**:
  - Learning from user interactions
  - Personalized response adaptation
  - Proactive nutrition suggestions
  - Progress tracking for nutritional goals

## 10. Conclusion

The NutriGuide application architecture represents a sophisticated integration of web technologies and AI capabilities focused on delivering nutrition guidance. The system's modular design prioritizes security, scalability, and user experience while providing a solid foundation for future enhancements.

Key architectural strengths include:

1. **Separation of Concerns**: The clear delineation between frontend, backend, and integration layers enables independent evolution of each component.

2. **Security by Design**: Multiple security layers protect user data and system integrity from common web vulnerabilities.

3. **AI Integration**: The thoughtful integration of Google's Gemini model provides powerful nutrition expertise while managing the complexities of API interaction.

4. **User-Centered Architecture**: All architectural decisions ultimately serve to create a seamless, responsive user experience that makes nutrition guidance accessible.

5. **Future Readiness**: The architecture accommodates planned enhancements without requiring fundamental restructuring.

This comprehensive architecture balances technical sophistication with practical implementation concerns, resulting in a system that is both powerful and maintainable. The NutriGuide system demonstrates how modern web technologies and AI can be combined to create meaningful solutions to real-world problems in the nutrition domain. 