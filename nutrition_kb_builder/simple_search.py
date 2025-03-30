#!/usr/bin/env python3
"""
Simple Search Tool for Qdrant

An ultra-simple search tool that directly searches Qdrant with minimal code.
"""

import os
import requests
import json
import argparse
from load_env import load_environment

def main():
    """Run a super-simple search against Qdrant"""
    parser = argparse.ArgumentParser(description="Simple search against Qdrant")
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
    
    # Step 1: Get embedding for query using Gemini API
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
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return 1
    
    # Step 2: Perform direct search with no filters
    print("Performing search...")
    
    # Build search payload
    search_payload = {
        "vector": embedding,
        "limit": 5,
        "with_payload": True
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Add API key if provided
    if qdrant_api_key:
        headers["api-key"] = qdrant_api_key
    
    try:
        search_url = f"{qdrant_url}/collections/{collection_name}/points/search"
        print(f"Sending request to: {search_url}")
        
        response = requests.post(
            search_url,
            headers=headers,
            json=search_payload
        )
        
        if response.status_code != 200:
            print(f"Error searching: {response.status_code}")
            print(f"Response: {response.text}")
            return 1
        
        results = response.json()
        
        # Try to find hits in the response
        hits = []
        if "result" in results:
            hits = results["result"]
        elif "hits" in results:
            hits = results["hits"]
        
        # Display results
        if not hits:
            print("No results found.")
            print(f"Full response: {json.dumps(results, indent=2)}")
        else:
            print(f"\nFound {len(hits)} results:\n")
            
            for i, hit in enumerate(hits):
                print(f"Result {i+1}")
                if "score" in hit:
                    print(f"Score: {hit['score']:.6f}")
                
                if "payload" in hit:
                    payload = hit["payload"]
                    if "title" in payload:
                        print(f"Title: {payload['title']}")
                    if "text" in payload:
                        text = payload["text"]
                        if len(text) > 200:
                            print(f"Text: {text[:200]}...")
                        else:
                            print(f"Text: {text}")
                
                print("-" * 50)
                
    except Exception as e:
        print(f"Error during search: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    main() 