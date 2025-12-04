/**
 * Search Box Component
 * Handles message input and sending with image upload support
 */

import { $, addClass, removeClass, toggleClass, createElement } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { sendUserMessage, getIsLoading, cancelCurrentRequest } from '../services/chat.js';
import { generate as generateImage, getIsGenerating } from '../services/imageGen.js';
import { STOP_PATH, SEND_PATH, CLOSE_PATH, GLOBE_PATH, DOCUMENT_PATH } from '../utils/icons.js';
import * as voiceInput from '../services/voiceInput.js';
import {
    FILE_TYPES,
    processFiles,
    extractImagesFromClipboard,
    createAcceptString
} from '../utils/fileHandler.js';

// DOM Elements
let searchBox;
let searchInput;
let voiceBtn;
let attachBtn;
let imageUploadBtn;
let sendStopBtn;
let webSearchBtn;
let attachmentPreview;

// Attached images (base64 data URLs)
let attachedImages = [];

// Attached PDFs (base64 data URLs with metadata)
let attachedPDFs = [];

// Current view state
let currentView = 'chat';

// Web search enabled state
let webSearchEnabled = false;

// Placeholder texts
const PLACEHOLDERS = {
    chat: 'Ask anything...',
    chatWeb: 'Search the web...',
    images: 'Describe an image to generate...'
};

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

    // Create web search toggle button
    createWebSearchButton();

    // Create send/stop button
    createSendStopButton();

    // Initialize voice input service
    initVoiceInput();

    setupEventListeners();

    // Subscribe to events
    eventBus.on(Events.LOADING_START, handleLoadingStart);
    eventBus.on(Events.LOADING_END, handleLoadingEnd);
    eventBus.on(Events.VIEW_CHANGED, handleViewChanged);
    eventBus.on(Events.CHAT_CLEARED, () => {
        clearAttachments();
        if (searchInput) searchInput.focus();
    });
};

/**
 * Initialize voice input service with callbacks
 */
