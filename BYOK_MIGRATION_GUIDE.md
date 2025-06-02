# 🔑 BYOK System Migration Guide
## From SQLite to Supabase

This guide walks you through migrating your Bring Your Own Keys (BYOK) system from SQLite to Supabase for better scalability, security, and user management.

## 🎯 What This Migration Solves

### Previous Issues:
- ❌ API keys stored in SQLite (separate from main Supabase database)
- ❌ No proper user association for API keys
- ❌ Inconsistent user ID handling ("anonymous" vs "default" vs `None`)
- ❌ Limited scalability and concurrent access
- ❌ No proper authentication integration

### New Benefits:
- ✅ Unified Supabase database for all data
- ✅ Proper user authentication and API key association
- ✅ Row Level Security (RLS) for data protection
- ✅ Scalable PostgreSQL backend
- ✅ Real-time capabilities
- ✅ Better error handling and logging
- ✅ Production-ready architecture

## 🚀 Migration Steps

### Step 1: Run the Supabase Migration

1. **Open your Supabase Dashboard**
   - Go to your project's SQL Editor
   - Copy the contents of `backend/migrations/create_supabase_byok_tables.sql`
   - Run the migration script

2. **Verify Tables Created**
   ```sql
   -- Check if tables were created successfully
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_profiles', 'user_api_keys', 'user_settings', 'integration_credentials');
   ```

### Step 2: Update Environment Variables

Ensure your `.env` file has the correct Supabase configuration:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URL (automatically constructed from Supabase URL)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Step 3: Migrate Existing API Keys (If Any)

If you have existing API keys in SQLite, run this migration script:

```python
#!/usr/bin/env python3
"""
Migrate existing API keys from SQLite to Supabase
"""

import asyncio
import sqlite3
import logging
from backend.services.supabase_user_settings_service import supabase_user_settings_service

async def migrate_api_keys():
    """Migrate API keys from SQLite to Supabase"""
    
    # Connect to old SQLite database
    sqlite_path = "data/user_settings.db"
    
    try:
        conn = sqlite3.connect(sqlite_path)
        cursor = conn.cursor()
        
        # Get all API keys from SQLite
        cursor.execute("""
            SELECT user_id, provider_id, key_value, is_active, validation_status
            FROM user_api_keys 
            WHERE is_active = 1
        """)
        
        keys = cursor.fetchall()
        
        for user_id, provider_id, key_value, is_active, validation_status in keys:
            # Map old user IDs to new format
            if user_id == "anonymous" or user_id is None:
                new_user_id = "00000000-0000-0000-0000-000000000000"
            else:
                new_user_id = user_id
            
            # Add to Supabase
            success = await supabase_user_settings_service.add_api_key(
                new_user_id, provider_id, key_value
            )
            
            if success:
                print(f"✅ Migrated {provider_id} key for user {new_user_id}")
            else:
                print(f"❌ Failed to migrate {provider_id} key for user {new_user_id}")
        
        conn.close()
        print(f"🎉 Migration completed! Migrated {len(keys)} API keys.")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(migrate_api_keys())
```

### Step 4: Test the New System

Run the enhanced test script:

```bash
cd /path/to/your/project
python test_perplexity_inheritance.py
```

This will test:
- ✅ Supabase connection
- ✅ User settings retrieval
- ✅ API key management
- ✅ Workflow execution context
- ✅ Provider registry integration

### Step 5: Update Your Application

The migration automatically updates these components:

1. **User Settings Service** → `backend/services/supabase_user_settings_service.py`
2. **API Router** → `backend/api/routers/user_settings.py`
3. **Workflow Context** → `backend/core/workflow_execution_context.py`
4. **Database Models** → `backend/models/supabase_models.py`

## 🔧 Configuration Details

### User ID Handling

The new system handles user IDs more consistently:

