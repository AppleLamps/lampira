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
        try {
            currentAbortController.abort();
        } catch (e) {
            console.warn('Error aborting request:', e);
        }
        currentAbortController = null;
        isLoading = false;
        eventBus.emit(Events.LOADING_END);
        return true;
    }
    return false;
};

/**
 * Add a message to history
 * @param {string} role - Message role (user/assistant)
 * @param {string} content - Message content
 * @param {Array} sources - Optional sources/citations
 * @param {Array} images - Optional images (base64 data URLs)
 * @returns {Object} The added message
 */
export const addMessage = (role, content, sources = [], images = []) => {
    const message = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        role,
        content,
        sources,
        images: images || [],
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
 * @param {Object} options - Additional options (images array, stream boolean)
 * @returns {Promise<Object>}
 */
export const sendUserMessage = async (content, options = {}) => {
    if (isLoading) {
        throw new Error('Already processing a message');
    }

    const images = options.images || [];

    if (!content.trim() && images.length === 0) {
        throw new Error('Message cannot be empty');
    }

    isLoading = true;
    eventBus.emit(Events.LOADING_START);

    // Create new abort controller for this request
    currentAbortController = new AbortController();

    try {
        // Add user message with images
        const userMessage = addMessage('user', content, [], images);
        eventBus.emit(Events.MESSAGE_SEND, userMessage);

        // Prepare messages for API (with image support)
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

                    // Generate follow-up suggestions
                    generateFollowUpSuggestions(fullContent, assistantMessage);
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

/**
 * Generate follow-up suggestions based on the AI response
 * @param {string} aiResponse - The AI's response content
 * @param {Object} message - The assistant message object
 */
const generateFollowUpSuggestions = async (aiResponse, message) => {
    // Don't generate suggestions for very short responses
    if (aiResponse.length < 100) return;

    try {
        // Extract key topics from the response to generate relevant follow-ups
        const suggestions = extractFollowUpSuggestions(aiResponse);

        if (suggestions.length > 0) {
            eventBus.emit(Events.AI_SUGGESTIONS, {
                messageId: message.id,
                suggestions
            });
        }
    } catch (error) {
        console.warn('Failed to generate follow-up suggestions:', error);
    }
};

/**
 * Extract follow-up suggestions from AI response content
 * Uses heuristics to generate relevant follow-up questions
 * @param {string} content - AI response content
 * @returns {Array<string>} Follow-up suggestions
 */
const extractFollowUpSuggestions = (content) => {
    const suggestions = [];

    // Extract the main topic by looking at the first paragraph or heading
    const firstParagraph = content.split('\n').find(line => line.trim().length > 20) || '';

    // Common follow-up patterns based on content analysis
    const contentLower = content.toLowerCase();

    // Check for comparisons
    if (contentLower.includes('compared to') || contentLower.includes('versus') || contentLower.includes(' vs ')) {
        suggestions.push('What are the key differences in more detail?');
    }

    // Check for lists or steps
    if (contentLower.includes('1.') || contentLower.includes('first,') || contentLower.includes('step ')) {
        suggestions.push('Can you explain the most important step?');
    }

    // Check for technical content
    if (contentLower.includes('function') || contentLower.includes('code') || contentLower.includes('implementation')) {
        suggestions.push('Can you show a code example?');
    }

    // Check for concepts that might need more explanation
    if (contentLower.includes('however') || contentLower.includes('although') || contentLower.includes('but ')) {
        suggestions.push('What are the main limitations or drawbacks?');
    }

    // Check for recommendations
    if (contentLower.includes('recommend') || contentLower.includes('suggest') || contentLower.includes('best practice')) {
        suggestions.push('What are alternative approaches?');
    }

    // Generic follow-ups if we don't have enough specific ones
    if (suggestions.length < 2) {
        suggestions.push('Can you elaborate on this topic?');
    }
    if (suggestions.length < 3) {
        suggestions.push('What are practical applications of this?');
    }

    // Return up to 3 suggestions
    return suggestions.slice(0, 3);
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
