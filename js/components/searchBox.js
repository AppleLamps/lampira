/**
 * Search Box Component
 * Handles message input and sending
 */

import { $, addClass, removeClass, toggleClass } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { sendUserMessage, getIsLoading } from '../services/chat.js';

// DOM Elements
let searchBox;
let searchInput;
let voiceBtn;
let attachBtn;

/**
 * Initialize search box component
 */
export const init = () => {
    searchBox = $('.search-box');
    searchInput = $('.search-input');
    voiceBtn = $('.voice-btn');
    attachBtn = $('.icon-btn:has(path[d*="21.44"])'); // Attachment button

    setupEventListeners();

    // Subscribe to events
    eventBus.on(Events.LOADING_START, handleLoadingStart);
    eventBus.on(Events.LOADING_END, handleLoadingEnd);
    eventBus.on(Events.CHAT_CLEARED, () => {
        if (searchInput) searchInput.focus();
    });
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
    if (searchInput) {
        // Enter to send
        searchInput.addEventListener('keydown', handleKeyDown);

        // Auto-resize for multiline (future enhancement)
        searchInput.addEventListener('input', handleInput);
    }

    if (voiceBtn) {
        voiceBtn.addEventListener('click', handleVoiceClick);
    }

    if (attachBtn) {
        attachBtn.addEventListener('click', handleAttachClick);
    }
};

/**
 * Handle keydown event
 * @param {KeyboardEvent} e
 */
const handleKeyDown = (e) => {
    // Enter to send (without shift for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
    }
};

/**
 * Handle input event
 * @param {InputEvent} e
 */
const handleInput = (e) => {
    // Future: auto-resize textarea
};

/**
 * Submit the current message
 */
const submitMessage = async () => {
    if (!searchInput) return;

    const content = searchInput.value.trim();
    if (!content) return;

    // Check if already loading
    if (getIsLoading()) {
        return;
    }

    // Clear input
    searchInput.value = '';

    try {
        await sendUserMessage(content);
    } catch (error) {
        console.error('Failed to send message:', error);
        // Restore input on error
        searchInput.value = content;
        showError(error.message);
    }
};

/**
 * Handle loading start
 */
const handleLoadingStart = () => {
    if (searchInput) {
        searchInput.disabled = true;
        searchInput.placeholder = 'Thinking...';
    }
    addClass(searchBox, 'loading');
};

/**
 * Handle loading end
 */
const handleLoadingEnd = () => {
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = 'Ask a question...';
        searchInput.focus();
    }
    removeClass(searchBox, 'loading');
};

/**
 * Handle voice button click
 */
const handleVoiceClick = () => {
    // Future: implement voice input using Web Speech API
    console.log('Voice input not yet implemented');

    // Check for browser support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        startVoiceRecognition();
    } else {
        showError('Voice input is not supported in your browser');
    }
};

/**
 * Start voice recognition
 */
const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        addClass(voiceBtn, 'recording');
        searchInput.placeholder = 'Listening...';
    };

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

        searchInput.value = transcript;
    };

    recognition.onend = () => {
        removeClass(voiceBtn, 'recording');
        searchInput.placeholder = 'Ask a question...';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        removeClass(voiceBtn, 'recording');
        searchInput.placeholder = 'Ask a question...';
    };

    recognition.start();
};

/**
 * Handle attach button click
 */
const handleAttachClick = () => {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,.pdf,.txt,.md';
    fileInput.multiple = true;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFileAttachment(files);
        }
    });

    fileInput.click();
};

/**
 * Handle file attachment
 * @param {File[]} files
 */
const handleFileAttachment = (files) => {
    // Future: implement file attachment handling
    console.log('Files selected:', files);

    // For images, could convert to base64 and include in message
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            // Handle image attachment
            console.log('Image file:', file.name);
        } else {
            // Handle text/document attachment
            console.log('Document file:', file.name);
        }
    });

    showError('File attachments not yet fully implemented');
};

/**
 * Show error message
 * @param {string} message
 */
const showError = (message) => {
    // Simple alert for now, can be replaced with toast notification
    alert(message);
};

/**
 * Focus on search input
 */
export const focus = () => {
    if (searchInput) searchInput.focus();
};

/**
 * Set input value
 * @param {string} value
 */
export const setValue = (value) => {
    if (searchInput) searchInput.value = value;
};

/**
 * Get input value
 * @returns {string}
 */
export const getValue = () => {
    return searchInput?.value || '';
};

export default { init, focus, setValue, getValue };
