import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
}

console.log(`[INFO] Supabase key mode: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'}`);

export const supabase = createClient(url, key);

export const TABLES = {
  USERS: 'users',
  SENIORS: 'seniors',
  CAREGIVERS: 'caregivers',
  HELP_REQUESTS: 'help_requests',
  SOS_ALERTS: 'sos_alerts',
  MOOD_LOGS: 'mood_logs',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  OTP_CODES: 'otp_codes',
  PENDING_APPROVALS: 'pending_approvals',
  NGOS: 'ngos',
  AUDIT_LOGS: 'audit_logs',
};
