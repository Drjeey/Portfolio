#!/usr/bin/env python3
"""
Enhanced Nutrition Knowledge Base Search

This script tests searching the Qdrant nutrition database using a more
sophisticated RAG approach with metadata-guided retrieval and query expansion.
"""

import os
import json
import requests
import argparse
import time
from typing import List, Dict, Any
# Import our environment loader
from load_env import load_environment

class EnhancedNutritionSearcher:
    def __init__(self):
        """Initialize with configuration from environment variables"""
        # Load environment variables
        if not load_environment():
            print("Failed to load environment variables")
            raise ValueError("Failed to load environment variables")
        
        # Configuration from environment variables
        self.config = {
            "qdrant_url": os.environ.get("QDRANT_URL", ""),
            "qdrant_api_key": os.environ.get("QDRANT_API_KEY", ""),
            "gemini_api_key": os.environ.get("GEMINI_API_KEY", ""),
            "collection_name": os.environ.get("COLLECTION_NAME", "nutrition_knowledge"),
            "nutrition_data_path": os.environ.get("NUTRITION_DATA_PATH", "../Nutrition_data"),
            "metadata_file": os.environ.get("METADATA_FILE", "nutrition_topics.json")
        }
            
        # Validate configuration
        required_keys = ["qdrant_url", "qdrant_api_key", "gemini_api_key"]
        missing_keys = [key for key in required_keys if not self.config.get(key)]
        
        if missing_keys:
            raise ValueError(f"Missing required configuration: {', '.join(missing_keys)}")
            
        # Load nutrition metadata for topic-based search
        self.metadata_file_path = os.path.join(
            self.config["nutrition_data_path"], 
            self.config["metadata_file"]
        )
        
        if os.path.exists(self.metadata_file_path):
            try:
                with open(self.metadata_file_path, "r", encoding='utf-8') as f:
                    self.nutrition_metadata = json.load(f)
                print(f"Loaded metadata for {len(self.nutrition_metadata['articles'])} articles")
            except Exception as e:
                print(f"Error loading metadata: {e}")
                self.nutrition_metadata = {"articles": []}
        else:
            print(f"Warning: Metadata file not found: {self.metadata_file_path}")
            self.nutrition_metadata = {"articles": []}

    def get_embedding(self, text: str) -> List[float]:
        """Get embedding vector from Gemini API
        
        Args:
            text: The text to embed
            
        Returns:
            List[float]: Embedding vector
        """
        url = f"https://generativelanguage.googleapis.com/v1/models/embedding-001:embedContent?key={self.config['gemini_api_key']}"
        
        payload = {
            "model": "models/embedding-001",
            "content": {
                "parts": [
                    {"text": text}
                ]
            }
        }
        
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

    def expand_query(self, query: str) -> List[str]:
        """Expand a query into multiple related queries
        
        Args:
            query: The original query
            
        Returns:
            List[str]: List of expanded queries
        """
        expanded_queries = [query]
        
        # Add variations based on common diet terms
        diet_terms = ["Mediterranean", "DASH", "keto", "ketogenic", "plant-based", 
                     "vegan", "paleo", "intermittent fasting"]
        health_terms = ["benefits", "effects", "health impact", "advantages", 
                       "nutrition", "nutrients", "healthy", "heart health"]
        
        # Check if query mentions a specific diet
        for diet in diet_terms:
            if diet.lower() in query.lower():
                # Add variations for this diet
                for health_term in health_terms:
                    if health_term not in query.lower():
                        expanded_queries.append(f"{diet} diet {health_term}")
                
                # Add specific health conditions for this diet
                if "Mediterranean" in diet:
                    expanded_queries.append(f"{diet} diet heart health")
                    expanded_queries.append(f"{diet} diet and longevity")
                elif "keto" in diet.lower():
                    expanded_queries.append(f"{diet} diet weight loss")
                    expanded_queries.append(f"{diet} diet epilepsy")
                elif "DASH" in diet:
                    expanded_queries.append(f"{diet} diet blood pressure")
                elif "plant" in diet.lower() or "vegan" in diet.lower():
                    expanded_queries.append(f"{diet} protein sources")
                    expanded_queries.append(f"{diet} nutritional considerations")
        
        # Filter out duplicates and keep a reasonable number of queries
        unique_queries = list(set(expanded_queries))
        return unique_queries[:5]  # Limit to 5 queries

    def find_relevant_articles(self, query: str) -> List[Dict]:
        """Find relevant articles based on metadata
        
        Args:
            query: The search query
            
        Returns:
            List[Dict]: List of relevant articles with scores
        """
        if not self.nutrition_metadata["articles"]:
            return []
            
        query_lower = query.lower()
        scored_articles = []
        
        for article in self.nutrition_metadata["articles"]:
            score = 0
            # Score based on title match
            if article.get("title", "").lower() in query_lower:
                score += 5
            elif any(word in article.get("title", "").lower() for word in query_lower.split()):
                score += 2
                
            # Score based on topics match
            for topic in article.get("topics", []):
                if topic.lower() in query_lower:
                    score += 3
                elif any(word in topic.lower() for word in query_lower.split()):
                    score += 1
            
            if score > 0:
                scored_articles.append({
                    "score": score,
                    "article": article
                })
        
        # Sort by score
        scored_articles.sort(key=lambda x: x["score"], reverse=True)
        return scored_articles

    def search(self, query: str, limit: int = 5, use_metadata: bool = True) -> List[Dict]:
        """Enhanced search for nutrition information
        
        Args:
            query: The search query
            limit: Maximum number of results to return
            use_metadata: Whether to use metadata-guided search
            
        Returns:
            List[Dict]: List of matching documents with scores
        """
        print(f"Searching for: {query}")
        
        # Step 1: Expand the query
        expanded_queries = self.expand_query(query)
        print(f"Expanded to {len(expanded_queries)} queries: {expanded_queries}")
        
        # Step 2: Metadata-based article selection
        if use_metadata:
            relevant_articles = self.find_relevant_articles(query)
            if relevant_articles:
                article_names = [a["article"]["filename"] for a in relevant_articles[:3]]
                print(f"Metadata suggests relevant articles: {article_names}")
        else:
            relevant_articles = []
            
        # Step 3: Vector search for each expanded query
        all_results = []
        
        # Try direct search with no filter first
        query_embedding = self.get_embedding(query)
        if query_embedding:
            print(f"DEBUG: Query embedding size: {len(query_embedding)}")
            print(f"DEBUG: First 5 values: {query_embedding[:5]}")
            
            # Simple payload with no filters to debug
            basic_payload = {
                "vector": query_embedding,
                "limit": limit * 3,
                "with_payload": True,
                "with_vectors": False,
                "score_threshold": 0.0  # No threshold to see if we get ANY results
            }
            
            # Search in Qdrant
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config["qdrant_api_key"]
            }
            
            try:
                response = requests.post(
                    f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}/points/search",
                    headers=headers,
                    json=basic_payload
                )
                
                if response.status_code != 200:
                    print(f"Error searching: {response.text}")
                else:
                    results = response.json()
                    
                    if "result" in results:
                        result_count = len(results["result"])
                        print(f"DEBUG: Basic search with no threshold found {result_count} results")
                        
                        if result_count > 0:
                            print(f"DEBUG: First result score: {results['result'][0]['score']}")
                        else:
                            print("DEBUG: Collection might be empty or vectors might be incompatible")
                    else:
                        print(f"DEBUG: Unexpected response format: {results}")
            except Exception as e:
                print(f"DEBUG: Error in basic search: {e}")
        
        # Try getting collection info to verify it has points
        try:
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config["qdrant_api_key"]
            }
            
            response = requests.get(
                f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}",
                headers=headers
            )
            
            if response.status_code == 200:
                collection_info = response.json()
                print(f"DEBUG: Collection info: {collection_info}")
                if "result" in collection_info and "vectors_count" in collection_info["result"]:
                    print(f"DEBUG: Collection has {collection_info['result']['vectors_count']} vectors")
                    print(f"DEBUG: Vector size: {collection_info['result']['config']['params']['vectors']['size']}")
            else:
                print(f"DEBUG: Error getting collection info: {response.text}")
        except Exception as e:
            print(f"DEBUG: Error checking collection info: {e}")
        
        # Continue with expanded queries as before
        for expanded_query in expanded_queries:
            # Get embedding for query
            query_embedding = self.get_embedding(expanded_query)
            
            if not query_embedding:
                print(f"Failed to get embedding for query: {expanded_query}")
                continue
            
            # Build search payload
            payload = {
                "vector": query_embedding,
                "limit": limit * 3,  # Get more results for filtering
                "with_payload": True,
                "with_vectors": False,
                "score_threshold": 0.1  # Extreme low threshold to ensure we get results
            }
            
            # Add filter if we have relevant articles
            if use_metadata and relevant_articles:
                # Add a filter to prioritize the relevant articles
                top_articles = [a["article"]["filename"] for a in relevant_articles[:3]]
                payload["filter"] = {
                    "should": [
                        {"key": "payload.filename", "match": {"value": filename}}
                        for filename in top_articles
                    ]
                }
            
            # Search in Qdrant
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config["qdrant_api_key"]
            }
            
            try:
                response = requests.post(
                    f"{self.config['qdrant_url']}/collections/{self.config['collection_name']}/points/search",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code != 200:
                    print(f"Error searching: {response.text}")
                    continue
                
                results = response.json()
                
                if "result" in results:
                    result_count = len(results["result"])
                    if result_count > 0:
                        print(f"Query '{expanded_query}' found {result_count} results with score threshold {payload['score_threshold']}")
                    else:
                        print(f"Query '{expanded_query}' found no results above threshold {payload['score_threshold']}")
                    
                    # Format results
                    for hit in results["result"]:
                        # Add to results list with query that found it
                        result = {
                            "score": hit["score"],
                            "title": hit["payload"]["title"],
                            "filename": hit["payload"]["filename"],
                            "topics": hit["payload"]["topics"],
                            "text": hit["payload"]["text"],
                            "chunk_index": hit["payload"]["chunk_index"],
                            "found_by_query": expanded_query
                        }
                        all_results.append(result)
                        
            except Exception as e:
                print(f"Error searching with query '{expanded_query}': {e}")
        
        # Step 4: Re-rank and deduplicate results
        # First deduplicate by chunk_index and filename
        seen_chunks = set()
        unique_results = []
        
        for result in all_results:
            chunk_id = f"{result['filename']}:{result['chunk_index']}"
            if chunk_id not in seen_chunks:
                seen_chunks.add(chunk_id)
                unique_results.append(result)
        
        # Boost score for results from metadata-suggested articles
        if use_metadata and relevant_articles:
            for result in unique_results:
                for article_info in relevant_articles:
                    if result["filename"] == article_info["article"]["filename"]:
                        # Boost score based on metadata relevance
                        result["score"] = result["score"] * (1 + article_info["score"] * 0.05)
                        break
        
        # Sort by boosted score
        unique_results.sort(key=lambda x: x["score"], reverse=True)
        
        if not unique_results:
            print("No results found after all query expansions")
            print("Potential issues:")
            print("1. The collection might not contain relevant information about this topic")
            print("2. The embeddings might not match well with the query semantics")
            print("3. You might need to re-embed with larger chunks or more content")
        else:
            print(f"Found {len(unique_results)} unique results after deduplication")
        
        # Return top results
        return unique_results[:limit]

    def print_results(self, results: List[Dict]):
        """Print search results in a readable format"""
        if not results:
            print("No results found")
            return
            
        print(f"\nFound {len(results)} results:\n")
        
        for i, result in enumerate(results):
            print(f"Result {i+1} (Score: {result['score']:.4f})")
            print(f"Title: {result['title']}")
            print(f"Source: {result['filename']} (Chunk {result['chunk_index']})")
            print(f"Topics: {', '.join(result['topics'])}")
            if "found_by_query" in result:
                print(f"Found by query: {result['found_by_query']}")
            print("\nExcerpt:")
            
            # Print just the first and last paragraph of the text for brevity
            paragraphs = result['text'].split('\n\n')
            if len(paragraphs) > 2:
                print(f"{paragraphs[0]}\n\n[...]\n\n{paragraphs[-1]}")
            else:
                print(result['text'])
                
            print("\n" + "-" * 80 + "\n")
            
    def synthesize_answer(self, query: str, results: List[Dict]) -> str:
        """Synthesize a coherent answer from search results
        
        NOTE: This is a placeholder function. In a production environment,
        you would use an LLM to synthesize the results into a coherent answer.
        
        Args:
            query: The original query
            results: The search results
            
        Returns:
            str: A synthesized answer
        """
        if not results:
            return "I don't have enough information to answer that question."
            
        # In a real implementation, you would use an LLM here
        answer = f"Here's what I found about '{query}':\n\n"
        
        # Extract relevant information from top results
        for i, result in enumerate(results[:3]):
            answer += f"From {result['title']}:\n"
            
            # Get first paragraph as summary
            paragraphs = result['text'].split('\n\n')
            first_para = paragraphs[0].strip()
            
            # Add text snippet
            if len(first_para) > 200:
                answer += f"{first_para[:200]}...\n\n"
            else:
                answer += f"{first_para}\n\n"
        
        answer += "This information is based on nutrition articles about "
        answer += ", ".join([r["title"] for r in results[:3]])
        
        return answer

def main():
    """Parse command line arguments and run search"""
    parser = argparse.ArgumentParser(description="Search nutrition knowledge base")
    parser.add_argument("--query", type=str, help="Search query (if not provided, interactive mode is used)")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of results")
    parser.add_argument("--no-metadata", action="store_true", help="Disable metadata-guided search")
    parser.add_argument("--synthesize", action="store_true", help="Synthesize an answer from results")
    parser.add_argument("--simple", action="store_true", help="Use simple direct search without complex logic")
    args = parser.parse_args()
    
    try:
        searcher = EnhancedNutritionSearcher()
        
        if args.query:
            # Single query mode
            start_time = time.time()
            
            # Option for simple direct search without complex logic
            if args.simple:
                print("Using simple direct search...")
                # Get embedding for query
                query_embedding = searcher.get_embedding(args.query)
                
                if not query_embedding:
                    print("Failed to get embedding for query")
                    return 1
                
                # Build basic search payload with no threshold
                payload = {
                    "vector": query_embedding,
                    "limit": args.limit,
                    "with_payload": True,
                    "with_vectors": False,
                    "score_threshold": 0.0  # No threshold at all
                }
                
                # Search in Qdrant
                headers = {
                    "Content-Type": "application/json",
                    "api-key": searcher.config["qdrant_api_key"]
                }
                
                try:
                    response = requests.post(
                        f"{searcher.config['qdrant_url']}/collections/{searcher.config['collection_name']}/points/search",
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code != 200:
                        print(f"Error searching: {response.text}")
                        return 1
                    
                    results = response.json()
                    
                    if "result" in results:
                        hits = results["result"]
                        print(f"Simple search found {len(hits)} results")
                        
                        # Format results
                        formatted_results = []
                        for hit in hits:
                            formatted_results.append({
                                "score": hit["score"],
                                "title": hit["payload"]["title"],
                                "filename": hit["payload"]["filename"],
                                "topics": hit["payload"]["topics"],
                                "text": hit["payload"]["text"],
                                "chunk_index": hit["payload"]["chunk_index"],
                                "found_by_query": args.query
                            })
                        
                        results = formatted_results
                    else:
                        print(f"Unexpected response format: {results}")
                        return 1
                        
                except Exception as e:
                    print(f"Error searching: {e}")
                    return 1
            else:
                # Use the enhanced search
                results = searcher.search(args.query, args.limit, not args.no_metadata)
            
            duration = time.time() - start_time
            
            print(f"Search completed in {duration:.2f} seconds")
            if not results:
                print("No results found. Try running with --simple to bypass complex search logic.")
                print("Make sure you've run nutrition_embedder.py first to create the embeddings.")
            else:
                searcher.print_results(results)
            
            if args.synthesize and results:
                print("\nSynthesized Answer:")
                print("-" * 40)
                answer = searcher.synthesize_answer(args.query, results)
                print(answer)
                print("-" * 40)
        else:
            # Interactive mode
            print("Enhanced Nutrition Knowledge Base Search")
            print("Enter 'exit' or 'quit' to end the session")
            
            while True:
                query = input("\nEnter your query: ")
                
                if query.lower() in ["exit", "quit"]:
                    break
                    
                if not query.strip():
                    continue
                    
                start_time = time.time()
                results = searcher.search(query, args.limit, not args.no_metadata)
                duration = time.time() - start_time
                
                print(f"Search completed in {duration:.2f} seconds")
                searcher.print_results(results)
                
                if args.synthesize and results:
                    print("\nSynthesized Answer:")
                    print("-" * 40)
                    answer = searcher.synthesize_answer(query, results)
                    print(answer)
                    print("-" * 40)
                
    except Exception as e:
        print(f"Error: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    main() 