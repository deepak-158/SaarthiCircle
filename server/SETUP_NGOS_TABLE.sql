-- SQL for NGO integration
-- Run this in Supabase SQL Editor
n
-- 1. Create ngos table
CREATE TABLE IF NOT EXISTS public.ngos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ngo_name text NOT NULL,
  registration_number text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  areas_of_operation text[] DEFAULT '{}'::text[], -- cities / districts
  services_offered text[] DEFAULT '{}'::text[], -- medical, food, counselling, emergency
  verification_documents text[] DEFAULT '{}'::text[], -- URLs to documents
  status text DEFAULT 'pending'::text,
  assigned_regions text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_ngo_status CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'deactivated'::text])))
);

-- 2. Add 'ngo' and 'ngo_pending' to user roles if needed (assuming role is a text column in users)
-- No changes needed if 'role' is just text. 

-- 3. Update help_requests status constraint to include 'escalated'
-- Since we can't easily ALTER a CHECK constraint on all DBs, we'll handle it in code or re-create if needed.
-- For this setup, we'll assume we can update it.
ALTER TABLE public.help_requests DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE public.help_requests ADD CONSTRAINT check_status CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'completed'::text, 'cancelled'::text, 'escalated'::text, 'emergency'::text])));

-- 4. Enable RLS for ngos
ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for ngos
CREATE POLICY "NGOs can see own profile" ON public.ngos
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can see all NGOs" ON public.ngos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_ngos_user_id ON public.ngos(user_id);
CREATE INDEX IF NOT EXISTS idx_ngos_status ON public.ngos(status);
