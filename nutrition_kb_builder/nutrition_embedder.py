#!/usr/bin/env python3
"""
Nutrition Knowledge Base Embedder

This script processes nutrition articles and uploads them to Qdrant for vector search.
It creates embeddings using Google's Gemini API and organizes the knowledge with metadata.
"""

import os
import json
import requests
import argparse
from typing import List, Dict, Any
import time
import logging
# Import our environment loader
from load_env import load_environment

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("embedding_process.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NutritionEmbedder:
    def __init__(self):
        """Initialize with configuration from environment variables"""
        # Load environment variables
        if not load_environment():
            logger.error("Failed to load environment variables")
            raise ValueError("Failed to load environment variables")
        
        # Configuration from environment variables
        self.config = {
            "qdrant_url": os.environ.get("QDRANT_URL", ""),
            "qdrant_api_key": os.environ.get("QDRANT_API_KEY", ""),
            "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
            "collection_name": os.environ.get("COLLECTION_NAME", "nutrition_knowledge"),
            "vector_size": int(os.environ.get("VECTOR_SIZE", "768")),
            "nutrition_data_path": os.environ.get("NUTRITION_DATA_PATH", "../Nutrition_data"),
            "metadata_file": os.environ.get("METADATA_FILE", "nutrition_topics.json"),
            "chunk_size": int(os.environ.get("CHUNK_SIZE", "200"))
        }
        
        # Validate configuration
        required_keys = ["qdrant_url", "qdrant_api_key", "gemini_api_key"]
        missing_keys = [key for key in required_keys if not self.config.get(key)]
        
        if missing_keys:
            logger.error(f"Missing required configuration: {', '.join(missing_keys)}")
            raise ValueError(f"Missing required configuration: {', '.join(missing_keys)}")
            
        # Set paths
        self.nutrition_data_path = self.config["nutrition_data_path"]
        self.metadata_file_path = os.path.join(self.nutrition_data_path, self.config["metadata_file"])
        
        # Load nutrition metadata
        if not os.path.exists(self.metadata_file_path):
            logger.error(f"Metadata file not found: {self.metadata_file_path}")
            raise FileNotFoundError(f"Metadata file not found: {self.metadata_file_path}")
            
        with open(self.metadata_file_path, "r", encoding='utf-8') as f:
            self.nutrition_metadata = json.load(f)
            
        logger.info(f"Loaded metadata for {len(self.nutrition_metadata['articles'])} articles")

    def create_collection(self) -> bool:
        """Create Qdrant collection if it doesn't exist
        
        Returns:
            bool: True if collection was created or already exists, False on error
        """
        headers = {
            "Content-Type": "application/json",
            "api-key": self.config["qdrant_api_key"]
        }
        
        # Check if collection exists
        try:
            response = requests.get(
                f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}",
                headers=headers
            )
            
            if response.status_code == 200:
                logger.info(f"Collection {self.config['collection_name']} already exists.")
                return True
                
            # Only proceed to create if it doesn't exist
            if response.status_code != 404:
                logger.error(f"Error checking collection: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to Qdrant: {e}")
            return False
        
        # Create collection with cosine distance
        payload = {
            "vectors": {
                "size": self.config["vector_size"],
                "distance": "Cosine"
            },
            "optimizers_config": {
                "indexing_threshold": 0  # Index immediately
            }
        }
        
        try:
            response = requests.put(
                f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                logger.info(f"Collection {self.config['collection_name']} created successfully.")
                return True
            else:
                logger.error(f"Failed to create collection: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            return False

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector from Gemini API
        
        Args:
            text: The text to embed
            
        Returns:
            List[float]: Embedding vector, or None on error
        """
        url = f"https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key={self.config['gemini_api_key']}"
        
        # Trim text if too long (API has limits)
        if len(text) > 25000:
            text = text[:25000]
            logger.warning(f"Text truncated to 25000 characters")
        
        payload = {
            "model": "models/embedding-001",
            "content": {
                "parts": [
                    {"text": text}
                ]
            }
        }
        
        try:
            response = requests.post(url, json=payload)
            
            if response.status_code != 200:
                logger.error(f"Error getting embedding: {response.text}")
                return None
            
            result = response.json()
            
            if "embedding" in result and "values" in result["embedding"]:
                return result["embedding"]["values"]
            else:
                logger.error(f"Unexpected response format: {result}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            return None

    def chunk_text(self, text: str, filename: str) -> List[Dict[str, Any]]:
        """Split text into chunks and prepare chunk metadata
        
        Args:
            text: The text to chunk
            filename: The source filename for metadata
            
        Returns:
            List[Dict]: List of chunk objects with text and metadata
        """
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = []
        current_size = 0
        chunk_index = 0
        
        # Larger chunk size (increased from 500)
        target_chunk_size = int(os.environ.get("CHUNK_SIZE", "1000"))
        # Overlap is 25% of chunk size
        overlap_size = int(target_chunk_size * 0.25)
        
        # Find matching article metadata
        article_metadata = None
        for article in self.nutrition_metadata["articles"]:
            if article["filename"] == os.path.basename(filename):
                article_metadata = article
                break
                
        if not article_metadata:
            logger.warning(f"No metadata found for {filename}")
            # Use filename as fallback title
            article_metadata = {
                "title": os.path.basename(filename).replace(".txt", "").replace("_", " "),
                "topics": []
            }
        
        # Process paragraphs
        i = 0
        while i < len(paragraphs):
            para = paragraphs[i]
            # Skip empty paragraphs
            if not para.strip():
                i += 1
                continue
                
            # Rough estimation of tokens (words)
            para_size = len(para.split())
            
            # If adding this paragraph would exceed chunk size and we already have content
            if current_size + para_size > target_chunk_size and current_chunk:
                # Save the current chunk
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "chunk_index": chunk_index,
                    "filename": os.path.basename(filename),
                    "title": article_metadata["title"],
                    "topics": article_metadata["topics"],
                    "chunk_size": current_size,
                    "start_paragraph": current_chunk[0][:50] + "..."  # First 50 chars for context
                })
                
                # Start the next chunk with overlap
                overlap_paras = []
                # Add enough paragraphs from the current chunk to meet the overlap size
                overlap_tokens = 0
                for para in reversed(current_chunk):
                    para_tokens = len(para.split())
                    if overlap_tokens + para_tokens <= overlap_size:
                        overlap_paras.insert(0, para)
                        overlap_tokens += para_tokens
                    else:
                        break
                
                # Reset for next chunk with overlap
                current_chunk = overlap_paras.copy()
                current_size = overlap_tokens
                chunk_index += 1
                # Don't increment i, process the current paragraph again
            else:
                # Add to current chunk
                current_chunk.append(para)
                current_size += para_size
                i += 1  # Move to next paragraph
        
        # Add the last chunk if it has content
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append({
                "text": chunk_text,
                "chunk_index": chunk_index,
                "filename": os.path.basename(filename),
                "title": article_metadata["title"],
                "topics": article_metadata["topics"],
                "chunk_size": current_size,
                "start_paragraph": current_chunk[0][:50] + "..."  # First 50 chars for context
            })
        
        logger.info(f"Split '{article_metadata['title']}' into {len(chunks)} chunks with size {target_chunk_size} and {overlap_size} overlap")
        return chunks

    def process_and_upload_articles(self, reset_collection=False):
        """Process articles and upload to Qdrant
        
        Args:
            reset_collection: If True, delete and recreate the collection
        """
        # Delete collection if reset requested
        if reset_collection:
            logger.info(f"Deleting collection {self.config['collection_name']}...")
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config["qdrant_api_key"]
            }
            
            try:
                response = requests.delete(
                    f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    logger.info(f"Collection {self.config['collection_name']} deleted successfully.")
                else:
                    logger.warning(f"Failed to delete collection: {response.text}")
            except Exception as e:
                logger.error(f"Error deleting collection: {e}")
        
        # Create collection
        if not self.create_collection():
            logger.error("Failed to create collection. Exiting.")
            return
        
        points = []
        point_id = 1
        total_chunks = 0
        
        # Process each article
        for article in self.nutrition_metadata["articles"]:
            filename = os.path.join(self.nutrition_data_path, article["filename"])
            title = article["title"]
            
            logger.info(f"Processing {title}...")
            
            try:
                with open(filename, "r", encoding="utf-8") as f:
                    content = f.read()
            except Exception as e:
                logger.error(f"Error reading file {filename}: {e}")
                continue
            
            # Split into chunks
            article_chunks = self.chunk_text(content, filename)
            logger.info(f"  Split into {len(article_chunks)} chunks")
            total_chunks += len(article_chunks)
            
            for i, chunk in enumerate(article_chunks):
                logger.info(f"  Embedding chunk {i+1}/{len(article_chunks)}...")
                
                # Get embedding
                embedding = self.get_embedding(chunk["text"])
                
                if embedding:
                    # Create point
                    point = {
                        "id": point_id,
                        "vector": embedding,
                        "payload": {
                            "text": chunk["text"],
                            "title": chunk["title"],
                            "filename": chunk["filename"],
                            "chunk_index": chunk["chunk_index"],
                            "topics": chunk["topics"],
                            "source": "Nutrition Articles",
                            "url": f"nutrition://{chunk['filename']}"
                        }
                    }
                    
                    points.append(point)
                    point_id += 1
                else:
                    logger.error(f"  Failed to embed chunk {i+1}")
                
                # Sleep briefly to avoid API rate limits
                time.sleep(0.5)
        
        logger.info(f"Processed {total_chunks} chunks from {len(self.nutrition_metadata['articles'])} articles")
        
        # Upload points in batches
        batch_size = 50
        num_batches = (len(points) + batch_size - 1) // batch_size
        
        for i in range(0, len(points), batch_size):
            batch = points[i:i+batch_size]
            batch_num = i // batch_size + 1
            
            logger.info(f"Uploading batch {batch_num}/{num_batches} ({len(batch)} points)...")
            
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config["qdrant_api_key"]
            }
            
            try:
                response = requests.put(
                    f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}/points?wait=true",
                    headers=headers,
                    json={"points": batch}
                )
                
                if response.status_code == 200:
                    logger.info(f"  Successfully uploaded batch {batch_num}/{num_batches}")
                else:
                    logger.error(f"  Failed to upload batch: {response.text}")
                    
            except Exception as e:
                logger.error(f"  Error uploading batch: {e}")
            
            # Sleep to avoid rate limits
            time.sleep(1)
        
        logger.info(f"Successfully processed and uploaded {len(points)} chunks to Qdrant")
        return len(points)


def main():
    """Main function to process command line arguments and run embedder"""
    parser = argparse.ArgumentParser(description="Upload nutrition articles to Qdrant vector database")
    parser.add_argument("--reset", action="store_true", help="Reset the collection before uploading")
    args = parser.parse_args()
    
    try:
        embedder = NutritionEmbedder()
        embedder.process_and_upload_articles(args.reset)
    except Exception as e:
        logger.error(f"Error: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    main() 