import 'dotenv/config';
import { supabase, TABLES } from './src/supabase.js';

async function inspect() {
  console.log('Inspecting tables...');
  
  const tables = [
    TABLES.USERS, 
    'profiles', 
    'elderly_profiles', 
    'volunteer_profiles', 
    'caregiver_profiles',
    TABLES.SENIORS, 
    TABLES.PENDING_APPROVALS
  ];
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`Error fetching from ${table}:`, error.message);
        continue;
      }
      if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
      } else {
        // Try to insert a dummy record and rollback? Supabase doesn't support rollback easily here.
        // Let's try to get schema via RPC if possible, or just guess from error messages.
        console.log('Table is empty, cannot determine columns from data.');
      }
    } catch (e) {
      console.error(`Unexpected error for ${table}:`, e.message);
    }
  }
}

inspect();
