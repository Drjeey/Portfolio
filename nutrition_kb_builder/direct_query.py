#!/usr/bin/env python3
"""
Direct Query Tool for Qdrant

A simple, direct vector search tool to debug Qdrant search issues.
"""

import os
import requests
import json
import argparse
from load_env import load_environment

def main():
    """Run a direct vector search against Qdrant"""
    parser = argparse.ArgumentParser(description="Direct vector search against Qdrant")
    parser.add_argument("--query", required=True, help="The query to search")
    args = parser.parse_args()
    
    # Load environment variables
    if not load_environment():
        print("Failed to load environment variables")
        return 1
    
    qdrant_url = os.environ.get("QDRANT_URL", "")
    qdrant_api_key = os.environ.get("QDRANT_API_KEY", "")
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    collection_name = os.environ.get("COLLECTION_NAME", "nutrition_knowledge")
    
    # Validate configuration
    missing_keys = []
    if not qdrant_url:
        missing_keys.append("QDRANT_URL")
    if not qdrant_api_key:
        missing_keys.append("QDRANT_API_KEY")
    if not gemini_api_key:
        missing_keys.append("GEMINI_API_KEY")
    
    if missing_keys:
        print(f"Missing required environment variables: {', '.join(missing_keys)}")
        return 1
    
    print(f"Searching for: {args.query}")
    
    # Step 1: Get collection info
    print("Checking collection info...")
    headers = {
        "Content-Type": "application/json",
        "api-key": qdrant_api_key
    }
    
    try:
        response = requests.get(
            f"{qdrant_url}/collections/{collection_name}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"Error getting collection info: {response.text}")
            return 1
            
        collection_info = response.json()
        print(f"Raw collection info: {json.dumps(collection_info, indent=2)}")
        
        # Try to extract vector count and size with flexible path handling
        vector_count = "unknown"
        vector_size = 768  # Default to standard Gemini size
        
        if "result" in collection_info:
            result = collection_info["result"]
            
            # Try different paths for vector count
            if "vectors_count" in result:
                vector_count = result["vectors_count"]
            elif "points_count" in result:
                vector_count = result["points_count"]
                
            # Try different paths for vector size
            if "config" in result and "params" in result["config"]:
                params = result["config"]["params"]
                if "vectors" in params and "size" in params["vectors"]:
                    vector_size = params["vectors"]["size"]
        
        print(f"Collection: {collection_name}")
        print(f"Vector count: {vector_count}")
        print(f"Vector size: {vector_size}")
        
    except Exception as e:
        print(f"Error checking collection: {e}")
        # Continue anyway - we'll assume the collection exists
    
    # Step 2: Get embedding for query
    print("Getting query embedding...")
    url = f"https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key={gemini_api_key}"
    
    payload = {
        "model": "models/embedding-001",
        "content": {
            "parts": [
                {"text": args.query}
            ]
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code != 200:
            print(f"Error getting embedding: {response.text}")
            return 1
        
        result = response.json()
        
        if "embedding" not in result or "values" not in result["embedding"]:
            print(f"Unexpected response format: {result}")
            return 1
            
        embedding = result["embedding"]["values"]
        embedding_size = len(embedding)
        
        print(f"Got embedding of size {embedding_size}")
        print(f"First 5 values: {embedding[:5]}")
        
        if embedding_size != vector_size and vector_size != "unknown":
            print(f"WARNING: Embedding size ({embedding_size}) doesn't match expected size ({vector_size})")
            # Continue anyway - in case the collection info was wrong
            
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return 1
    
    # Step 3: Perform direct search with no threshold
    print("Performing direct search...")
    payload = {
        "vector": embedding,
        "limit": 5,
        "with_payload": True,
        "with_vectors": False
        # No score_threshold to ensure we get results
    }
    
    try:
        response = requests.post(
            f"{qdrant_url}/collections/{collection_name}/points/search",
            headers=headers,
            json=payload
        )
        
        if response.status_code != 200:
            print(f"Error searching: {response.text}")
            return 1
        
        results = response.json()
        print(f"Raw search response: {json.dumps(results, indent=2)}")
        
        # Handle different response formats
        hits = []
        if "result" in results:
            hits = results["result"]
        elif "hits" in results:
            hits = results["hits"]
        
        if not hits:
            print("No results found, even with no threshold.")
            return 1
            
        print(f"\nFound {len(hits)} results:\n")
        
        for i, hit in enumerate(hits):
            print(f"Result {i+1}")
            if "score" in hit:
                print(f"Score: {hit['score']:.6f}")
            
            if "payload" in hit:
                payload = hit["payload"]
                for key, value in payload.items():
                    if key == "text":
                        # Truncate text if too long
                        if len(value) > 300:
                            print(f"{key}: {value[:300]}...")
                        else:
                            print(f"{key}: {value}")
                    elif isinstance(value, list) and key == "topics":
                        print(f"{key}: {', '.join(value)}")
                    else:
                        print(f"{key}: {value}")
                        
            print("-" * 50)
            
    except Exception as e:
        print(f"Error searching: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    main() 