// Services Export
export { default as speechService } from './speechService';
export { default as aiService } from './aiService';
export { default as databaseService } from './databaseService';

// Re-export individual functions for convenience
export { speechToText, textToSpeech, detectLanguage } from './speechService';
export { 
  analyzeIntent, 
  analyzeSentiment, 
  generateCompanionResponse, 
  processHelpRequest,
  analyzeMoodFromConversation,
} from './aiService';
export {
  upsertUser,
  getUserByPhone,
  createSeniorProfile,
  updateSeniorProfile,
  getSeniorProfile,
  getAvailableCaregivers,
  updateCaregiverAvailability,
  createHelpRequest,
  getSeniorHelpRequests,
  getPendingRequestsForCaregiver,
  acceptHelpRequest,
  completeHelpRequest,
  createSOSAlert,
  getActiveSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  logMood,
  getMoodHistory,
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getDashboardStats,
  getSeniorsAtRisk,
} from './databaseService';
