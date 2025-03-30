# Gemini Embedding Tool

A general-purpose tool for embedding text documents into a Qdrant vector database using Google's Gemini embedding model.

## Overview

This tool:
- Processes any text (.txt) files in the `docs` folder
- Splits them into semantically meaningful chunks with configurable overlap
- Generates embeddings using Google's Gemini API
- Stores the vectors in Qdrant for efficient semantic search
- Works with any type of documents (not specific to any domain)

## Setup

1. **Requirements**
   - Python 3.11+ (Python 3.11.5 recommended)

2. **Install dependencies**
   ```
   pip install -r requirements.txt
   ```

2. **Configure environment variables**
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your API keys and configuration.

3. **Add documents**
   
   Place your text documents (with `.txt` extension) in the `docs` folder.

## Usage

### Basic usage:
```
python embedder.py
```

### Reset collection:
```
python embedder.py --reset
```
This will delete the existing collection before creating a new one.

## Configuration

Edit the `.env` file to customize:

- **Qdrant settings**:
  - `QDRANT_URL`: URL of your Qdrant instance
  - `QDRANT_API_KEY`: API key for Qdrant
  - `COLLECTION_NAME`: Name of the collection to store documents in

- **Gemini settings**:
  - `GEMINI_API_KEY`: Your Google Gemini API key

- **Chunking settings**:
  - `CHUNK_SIZE`: Target size of each chunk in tokens (default: 1000)
  - `CHUNK_OVERLAP`: Overlap between chunks as a decimal percentage (default: 0.2 = 20%)

- **Path settings**:
  - `DOCS_PATH`: Path to the directory containing your text documents

## How It Works

1. The tool scans the `docs` folder for .txt files
2. Each document is split into chunks with configurable overlap
3. Chunks are embedded using Google's Gemini API
4. The embeddings are stored in Qdrant with metadata about the source document
5. Each point in Qdrant contains:
   - The text chunk
   - Document title (derived from filename)
   - Filename
   - Chunk index
   - The chunk's position within the document

## Notes

- Documents are automatically chunked to fit within API limits (25,000 characters max)
- Chunking is done at paragraph boundaries to preserve context
- The tool includes logging to track progress and troubleshoot issues
- Batched uploads prevent API rate limit issues 