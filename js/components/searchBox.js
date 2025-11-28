/**
 * Search Box Component
 * Handles message input and sending with image upload support
 */

import { $, addClass, removeClass, toggleClass, createElement } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { sendUserMessage, getIsLoading, cancelCurrentRequest } from '../services/chat.js';
import { STOP_PATH, SEND_PATH, CLOSE_PATH } from '../utils/icons.js';

// DOM Elements
let searchBox;
let searchInput;
let voiceBtn;
let attachBtn;
let imageUploadBtn;
let sendStopBtn;
let attachmentPreview;

// Attached images (base64 data URLs)
let attachedImages = [];

// Supported image types
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB max

/**
 * Initialize search box component
 */
export const init = () => {
    searchBox = $('.search-box');
    searchInput = $('.search-input');
    voiceBtn = $('.voice-btn');
    attachBtn = $('#attach-btn');
    imageUploadBtn = $('#image-upload-btn');

    // Create attachment preview area
    createAttachmentPreview();

    // Create send/stop button
    createSendStopButton();

    setupEventListeners();

    // Subscribe to events
    eventBus.on(Events.LOADING_START, handleLoadingStart);
    eventBus.on(Events.LOADING_END, handleLoadingEnd);
    eventBus.on(Events.CHAT_CLEARED, () => {
        clearAttachments();
        if (searchInput) searchInput.focus();
    });
};

/**
 * Create attachment preview area
 */
const createAttachmentPreview = () => {
    attachmentPreview = createElement('div', { className: 'attachment-preview' });
    attachmentPreview.style.display = 'none';

    // Insert before search controls
    const searchControls = $('.search-controls');
    if (searchControls) {
        searchBox.insertBefore(attachmentPreview, searchControls);
    }
};

/**
 * Create the send/stop toggle button
 */
const createSendStopButton = () => {
    const rightControls = $('.search-right-controls');
    if (!rightControls) return;

    sendStopBtn = createElement('button', {
        className: 'send-stop-btn',
        title: 'Send message'
    });
    sendStopBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${SEND_PATH}</svg>`;
    sendStopBtn.dataset.mode = 'send';

    rightControls.appendChild(sendStopBtn);
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

        // Handle paste for images
        searchInput.addEventListener('paste', handlePaste);
    }

    if (voiceBtn) {
        voiceBtn.addEventListener('click', handleVoiceClick);
    }

    if (attachBtn) {
        attachBtn.addEventListener('click', handleAttachClick);
    }

    if (imageUploadBtn) {
        imageUploadBtn.addEventListener('click', handleImageUploadClick);
    }

    if (sendStopBtn) {
        sendStopBtn.addEventListener('click', handleSendStopClick);
    }
};

/**
 * Handle send/stop button click
 */
const handleSendStopClick = () => {
    if (sendStopBtn.dataset.mode === 'stop') {
        // Stop generation
        const cancelled = cancelCurrentRequest();
        if (cancelled) {
            eventBus.emit(Events.AI_CANCELLED);
        }
    } else {
        // Send message
        submitMessage();
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

    // Need either text or images to send
    if (!content && attachedImages.length === 0) return;

    // Check if already loading
    if (getIsLoading()) {
        return;
    }

    // Store values before clearing
    const messageText = content;
    const images = [...attachedImages];

    // Clear input and attachments
    searchInput.value = '';
    clearAttachments();

    try {
        await sendUserMessage(messageText, { images });
    } catch (error) {
        console.error('Failed to send message:', error);
        // Restore input on error
        searchInput.value = messageText;
        // Restore images
        images.forEach(img => addImageToPreview(img));
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

    // Switch to stop button
    if (sendStopBtn) {
        sendStopBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">${STOP_PATH}</svg>`;
        sendStopBtn.dataset.mode = 'stop';
        sendStopBtn.title = 'Stop generation';
        addClass(sendStopBtn, 'stop-mode');
    }
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

    // Switch back to send button
    if (sendStopBtn) {
        sendStopBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${SEND_PATH}</svg>`;
        sendStopBtn.dataset.mode = 'send';
        sendStopBtn.title = 'Send message';
        removeClass(sendStopBtn, 'stop-mode');
    }
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
 * Handle attach button click (general files - future expansion)
 */
const handleAttachClick = () => {
    // For now, redirect to image upload
    handleImageUploadClick();
};

/**
 * Handle image upload button click
 */
const handleImageUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = SUPPORTED_IMAGE_TYPES.map(t => t.replace('image/', '.')).join(',') + ',image/*';
    fileInput.multiple = true;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
    });

    fileInput.click();
};

/**
 * Handle paste event to detect images
 * @param {ClipboardEvent} e
 */
const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
        }
    }

    if (imageFiles.length > 0) {
        e.preventDefault();
        handleImageFiles(imageFiles);
    }
};

/**
 * Handle image files - validate and convert to base64
 * @param {File[]} files
 */
const handleImageFiles = async (files) => {
    for (const file of files) {
        // Validate file type
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            showError(`Unsupported image type: ${file.type}. Supported: PNG, JPEG, WebP, GIF`);
            continue;
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
            showError(`Image too large: ${file.name}. Maximum size is 20MB.`);
            continue;
        }

        try {
            const base64 = await fileToBase64(file);
            addImageToPreview(base64);
        } catch (error) {
            console.error('Failed to process image:', error);
            showError(`Failed to process image: ${file.name}`);
        }
    }
};

/**
 * Convert a File to base64 data URL
 * @param {File} file
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Add image to preview area
 * @param {string} base64 - Base64 data URL
 */
const addImageToPreview = (base64) => {
    attachedImages.push(base64);

    const imageWrapper = createElement('div', { className: 'attachment-item' });
    imageWrapper.dataset.index = attachedImages.length - 1;

    const img = createElement('img', {
        src: base64,
        alt: 'Attached image'
    });

    const removeBtn = createElement('button', {
        className: 'attachment-remove',
        title: 'Remove image'
    });
    removeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${CLOSE_PATH}</svg>`;
    removeBtn.addEventListener('click', () => removeAttachment(imageWrapper));

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(removeBtn);
    attachmentPreview.appendChild(imageWrapper);
    attachmentPreview.style.display = 'flex';
};

/**
 * Remove an attachment
 * @param {HTMLElement} wrapper
 */
const removeAttachment = (wrapper) => {
    const index = parseInt(wrapper.dataset.index, 10);
    attachedImages.splice(index, 1);
    wrapper.remove();

    // Update indices for remaining items
    const items = attachmentPreview.querySelectorAll('.attachment-item');
    items.forEach((item, i) => item.dataset.index = i);

    // Hide preview if empty
    if (attachedImages.length === 0) {
        attachmentPreview.style.display = 'none';
    }
};

/**
 * Clear all attachments
 */
const clearAttachments = () => {
    attachedImages = [];
    if (attachmentPreview) {
        attachmentPreview.innerHTML = '';
        attachmentPreview.style.display = 'none';
    }
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
