/**
 * Message List Component
 * Renders chat messages with streaming support
 */

import { $, $$, createElement, empty, scrollIntoView, addClass, removeClass } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { parseMarkdown, highlightCodeBlocks } from '../utils/markdown.js';
import { getHistory, sendUserMessage } from '../services/chat.js';
import { icons, USER_PATH, LOGO_PATH, SOURCES_PATH, CHEVRON_DOWN_PATH, COPY_PATH, CHECK_PATH } from '../utils/icons.js';

// DOM Elements
let mainContent;
let messageContainer;
let brandTitle;
let searchContainer;

/**
 * Initialize message list component
 */
export const init = () => {
    mainContent = $('.main-content');
    brandTitle = $('.brand-title');
    searchContainer = $('.search-container');

    // Create message container
    messageContainer = $('.message-container');
    if (!messageContainer) {
        messageContainer = createElement('div', { className: 'message-container' });
        messageContainer.style.display = 'none';
        mainContent.insertBefore(messageContainer, searchContainer);
    }

    // Subscribe to events
    eventBus.on(Events.CHAT_UPDATED, handleChatUpdated);
    eventBus.on(Events.AI_STREAMING, handleStreaming);
    eventBus.on(Events.AI_PROCESSING, handleProcessing);
    eventBus.on(Events.AI_COMPLETE, handleComplete);
    eventBus.on(Events.AI_SOURCES_UPDATED, handleSourcesUpdated);
    eventBus.on(Events.CHAT_CLEARED, handleChatCleared);
    eventBus.on(Events.CHAT_LOADED, handleChatLoaded);
    eventBus.on(Events.AI_SUGGESTIONS, handleSuggestions);

    // Render any existing messages
    const history = getHistory();
    if (history.length > 0) {
        renderMessages(history);
        showChatMode();
    }
};

/**
 * Handle chat updated event
 * @param {Object} data
 */
const handleChatUpdated = ({ history, message }) => {
    if (history.length > 0) {
        showChatMode();
    }

    if (message) {
        renderMessage(message);
        scrollToBottom();
    }
};

/**
 * Handle streaming event
 * @param {Object} data
 */
const handleStreaming = ({ chunk, fullContent, message }) => {
    const messageEl = $(`[data-message-id="${message.id}"]`);
    if (messageEl) {
        removeClass(messageEl, 'processing');
        addClass(messageEl, 'streaming');
        const contentEl = $('.message-content', messageEl);
        if (contentEl) {
            contentEl.innerHTML = parseMarkdown(fullContent);
            // Note: We don't highlight during streaming for performance
        }
        scrollToBottom();
    }
};

/**
 * Handle processing event (OpenRouter processing)
 * @param {Object} data
 */
const handleProcessing = ({ message }) => {
    const messageEl = $(`[data-message-id="${message.id}"]`);
    if (messageEl) {
        addClass(messageEl, 'processing');
        const contentEl = $('.message-content', messageEl);
        if (contentEl) {
            contentEl.innerHTML = '<div class="processing-indicator"><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line"></div></div>';
        }
    }
};

/**
 * Handle AI complete event
 * @param {Object} data
 */
const handleComplete = ({ content, message, sources }) => {
    const messageEl = $(`[data-message-id="${message.id}"]`);
    if (messageEl) {
        removeClass(messageEl, 'streaming');
        removeClass(messageEl, 'processing');
        const contentEl = $('.message-content', messageEl);
        if (contentEl) {
            contentEl.innerHTML = parseMarkdown(content);
            // Apply syntax highlighting to code blocks
            highlightCodeBlocks(contentEl);
            // Add copy buttons to code blocks
            addCopyButtonsToCodeBlocks(contentEl);
        }
        // Render sources if available
        if (sources && sources.length > 0) {
            renderSources(messageEl, sources);
        }
    }
    scrollToBottom();
};

/**
 * Handle follow-up suggestions event
 * @param {Object} data
 */
const handleSuggestions = ({ messageId, suggestions }) => {
    const messageEl = $(`[data-message-id="${messageId}"]`);
    if (messageEl && suggestions && suggestions.length > 0) {
        renderSuggestions(messageEl, suggestions);
        scrollToBottom();
    }
};

/**
 * Handle sources updated event (real-time citation updates)
 * @param {Object} data
 */
const handleSourcesUpdated = ({ message, sources }) => {
    const messageEl = $(`[data-message-id="${message.id}"]`);
    if (messageEl && sources && sources.length > 0) {
        renderSources(messageEl, sources);
    }
};

/**
 * Handle chat cleared event
 */
const handleChatCleared = () => {
    empty(messageContainer);
    showWelcomeMode();
};

/**
 * Handle chat loaded event
 * @param {Object} data
 */
const handleChatLoaded = ({ history }) => {
    renderMessages(history);
    showChatMode();
    scrollToBottom();
};

/**
 * Show chat mode (hide brand title)
 */