const initVoiceInput = () => {
    voiceInput.init({
        onResult: (transcript) => {
            if (searchInput) {
                searchInput.value = transcript;
            }
        },
        onStart: () => {
            if (voiceBtn) addClass(voiceBtn, 'recording');
            if (searchInput) searchInput.placeholder = 'Listening...';
        },
        onEnd: () => {
            if (voiceBtn) removeClass(voiceBtn, 'recording');
            updatePlaceholder();
        },
        onError: (errorMessage) => {
            showError(errorMessage);
        }
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
 * Create the web search toggle button
 */
const createWebSearchButton = () => {
    const rightControls = $('.search-right-controls');
    if (!rightControls) return;

    webSearchBtn = createElement('button', {
        className: 'icon-btn web-search-btn',
        title: 'Enable web search'
    });
    webSearchBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${GLOBE_PATH}</svg>`;

    // Insert before attach button
    const attachBtnEl = $('#attach-btn');
    if (attachBtnEl) {
        rightControls.insertBefore(webSearchBtn, attachBtnEl);
    } else {
        rightControls.appendChild(webSearchBtn);
    }
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

    if (webSearchBtn) {
        webSearchBtn.addEventListener('click', handleWebSearchToggle);
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
 * Handle web search toggle button click
 */
const handleWebSearchToggle = () => {
    webSearchEnabled = !webSearchEnabled;

    // Update button appearance
    if (webSearchEnabled) {
        addClass(webSearchBtn, 'active');
        webSearchBtn.title = 'Disable web search';
    } else {
        removeClass(webSearchBtn, 'active');
        webSearchBtn.title = 'Enable web search';
    }

    // Update placeholder
    updatePlaceholder();

    // Emit event
    eventBus.emit(Events.WEB_SEARCH_TOGGLE, { enabled: webSearchEnabled });
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
 * Handle view changed event
 * @param {Object} data
 */
const handleViewChanged = ({ view }) => {
    currentView = view;
    updatePlaceholder();
    updateControlsForView();
};

/**
 * Update placeholder text based on current view and web search state
 */
const updatePlaceholder = () => {
    if (searchInput && !getIsLoading() && !getIsGenerating()) {
        if (currentView === 'images') {
            searchInput.placeholder = PLACEHOLDERS.images;
        } else if (webSearchEnabled) {
            searchInput.placeholder = PLACEHOLDERS.chatWeb;
        } else {
            searchInput.placeholder = PLACEHOLDERS.chat;
        }
    }
};

/**
 * Update controls visibility based on current view
 */
const updateControlsForView = () => {
    // Hide image upload and model selector in image generation view
    const leftControls = $('.search-left-controls');
    if (leftControls) {
        if (currentView === 'images') {
            leftControls.style.opacity = '0.5';
            leftControls.style.pointerEvents = 'none';
        } else {
            leftControls.style.opacity = '';
            leftControls.style.pointerEvents = '';
        }
    }

    // Hide web search button in image generation view
    if (webSearchBtn) {
        if (currentView === 'images') {
            webSearchBtn.style.display = 'none';
        } else {
            webSearchBtn.style.display = '';
        }
    }
};

/**
 * Submit the current message
 */
const submitMessage = async () => {
    if (!searchInput) return;

    const content = searchInput.value.trim();

    // Route based on current view
    if (currentView === 'images') {
        await submitImageGeneration(content);
    } else {
        await submitChatMessage(content);
    }
};

/**
 * Submit a chat message
 * @param {string} content
 */
const submitChatMessage = async (content) => {
    // Need either text, images, or PDFs to send
    if (!content && attachedImages.length === 0 && attachedPDFs.length === 0) return;

    // Check if already loading
    if (getIsLoading()) {
        return;
    }

    // Store values before clearing
    const messageText = content;
    const images = [...attachedImages];
    const pdfs = [...attachedPDFs];
    const useWebSearch = webSearchEnabled;

    // Clear input and attachments
    searchInput.value = '';
    clearAttachments();

    try {
        await sendUserMessage(messageText, { images, pdfs, webSearchEnabled: useWebSearch });
    } catch (error) {
        console.error('Failed to send message:', error);
        // Restore input on error
        searchInput.value = messageText;
        // Restore images
        images.forEach(img => addImageToPreview(img));
        // Restore PDFs
        pdfs.forEach(pdf => addPDFToPreview(pdf.data, pdf.filename));
        showError(error.message);
    }
};

/**
 * Submit an image generation request
 * @param {string} prompt
 */
const submitImageGeneration = async (prompt) => {
    if (!prompt) {
        showError('Please enter a description for the image');
        return;
    }

    // Check if already generating
    if (getIsGenerating()) {
        return;
    }

    // Clear input
    searchInput.value = '';

    try {
        await generateImage(prompt);
    } catch (error) {
        console.error('Failed to generate image:', error);
        // Restore input on error
        searchInput.value = prompt;
        showError(error.message || 'Image generation failed');
    }
};

/**
 * Handle loading start
 */
const handleLoadingStart = () => {
    if (searchInput) {
        searchInput.disabled = true;
        // Use context-appropriate placeholder
        searchInput.placeholder = currentView === 'images' ? 'Generating image...' : 'Thinking...';
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
        updatePlaceholder();
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
    if (!voiceInput.isSupported()) {
        showError('Voice input is not supported in your browser');
        return;
    }

    voiceInput.toggle();
};

/**
 * Handle attach button click (images and PDFs)
 */
const handleAttachClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = createAcceptString(FILE_TYPES.IMAGE, FILE_TYPES.PDF);
    fileInput.multiple = true;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    fileInput.click();
};

/**
 * Handle image upload button click
 */
const handleImageUploadClick = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = createAcceptString(FILE_TYPES.IMAGE);
    fileInput.multiple = true;

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleImageOnlyFiles(files);
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

    const imageFiles = extractImagesFromClipboard(items);

    if (imageFiles.length > 0) {
        e.preventDefault();
        handleImageOnlyFiles(imageFiles);
    }
};

/**
 * Handle mixed files - route to appropriate handler using fileHandler utility
 * @param {File[]} files
 */
const handleFiles = async (files) => {
    const result = await processFiles(files);

    // Show any errors
    for (const error of result.errors) {
        showError(error);
    }

    // Add processed images to preview
    for (const { base64 } of result.images) {
        addImageToPreview(base64);
    }

    // Add processed PDFs to preview
    for (const { file, base64 } of result.pdfs) {
        addPDFToPreview(base64, file.name);
    }
};

/**
 * Handle image-only files
 * @param {File[]} files
 */
const handleImageOnlyFiles = async (files) => {
    const result = await processFiles(files);

    // Show any errors (but filter to only image-related ones)
    for (const error of result.errors) {
        if (error.toLowerCase().includes('image')) {
            showError(error);
        }
    }

    // Add processed images to preview
    for (const { base64 } of result.images) {
        addImageToPreview(base64);
    }
};

/**
 * Add image to preview area
 * @param {string} base64 - Base64 data URL
 */
const addImageToPreview = (base64) => {
    attachedImages.push(base64);

    const imageWrapper = createElement('div', { className: 'attachment-item' });
    imageWrapper.dataset.index = attachedImages.length - 1;
    imageWrapper.dataset.type = 'image';

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
 * Add PDF to preview area
 * @param {string} base64 - Base64 data URL
 * @param {string} filename - Original filename
 */
const addPDFToPreview = (base64, filename) => {
    attachedPDFs.push({ data: base64, filename });

    const pdfWrapper = createElement('div', { className: 'attachment-item attachment-pdf' });
    pdfWrapper.dataset.index = attachedPDFs.length - 1;
    pdfWrapper.dataset.type = 'pdf';

    const iconContainer = createElement('div', { className: 'pdf-icon' });
    iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${DOCUMENT_PATH}</svg>`;

    const nameEl = createElement('span', { className: 'pdf-name' });
    nameEl.textContent = filename.length > 12 ? filename.substring(0, 10) + '...' : filename;
    nameEl.title = filename;

    const removeBtn = createElement('button', {
        className: 'attachment-remove',
        title: 'Remove PDF'
    });
    removeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${CLOSE_PATH}</svg>`;
    removeBtn.addEventListener('click', () => removeAttachment(pdfWrapper));

    pdfWrapper.appendChild(iconContainer);
    pdfWrapper.appendChild(nameEl);
    pdfWrapper.appendChild(removeBtn);
    attachmentPreview.appendChild(pdfWrapper);
    attachmentPreview.style.display = 'flex';
};

/**
 * Remove an attachment
 * @param {HTMLElement} wrapper
 */
const removeAttachment = (wrapper) => {
    const index = parseInt(wrapper.dataset.index, 10);
    const type = wrapper.dataset.type;

    if (type === 'pdf') {
        attachedPDFs.splice(index, 1);
        // Update indices for remaining PDF items
        const pdfItems = attachmentPreview.querySelectorAll('.attachment-item[data-type="pdf"]');
        pdfItems.forEach((item, i) => item.dataset.index = i);
    } else {
        attachedImages.splice(index, 1);
        // Update indices for remaining image items
        const imageItems = attachmentPreview.querySelectorAll('.attachment-item[data-type="image"]');
        imageItems.forEach((item, i) => item.dataset.index = i);
    }

    wrapper.remove();

    // Hide preview if empty
    if (attachedImages.length === 0 && attachedPDFs.length === 0) {
        attachmentPreview.style.display = 'none';
    }
};

/**
 * Clear all attachments
 */
const clearAttachments = () => {
    attachedImages = [];
    attachedPDFs = [];
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
