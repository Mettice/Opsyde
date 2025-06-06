#!/usr/bin/env python3
"""Test LlamaIndex imports to identify the issue"""

print("🔍 Testing LlamaIndex imports...")

try:
    from llama_index.core import VectorStoreIndex, Document, Settings
    print("✅ Core imports successful")
except ImportError as e:
    print(f"❌ Core import error: {e}")

try:
    from llama_index.embeddings.openai import OpenAIEmbedding
    print("✅ OpenAI embeddings import successful")
except ImportError as e:
    print(f"❌ OpenAI embeddings import error: {e}")

try:
    from llama_index.llms.openai import OpenAI
    print("✅ OpenAI LLM import successful")
except ImportError as e:
    print(f"❌ OpenAI LLM import error: {e}")

try:
    from llama_index.vector_stores.faiss import FaissVectorStore
    print("✅ FAISS vector store import successful")
except ImportError as e:
    print(f"❌ FAISS vector store import error: {e}")

try:
    from llama_index.readers.web import SimpleWebPageReader
    print("✅ Web reader import successful")
except ImportError as e:
    print(f"❌ Web reader import error: {e}")

try:
    from llama_index.readers.file import PyMuPDFReader
    print("✅ PDF reader import successful")
except ImportError as e:
    print(f"❌ PDF reader import error: {e}")

print("\n🔍 Checking LlamaIndex version...")
try:
    import llama_index
    print(f"✅ LlamaIndex version: {llama_index.__version__}")
except Exception as e:
    print(f"❌ Version check error: {e}")

print("\n�� Test complete!") 