import 'dotenv/config';
import { connectMongo, supabase } from './src/mongodb.js';
import { TABLES } from './src/supabase.js';

async function checkTable() {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    await connectMongo();
    console.log('[INFO] Checking help_requests collection...');
    
    // Try to query the table using the supabase mock wrapper
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .select()
      .limit(1);
    
    if (error) {
      console.error('[ERROR] Collection query failed:', error);
    } else {
      console.log('[SUCCESS] Collection exists and is queryable!');
      console.log('[INFO] Sample data:', data);
    }
  } catch (e) {
    console.error('[ERROR] Unexpected error:', e);
  } finally {
    process.exit(0);
  }
}

checkTable();
