# Gemini Qdrant Vector Search Tool

A standalone tool for searching a Qdrant vector database using Google's Gemini API for embeddings and response generation. This tool connects to an existing vector database and does not include functions for creating or updating the database.

## Features

- Converts search queries to embeddings using Gemini's embedding model
- Performs semantic search against a pre-existing Qdrant vector database
- Generates coherent answers to queries using Gemini model based on search results
- Completely standalone with no dependencies on other project files

## Prerequisites

- Python 3.8+
- A Google Cloud account with Gemini API access
- A Qdrant account with an existing collection containing embeddings

## Installation

1. Clone or download this repository
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and update it with your API keys and configuration:
   ```
   cp .env.example .env
   ```

## Configuration

Update the `.env` file with your configuration:

```
# Qdrant Configuration
QDRANT_URL="https://YOUR-QDRANT-INSTANCE.api.qdrant.tech/v1"
QDRANT_API_KEY="your_qdrant_api_key_here"

# Google Gemini API Configuration
GEMINI_API_KEY="your_gemini_api_key_here"

# Collection Settings
COLLECTION_NAME="your_collection_name"
```

## Usage

Run the search tool from the command line:

```
python gemini_vector_search.py --query "Your search query here" --collection "your_collection_name"
```

### Arguments

- `--query`: The search query to perform (required)
- `--collection`: Override the collection name from the .env file (optional)
- `--limit`: Maximum number of results to return (default: 5)

## Example

```
python gemini_vector_search.py --query "What are the benefits of vitamin D?" --collection "nutrition_knowledge"
```

## How It Works

1. The tool converts your query to a vector embedding using Google's Gemini embedding model
2. It then searches your Qdrant vector database for semantically similar content
3. The top results are retrieved and formatted
4. Gemini's text generation model is used to synthesize a coherent answer based on the search results

## Customizing the Search

The search tool is designed to work with any Qdrant collection that contains embeddings. The collection should have documents with at least a "text" field in the payload. Additional metadata fields like "title" and "topics" will be used if present. 