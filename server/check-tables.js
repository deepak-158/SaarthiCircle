import 'dotenv/config';
import { supabase } from './src/supabase.js';

async function checkTables() {
  const tables = ['users', 'profiles', 'elderly_profiles', 'volunteer_profiles', 'caregiver_profiles'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table ${table} does not exist or error: ${error.message}`);
    } else {
      console.log(`Table ${table} exists! Columns: ${data.length > 0 ? Object.keys(data[0]) : 'unknown'}`);
    }
  }
}

checkTables();
