import 'dotenv/config';
import { connectMongo } from './src/mongodb.js';
import { TABLES } from './src/supabase.js';

async function setupDatabase() {
  try {
    console.log('[INFO] Connecting to MongoDB...');
    const db = await connectMongo();
    console.log('[SUCCESS] Connected to MongoDB!');

    console.log('[INFO] Setting up collections and indexes...');

    // 1. Users collection
    const usersCol = db.collection(TABLES.USERS);
    await usersCol.createIndex({ id: 1 }, { unique: true });
    await usersCol.createIndex({ email: 1 }, { unique: true, sparse: true });
    await usersCol.createIndex({ phone: 1 }, { unique: true, sparse: true });
    console.log('[SUCCESS] USERS indexes verified.');

    // 2. Seniors collection
    const seniorsCol = db.collection(TABLES.SENIORS);
    await seniorsCol.createIndex({ id: 1 }, { unique: true });
    await seniorsCol.createIndex({ user_id: 1 }, { unique: true });
    console.log('[SUCCESS] SENIORS indexes verified.');

    // 3. Caregivers collection
    const caregiversCol = db.collection(TABLES.CAREGIVERS);
    await caregiversCol.createIndex({ id: 1 }, { unique: true });
    await caregiversCol.createIndex({ user_id: 1 }, { unique: true });
    console.log('[SUCCESS] CAREGIVERS indexes verified.');

    // 4. NGOs collection
    const ngosCol = db.collection(TABLES.NGOS);
    await ngosCol.createIndex({ id: 1 }, { unique: true });
    await ngosCol.createIndex({ user_id: 1 }, { unique: true });
    console.log('[SUCCESS] NGOS indexes verified.');

    // 5. Help Requests collection
    const helpCol = db.collection(TABLES.HELP_REQUESTS);
    await helpCol.createIndex({ id: 1 }, { unique: true });
    await helpCol.createIndex({ senior_id: 1 });
    await helpCol.createIndex({ volunteer_id: 1 });
    await helpCol.createIndex({ status: 1 });
    console.log('[SUCCESS] HELP_REQUESTS indexes verified.');

    // 6. SOS Alerts collection
    const sosCol = db.collection(TABLES.SOS_ALERTS);
    await sosCol.createIndex({ id: 1 }, { unique: true });
    await sosCol.createIndex({ senior_id: 1 });
    await sosCol.createIndex({ volunteer_id: 1 });
    await sosCol.createIndex({ status: 1 });
    console.log('[SUCCESS] SOS_ALERTS indexes verified.');

    // 7. Conversations collection
    const convoCol = db.collection(TABLES.CONVERSATIONS);
    await convoCol.createIndex({ id: 1 }, { unique: true });
    console.log('[SUCCESS] CONVERSATIONS indexes verified.');

    // 8. Messages collection
    const msgCol = db.collection(TABLES.MESSAGES);
    await msgCol.createIndex({ id: 1 }, { unique: true });
    await msgCol.createIndex({ conversation_id: 1 });
    console.log('[SUCCESS] MESSAGES indexes verified.');

    // 9. OTP Codes collection
    const otpCol = db.collection(TABLES.OTP_CODES);
    await otpCol.createIndex({ email: 1 });
    await otpCol.createIndex({ phone: 1 });
    console.log('[SUCCESS] OTP_CODES indexes verified.');

    // 10. Pending Approvals collection
    const pendingCol = db.collection(TABLES.PENDING_APPROVALS);
    await pendingCol.createIndex({ uid: 1 }, { unique: true });
    console.log('[SUCCESS] PENDING_APPROVALS indexes verified.');

    console.log('[SUCCESS] MongoDB database setup complete!');
  } catch (e) {
    console.error('[ERROR] Database setup failed:', e.message);
  } finally {
    process.exit(0);
  }
}

setupDatabase();
