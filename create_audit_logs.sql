-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- 1. Allow authenticated users to insert logs (logging their own actions)
CREATE POLICY "Allow All Authenticated Insert Logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Allow authenticated users to view logs (for history)
CREATE POLICY "Allow All Authenticated Select Logs" ON public.audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Verify
SELECT * FROM public.audit_logs LIMIT 1;
