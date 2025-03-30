#!/usr/bin/env python3
"""
Environment Variables Loader

Utility to load environment variables for the nutrition knowledge base embedder.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def load_environment():
    """Load environment variables from .env file
    
    Returns:
        bool: True if environment loaded successfully, False otherwise
    """
    # Find .env file in current directory or parent directories
    env_path = Path('.env')
    if not env_path.exists():
        # Try looking in parent directory
        env_path = Path('../.env')
        if not env_path.exists():
            print("No .env file found! Please create one based on .env.example")
            return False
    
    # Load environment variables
    load_dotenv(dotenv_path=env_path)
    
    # Check required variables
    required_vars = ['QDRANT_URL', 'QDRANT_API_KEY', 'GEMINI_API_KEY']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Missing environment variables: {', '.join(missing_vars)}")
        print("Please add them to your .env file")
        return False
        
    return True
    
if __name__ == "__main__":
    # If run directly, print status of environment variables
    if load_environment():
        print("Environment variables loaded successfully!")
        
        # Print current settings
        print("\nCurrent configuration:")
        print(f"QDRANT_URL: {os.getenv('QDRANT_URL')}")
        print(f"COLLECTION_NAME: {os.getenv('COLLECTION_NAME', 'nutrition_knowledge')}")
        
        # Don't print API keys for security
        print("QDRANT_API_KEY: [configured]" if os.getenv('QDRANT_API_KEY') else "QDRANT_API_KEY: [missing]")
        print("GEMINI_API_KEY: [configured]" if os.getenv('GEMINI_API_KEY') else "GEMINI_API_KEY: [missing]")
    else:
        sys.exit(1) 