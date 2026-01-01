// Azure Speech Services Helper
// Handles Speech-to-Text and Text-to-Speech operations

import { AZURE_SPEECH_CONFIG, SUPPORTED_LANGUAGES } from '../config/azure';

// Speech-to-Text: Convert voice input to text
export const speechToText = async (audioBlob, language = 'en-IN') => {
  try {
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
    return {
      success: false,
      error: error.message,
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
    // Use the Language Identification feature
    const endpoint = `${AZURE_SPEECH_CONFIG.endpoint}/speechtotext/v3.1/transcriptions:transcribe`;
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('definition', JSON.stringify({
      locales: Object.keys(SUPPORTED_LANGUAGES),
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
      throw new Error('Language detection failed');
    }

    const result = await response.json();
    return {
      success: true,
      detectedLanguage: result.recognizedPhrases?.[0]?.locale || 'en-IN',
    };
  } catch (error) {
    console.error('Language detection error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  speechToText,
  textToSpeech,
  detectLanguage,
};
