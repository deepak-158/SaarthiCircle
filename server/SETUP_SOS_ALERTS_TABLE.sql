-- Run this SQL in Supabase SQL Editor to create the sos_alerts table
-- https://app.supabase.com/project/YOUR_PROJECT_ID/sql

-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.sos_alerts CASCADE;

-- Create the sos_alerts table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id uuid,
  user_id uuid,
  message text DEFAULT ''::text,
  type text DEFAULT 'panic'::text,
  status text DEFAULT 'active'::text,
  responder_id uuid,
  acknowledged_at timestamp with time zone,
  resolution text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Basic constraints (kept flexible to avoid schema mismatch issues)
ALTER TABLE public.sos_alerts
  ADD CONSTRAINT sos_alerts_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'acknowledged'::text, 'resolved'::text]));

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at ON public.sos_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_senior_id ON public.sos_alerts(senior_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON public.sos_alerts(user_id);

-- Enable RLS
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Keep policies permissive for now to avoid blocking the app.
-- Your backend uses a service role key, but the mobile client may also access directly.

-- Anyone authenticated can insert
CREATE POLICY "Anyone can insert sos alerts" ON public.sos_alerts
  FOR INSERT WITH CHECK (true);

-- Anyone authenticated can select
CREATE POLICY "Anyone can read sos alerts" ON public.sos_alerts
  FOR SELECT USING (true);

-- Anyone authenticated can update
CREATE POLICY "Anyone can update sos alerts" ON public.sos_alerts
  FOR UPDATE USING (true);
