import 'dotenv/config';
import { connectMongo } from './src/mongodb.js';
import { TABLES } from './src/supabase.js';

async function inspect() {
  console.log('[INFO] Connecting to MongoDB...');
  try {
    const db = await connectMongo();
    console.log('[SUCCESS] Connected to MongoDB!');

    const collections = Object.values(TABLES);
    
    for (const name of collections) {
      console.log(`\nCollection: ${name}`);
      const col = db.collection(name);
      const count = await col.countDocuments();
      console.log(`- Document Count: ${count}`);
      
      if (count > 0) {
        const sample = await col.findOne();
        console.log('- Sample Document Fields:', Object.keys(sample));
      } else {
        console.log('- Collection is empty.');
      }
    }
  } catch (e) {
    console.error(`[ERROR] Inspection failed:`, e.message);
  } finally {
    process.exit(0);
  }
}

inspect();
