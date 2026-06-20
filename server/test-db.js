import 'dotenv/config';
import { connectMongo, supabase } from './src/mongodb.js';
import { TABLES } from './src/supabase.js';

async function checkSchema() {
  console.log('Connecting to MongoDB...');
  try {
    await connectMongo();
    console.log('Checking USERS collection schema...');
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Available columns/fields in users collection:', Object.keys(data[0]));
    } else {
      console.log('No users found in collection to check schema.');
    }
  } catch (err) {
    console.error('Unexpected error during MongoDB connection/query:', err);
  } finally {
    process.exit(0);
  }
}

checkSchema();
