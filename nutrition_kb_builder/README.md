# Nutrition Knowledge Base Builder

This tool embeds nutrition articles into Qdrant for semantic search, enabling a nutrition chatbot to respond based only on verified nutrition information.

## Features

- Processes nutrition articles stored in text files
- Chunks text into semantically meaningful segments
- Creates embeddings using Google's Gemini Embedding API
- Stores vectors and metadata in Qdrant for easy retrieval
- Includes search testing functionality
- Automatically updates the IS 2025 chat interface

## Key Scripts

### 1. `nutrition_embedder.py`

This is the main script responsible for processing nutrition articles and uploading them to Qdrant. It:
- Reads nutrition articles from the specified directory
- Chunks the content into manageable pieces
- Creates vector embeddings for each chunk using Gemini API
- Uploads the chunks with their metadata to Qdrant

### 2. `search_test.py`

This script is essential for testing that your Qdrant integration is working correctly. It allows you to:
- Test semantic search queries against your knowledge base
- Verify the relevance of search results before integrating with your chatbot
- Debug any issues with your embeddings or Qdrant setup
- Evaluate the quality of results with different search parameters

This is an important verification step before connecting your knowledge base to the actual chatbot application.

### 3. `update_chatbot.py`

This script handles the integration of the Qdrant knowledge base with your existing IS 2025 chat application. It:
- Creates and updates necessary JavaScript modules in the IS 2025 project
- Modifies the chat.js file to use the knowledge base for lookups
- Updates the backend.php file to handle knowledge base searches
- Adds UI enhancements to display source attributions
- Creates necessary configuration files for the integration

This script saves you from having to manually update multiple files across the IS 2025 project and ensures that all components work together properly.

## Setup

1. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Set up Qdrant:
   - Create an account at [Qdrant Cloud](https://cloud.qdrant.io/)
   - Create a new cluster (or use a local installation)
   - Generate an API key from your Qdrant dashboard

3. Set up Google AI:
   - Create an account at [Google AI Studio](https://makersuite.google.com/)
   - Create an API key in your Google AI Studio account

4. Configure the application:
   - Copy `.env.example` to `.env`
   - Edit `.env` with your Qdrant and Gemini API credentials

## Usage

### Embedding Nutrition Articles

To embed nutrition articles into Qdrant:

```bash
python nutrition_embedder.py
```

If you need to reset the collection first:

```bash
python nutrition_embedder.py --reset
```

### Testing Search

To test searching the knowledge base:

```bash
python search_test.py
```

This will start an interactive search session. You can also do a single search:

```bash
python search_test.py --query "benefits of mediterranean diet" --limit 3
```

### Updating Your Chat Application

To integrate the Qdrant knowledge base with your IS 2025 project:

```bash
python update_chatbot.py --is2025 "../IS 2025"
```

## Data Format

The embedder expects nutrition articles in text format (`*.txt`) and a metadata file (`nutrition_topics.json`) with the following structure:

```json
{
  "articles": [
    {
      "filename": "mediterranean_diet.txt",
      "title": "Mediterranean Diet",
      "topics": ["heart health", "longevity", "olive oil"]
    },
    ...
  ]
}
```

## Environment Variables

The application is configured using environment variables in the `.env` file:

- `QDRANT_URL`: URL of your Qdrant instance
- `QDRANT_API_KEY`: API key for Qdrant
- `GEMINI_API_KEY`: API key for Google Gemini
- `COLLECTION_NAME`: Name of your Qdrant collection
- `VECTOR_SIZE`: Dimension of the embedding vectors
- `CHUNK_SIZE`: Target token count per text chunk
- `NUTRITION_DATA_PATH`: Path to your nutrition articles
- `METADATA_FILE`: Filename of your metadata JSON file 