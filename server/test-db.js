import 'dotenv/config';
import { supabase, TABLES } from './src/supabase.js';

async function checkSchema() {
  console.log('Checking USERS table schema...');
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Available columns in users table:', Object.keys(data[0]));
  } else {
    console.log('No users found in table to check schema.');
    // Try to insert a dummy record with only id to see what it has
    console.log('Attempting to check via rpc or other means is not possible here.');
  }
}

checkSchema();