const showChatMode = () => {
    if (brandTitle) brandTitle.style.display = 'none';
    if (messageContainer) messageContainer.style.display = 'flex';
    if (mainContent) {
        mainContent.style.justifyContent = 'flex-start';
        mainContent.style.paddingTop = '20px';
    }
    if (searchContainer) {
        searchContainer.style.position = 'sticky';
        searchContainer.style.bottom = '0';
        searchContainer.style.backgroundColor = '#ffffff';
        searchContainer.style.paddingTop = '20px';
        searchContainer.style.paddingBottom = '20px';
    }
};

/**
 * Show welcome mode (show brand title)
 */
const showWelcomeMode = () => {
    if (brandTitle) brandTitle.style.display = '';
    if (messageContainer) messageContainer.style.display = 'none';
    if (mainContent) {
        mainContent.style.justifyContent = 'center';
        mainContent.style.paddingTop = '';
    }
    if (searchContainer) {
        searchContainer.style.position = '';
        searchContainer.style.bottom = '';
        searchContainer.style.backgroundColor = '';
        searchContainer.style.paddingTop = '';
        searchContainer.style.paddingBottom = '';
    }
};

/**
 * Render all messages
 * @param {Array} messages
 */
const renderMessages = (messages) => {
    empty(messageContainer);
    messages.forEach(message => {
        renderMessage(message, false);
    });
};

/**
 * Render a single message
 * @param {Object} message
 * @param {boolean} animate
 */
const renderMessage = (message, animate = true) => {
    const isUser = message.role === 'user';
    const isStreaming = message.role === 'assistant' && !message.content;

    const messageEl = createElement('div', {
        className: `message ${isUser ? 'message-user' : 'message-assistant'} ${isStreaming ? 'streaming' : ''}`,
        dataset: { messageId: message.id }
    });

    // Avatar
    const avatar = createElement('div', { className: 'message-avatar' });
    if (isUser) {
        avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${USER_PATH}</svg>`;
    } else {
        avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${LOGO_PATH}</svg>`;
    }

    // Content wrapper
    const wrapper = createElement('div', { className: 'message-wrapper' });

    // Role label
    const roleLabel = createElement('div', { className: 'message-role' }, isUser ? 'You' : 'Lampira');

    // Content
    const content = createElement('div', { className: 'message-content' });

    // Render images if present (user messages with image attachments)
    if (message.images && message.images.length > 0) {
        const imagesContainer = createElement('div', { className: 'message-images' });
        message.images.forEach(imageUrl => {
            const img = createElement('img', {
                src: imageUrl,
                alt: 'Attached image',
                className: 'message-image'
            });
            img.addEventListener('click', () => openImageModal(imageUrl));
            imagesContainer.appendChild(img);
        });
        content.appendChild(imagesContainer);
    }

    if (message.content) {
        const textContent = createElement('div', { className: 'message-text' });
        textContent.innerHTML = parseMarkdown(message.content);
        content.appendChild(textContent);
        // Apply syntax highlighting after adding to DOM (deferred)
        requestAnimationFrame(() => {
            highlightCodeBlocks(textContent);
            addCopyButtonsToCodeBlocks(textContent);
        });
    } else if (!message.images || message.images.length === 0) {
        content.innerHTML = '<div class="processing-indicator"><div class="shimmer-line"></div><div class="shimmer-line"></div><div class="shimmer-line"></div></div>';
    }

    wrapper.appendChild(roleLabel);
    wrapper.appendChild(content);

    // Add sources if available (for loaded messages)
    if (message.sources && message.sources.length > 0) {
        const sourcesEl = createSourcesElement(message.sources);
        wrapper.appendChild(sourcesEl);
    }

    messageEl.appendChild(avatar);
    messageEl.appendChild(wrapper);

    // Add animation class
    if (animate) {
        addClass(messageEl, 'animate-in');
    }

    messageContainer.appendChild(messageEl);
};

/**
 * Create sources element
 * @param {Array} sources - Array of source objects
 * @returns {HTMLElement}
 */
const createSourcesElement = (sources) => {
    const sourcesContainer = createElement('div', { className: 'message-sources collapsed' });

    const sourcesHeader = createElement('div', { className: 'sources-header' });
    sourcesHeader.innerHTML = `
        <svg class="sources-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">${SOURCES_PATH}</svg>
        <span>Sources</span>
        <span class="sources-count">${sources.length}</span>
        <svg class="sources-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">${CHEVRON_DOWN_PATH}</svg>
    `;

    // Add click handler to toggle sources visibility
    sourcesHeader.addEventListener('click', () => {
        sourcesContainer.classList.toggle('collapsed');
    });

    sourcesContainer.appendChild(sourcesHeader);

    const sourcesList = createElement('div', { className: 'sources-list' });

    sources.forEach((source, index) => {
        const sourceCard = createElement('a', {
            className: 'source-card',
            href: source.url,
            target: '_blank',
            rel: 'noopener noreferrer'
        });

        // Extract favicon URL from source
        let faviconUrl = '';
        try {
            const url = new URL(source.url);
            faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
        } catch {
            faviconUrl = '';
        }

        // Get domain for display
        let domain = '';
        try {
            domain = new URL(source.url).hostname.replace('www.', '');
        } catch {
            domain = source.url;
        }

        sourceCard.innerHTML = `
            <div class="source-number">${index + 1}</div>
            <div class="source-info">
                <div class="source-title">${escapeHtml(source.title || domain)}</div>
                <div class="source-domain">
                    ${faviconUrl ? `<img src="${faviconUrl}" alt="" class="source-favicon" onerror="this.style.display='none'">` : ''}
                    <span>${domain}</span>
                </div>
            </div>
        `;

        sourcesList.appendChild(sourceCard);
    });

    sourcesContainer.appendChild(sourcesList);
    return sourcesContainer;
};

