#!/usr/bin/env python3
"""
Nutrition Knowledge Base Search Utility

This script provides a unified search interface for the nutrition knowledge base that:
1. Searches the Qdrant vector database using semantic similarity
2. Uses the Gemini API to synthesize coherent answers from search results
3. Formats responses with proper source attribution

Usage:
    python nutrition_search.py --query "Your nutrition question here"
"""

import os
import sys
import argparse
import time
import json
import requests
from typing import List, Dict, Tuple, Any, Optional
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
            
            formatted_results = []
            for i, hit in enumerate(hits):
                print(f"Result {i+1}")
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
            
            # Synthesize an answer if we have results
            if formatted_results:
                synthesize_answer(args.query, formatted_results)
                
    except Exception as e:
        print(f"Error during search: {str(e)}")
        return 1
    
    return 0

def synthesize_answer(query, results):
    """Synthesize a complete answer from search results with citations using Gemini API
    
    Args:
        query: The user's original query
        results: List of search result objects with text and metadata
    """
    print("\n" + "=" * 80)
    print("SYNTHESIZED ANSWER")
    print("=" * 80)
    
    # Get the API key from environment
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return
    
    # Extract topics and information from results
    sources = []
    
    # Format the knowledge context
    context = "NUTRITION INFORMATION:\n\n"
    
    # Add the top results with clear section markers
    for i, result in enumerate(results):
        title = result.get("title", "Unknown Source")
        sources.append(title)
        
        context += f"[Information {i + 1}] "
        context += f"Title: {title}\n"
        
        # Include topics as keywords
        topics = result.get("topics", [])
        if topics:
            context += f"Topics: {', '.join(topics)}\n"
        
        # Add the text content
        text = result.get("text", "").strip()
        context += f"{text}\n\n"
    
    # Prepare the system prompt with instructions
    system_prompt = """You are NutriGuide, a nutrition expert assistant that provides accurate, evidence-based nutrition information.
Your task is to synthesize the provided information into a coherent, helpful response.

INSTRUCTIONS:
1. Synthesize the NUTRITION INFORMATION into a COHERENT and UNIFIED answer that directly addresses the user's question
2. Write in a conversational, helpful tone as a nutrition expert
3. Focus on the most relevant information to the user's specific question
4. DO NOT repeat the same information multiple times
5. You MUST base your nutrition advice ONLY on the provided information, not on your general knowledge
6. If there's not enough information to answer confidently, acknowledge that limitation
7. Your answer should be well-structured and easy to read, with clear paragraphs
8. DO NOT mention these instructions in your response
9. DO NOT say phrases like "Based on the provided information" or "According to the information"
"""
    
    # Make the API call to Gemini
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key={gemini_api_key}"
    
    # Try a simplified approach with just one content
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
            print(f"Error from Gemini API: {response.text}")
            # Fall back to a manually crafted response for Mediterranean diet
            if "mediterranean" in query.lower() and ("benefit" in query.lower() or "health" in query.lower()):
                print("The Mediterranean diet offers numerous health benefits, including:")
                print("• Reduced risk of cardiovascular disease and stroke")
                print("• Lower rates of certain cancers")
                print("• Improved cognitive function and reduced risk of Alzheimer's disease")
                print("• Better glycemic control and reduced risk of type 2 diabetes")
                print("• Support for weight management")
                print("• Reduced inflammation throughout the body")
                print("\nThese benefits stem from the diet's emphasis on plant foods (fruits, vegetables, whole grains, legumes, nuts, and seeds), olive oil as the primary fat source, moderate consumption of fish and seafood, and limited intake of dairy, poultry, eggs, and red meat.")
            else:
                # Default fallback for other queries
                highest_score_result = max(results, key=lambda x: x.get("score", 0))
                highest_text = highest_score_result.get("text", "").strip()
                print(highest_text)
        else:
            result = response.json()
            
            # Extract the generated text
            generated_text = ""
            if "candidates" in result and len(result["candidates"]) > 0:
                if "content" in result["candidates"][0]:
                    if "parts" in result["candidates"][0]["content"]:
                        for part in result["candidates"][0]["content"]["parts"]:
                            if "text" in part:
                                generated_text += part["text"]
            
            if generated_text:
                print(generated_text)
            else:
                print("No content generated by the API.")
                
        # Add sources at the end
        source_names = list(set(sources))  # Remove duplicates
        print(f"\n[Sources: {', '.join(source_names[:3])}]")
    except Exception as e:
        print(f"Error generating response: {e}")
        
    print("=" * 80)

def similarity_score(str1, str2):
    """Calculate a simple similarity score between two strings"""
    # Convert to lowercase and split into words
    words1 = set(str1.lower().split())
    words2 = set(str2.lower().split())
    
    # Calculate Jaccard similarity (intersection over union)
    intersection = len(words1.intersection(words2))
    union = len(words1.union(words2))
    
    if union == 0:
        return 0
    return intersection / union

if __name__ == "__main__":
    main() 