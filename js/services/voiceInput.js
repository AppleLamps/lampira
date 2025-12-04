/**
 * Voice Input Service
 * Handles Web Speech API voice recognition
 */

import eventBus, { Events } from '../utils/events.js';

// Voice recognition instance
let recognition = null;
let isRecording = false;

// Callbacks
let onResultCallback = null;
let onStartCallback = null;
let onEndCallback = null;
let onErrorCallback = null;

/**
 * Check if voice recognition is supported
 * @returns {boolean}
 */
export const isSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

/**
 * Get the SpeechRecognition constructor
 * @returns {Function|null}
 */
const getSpeechRecognition = () => {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Initialize voice recognition with callbacks
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onResult - Called with transcript when speech is recognized
 * @param {Function} callbacks.onStart - Called when recording starts
 * @param {Function} callbacks.onEnd - Called when recording ends
 * @param {Function} callbacks.onError - Called on error with error message
 */
export const init = ({ onResult, onStart, onEnd, onError } = {}) => {
    onResultCallback = onResult;
    onStartCallback = onStart;
    onEndCallback = onEnd;
    onErrorCallback = onError;
};

/**
 * Start voice recognition
 * @param {Object} options - Recognition options
 * @param {string} options.lang - Language code (default: 'en-US')
 * @param {boolean} options.continuous - Continue listening (default: false)
 * @param {boolean} options.interimResults - Return interim results (default: true)
 * @returns {boolean} Whether recognition started successfully
 */
export const start = ({ lang = 'en-US', continuous = false, interimResults = true } = {}) => {
    if (!isSupported()) {
        if (onErrorCallback) {
            onErrorCallback('Voice input is not supported in your browser');
        }
        return false;
    }

    if (isRecording) {
        return false;
    }

    const SpeechRecognition = getSpeechRecognition();
    recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
        isRecording = true;
        if (onStartCallback) onStartCallback();
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        if (onResultCallback) onResultCallback(transcript, event.results);
    };

    recognition.onend = () => {
        isRecording = false;
        recognition = null;
        if (onEndCallback) onEndCallback();
    };

    recognition.onerror = (event) => {
        isRecording = false;
        recognition = null;
        
        let errorMessage = 'Voice recognition error';
        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone found. Please check your settings.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error occurred. Please check your connection.';
                break;
            case 'aborted':
                errorMessage = 'Voice recognition was cancelled.';
                break;
            default:
                errorMessage = `Voice recognition error: ${event.error}`;
        }

        console.error('Speech recognition error:', event.error);
        if (onErrorCallback) onErrorCallback(errorMessage);
        if (onEndCallback) onEndCallback();
    };

    try {
        recognition.start();
        return true;
    } catch (error) {
        console.error('Failed to start voice recognition:', error);
        if (onErrorCallback) onErrorCallback('Failed to start voice recognition');
        return false;
    }
};

/**
 * Stop voice recognition
 */
export const stop = () => {
    if (recognition && isRecording) {
        recognition.stop();
    }
};

/**
 * Abort voice recognition (immediate stop without final result)
 */
export const abort = () => {
    if (recognition && isRecording) {
        recognition.abort();
    }
};

/**
 * Check if currently recording
 * @returns {boolean}
 */
export const getIsRecording = () => isRecording;

/**
 * Toggle voice recognition on/off
 * @param {Object} options - Recognition options (passed to start)
 * @returns {boolean} Whether recognition is now active
 */
export const toggle = (options = {}) => {
    if (isRecording) {
        stop();
        return false;
    } else {
        return start(options);
    }
};

export default {
    isSupported,
    init,
    start,
    stop,
    abort,
    getIsRecording,
    toggle
};