/**
 * Render or update sources for a message
 * @param {HTMLElement} messageEl - Message element
 * @param {Array} sources - Array of sources
 */
const renderSources = (messageEl, sources) => {
    const wrapper = $('.message-wrapper', messageEl);
    if (!wrapper) return;

    // Remove existing sources
    const existingSources = $('.message-sources', wrapper);
    if (existingSources) {
        existingSources.remove();
    }

    // Add new sources
    const sourcesEl = createSourcesElement(sources);
    wrapper.appendChild(sourcesEl);
};

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

/**
 * Scroll to bottom of message container
 */
const scrollToBottom = () => {
    if (messageContainer && messageContainer.lastElementChild) {
        scrollIntoView(messageContainer.lastElementChild);
    }
};

/**
 * Update a specific message content
 * @param {string} messageId
 * @param {string} content
 */
export const updateMessageContent = (messageId, content) => {
    const messageEl = $(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        const contentEl = $('.message-content', messageEl);
        if (contentEl) {
            contentEl.innerHTML = parseMarkdown(content);
            highlightCodeBlocks(contentEl);
            addCopyButtonsToCodeBlocks(contentEl);
        }
    }
};

/**
 * Add copy buttons to all code blocks in a container
 * @param {HTMLElement} container - Container with code blocks
 */
const addCopyButtonsToCodeBlocks = (container) => {
    const codeBlocks = container.querySelectorAll('pre');

    codeBlocks.forEach(pre => {
        // Skip if already has a copy button
        if (pre.querySelector('.code-copy-btn')) return;

        // Create wrapper for positioning
        pre.style.position = 'relative';

        // Create copy button
        const copyBtn = createElement('button', {
            className: 'code-copy-btn',
            title: 'Copy code'
        });
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">${COPY_PATH}</svg><span>Copy</span>`;

        // Add click handler
        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;

            try {
                await navigator.clipboard.writeText(text);

                // Show copied feedback
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">${CHECK_PATH}</svg><span>Copied!</span>`;
                addClass(copyBtn, 'copied');

                // Reset after delay
                setTimeout(() => {
                    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">${COPY_PATH}</svg><span>Copy</span>`;
                    removeClass(copyBtn, 'copied');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback for older browsers
                fallbackCopy(text);
            }
        });

        pre.appendChild(copyBtn);
    });
};

/**
 * Fallback copy method for browsers without clipboard API
 * @param {string} text - Text to copy
 */
const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textarea);
};

/**
 * Render follow-up suggestions for a message
 * @param {HTMLElement} messageEl - Message element
 * @param {Array<string>} suggestions - Array of suggestion strings
 */
const renderSuggestions = (messageEl, suggestions) => {
    const wrapper = $('.message-wrapper', messageEl);
    if (!wrapper) return;

    // Remove existing suggestions
    const existingSuggestions = $('.follow-up-suggestions', wrapper);
    if (existingSuggestions) {
        existingSuggestions.remove();
    }

    // Create suggestions container
    const suggestionsContainer = createElement('div', { className: 'follow-up-suggestions' });

    const suggestionsHeader = createElement('div', { className: 'suggestions-header' }, 'Follow-up questions');
    suggestionsContainer.appendChild(suggestionsHeader);

    const suggestionsList = createElement('div', { className: 'suggestions-list' });

    suggestions.forEach(suggestion => {
        const chip = createElement('button', {
            className: 'suggestion-chip'
        }, suggestion);

        chip.addEventListener('click', async () => {
            // Send the suggestion as a new message
            try {
                await sendUserMessage(suggestion);
            } catch (error) {
                console.error('Failed to send suggestion:', error);
            }
        });

        suggestionsList.appendChild(chip);
    });

    suggestionsContainer.appendChild(suggestionsList);
    wrapper.appendChild(suggestionsContainer);
};

/**
 * Open an image in a fullscreen modal
 * @param {string} imageUrl - Image URL or base64 data URL
 */
const openImageModal = (imageUrl) => {
    // Create modal backdrop
    const modal = createElement('div', { className: 'image-modal' });

    // Create image container
    const imgContainer = createElement('div', { className: 'image-modal-content' });

    // Create image
    const img = createElement('img', {
        src: imageUrl,
        alt: 'Full size image'
    });

    // Create close button
    const closeBtn = createElement('button', { className: 'image-modal-close' });
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => modal.remove());

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    imgContainer.appendChild(img);
    imgContainer.appendChild(closeBtn);
    modal.appendChild(imgContainer);
    document.body.appendChild(modal);
};

export default { init, renderMessages, renderMessage, updateMessageContent, scrollToBottom };
