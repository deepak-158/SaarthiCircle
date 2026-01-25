-- Run this SQL in Supabase SQL Editor to set up conversations table
-- https://app.supabase.com/project/YOUR_PROJECT_ID/sql

-- Drop table if exists to start fresh
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id uuid NOT NULL,
  companion_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone,
  ended_at timestamp with time zone,
  status text DEFAULT 'active'::text
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_senior_id ON public.conversations(senior_id);
CREATE INDEX IF NOT EXISTS idx_conversations_companion_id ON public.conversations(companion_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Seniors can see their conversations" ON public.conversations
  FOR SELECT USING (senior_id = auth.uid());

CREATE POLICY "Companions can see conversations they are part of" ON public.conversations
  FOR SELECT USING (companion_id = auth.uid());

CREATE POLICY "Anyone authenticated can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can update their conversations" ON public.conversations
  FOR UPDATE USING (senior_id = auth.uid() OR companion_id = auth.uid());

-- Create messages table if it doesn't exist
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'text'::text,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Conversation participants can see messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.senior_id = auth.uid() OR conversations.companion_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can insert messages" ON public.messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Message sender can update their messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());
