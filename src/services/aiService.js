// Azure Language & AI Service Helper
// Handles NLU, Sentiment Analysis, and OpenAI integration

import { 
  AZURE_LANGUAGE_CONFIG, 
  AZURE_SENTIMENT_CONFIG,
  AZURE_OPENAI_CONFIG 
} from '../config/azure';

// Analyze intent from user message
export const analyzeIntent = async (text, language = 'en') => {
  try {
    const endpoint = `${AZURE_LANGUAGE_CONFIG.endpoint}/language/:analyze-conversations`;
    
    const response = await fetch(`${endpoint}?api-version=2022-10-01-preview`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_LANGUAGE_CONFIG.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'Conversation',
        analysisInput: {
          conversationItem: {
            id: '1',
            participantId: 'user',
            text: text,
            language: language,
          },
        },
        parameters: {
          projectName: AZURE_LANGUAGE_CONFIG.projectName,
          deploymentName: 'production',
          stringIndexType: 'TextElement_V8',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Intent analysis failed');
    }

    const result = await response.json();
    const prediction = result.result?.prediction;
    
    return {
      success: true,
      topIntent: prediction?.topIntent || 'Unknown',
      intents: prediction?.intents || [],
      entities: prediction?.entities || [],
    };
  } catch (error) {
    console.error('Intent analysis error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Analyze sentiment of text
export const analyzeSentiment = async (text, language = 'en') => {
  try {
    const endpoint = `${AZURE_SENTIMENT_CONFIG.endpoint}/text/analytics/v3.1/sentiment`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SENTIMENT_CONFIG.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: [
          {
            id: '1',
            language: language,
            text: text,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Sentiment analysis failed');
    }

    const result = await response.json();
    const document = result.documents?.[0];
    
    return {
      success: true,
      sentiment: document?.sentiment || 'neutral',
      confidenceScores: document?.confidenceScores || {},
      sentences: document?.sentences || [],
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Generate companion response using Azure OpenAI
export const generateCompanionResponse = async (userMessage, conversationHistory = [], seniorProfile = {}) => {
  try {
    const endpoint = `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.deploymentId}/chat/completions?api-version=2024-02-01`;
    
    // System prompt for elderly companion AI
    const systemPrompt = `You are a warm, patient, and caring companion for elderly individuals in India. 
Your role is to:
- Provide emotional support and friendly conversation
- Be respectful and use appropriate honorifics (Ji, Aunty, Uncle)
- Speak clearly and simply, avoiding complex jargon
- Show genuine interest in their stories and experiences
- Gently encourage positive thinking while validating their feelings
- Remind them they are valued and cared for
- If they mention health concerns, suggest consulting family or doctor
- Be culturally aware of Indian customs and festivals

Senior's Profile:
- Name: ${seniorProfile.name || 'Dear Friend'}
- Interests: ${seniorProfile.interests?.join(', ') || 'conversation'}
- Preferred Language: ${seniorProfile.language || 'English'}

Always maintain a warm, reassuring tone.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Last 10 messages for context
      { role: 'user', content: userMessage },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': AZURE_OPENAI_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.5,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI response generation failed');
    }

    const result = await response.json();
    const assistantMessage = result.choices?.[0]?.message?.content || '';
    
    return {
      success: true,
      response: assistantMessage,
      usage: result.usage,
    };
  } catch (error) {
    console.error('Companion response error:', error);
    return {
      success: false,
      error: error.message,
      // Fallback response
      response: "I'm here for you. How can I help you today?",
    };
  }
};

// Process help request with AI
export const processHelpRequest = async (voiceText, language = 'en') => {
  try {
    // First, analyze the intent
    const intentResult = await analyzeIntent(voiceText, language);
    
    // Then analyze sentiment to gauge urgency
    const sentimentResult = await analyzeSentiment(voiceText, language);
    
    // Determine help category and urgency
    const helpCategory = categorizeHelpRequest(intentResult.topIntent, intentResult.entities);
    const urgency = determineUrgency(sentimentResult.sentiment, voiceText);
    
    return {
      success: true,
      originalText: voiceText,
      intent: intentResult.topIntent,
      category: helpCategory,
      urgency: urgency,
      entities: intentResult.entities,
      sentiment: sentimentResult.sentiment,
    };
  } catch (error) {
    console.error('Help request processing error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Helper function to categorize help request
const categorizeHelpRequest = (intent, entities) => {
  const categoryMap = {
    'GetMedicine': 'medicine',
    'GetGroceries': 'groceries',
    'GetTransport': 'transport',
    'EmergencyHelp': 'emergency',
    'DailyAssistance': 'daily_assistance',
  };
  
  // Check entities for specific items
  const hasHealthItems = entities.some(e => 
    e.category === 'Medicine' || e.text?.toLowerCase().includes('medicine')
  );
  const hasFoodItems = entities.some(e => 
    e.category === 'Food' || e.text?.toLowerCase().includes('grocery')
  );
  
  if (hasHealthItems) return 'medicine';
  if (hasFoodItems) return 'groceries';
  
  return categoryMap[intent] || 'daily_assistance';
};

// Helper function to determine urgency
const determineUrgency = (sentiment, text) => {
  const urgentKeywords = ['urgent', 'emergency', 'immediately', 'now', 'pain', 'help', 'please'];
  const textLower = text.toLowerCase();
  
  const hasUrgentKeyword = urgentKeywords.some(keyword => textLower.includes(keyword));
  
  if (sentiment === 'negative' && hasUrgentKeyword) return 'high';
  if (sentiment === 'negative' || hasUrgentKeyword) return 'medium';
  return 'low';
};

// Analyze mood from conversation
export const analyzeMoodFromConversation = async (messages) => {
  try {
    // Combine recent messages
    const recentText = messages.slice(-5).map(m => m.text).join(' ');
    
    const sentimentResult = await analyzeSentiment(recentText);
    
    // Map sentiment to mood
    const moodMap = {
      positive: 'happy',
      neutral: 'okay',
      negative: 'sad',
      mixed: 'okay',
    };
    
    return {
      success: true,
      mood: moodMap[sentimentResult.sentiment] || 'okay',
      confidence: sentimentResult.confidenceScores?.[sentimentResult.sentiment] || 0.5,
    };
  } catch (error) {
    console.error('Mood analysis error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  analyzeIntent,
  analyzeSentiment,
  generateCompanionResponse,
  processHelpRequest,
  analyzeMoodFromConversation,
};
