import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceRoleKey);

async function setupDatabase() {
  try {
    console.log('[INFO] Setting up database tables...');
    
    // Create help_requests table
    console.log('[INFO] Creating help_requests table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS help_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        senior_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        volunteer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        category TEXT DEFAULT 'General',
        description TEXT DEFAULT '',
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        accepted_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT help_requests_unique_pending UNIQUE (senior_id) WHERE status = 'pending'
      );
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (tableError && !tableError.message.includes('already exists')) {
      console.error('[ERROR] Failed to create table:', tableError);
    } else {
      console.log('[SUCCESS] help_requests table ready!');
    }
    
    // Create indexes
    console.log('[INFO] Creating indexes...');
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS idx_help_requests_senior_id ON help_requests(senior_id);
      CREATE INDEX IF NOT EXISTS idx_help_requests_volunteer_id ON help_requests(volunteer_id);
      CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
      CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at DESC);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSQL });
    
    if (indexError && !indexError.message.includes('already exists')) {
      console.warn('[WARN] Some indexes may not have been created:', indexError.message);
    } else {
      console.log('[SUCCESS] Indexes created!');
    }
    
    // Verify table
    console.log('[INFO] Verifying table...');
    const { data, error: verifyError } = await supabase
      .from('help_requests')
      .select()
      .limit(1);
    
    if (verifyError) {
      console.error('[ERROR] Table verification failed:', verifyError);
    } else {
      console.log('[SUCCESS] Table verified! Table is ready to use.');
    }
    
  } catch (e) {
    console.error('[ERROR] Setup failed:', e.message);
  }
}

setupDatabase();
