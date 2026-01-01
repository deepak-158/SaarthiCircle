// Supabase Configuration for SaathiCircle
// Using Supabase Free Tier

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Replace with your Supabase project credentials
const SUPABASE_URL = 'https://hhfmxmkwroyuwrlchiur.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8NywUV2O1GWwT0uefB6p_g_IB272tAL';

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key) => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    await SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  USERS: 'users',
  SENIORS: 'seniors',
  CAREGIVERS: 'caregivers',
  HELP_REQUESTS: 'help_requests',
  SOS_ALERTS: 'sos_alerts',
  MOOD_LOGS: 'mood_logs',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  COMPANIONS: 'companions',
};

// User roles
export const USER_ROLES = {
  SENIOR: 'senior',
  CAREGIVER: 'caregiver',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
  NGO: 'ngo',
};

// Help request types
export const HELP_TYPES = {
  EMOTIONAL: 'emotional',
  DAILY_ASSISTANCE: 'daily_assistance',
  HEALTH: 'health',
  EMERGENCY: 'emergency',
};

// Help request priorities
export const PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Request statuses
export const REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
};

export default supabase;
