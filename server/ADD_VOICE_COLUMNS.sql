-- Run this SQL in Supabase SQL Editor to add voice support fields

-- Add columns for voice and language support
ALTER TABLE public.help_requests 
ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS has_audio boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_uri text DEFAULT NULL;

-- Create index for language if needed
CREATE INDEX IF NOT EXISTS idx_help_requests_language ON public.help_requests(language);
