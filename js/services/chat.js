/**
 * Chat Service
 * Manages conversation state and AI interactions
 */

import config from '../config.js';
import eventBus, { Events } from '../utils/events.js';
import { saveCurrentChat, loadCurrentChat, clearCurrentChat, saveChat } from './storage.js';
import { getModel } from './models.js';
import { sendMessage, sendMessageStream, formatMessages, getModelParams } from '../api/openrouter.js';

// Current conversation history
let history = loadCurrentChat() || [];

// Current chat ID (null for new/unsaved chat)
let currentChatId = null;

// Loading state
let isLoading = false;

// Current abort controller for stream cancellation
let currentAbortController = null;

/**
 * Get conversation history
 * @returns {Array}
 */
export const getHistory = () => [...history];

/**
 * Get current chat ID
 * @returns {string|null}
 */
export const getCurrentChatId = () => currentChatId;

/**
 * Check if currently loading
 * @returns {boolean}
 */
export const getIsLoading = () => isLoading;

/**
 * Cancel current streaming request
 * @returns {boolean} Whether cancellation was triggered
 */
export const cancelCurrentRequest = () => {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        return true;
    }
    return false;
};

/**
 * Add a message to history
 * @param {string} role - Message role (user/assistant)
 * @param {string} content - Message content
 * @param {Array} sources - Optional sources/citations
 * @returns {Object} The added message
 */
export const addMessage = (role, content, sources = []) => {
    const message = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        role,
        content,
        sources,
        timestamp: Date.now()
    };

    history.push(message);
    saveCurrentChat(history);
    eventBus.emit(Events.CHAT_UPDATED, { history, message });

    return message;
};

/**
 * Update the last assistant message (for streaming)
 * @param {string} content - Updated content
 * @param {Array} sources - Optional sources/citations
 */
export const updateLastAssistantMessage = (content, sources = null) => {
    const lastMsg = history.findLast(m => m.role === 'assistant');
    if (lastMsg) {
        lastMsg.content = content;
        if (sources !== null) {
            lastMsg.sources = sources;
        }
        saveCurrentChat(history);
    }
};

/**
 * Clear conversation history
 */
export const clearHistory = () => {
    history = [];
    currentChatId = null;
    clearCurrentChat();
    eventBus.emit(Events.CHAT_CLEARED);
};

/**
 * Load a saved chat
 * @param {string} chatId - Chat ID
 * @param {Array} messages - Messages array
 */
export const loadChatHistory = (chatId, messages) => {
    history = messages;
    currentChatId = chatId;
    saveCurrentChat(history);
    eventBus.emit(Events.CHAT_LOADED, { chatId, history });
};

/**
 * Save current chat
 * @param {string} title - Optional title
 * @returns {string} Chat ID
 */
export const saveCurrentChatToStorage = (title = null) => {
    currentChatId = saveChat(currentChatId, history, title);
    return currentChatId;
};

/**
 * Send a message and get AI response
 * @param {string} content - User message content
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
export const sendUserMessage = async (content, options = {}) => {
    if (isLoading) {
        throw new Error('Already processing a message');
    }

    if (!content.trim()) {
        throw new Error('Message cannot be empty');
    }

    isLoading = true;
    eventBus.emit(Events.LOADING_START);

    // Create new abort controller for this request
    currentAbortController = new AbortController();

    try {
        // Add user message
        const userMessage = addMessage('user', content);
        eventBus.emit(Events.MESSAGE_SEND, userMessage);

        // Prepare messages for API
        const messages = formatMessages(history, config.chat.systemPrompt);
        const model = getModel();
        const modelParams = getModelParams(model);

        // Check if streaming is enabled
        const useStreaming = options.stream !== false && config.chat.streamingEnabled;

        if (useStreaming) {
            // Add placeholder for assistant message
            const assistantMessage = addMessage('assistant', '', []);

            await sendMessageStream(messages, model, {
                onChunk: (chunk, fullContent) => {
                    updateLastAssistantMessage(fullContent);
                    eventBus.emit(Events.AI_STREAMING, { chunk, fullContent, message: assistantMessage });
                },
                onComplete: (fullContent, usage, annotations) => {
                    updateLastAssistantMessage(fullContent, annotations || []);
                    assistantMessage.sources = annotations || [];
                    eventBus.emit(Events.AI_COMPLETE, { content: fullContent, message: assistantMessage, usage, sources: annotations || [] });

                    // Auto-save chat
                    saveCurrentChatToStorage();
                },
                onError: (error) => {
                    // Remove empty assistant message on error
                    history = history.filter(m => m.id !== assistantMessage.id);
                    saveCurrentChat(history);
                    eventBus.emit(Events.AI_ERROR, error);
                },
                onProcessing: () => {
                    // Emit processing event for UI feedback
                    eventBus.emit(Events.AI_PROCESSING, { message: assistantMessage });
                },
                onAnnotations: (annotations) => {
                    // Update sources as they come in
                    updateLastAssistantMessage(assistantMessage.content, annotations);
                    assistantMessage.sources = annotations;
                    eventBus.emit(Events.AI_SOURCES_UPDATED, { message: assistantMessage, sources: annotations });
                }
            }, modelParams, currentAbortController);

            return assistantMessage;
        } else {
            // Non-streaming request
            const response = await sendMessage(messages, model, modelParams);
            const aiContent = response.choices?.[0]?.message?.content || 'No response received';

            const assistantMessage = addMessage('assistant', aiContent);
            eventBus.emit(Events.AI_COMPLETE, { content: aiContent, message: assistantMessage });
            eventBus.emit(Events.MESSAGE_RECEIVED, assistantMessage);

            // Auto-save chat
            saveCurrentChatToStorage();

            return assistantMessage;
        }
    } catch (error) {
        eventBus.emit(Events.AI_ERROR, error);
        throw error;
    } finally {
        isLoading = false;
        currentAbortController = null;
        eventBus.emit(Events.LOADING_END);
    }
};

/**
 * Regenerate the last AI response
 * @returns {Promise<Object>}
 */
export const regenerateLastResponse = async () => {
    // Find and remove the last assistant message
    const lastAssistantIndex = history.findLastIndex(m => m.role === 'assistant');
    if (lastAssistantIndex === -1) {
        throw new Error('No assistant message to regenerate');
    }

    // Get the user message before it
    const userMessage = history.slice(0, lastAssistantIndex).findLast(m => m.role === 'user');
    if (!userMessage) {
        throw new Error('No user message found');
    }

    // Remove messages after and including the last assistant message
    history = history.slice(0, lastAssistantIndex);
    saveCurrentChat(history);
    eventBus.emit(Events.CHAT_UPDATED, { history });

    // Resend
    return sendUserMessage(userMessage.content);
};

/**
 * Edit a previous user message and regenerate
 * @param {string} messageId - Message ID to edit
 * @param {string} newContent - New content
 * @returns {Promise<Object>}
 */
export const editAndResend = async (messageId, newContent) => {
    const messageIndex = history.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
        throw new Error('Message not found');
    }

    // Remove this message and all after it
    history = history.slice(0, messageIndex);
    saveCurrentChat(history);
    eventBus.emit(Events.CHAT_UPDATED, { history });

    // Send new message
    return sendUserMessage(newContent);
};

export default {
    getHistory,
    getCurrentChatId,
    getIsLoading,
    cancelCurrentRequest,
    addMessage,
    clearHistory,
    loadChatHistory,
    saveCurrentChatToStorage,
    sendUserMessage,
    regenerateLastResponse,
    editAndResend
};
