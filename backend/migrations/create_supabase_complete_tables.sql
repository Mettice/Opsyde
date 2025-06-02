-- 🚀 Complete Supabase Migration for CrewFlow
-- Creates all necessary tables for the full system functionality
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== USER MANAGEMENT =====

-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    masked_value TEXT NOT NULL,
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'expired')),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one key per provider per user
    CONSTRAINT user_api_keys_user_provider_unique UNIQUE (user_id, provider_id)
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{}',
    quotas JSONB DEFAULT '{}',
    monthly_usage JSONB DEFAULT '{}',
    usage_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_settings_user_id_unique UNIQUE (user_id)
);

-- ===== WORKFLOW MANAGEMENT =====

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    config JSONB DEFAULT '{}',
    inputs JSONB DEFAULT '{}',
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    tags TEXT[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_id TEXT,
    execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'scheduled', 'webhook', 'api')),
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    error_message TEXT,
    node_count INTEGER DEFAULT 0,
    completed_nodes INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create node_executions table
CREATE TABLE IF NOT EXISTS public.node_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    inputs JSONB DEFAULT '{}',
    outputs JSONB DEFAULT '{}',
    error_message TEXT,
    execution_time_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== TRIGGER MANAGEMENT =====

-- Create triggers table
CREATE TABLE IF NOT EXISTS public.triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id TEXT UNIQUE NOT NULL, -- The user-defined trigger ID
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'api_polling', 'file_monitor', 'email')),
    config JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
    execution_count INTEGER DEFAULT 0,
    last_executed TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    webhook_secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger_executions table
CREATE TABLE IF NOT EXISTS public.trigger_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID REFERENCES public.triggers(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
    trigger_data JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== DATA STATE MANAGEMENT =====

-- Create data_states table (for trigger monitoring)
CREATE TABLE IF NOT EXISTS public.data_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id TEXT NOT NULL,
    data_hash TEXT,
    last_value TEXT,
    last_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT data_states_trigger_unique UNIQUE (trigger_id)
);

-- Create processed_records table (for incremental processing)
CREATE TABLE IF NOT EXISTS public.processed_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_hash TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT processed_records_trigger_record_unique UNIQUE (trigger_id, record_id)
);

-- ===== INTEGRATION CREDENTIALS =====

-- Create integration_credentials table
CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    masked_value TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT integration_credentials_user_service_unique UNIQUE (user_id, service)
);

-- ===== USAGE TRACKING =====

-- Create api_usage table
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0,
    request_type TEXT DEFAULT 'completion',
    execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_quotas table
CREATE TABLE IF NOT EXISTS public.usage_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quota_type TEXT NOT NULL CHECK (quota_type IN ('monthly_tokens', 'daily_requests', 'concurrent_workflows')),
    quota_limit INTEGER NOT NULL,
    quota_used INTEGER DEFAULT 0,
    reset_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT usage_quotas_user_type_unique UNIQUE (user_id, quota_type)
);

-- ===== SHARED WORKFLOWS & TEMPLATES =====

-- Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    config JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id ON public.user_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON public.user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON public.workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON public.workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON public.node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_node_id ON public.node_executions(node_id);

-- Trigger indexes
CREATE INDEX IF NOT EXISTS idx_triggers_trigger_id ON public.triggers(trigger_id);
CREATE INDEX IF NOT EXISTS idx_triggers_user_id ON public.triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_triggers_workflow_id ON public.triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON public.triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_triggers_status ON public.triggers(status);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger_id ON public.trigger_executions(trigger_id);

-- Data state indexes
CREATE INDEX IF NOT EXISTS idx_data_states_trigger_id ON public.data_states(trigger_id);
CREATE INDEX IF NOT EXISTS idx_processed_records_trigger_id ON public.processed_records(trigger_id);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider_id ON public.api_usage(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_quotas_user_id ON public.usage_quotas(user_id);

-- ===== UPDATED_AT TRIGGERS =====

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_triggers_updated_at
    BEFORE UPDATE ON public.triggers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_data_states_updated_at
    BEFORE UPDATE ON public.data_states
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_integration_credentials_updated_at
    BEFORE UPDATE ON public.integration_credentials
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_usage_quotas_updated_at
    BEFORE UPDATE ON public.usage_quotas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_workflow_templates_updated_at
    BEFORE UPDATE ON public.workflow_templates
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trigger_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- User management policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON public.user_api_keys
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Workflow policies
CREATE POLICY "Users can manage their own workflows" ON public.workflows
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows" ON public.workflows
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own executions" ON public.workflow_executions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own node executions" ON public.node_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workflow_executions we 
            WHERE we.id = execution_id AND we.user_id = auth.uid()
        )
    );

-- Trigger policies
CREATE POLICY "Users can manage their own triggers" ON public.triggers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trigger executions" ON public.trigger_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.triggers t 
            WHERE t.id = trigger_id AND t.user_id = auth.uid()
        )
    );

-- Data state policies (allow system access)
CREATE POLICY "System can manage data states" ON public.data_states
    FOR ALL USING (true);

CREATE POLICY "System can manage processed records" ON public.processed_records
    FOR ALL USING (true);

-- Integration and usage policies
CREATE POLICY "Users can manage their own credentials" ON public.integration_credentials
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quotas" ON public.usage_quotas
    FOR ALL USING (auth.uid() = user_id);

