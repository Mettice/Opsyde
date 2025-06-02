#!/usr/bin/env python3
"""
🔧 Create Supabase Tables for BYOK System
This script creates the necessary tables in Supabase for the BYOK (Bring Your Own Keys) system
"""

import logging
import os
import sys
from dotenv import load_dotenv

# Load environment variables from backend directory
load_dotenv(dotenv_path='backend/.env')

# Add the backend directory to the Python path
sys.path.append('backend')

from backend.database import init_db, engine
from backend.models.supabase_models import Base

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all tables in Supabase"""
    try:
        logger.info("🔧 Creating Supabase tables for BYOK system...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Successfully created Supabase tables:")
        logger.info("   - profiles (user profiles)")
        logger.info("   - user_api_keys (encrypted API keys)")
        logger.info("   - user_settings (user preferences and quotas)")
        logger.info("   - integration_credentials (webhook/integration credentials)")
        
        # Verify tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        expected_tables = ['profiles', 'user_api_keys', 'user_settings', 'integration_credentials']
        for table in expected_tables:
            if table in tables:
                logger.info(f"✅ Table '{table}' exists")
            else:
                logger.warning(f"⚠️ Table '{table}' not found")
        
        logger.info("🎉 Supabase table creation completed!")
        
    except Exception as e:
        logger.error(f"❌ Failed to create Supabase tables: {str(e)}")
        raise

if __name__ == "__main__":
    create_tables() 