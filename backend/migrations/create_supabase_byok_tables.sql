-- 🔑 Supabase BYOK (Bring Your Own Keys) Migration
-- Creates tables for user settings and API key management
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create integration_credentials table (for future use)
CREATE TABLE IF NOT EXISTS public.integration_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT integration_credentials_user_service_unique UNIQUE (user_id, service)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider_id ON public.user_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON public.user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_validation ON public.user_api_keys(validation_status);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_user_id ON public.integration_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_service ON public.integration_credentials(service);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_integration_credentials_updated_at
    BEFORE UPDATE ON public.integration_credentials
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_api_keys
CREATE POLICY "Users can view their own API keys" ON public.user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own API keys" ON public.user_api_keys
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for integration_credentials
CREATE POLICY "Users can view their own credentials" ON public.integration_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own credentials" ON public.integration_credentials
    FOR ALL USING (auth.uid() = user_id);

-- Create a function to handle new user registration
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create a view for easy API key management
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

-- Grant access to the view
GRANT SELECT ON public.user_api_keys_view TO anon, authenticated;

-- Insert default anonymous user for testing (optional)
-- This allows the system to work without authentication during development
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'anonymous@crewflow.local',
    crypt('anonymous', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create anonymous user profile
INSERT INTO public.user_profiles (user_id, username, full_name)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'anonymous',
    'Anonymous User'
) ON CONFLICT (user_id) DO NOTHING;

-- Create anonymous user settings
INSERT INTO public.user_settings (user_id, preferences, quotas)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '{"theme": "light", "language": "en", "notifications": false}',
    '{"monthly_requests": 10000, "daily_requests": 1000}'
) ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'BYOK Supabase tables created successfully! 🎉' as status; 