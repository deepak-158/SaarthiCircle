// Supabase Database Service
// Handles all database operations for SaathiCircle

import { supabase, TABLES, REQUEST_STATUS, PRIORITIES, HELP_TYPES } from '../config/supabase';

// ==================== USER OPERATIONS ====================

// Create or update user profile
export const upsertUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .upsert(userData, { onConflict: 'phone' })
      .select()
      .single();

    if (error) throw error;
    return { success: true, user: data };
  } catch (error) {
    console.error('Upsert user error:', error);
    return { success: false, error: error.message };
  }
};

// Get user by phone number
export const getUserByPhone = async (phone) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, user: data };
  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SENIOR PROFILE OPERATIONS ====================

// Create senior profile
export const createSeniorProfile = async (seniorData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SENIORS)
      .insert(seniorData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, senior: data };
  } catch (error) {
    console.error('Create senior profile error:', error);
    return { success: false, error: error.message };
  }
};

// Update senior profile
export const updateSeniorProfile = async (seniorId, updates) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SENIORS)
      .update(updates)
      .eq('id', seniorId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, senior: data };
  } catch (error) {
    console.error('Update senior profile error:', error);
    return { success: false, error: error.message };
  }
};

// Get senior profile by user ID
export const getSeniorProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SENIORS)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, senior: data };
  } catch (error) {
    console.error('Get senior profile error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CAREGIVER OPERATIONS ====================

// Get available caregivers
export const getAvailableCaregivers = async (filters = {}) => {
  try {
    let query = supabase
      .from(TABLES.CAREGIVERS)
      .select(`
        *,
        user:users(name, phone, profile_image)
      `)
      .eq('is_available', true);

    if (filters.specialization) {
      query = query.contains('specializations', [filters.specialization]);
    }

    if (filters.language) {
      query = query.contains('languages', [filters.language]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, caregivers: data };
  } catch (error) {
    console.error('Get caregivers error:', error);
    return { success: false, error: error.message };
  }
};

// Update caregiver availability
export const updateCaregiverAvailability = async (caregiverId, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.CAREGIVERS)
      .update({ is_available: isAvailable })
      .eq('id', caregiverId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, caregiver: data };
  } catch (error) {
    console.error('Update availability error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== HELP REQUEST OPERATIONS ====================

// Create help request
export const createHelpRequest = async (requestData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .insert({
        ...requestData,
        status: REQUEST_STATUS.PENDING,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, request: data };
  } catch (error) {
    console.error('Create help request error:', error);
    return { success: false, error: error.message };
  }
};

// Get help requests for senior
export const getSeniorHelpRequests = async (seniorId, status = null) => {
  try {
    let query = supabase
      .from(TABLES.HELP_REQUESTS)
      .select(`
        *,
        caregiver:caregivers(
          id,
          user:users(name, phone, profile_image)
        )
      `)
      .eq('senior_id', seniorId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, requests: data };
  } catch (error) {
    console.error('Get senior requests error:', error);
    return { success: false, error: error.message };
  }
};

// Get pending help requests for caregiver
export const getPendingRequestsForCaregiver = async (caregiverId = null) => {
  try {
    let query = supabase
      .from(TABLES.HELP_REQUESTS)
      .select(`
        *,
        senior:seniors(
          id,
          user:users(name, phone, profile_image),
          address,
          medical_info
        )
      `)
      .in('status', [REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (caregiverId) {
      query = query.or(`caregiver_id.is.null,caregiver_id.eq.${caregiverId}`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, requests: data };
  } catch (error) {
    console.error('Get pending requests error:', error);
    return { success: false, error: error.message };
  }
};

// Accept help request
export const acceptHelpRequest = async (requestId, caregiverId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        caregiver_id: caregiverId,
        status: REQUEST_STATUS.ASSIGNED,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, request: data };
  } catch (error) {
    console.error('Accept request error:', error);
    return { success: false, error: error.message };
  }
};

// Complete help request
export const completeHelpRequest = async (requestId, notes = '') => {
  try {
    const { data, error } = await supabase
      .from(TABLES.HELP_REQUESTS)
      .update({
        status: REQUEST_STATUS.COMPLETED,
        completed_at: new Date().toISOString(),
        notes: notes,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, request: data };
  } catch (error) {
    console.error('Complete request error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SOS ALERT OPERATIONS ====================

// Create SOS alert
export const createSOSAlert = async (alertData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .insert({
        ...alertData,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: data };
  } catch (error) {
    console.error('Create SOS alert error:', error);
    return { success: false, error: error.message };
  }
};

// Get active SOS alerts
export const getActiveSOSAlerts = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .select(`
        *,
        senior:seniors(
          id,
          user:users(name, phone),
          address,
          emergency_contact,
          medical_info
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, alerts: data };
  } catch (error) {
    console.error('Get SOS alerts error:', error);
    return { success: false, error: error.message };
  }
};

// Acknowledge SOS alert
export const acknowledgeSOSAlert = async (alertId, responderId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .update({
        status: 'acknowledged',
        responder_id: responderId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: data };
  } catch (error) {
    console.error('Acknowledge SOS error:', error);
    return { success: false, error: error.message };
  }
};

// Resolve SOS alert
export const resolveSOSAlert = async (alertId, resolution) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.SOS_ALERTS)
      .update({
        status: 'resolved',
        resolution: resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: data };
  } catch (error) {
    console.error('Resolve SOS error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== MOOD LOG OPERATIONS ====================

// Log mood
export const logMood = async (moodData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MOOD_LOGS)
      .insert({
        ...moodData,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, moodLog: data };
  } catch (error) {
    console.error('Log mood error:', error);
    return { success: false, error: error.message };
  }
};

// Get mood history for senior
export const getMoodHistory = async (seniorId, days = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from(TABLES.MOOD_LOGS)
      .select('*')
      .eq('senior_id', seniorId)
      .gte('logged_at', startDate.toISOString())
      .order('logged_at', { ascending: false });

    if (error) throw error;
    return { success: true, moodLogs: data };
  } catch (error) {
    console.error('Get mood history error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== COMPANION/CONVERSATION OPERATIONS ====================

// Get or create conversation
export const getOrCreateConversation = async (seniorId, companionId) => {
  try {
    // Try to find existing conversation
    let { data: conversation, error } = await supabase
      .from(TABLES.CONVERSATIONS)
      .select('*')
      .eq('senior_id', seniorId)
      .eq('companion_id', companionId)
      .single();

    if (error && error.code === 'PGRST116') {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from(TABLES.CONVERSATIONS)
        .insert({
          senior_id: seniorId,
          companion_id: companionId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      conversation = newConversation;
    } else if (error) {
      throw error;
    }

    return { success: true, conversation };
  } catch (error) {
    console.error('Get/create conversation error:', error);
    return { success: false, error: error.message };
  }
};

// Send message
export const sendMessage = async (conversationId, senderId, content, type = 'text') => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last_message_at
    await supabase
      .from(TABLES.CONVERSATIONS)
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return { success: true, message: data };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: error.message };
  }
};

// Get messages for conversation
export const getMessages = async (conversationId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, messages: data.reverse() };
  } catch (error) {
    console.error('Get messages error:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ADMIN/ANALYTICS OPERATIONS ====================

// Get dashboard stats
export const getDashboardStats = async () => {
  try {
    const [
      { count: totalSeniors },
      { count: activeCaregivers },
      { count: pendingRequests },
      { count: sosAlerts },
    ] = await Promise.all([
      supabase.from(TABLES.SENIORS).select('*', { count: 'exact', head: true }),
      supabase.from(TABLES.CAREGIVERS).select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from(TABLES.HELP_REQUESTS).select('*', { count: 'exact', head: true }).eq('status', REQUEST_STATUS.PENDING),
      supabase.from(TABLES.SOS_ALERTS).select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    return {
      success: true,
      stats: {
        totalSeniors,
        activeCaregivers,
        pendingRequests,
        sosAlerts,
      },
    };
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return { success: false, error: error.message };
  }
};

// Get seniors at risk (low mood, missed check-ins)
export const getSeniorsAtRisk = async () => {
  try {
    // Get seniors with negative mood in last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data, error } = await supabase
      .from(TABLES.MOOD_LOGS)
      .select(`
        senior_id,
        mood,
        logged_at,
        senior:seniors(
          id,
          user:users(name, phone)
        )
      `)
      .eq('mood', 'sad')
      .gte('logged_at', threeDaysAgo.toISOString())
      .order('logged_at', { ascending: false });

    if (error) throw error;

    // Group by senior
    const riskySeniors = data.reduce((acc, log) => {
      const key = log.senior_id;
      if (!acc[key]) {
        acc[key] = {
          ...log.senior,
          sadMoodCount: 0,
          lastSadMood: log.logged_at,
        };
      }
      acc[key].sadMoodCount++;
      return acc;
    }, {});

    return { success: true, seniorsAtRisk: Object.values(riskySeniors) };
  } catch (error) {
    console.error('Get at-risk seniors error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  // User
  upsertUser,
  getUserByPhone,
  // Senior
  createSeniorProfile,
  updateSeniorProfile,
  getSeniorProfile,
  // Caregiver
  getAvailableCaregivers,
  updateCaregiverAvailability,
  // Help Requests
  createHelpRequest,
  getSeniorHelpRequests,
  getPendingRequestsForCaregiver,
  acceptHelpRequest,
  completeHelpRequest,
  // SOS
  createSOSAlert,
  getActiveSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  // Mood
  logMood,
  getMoodHistory,
  // Conversation
  getOrCreateConversation,
  sendMessage,
  getMessages,
  // Admin
  getDashboardStats,
  getSeniorsAtRisk,
};
