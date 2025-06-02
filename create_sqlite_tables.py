#!/usr/bin/env python3
"""
🔧 SQLite Table Creation Script
Creates the necessary tables for the BYOK system in SQLite for local testing
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database import engine, Base, init_db
from backend.models.supabase_models import UserProfile, UserAPIKeyDB, UserSettingsDB, IntegrationCredentialDB
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all tables in SQLite database"""
    try:
        logger.info("🔧 Creating SQLite tables for BYOK system...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Successfully created SQLite tables:")
        logger.info("   - profiles (UserProfile)")
        logger.info("   - user_api_keys (UserAPIKeyDB)")
        logger.info("   - user_settings (UserSettingsDB)")
        logger.info("   - integration_credentials (IntegrationCredentialDB)")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        logger.info(f"📋 Available tables: {tables}")
        
        if len(tables) >= 4:
            logger.info("🎉 All tables created successfully!")
            return True
        else:
            logger.error("❌ Some tables may not have been created")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_tables()
    if success:
        print("\n🎉 SQLite tables created successfully!")
        print("You can now run the test script: python test_perplexity_inheritance.py")
    else:
        print("\n❌ Failed to create tables. Check the logs above.")
        sys.exit(1) 