-- Template policies
CREATE POLICY "Everyone can view templates" ON public.workflow_templates
    FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON public.workflow_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON public.workflow_templates
    FOR UPDATE USING (auth.uid() = created_by);

-- ===== HELPER FUNCTIONS =====

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, username, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'full_name'
    );
    
    INSERT INTO public.user_settings (user_id, preferences, quotas)
    VALUES (
        NEW.id,
        '{"theme": "light", "language": "en", "notifications": true}',
        '{"monthly_requests": 1000, "daily_requests": 100}'
    );
    
    -- Initialize default quotas
    INSERT INTO public.usage_quotas (user_id, quota_type, quota_limit)
    VALUES 
        (NEW.id, 'monthly_tokens', 100000),
        (NEW.id, 'daily_requests', 1000),
        (NEW.id, 'concurrent_workflows', 5);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create anonymous user for development
CREATE OR REPLACE FUNCTION public.create_anonymous_user()
RETURNS UUID AS $$
DECLARE
    anonymous_id UUID;
BEGIN
    -- Check if anonymous user already exists
    SELECT id INTO anonymous_id FROM auth.users WHERE email = 'anonymous@crewflow.dev';
    
    IF anonymous_id IS NULL THEN
        -- Create anonymous user
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_user_meta_data
        ) VALUES (
            gen_random_uuid(),
            'anonymous@crewflow.dev',
            crypt('anonymous', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"username": "anonymous", "full_name": "Anonymous User"}'::jsonb
        ) RETURNING id INTO anonymous_id;
    END IF;
    
    RETURN anonymous_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get anonymous user ID
CREATE OR REPLACE FUNCTION public.get_anonymous_user_id()
RETURNS UUID AS $$
DECLARE
    anonymous_id UUID;
BEGIN
    -- Try to find existing anonymous user
    SELECT id INTO anonymous_id FROM auth.users WHERE email = 'anonymous@crewflow.dev';
    
    -- If not found, create one
    IF anonymous_id IS NULL THEN
        anonymous_id := public.create_anonymous_user();
    END IF;
    
    RETURN anonymous_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure anonymous user profile exists
CREATE OR REPLACE FUNCTION public.ensure_anonymous_profile()
RETURNS UUID AS $$
DECLARE
    anonymous_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Get or create anonymous user
    anonymous_id := public.get_anonymous_user_id();
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = anonymous_id) INTO profile_exists;
    
    -- Create profile if it doesn't exist
    IF NOT profile_exists THEN
        INSERT INTO public.user_profiles (user_id, username, full_name)
        VALUES (anonymous_id, 'anonymous', 'Anonymous User')
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Also create settings
        INSERT INTO public.user_settings (user_id, preferences, quotas)
        VALUES (
            anonymous_id,
            '{"theme": "light", "language": "en", "notifications": true}',
            '{"monthly_requests": 1000, "daily_requests": 100}'
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Initialize default quotas
        INSERT INTO public.usage_quotas (user_id, quota_type, quota_limit)
        VALUES 
            (anonymous_id, 'monthly_tokens', 100000),
            (anonymous_id, 'daily_requests', 1000),
            (anonymous_id, 'concurrent_workflows', 5)
        ON CONFLICT (user_id, quota_type) DO NOTHING;
    END IF;
    
    RETURN anonymous_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== VIEWS FOR EASY ACCESS =====

-- User API keys view
CREATE OR REPLACE VIEW public.user_api_keys_view AS
SELECT 
    k.id,
    k.user_id,
    k.provider_id,
    k.masked_value,
    k.validation_status,
    k.is_active,
    k.usage_count,
    k.last_used,
    k.created_at,
    k.updated_at,
    p.username as user_username
FROM public.user_api_keys k
LEFT JOIN public.user_profiles p ON k.user_id = p.user_id
WHERE k.is_active = true;

-- Workflow execution summary view
CREATE OR REPLACE VIEW public.workflow_execution_summary AS
SELECT 
    we.id,
    we.workflow_id,
    w.name as workflow_name,
    we.user_id,
    p.username,
    we.status,
    we.execution_type,
    we.node_count,
    we.completed_nodes,
    we.execution_time_ms,
    we.started_at,
    we.completed_at,
    CASE 
        WHEN we.completed_nodes = we.node_count THEN 100.0
        ELSE (we.completed_nodes::float / NULLIF(we.node_count, 0)) * 100.0
    END as completion_percentage
FROM public.workflow_executions we
LEFT JOIN public.workflows w ON we.workflow_id = w.id
LEFT JOIN public.user_profiles p ON we.user_id = p.user_id;

-- ===== PERMISSIONS =====

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant access to views
GRANT SELECT ON public.user_api_keys_view TO anon, authenticated;
GRANT SELECT ON public.workflow_execution_summary TO anon, authenticated;

-- ===== INITIALIZE ANONYMOUS USER =====

-- Create anonymous user for development (comment out for production)
SELECT public.create_anonymous_user();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'NodesFlow Supabase migration completed successfully!';
    RAISE NOTICE 'Created tables: user_profiles, user_api_keys, user_settings, workflows, workflow_executions, node_executions, triggers, trigger_executions, data_states, processed_records, integration_credentials, api_usage, usage_quotas, workflow_templates';
    RAISE NOTICE 'Anonymous user created for development';
END $$; 