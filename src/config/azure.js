// Microsoft Azure AI Services Configuration
// Using Azure Free Tier

// Azure Speech Services
export const AZURE_SPEECH_CONFIG = {
  subscriptionKey: 'YOUR_AZURE_SPEECH_KEY',
  region: 'YOUR_AZURE_REGION', // e.g., 'eastus', 'westus2'
  endpoint: '', // Will be constructed from region

  // Supported languages for SaathiCircle
  languages: {
    hindi: 'hi-IN',
    english: 'en-IN',
    bengali: 'bn-IN',
    tamil: 'ta-IN',
    telugu: 'te-IN',
    marathi: 'mr-IN',
    gujarati: 'gu-IN',
    kannada: 'kn-IN',
    malayalam: 'ml-IN',
    punjabi: 'pa-IN',
  },

  // Voice names for text-to-speech
  voices: {
    hindi: {
      male: 'hi-IN-MadhurNeural',
      female: 'hi-IN-SwaraNeural',
    },
    english: {
      male: 'en-IN-PrabhatNeural',
      female: 'en-IN-NeerjaNeural',
    },
  },
};

// Construct endpoint from region
if (AZURE_SPEECH_CONFIG.region && AZURE_SPEECH_CONFIG.region !== 'YOUR_AZURE_REGION') {
  AZURE_SPEECH_CONFIG.endpoint = `https://${AZURE_SPEECH_CONFIG.region}.api.cognitive.microsoft.com`;
}

// Supported languages list
export const SUPPORTED_LANGUAGES = {
  'hi-IN': 'Hindi',
  'en-IN': 'English',
  'bn-IN': 'Bengali',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'pa-IN': 'Punjabi',
};

// Azure Language Understanding (LUIS) / Conversational Language Understanding
export const AZURE_LANGUAGE_CONFIG = {
  endpoint: 'YOUR_AZURE_LANGUAGE_ENDPOINT',
  apiKey: 'YOUR_AZURE_LANGUAGE_KEY',
  projectName: 'saathicircle-intents',
  deploymentName: 'production',
};

// Azure Text Analytics for Sentiment Analysis
export const AZURE_SENTIMENT_CONFIG = {
  endpoint: 'YOUR_AZURE_TEXT_ANALYTICS_ENDPOINT',
  apiKey: 'YOUR_AZURE_TEXT_ANALYTICS_KEY',
};

// Azure OpenAI Service (for conversational AI)
export const AZURE_OPENAI_CONFIG = {
  endpoint: 'YOUR_AZURE_OPENAI_ENDPOINT',
  apiKey: 'YOUR_AZURE_OPENAI_KEY',
  deploymentName: 'gpt-35-turbo',
  apiVersion: '2023-12-01-preview',
};

// Intent categories for help requests
export const INTENTS = {
  EMOTIONAL_SUPPORT: 'emotional_support',
  DAILY_HELP: 'daily_help',
  HEALTH_CONCERN: 'health_concern',
  EMERGENCY: 'emergency',
  GENERAL_CHAT: 'general_chat',
  COMPANION_REQUEST: 'companion_request',
};

// Sentiment thresholds for risk assessment
export const SENTIMENT_THRESHOLDS = {
  POSITIVE: 0.6,
  NEUTRAL_LOW: 0.4,
  NEUTRAL_HIGH: 0.6,
  NEGATIVE: 0.4,
  HIGH_RISK: 0.2, // Very negative sentiment - needs attention
};

export default {
  AZURE_SPEECH_CONFIG,
  AZURE_LANGUAGE_CONFIG,
  AZURE_SENTIMENT_CONFIG,
  AZURE_OPENAI_CONFIG,
  SUPPORTED_LANGUAGES,
  INTENTS,
  SENTIMENT_THRESHOLDS,
};
