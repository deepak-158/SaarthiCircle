#!/bin/bash
# Database Setup Script for SaarthiCircle

# SQL to create the help_requests table
# Run this in Supabase SQL Editor: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql

CREATE_TABLE_SQL='
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT DEFAULT "General",
  description TEXT DEFAULT "",
  priority TEXT DEFAULT "medium" CHECK (priority IN ("low", "medium", "high")),
  status TEXT DEFAULT "pending" CHECK (status IN ("pending", "accepted", "completed", "cancelled")),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_help_requests_senior_id ON help_requests(senior_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_volunteer_id ON help_requests(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at DESC);

-- Create unique constraint for pending requests per senior (only one pending at a time)
ALTER TABLE help_requests ADD CONSTRAINT help_requests_unique_pending 
UNIQUE (senior_id) WHERE status = "pending";

-- Enable Row Level Security (RLS)
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Seniors can see their own requests
CREATE POLICY senior_see_own_requests ON help_requests
  FOR SELECT USING (senior_id = auth.uid());

-- Volunteers can see pending requests and their accepted requests
CREATE POLICY volunteer_see_pending_requests ON help_requests
  FOR SELECT USING (
    status = "pending" OR volunteer_id = auth.uid()
  );

-- Admins can see all requests
CREATE POLICY admin_see_all_requests ON help_requests
  FOR SELECT USING (true);

-- Seniors can create requests
CREATE POLICY senior_create_requests ON help_requests
  FOR INSERT WITH CHECK (senior_id = auth.uid());

-- Volunteers can update requests they are assigned to
CREATE POLICY volunteer_update_requests ON help_requests
  FOR UPDATE USING (volunteer_id = auth.uid());
'

echo "=== SaarthiCircle Database Setup ==="
echo ""
echo "To set up the database, follow these steps:"
echo ""
echo "1. Go to: https://app.supabase.com"
echo "2. Select your project"
echo "3. Go to SQL Editor"
echo "4. Click 'New Query'"
echo "5. Copy and paste the SQL below:"
echo ""
echo "================================"
echo "$CREATE_TABLE_SQL"
echo "================================"
echo ""
echo "6. Click 'Run'"
echo "7. Verify the table was created by checking the 'Tables' section in the Database menu"
echo ""
echo "After setup, restart your backend server and the /help-requests endpoint should work!"
