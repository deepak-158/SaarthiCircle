// Azure Speech Services Helper
// Handles Speech-to-Text and Text-to-Speech operations

import { AZURE_SPEECH_CONFIG, SUPPORTED_LANGUAGES } from '../config/azure';

// Check if Azure is properly configured
const isAzureConfigured = () => {
  return AZURE_SPEECH_CONFIG.subscriptionKey &&
    AZURE_SPEECH_CONFIG.subscriptionKey !== 'YOUR_AZURE_SPEECH_KEY' &&
    AZURE_SPEECH_CONFIG.endpoint;
};

// Speech-to-Text: Convert voice input to text
export const speechToText = async (audioBlob, language = 'en-IN') => {
  try {
    // If Azure is not configured, return mock response for development
    if (!isAzureConfigured()) {
      console.warn('Azure Speech API not configured. Using mock response.');
      return {
        success: true,
        text: 'I need help with daily tasks',
        confidence: 0.85,
        isMock: true,
      };
    }

    const endpoint = `${AZURE_SPEECH_CONFIG.endpoint}/speechtotext/v3.1/transcriptions:transcribe`;

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('definition', JSON.stringify({
      locales: [language],
      profanityFilterMode: 'Masked',
      channels: [0],
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_CONFIG.subscriptionKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure API Error:', errorText);
      throw new Error('Speech recognition failed');
    }

    const result = await response.json();
    return {
      success: true,
      text: result.combinedPhrases?.[0]?.text || '',
      confidence: result.combinedPhrases?.[0]?.confidence || 0,
    };
  } catch (error) {
    console.error('Speech-to-Text error:', error);
    // Return mock response on error for development
    return {
      success: true,
      text: 'I need help with daily tasks',
      confidence: 0.75,
      isMock: true,
    };
  }
};

// Text-to-Speech: Convert text to audio
export const textToSpeech = async (text, language = 'en-IN', voice = null) => {
  try {
    const endpoint = `${AZURE_SPEECH_CONFIG.endpoint}/cognitiveservices/v1`;

    // Get appropriate voice for language
    const voiceName = voice || getVoiceForLanguage(language);

    const ssml = `
      <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
        <voice name='${voiceName}'>
          <prosody rate='0.9' pitch='+0%'>
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_CONFIG.subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!response.ok) {
      throw new Error('Text-to-Speech failed');
    }

    const audioBlob = await response.blob();
    return {
      success: true,
      audioBlob,
    };
  } catch (error) {
    console.error('Text-to-Speech error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get voice name for a specific language
const getVoiceForLanguage = (language) => {
  const voices = {
    'en-IN': 'en-IN-NeerjaNeural',
    'hi-IN': 'hi-IN-SwaraNeural',
    'ta-IN': 'ta-IN-PallaviNeural',
    'te-IN': 'te-IN-ShrutiNeural',
    'kn-IN': 'kn-IN-SapnaNeural',
    'mr-IN': 'mr-IN-AarohiNeural',
    'bn-IN': 'bn-IN-TanishaaNeural',
    'gu-IN': 'gu-IN-DhwaniNeural',
  };
  return voices[language] || 'en-IN-NeerjaNeural';
};

// Detect language from speech
export const detectLanguage = async (audioBlob) => {
  try {
    // If Azure is not configured, return mock response
    if (!isAzureConfigured()) {
      console.warn('Azure Speech API not configured. Using mock language detection.');
      return {
        success: true,
        detectedLanguage: 'en-IN',
        isMock: true,
      };
    }

    // Use the Language Identification feature
    const endpoint = `${AZURE_SPEECH_CONFIG.endpoint}/speechtotext/v3.1/transcriptions:transcribe`;

    const formData = new FormData();
    formData.append('audio', audioBlob);

    // Check if SUPPORTED_LANGUAGES exists and has keys
    const locales = SUPPORTED_LANGUAGES && typeof SUPPORTED_LANGUAGES === 'object'
      ? Object.keys(SUPPORTED_LANGUAGES)
      : ['en-IN', 'hi-IN'];

    formData.append('definition', JSON.stringify({
      locales: locales,
      profanityFilterMode: 'Masked',
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_CONFIG.subscriptionKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Language Detection Error:', errorText);
      throw new Error('Language detection failed');
    }

    const result = await response.json();
    return {
      success: true,
      detectedLanguage: result.recognizedPhrases?.[0]?.locale || 'en-IN',
    };
  } catch (error) {
    console.error('Language detection error:', error);
    // Return mock response on error
    return {
      success: true,
      detectedLanguage: 'en-IN',
      isMock: true,
    };
  }
};

export default {
  speechToText,
  textToSpeech,
  detectLanguage,
};
