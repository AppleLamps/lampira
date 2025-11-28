/**
 * Models Service
 * Manages model selection and state
 */

import config from '../config.js';
import eventBus, { Events } from '../utils/events.js';
import { saveCurrentModel, loadCurrentModel } from './storage.js';
import { getModels as fetchModels } from '../api/openrouter.js';

// Cached models list
let cachedModels = [...config.models];

// Current selected model - always use default since we only have one model
let currentModel = config.defaultModel;

/**
 * Get current selected model
 * @returns {string}
 */
export const getModel = () => currentModel;

/**
 * Set current model
 * @param {string} modelId - Model ID
 */
export const setModel = (modelId) => {
    const model = cachedModels.find(m => m.id === modelId);
    if (model || modelId) {
        currentModel = modelId;
        saveCurrentModel(modelId);
        eventBus.emit(Events.MODEL_CHANGED, { modelId, model });
    }
};

/**
 * Get available models (from cache)
 * @returns {Array}
 */
export const getAvailableModels = () => cachedModels;

/**
 * Refresh models list from API
 * @returns {Promise<Array>}
 */
export const refreshModels = async () => {
    // Only use models from config - don't fetch from API
    // This ensures we only show the configured model(s)
    cachedModels = [...config.models];
    eventBus.emit(Events.MODELS_LOADED, cachedModels);
    return cachedModels;
};

/**
 * Get model info by ID
 * @param {string} modelId - Model ID
 * @returns {Object|null}
 */
export const getModelInfo = (modelId) => {
    return cachedModels.find(m => m.id === modelId) || null;
};

/**
 * Get current model info
 * @returns {Object|null}
 */
export const getCurrentModelInfo = () => {
    return getModelInfo(currentModel);
};

/**
 * Get display name for a model
 * @param {string} modelId - Model ID
 * @returns {string}
 */
export const getModelDisplayName = (modelId) => {
    const model = getModelInfo(modelId);
    return model?.name || modelId.split('/').pop() || 'Unknown Model';
};

/**
 * Group models by provider
 * @returns {Object}
 */
export const getModelsByProvider = () => {
    const grouped = {};

    cachedModels.forEach(model => {
        const provider = model.id.split('/')[0] || 'other';
        if (!grouped[provider]) {
            grouped[provider] = [];
        }
        grouped[provider].push(model);
    });

    return grouped;
};

/**
 * Search models by name or ID
 * @param {string} query - Search query
 * @returns {Array}
 */
export const searchModels = (query) => {
    const lowerQuery = query.toLowerCase();
    return cachedModels.filter(model =>
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery)
    );
};

export default {
    getModel,
    setModel,
    getAvailableModels,
    refreshModels,
    getModelInfo,
    getCurrentModelInfo,
    getModelDisplayName,
    getModelsByProvider,
    searchModels
};
