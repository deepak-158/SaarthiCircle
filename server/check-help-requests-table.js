import 'dotenv/config';
import { supabase, TABLES } from './src/supabase.js';

async function checkTable() {
  try {
    console.log('[INFO] Checking help_requests table...');
    
    // Try to query the table
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select()
      .limit(1);
    
    if (error) {
      console.error('[ERROR] Table query failed:', error);
      console.error('[ERROR] Error details:', JSON.stringify(error, null, 2));
      
      // Try to create the table
      if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('[INFO] Table does not exist. Creating it now...');
        await createTable();
      }
    } else {
      console.log('[SUCCESS] Table exists!');
      console.log('[INFO] Sample data:', data);
    }
  } catch (e) {
    console.error('[ERROR] Unexpected error:', e);
  }
}

async function createTable() {
  try {
    // Use the Supabase client to execute SQL - but we can't do this with the JS client
    // Instead, let's just provide guidance
    console.log('[INFO] To create the table, run this SQL in Supabase:');
    console.log(`
CREATE TABLE help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'General',
  description TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_help_requests_senior_id ON help_requests(senior_id);
CREATE INDEX idx_help_requests_volunteer_id ON help_requests(volunteer_id);
CREATE INDEX idx_help_requests_status ON help_requests(status);
    `);
  } catch (e) {
    console.error('[ERROR] Failed to create table:', e);
  }
}

checkTable();
