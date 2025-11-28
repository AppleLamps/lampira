/**
 * OpenRouter API Client
 * Handles communication with OpenRouter API
 */

import { fetchJSON, fetchStream, APIError } from './base.js';
import config from '../config.js';

/**
 * Build web search configuration for request
 * @param {boolean} enabled - Whether web search is enabled for this request
 * @returns {Object} Web search options to merge into request
 */
const getWebSearchConfig = (enabled = false) => {
    if (!enabled) {
        return {};
    }

    const webConfig = {
        plugins: [{
            id: 'web',
            max_results: config.webSearch.maxResults || 10
        }]
    };

    // Add engine if specified
    if (config.webSearch.engine) {
        webConfig.plugins[0].engine = config.webSearch.engine;
    }

    // Add search context size for native search
    if (config.webSearch.searchContextSize) {
        webConfig.web_search_options = {
            search_context_size: config.webSearch.searchContextSize
        };
    }

    return webConfig;
};

/**
 * Send a chat completion request
 * @param {Array} messages - Array of message objects {role, content}
 * @param {string} model - Model ID to use
 * @param {Object} options - Additional options (includes webSearchEnabled)
 * @returns {Promise<Object>}
 */
export const sendMessage = async (messages, model = config.defaultModel, options = {}) => {
    const { webSearchEnabled, ...restOptions } = options;
    const webSearchConfig = getWebSearchConfig(webSearchEnabled);

    const body = {
        model,
        messages,
        ...webSearchConfig,
        ...restOptions
    };

    const response = await fetchJSON('/chat', {
        method: 'POST',
        body: JSON.stringify(body)
    });

    return response;
};

/**
 * Send a streaming chat completion request
 * @param {Array} messages - Array of message objects {role, content}
 * @param {string} model - Model ID to use
 * @param {Object} callbacks - Callback functions {onChunk, onComplete, onError, onProcessing, onAnnotations}
 * @param {Object} options - Additional options (includes webSearchEnabled)
 * @param {AbortController} abortController - Optional abort controller for cancellation
 */
export const sendMessageStream = async (messages, model = config.defaultModel, callbacks = {}, options = {}, abortController = null) => {
    const { webSearchEnabled, ...restOptions } = options;
    const webSearchConfig = getWebSearchConfig(webSearchEnabled);

    const body = {
        model,
        messages,
        ...webSearchConfig,
        ...restOptions
    };

    await fetchStream('/chat', body, callbacks, abortController);
};

/**
 * Get available models from OpenRouter
 * @returns {Promise<Array>}
 */
export const getModels = async () => {
    try {
        const response = await fetchJSON('/models', {
            method: 'GET'
        });
        return response.data || [];
    } catch (error) {
        console.error('Failed to fetch models:', error);
        // Return default models from config if API fails
        return config.models;
    }
};

/**
 * Get model details
 * @param {string} modelId - Model ID
 * @returns {Promise<Object>}
 */
export const getModelDetails = async (modelId) => {
    const models = await getModels();
    return models.find(m => m.id === modelId);
};

/**
 * Format messages for API request
 * Handles multimodal content (text + images + PDFs)
 * @param {Array} history - Chat history
 * @param {string} systemPrompt - Optional system prompt
 * @returns {Array}
 */
export const formatMessages = (history, systemPrompt = config.chat.systemPrompt) => {
    const messages = [];

    // Add system prompt if provided
    if (systemPrompt) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    // Add conversation history
    history.forEach(msg => {
        const hasImages = msg.images && msg.images.length > 0;
        const hasPDFs = msg.pdfs && msg.pdfs.length > 0;

        // Check if message has multimodal content
        if (hasImages || hasPDFs) {
            // Build multimodal content array
            const content = [];

            // Text first (recommended by OpenRouter docs)
            if (msg.content && msg.content.trim()) {
                content.push({
                    type: 'text',
                    text: msg.content
                });
            }

            // Then images
            if (hasImages) {
                msg.images.forEach(imageUrl => {
                    content.push({
                        type: 'image_url',
                        image_url: {
                            url: imageUrl
                        }
                    });
                });
            }

            // Then PDFs (using OpenRouter file content type)
            if (hasPDFs) {
                msg.pdfs.forEach(pdf => {
                    content.push({
                        type: 'file',
                        file: {
                            filename: pdf.filename,
                            file_data: pdf.data
                        }
                    });
                });
            }

            messages.push({
                role: msg.role,
                content: content
            });
        } else {
            // Standard text-only message
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }
    });

    return messages;
};

/**
 * Get generation parameters for a model
 * @param {string} modelId - Model ID
 * @returns {Object}
 */
export const getModelParams = (modelId) => {
    // Default parameters that work well for most models
    const defaults = {
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    };

    // Model-specific overrides
    const overrides = {
        'anthropic/claude-3-opus': { max_tokens: 4096 },
        'google/gemini-pro-1.5': { max_tokens: 8192 },
        'openai/gpt-4o': { max_tokens: 4096 }
    };

    return { ...defaults, ...overrides[modelId] };
};

export default {
    sendMessage,
    sendMessageStream,
    getModels,
    getModelDetails,
    formatMessages,
    getModelParams
};
