-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- '5S_CARD', 'A3_PROJECT', etc.
    entity_id TEXT, -- Can be UUID or string depending on entity
    details JSONB, -- Stores visual snapshot or diff
    user_email TEXT -- Optional, for easier display
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert logs
CREATE POLICY "Users can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Authenticated users can view logs (or restrict to admins if needed)
CREATE POLICY "Users can view audit logs" 
ON public.audit_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
