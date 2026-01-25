-- Run this SQL in Supabase SQL Editor to create the help_requests table
-- https://app.supabase.com/project/YOUR_PROJECT_ID/sql

-- First, drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.help_requests CASCADE;

-- Create the help_requests table
CREATE TABLE IF NOT EXISTS public.help_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id uuid NOT NULL,
  volunteer_id uuid,
  category text DEFAULT 'General'::text,
  description text DEFAULT ''::text,
  priority text DEFAULT 'medium'::text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_priority CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
  CONSTRAINT check_status CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text])))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_help_requests_senior_id ON public.help_requests(senior_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_volunteer_id ON public.help_requests(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON public.help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON public.help_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies - FIXED to allow caregivers to see ALL pending requests
CREATE POLICY "Seniors can see own requests" ON public.help_requests
  FOR SELECT USING (senior_id = auth.uid());

CREATE POLICY "Volunteers see all pending and their accepted" ON public.help_requests
  FOR SELECT USING (status = 'pending'::text OR volunteer_id = auth.uid());

CREATE POLICY "Anyone can insert" ON public.help_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Volunteers can update their accepted requests" ON public.help_requests
  FOR UPDATE USING (volunteer_id = auth.uid() OR status = 'pending'::text);