```python
# Anonymous users (no authentication)
user_id = "00000000-0000-0000-0000-000000000000"

# Authenticated users (from Supabase Auth)
user_id = str(current_user["id"])  # UUID from auth.users

# System context (for system-level operations)
user_id = "system"
```

### API Key Storage

API keys are now stored with proper encryption and user association:

```sql
-- Example API key record
INSERT INTO user_api_keys (user_id, provider_id, encrypted_key, masked_value)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'perplexity',
    'encrypted_key_data',
    'pplx-****...****1234'
);
```

### Row Level Security

All tables have RLS enabled to ensure users can only access their own data:

```sql
-- Users can only see their own API keys
CREATE POLICY "Users can view their own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);
```

## 🧪 Testing Your Migration

### 1. Test API Key Management

```bash
# Test adding an API key via API
curl -X POST http://localhost:8000/api/user-settings/api-keys \
  -H "Content-Type: application/json" \
  -d '{"provider": "perplexity", "api_key": "your-key-here"}'

# Test retrieving API keys
curl http://localhost:8000/api/user-settings/api-keys
```

### 2. Test Workflow Execution

```python
from backend.core.workflow_execution_context import create_execution_context

# Test context creation
context = await create_execution_context(user_id="anonymous")
perplexity_key = context.get_api_key_for_framework("perplexity")
print(f"Perplexity key available: {perplexity_key is not None}")
```

### 3. Test Provider Registry

```python
from backend.core.provider_registry import provider_registry

# Test provider detection
provider = provider_registry.get_provider_for_model("llama-3.1-sonar-small-128k-online")
print(f"Provider for Perplexity model: {provider.name if provider else 'Not found'}")
```

## 🔒 Security Improvements

### 1. Encryption
- API keys are encrypted before storage
- Masked values shown in UI for security
- Proper key rotation support

### 2. Authentication
- Integration with Supabase Auth
- Row Level Security policies
- User-specific data isolation

### 3. Validation
- API key validation before storage
- Provider verification
- Model compatibility checks

## 📊 Monitoring and Logging

The new system includes comprehensive logging:

```python
# Example log output
2024-01-15 10:30:15 - INFO - 🔑 Loading API keys for user: anonymous
2024-01-15 10:30:15 - INFO - ✅ Loaded 2 API keys for user anonymous
2024-01-15 10:30:15 - INFO - 📋 Available providers: ['openai', 'perplexity']
```

## 🚨 Troubleshooting

### Common Issues:

1. **"No API keys found"**
   - Check if migration script ran successfully
   - Verify user ID format (should be UUID)
   - Check Supabase connection

2. **"Permission denied"**
   - Verify RLS policies are set up correctly
   - Check authentication token
   - Ensure user has proper permissions

3. **"Provider not found"**
   - Check provider registry configuration
   - Verify provider ID matches exactly
   - Update provider registry if needed

### Debug Commands:

```python
# Check Supabase connection
from backend.services.supabase_user_settings_service import supabase_user_settings_service
settings = await supabase_user_settings_service.get_user_settings("anonymous")

# Check available providers
from backend.core.provider_registry import provider_registry
providers = provider_registry.get_all_providers()
print([p.id for p in providers])

# Test execution context
from backend.core.workflow_execution_context import create_execution_context
context = await create_execution_context(user_id="anonymous")
print(context.get_context_info())
```

## 🎉 Success Indicators

After successful migration, you should see:

- ✅ All tests in `test_perplexity_inheritance.py` pass
- ✅ API keys visible in Supabase dashboard
- ✅ Workflow execution works with proper API key injection
- ✅ User authentication properly associates keys with users
- ✅ No more SQLite database dependencies

## 📞 Support

If you encounter issues during migration:

1. Check the logs for detailed error messages
2. Verify your Supabase configuration
3. Run the test script to identify specific problems
4. Check the GitHub issues for similar problems

The new BYOK system is production-ready and provides a solid foundation for scaling your AI workflow platform! 🚀 