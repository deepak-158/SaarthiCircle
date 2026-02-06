// Web Speech API Service
// Real speech-to-text using browser's built-in capabilities

// Check if browser supports Web Speech API
export const isSpeechRecognitionSupported = () => {
    return typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition);
};

// Create and configure speech recognition instance
export const createSpeechRecognition = (language = 'en-IN') => {
    if (!isSpeechRecognitionSupported()) {
        console.error('Speech Recognition not supported in this browser');
        return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = false; // Stop after user stops speaking
    recognition.interimResults = true; // Get results while speaking
    recognition.lang = language; // Set language
    recognition.maxAlternatives = 1; // Only get best result

    return recognition;
};

// Start speech recognition with callbacks
export const startSpeechRecognition = (language = 'en-IN', callbacks = {}) => {
    const recognition = createSpeechRecognition(language);

    if (!recognition) {
        if (callbacks.onError) {
            callbacks.onError(new Error('Speech Recognition not supported'));
        }
        return null;
    }

    // Handle results
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;

            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (callbacks.onResult) {
            callbacks.onResult({
                transcript: finalTranscript || interimTranscript,
                isFinal: finalTranscript.length > 0,
                confidence: event.results[0]?.[0]?.confidence || 0.9,
            });
        }
    };

    // Handle errors
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (callbacks.onError) {
            callbacks.onError(event.error);
        }
    };

    // Handle end
    recognition.onend = () => {
        console.log('Speech recognition ended');
        if (callbacks.onEnd) {
            callbacks.onEnd();
        }
    };

    // Handle start
    recognition.onstart = () => {
        console.log('Speech recognition started');
        if (callbacks.onStart) {
            callbacks.onStart();
        }
    };

    // Start recognition
    try {
        recognition.start();
        return recognition;
    } catch (error) {
        console.error('Error starting recognition:', error);
        if (callbacks.onError) {
            callbacks.onError(error);
        }
        return null;
    }
};

// Stop speech recognition
export const stopSpeechRecognition = (recognition) => {
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
};

// Text-to-Speech using browser's Speech Synthesis API
export const speak = (text, language = 'en-IN') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        console.error('Speech Synthesis not supported');
        return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
    return true;
};

// Get available voices
export const getAvailableVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return [];
    }
    return window.speechSynthesis.getVoices();
};

export default {
    isSpeechRecognitionSupported,
    createSpeechRecognition,
    startSpeechRecognition,
    stopSpeechRecognition,
    speak,
    getAvailableVoices,
};
