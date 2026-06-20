import 'dotenv/config';
import { connectMongo } from './src/mongodb.js';
import { TABLES } from './src/supabase.js';

async function checkTables() {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    const db = await connectMongo();
    console.log('[SUCCESS] Connected to MongoDB!');

    const collections = Object.values(TABLES);
    console.log('[INFO] Checking collections:');
    for (const name of collections) {
      const col = db.collection(name);
      const count = await col.countDocuments();
      console.log(`- Collection [${name}]: exists, count = ${count}`);
    }
  } catch (err) {
    console.error('[ERROR] Failed to check collections:', err.message);
  } finally {
    process.exit(0);
  }
}

checkTables();
