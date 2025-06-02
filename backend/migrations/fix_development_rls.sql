-- Fix RLS for development environment
-- This allows the backend to manage API keys for the development user

-- Add a policy that allows backend operations for the development user
CREATE POLICY "Allow backend operations for development user" ON public.user_api_keys
    FOR ALL 
    USING (user_id = 'f31db8d3-7b54-46b5-bebf-1ea7b6b2edff'::uuid);

-- Also ensure the development user exists in auth.users
DO $$
DECLARE
    dev_user_id UUID := 'f31db8d3-7b54-46b5-bebf-1ea7b6b2edff'::uuid;
BEGIN
    -- Insert the development user if it doesn't exist
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_user_meta_data
    ) VALUES (
        dev_user_id,
        'dev@crewflow.local',
        crypt('development', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"username": "development", "full_name": "Development User"}'::jsonb
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Ensure profile exists
    INSERT INTO public.user_profiles (user_id, username, full_name)
    VALUES (dev_user_id, 'development', 'Development User')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Ensure settings exist
    INSERT INTO public.user_settings (user_id, preferences, quotas)
    VALUES (
        dev_user_id,
        '{"theme": "light", "language": "en", "notifications": true}',
        '{"monthly_requests": 10000, "daily_requests": 1000}'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
END $$; 