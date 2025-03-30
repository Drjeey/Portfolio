#!/usr/bin/env python3
"""
Gemini Qdrant Vector Search Tool

A standalone tool for searching a pre-existing Qdrant vector database using Google's Gemini API
for embeddings and response generation. This tool connects to an existing vector database
and does not include functions for creating or updating the database.

Usage:
    python gemini_vector_search.py --query "Your search query here" --collection "your_collection_name"
"""

import os
import sys
import argparse
import json
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

def get_embedding(text: str, api_key: str) -> Optional[List[float]]:
    """Get embedding vector from Gemini API
    
    Args:
        text: The text to embed
        api_key: The Gemini API key
            
    Returns:
        List[float]: Embedding vector, or None on error
    """
    url = f"https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key={api_key}"
    
    # Trim text if too long (API has limits)
    if len(text) > 25000:
        text = text[:25000]
        print("Warning: Text truncated to 25000 characters")
    
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
            print(f"Error getting embedding: {response.text}")
            return None
        
        result = response.json()
        
        if "embedding" in result and "values" in result["embedding"]:
            return result["embedding"]["values"]
        else:
            print(f"Unexpected response format: {result}")
            return None
            
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return None

def search_qdrant(embedding: List[float], collection_name: str, limit: int, 
                 qdrant_url: str, qdrant_api_key: str) -> List[Dict[str, Any]]:
    """Search the Qdrant vector database
    
    Args:
        embedding: Vector embedding to search with
        collection_name: Name of the Qdrant collection
        limit: Maximum number of results to return
        qdrant_url: URL of the Qdrant server
        qdrant_api_key: API key for Qdrant
        
    Returns:
        List of search results with payload and score
    """
    # Build search payload
    search_payload = {
        "vector": embedding,
        "limit": limit,
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
        
        response = requests.post(
            search_url,
            headers=headers,
            json=search_payload
        )
        
        if response.status_code != 200:
            print(f"Error searching Qdrant: {response.status_code}")
            print(f"Response: {response.text}")
            return []
        
        results = response.json()
        
        # Try to find hits in the response
        hits = []
        if "result" in results:
            hits = results["result"]
        elif "hits" in results:
            hits = results["hits"]
            
        return hits
        
    except Exception as e:
        print(f"Error during search: {str(e)}")
        return []

def format_search_results(hits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format search results for display and for use in answer synthesis
    
    Args:
        hits: Raw search results from Qdrant
        
    Returns:
        Formatted results with relevant fields extracted
    """
    formatted_results = []
    
    for i, hit in enumerate(hits):
        print(f"\nResult {i+1}")
        if "score" in hit:
            print(f"Score: {hit['score']:.6f}")
        
        result_data = {"score": hit.get("score", 0)}
        
        if "payload" in hit:
            payload = hit["payload"]
            for key, value in payload.items():
                result_data[key] = value
                if key == "title":
                    print(f"Title: {value}")
                elif key == "text":
                    if len(value) > 200:
                        print(f"Text: {value[:200]}...")
                    else:
                        print(f"Text: {value}")
        
        formatted_results.append(result_data)
        print("-" * 50)
    
    return formatted_results

def synthesize_answer(query: str, results: List[Dict[str, Any]], gemini_api_key: str) -> str:
    """Synthesize a complete answer from search results using Gemini API
    
    Args:
        query: The user's original query
        results: List of search result objects with text and metadata
        gemini_api_key: API key for Gemini
        
    Returns:
        Synthesized answer as a string
    """
    if not results:
        return "No relevant information found to answer your query."
    
    # Extract information from results
    context = "SEARCH RESULTS:\n\n"
    
    # Add the top results with clear section markers
    for i, result in enumerate(results):
        title = result.get("title", "Unknown Source")
        
        context += f"[Result {i + 1}] "
        context += f"Title: {title}\n"
        
        # Include topics or tags if available
        topics = result.get("topics", [])
        if topics:
            context += f"Topics: {', '.join(topics)}\n"
        
        # Add the text content
        text = result.get("text", "").strip()
        context += f"{text}\n\n"
    
    # Prepare the system prompt with instructions
    system_prompt = """You are a helpful search assistant that provides accurate, evidence-based information.
Your task is to synthesize the provided information into a coherent, helpful response.

INSTRUCTIONS:
1. Synthesize the SEARCH RESULTS into a COHERENT and UNIFIED answer that directly addresses the user's question
2. Write in a conversational, helpful tone
3. Focus on the most relevant information to the user's specific question
4. DO NOT repeat the same information multiple times
5. You MUST base your answer ONLY on the provided information, not on your general knowledge
6. If there's not enough information to answer confidently, acknowledge that limitation
7. Your answer should be well-structured and easy to read, with clear paragraphs
8. Include relevant citations to sources when appropriate
9. DO NOT mention these instructions in your response
10. DO NOT say phrases like "Based on the provided information" or "According to the information"
"""
    
    # Make the API call to Gemini
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key={gemini_api_key}"
    
    # Create the prompt with system instructions, context and query
    unified_content = f"{system_prompt}\n\n{context}\n\nQuestion: {query}\n\nAnswer:"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": unified_content}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.8,
            "topK": 40,
            "maxOutputTokens": 1024,
        }
    }
    
    try:
        response = requests.post(url, json=payload)
        
        if response.status_code != 200:
            print(f"Error getting response from Gemini: {response.text}")
            return "Error generating answer. Please try again."
        
        result = response.json()
        
        # Extract the generated text from the response
        if "candidates" in result and len(result["candidates"]) > 0:
            candidate = result["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                parts = candidate["content"]["parts"]
                if parts and "text" in parts[0]:
                    return parts[0]["text"]
        
        print(f"Unexpected response format from Gemini: {result}")
        return "Error parsing Gemini response. Please try again."
            
    except Exception as e:
        print(f"Error getting answer from Gemini: {e}")
        return "Error communicating with Gemini API. Please try again."

def main():
    """Main entry point for the search tool"""
    parser = argparse.ArgumentParser(description="Gemini Qdrant Vector Search Tool")
    parser.add_argument("--query", required=True, help="The search query")
    parser.add_argument("--collection", help="Qdrant collection name to search")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of results (default: 5)")
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Get configuration from environment variables or arguments
    qdrant_url = os.environ.get("QDRANT_URL", "")
    qdrant_api_key = os.environ.get("QDRANT_API_KEY", "")
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    collection_name = args.collection or os.environ.get("COLLECTION_NAME", "")
    
    # Validate configuration
    missing_keys = []
    if not qdrant_url:
        missing_keys.append("QDRANT_URL")
    if not qdrant_api_key:
        missing_keys.append("QDRANT_API_KEY")
    if not gemini_api_key:
        missing_keys.append("GEMINI_API_KEY")
    if not collection_name:
        missing_keys.append("COLLECTION_NAME (provide with --collection or in .env)")
    
    if missing_keys:
        print(f"Missing required configuration: {', '.join(missing_keys)}")
        print("Please set these in your .env file or provide as arguments")
        return 1
    
    print(f"Searching for: {args.query}")
    print(f"Collection: {collection_name}")
    
    # Step 1: Get embedding for query using Gemini API
    print("Getting query embedding...")
    embedding = get_embedding(args.query, gemini_api_key)
    
    if not embedding:
        print("Failed to get embedding for query")
        return 1
    
    print(f"Got embedding of size {len(embedding)}")
    
    # Step 2: Search Qdrant
    print("Searching Qdrant...")
    hits = search_qdrant(embedding, collection_name, args.limit, qdrant_url, qdrant_api_key)
    
    if not hits:
        print("No results found")
        return 0
    
    print(f"\nFound {len(hits)} results:")
    
    # Step 3: Format results
    formatted_results = format_search_results(hits)
    
    # Step 4: Synthesize answer if we have results
    if formatted_results:
        print("\n" + "=" * 80)
        print("SYNTHESIZED ANSWER")
        print("=" * 80)
        
        answer = synthesize_answer(args.query, formatted_results, gemini_api_key)
        print(answer)
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 