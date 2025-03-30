# Nutrition Knowledge Base Builder

A toolkit for building and integrating a semantic search knowledge base for nutrition information with your chatbot application.

## Overview

This toolkit allows you to:

1. Process nutrition articles and embed them into a Qdrant vector database
2. Search for nutrition information using semantic similarity
3. Generate coherent answers from search results using the Gemini API
4. Integrate the knowledge base with your chat interface

## Quick Start

```bash
# Setup
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Create embeddings
python nutrition_embedder.py

# Test the search
python nutrition_search.py --query "What are the health benefits of the Mediterranean diet?"

# Integrate with your chat interface
python update_chatbot.py
```

## Core Components

- **nutrition_embedder.py**: Processes nutrition articles and uploads them to Qdrant
- **nutrition_search.py**: Searches the knowledge base and synthesizes answers
- **update_chatbot.py**: Integrates the knowledge base with your chat interface
- **load_env.py**: Utility for loading environment variables

## Setup

### Prerequisites
- Python 3.11+ (Python 3.11.5 recommended)
- A Qdrant account and API key
- Google Gemini API key
- Nutrition articles in text format

### Installation

1. **Clone or download this repository**

2. **Create and activate a virtual environment**
   ```powershell
   cd nutrition_kb_builder
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

4. **Create .env file**
   ```
   cp .env.example .env
   ```
   Then edit the .env file with your API keys and configuration.

## Configuration

Edit the `.env` file with your API keys and settings:

```
# Qdrant Configuration
QDRANT_URL="https://YOUR-QDRANT-INSTANCE.api.qdrant.tech/v1"
QDRANT_API_KEY="your_qdrant_api_key_here"

# Google Gemini API Configuration
GEMINI_API_KEY="your_gemini_api_key_here"

# Collection Settings
COLLECTION_NAME="nutrition_knowledge"
VECTOR_SIZE="768"
CHUNK_SIZE="1000"

# Data Paths
NUTRITION_DATA_PATH="../Nutrition_data"
METADATA_FILE="nutrition_topics.json"
```

## Creating and Updating Embeddings

The nutrition_embedder.py script processes your nutrition articles, chunks them into semantically meaningful pieces, and uploads them to Qdrant.

### Basic Usage

```
python nutrition_embedder.py
```

### Options

- `--reset`: Deletes the existing collection and recreates it
- `--log`: Enables detailed logging of the embedding process

### Workflow

1. Place your nutrition articles in the folder specified by `NUTRITION_DATA_PATH`
2. Run the embedder script to process and upload them
3. Check the log file to confirm successful processing

## Testing the Search

Use the nutrition_search.py script to test searching the knowledge base:

```
python nutrition_search.py --query "What are the health benefits of the Mediterranean diet?"
```

This will:
1. Search the Qdrant database for relevant information
2. Use the Gemini API to synthesize a coherent answer
3. Format the response with source attribution

## Integrating with the Chat Interface

Run the update_chatbot.py script to integrate the knowledge base with your chat interface:

```
python update_chatbot.py
```

This will:
1. Create/update the knowledgeBase.js module
2. Modify chat.js to use the knowledge base for nutrition queries
3. Update UI components to display source attributions
4. Set up the backend to connect with Qdrant

After running this script, the same .env file settings must be copied to your chat application's environment.

## Troubleshooting

### No Search Results

If searches return no results:
1. Verify that your embeddings were created successfully
2. Check that your Qdrant and Gemini API keys are correct
3. Try running `nutrition_search.py` with a simple query

### API Errors

Check your API credentials and whether you've reached any usage limits.

### Integration Issues

If the chat interface isn't using the knowledge base:
1. Make sure you've run `update_chatbot.py`
2. Check that your chat application has the correct environment variables
3. Look for JavaScript console errors in the browser

## License

This project is licensed under the MIT License - see the LICENSE file for details. 