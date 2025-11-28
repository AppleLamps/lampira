/**
 * Storage Service
 * Handles localStorage operations for chats and settings
 */

import config from '../config.js';
import eventBus, { Events } from '../utils/events.js';

/**
 * Generate a unique ID
 * @returns {string}
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Get item from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*}
 */
const getItem = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from storage (${key}):`, error);
        return defaultValue;
    }
};

/**
 * Set item in localStorage with JSON stringification
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
const setItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to storage (${key}):`, error);
    }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
const removeItem = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing from storage (${key}):`, error);
    }
};

// ============ Chat Storage ============

/**
 * Save a chat conversation
 * @param {string} id - Chat ID (optional, will generate if not provided)
 * @param {Array} messages - Array of messages
 * @param {string} title - Chat title (optional)
 * @returns {string} Chat ID
 */
export const saveChat = (id = null, messages, title = null) => {
    const chatId = id || generateId();
    const chats = getItem(config.storage.chats, {});

    // Generate title from first user message if not provided
    if (!title && messages.length > 0) {
        const firstUserMsg = messages.find(m => m.role === 'user');
        title = firstUserMsg
            ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : 'New Chat';
    }

    chats[chatId] = {
        id: chatId,
        title: title || 'New Chat',
        messages,
        createdAt: chats[chatId]?.createdAt || Date.now(),
        updatedAt: Date.now()
    };

    setItem(config.storage.chats, chats);
    eventBus.emit(Events.CHAT_SAVED, { id: chatId, chat: chats[chatId] });

    return chatId;
};

/**
 * Load a chat by ID
 * @param {string} id - Chat ID
 * @returns {Object|null}
 */
export const loadChat = (id) => {
    const chats = getItem(config.storage.chats, {});
    return chats[id] || null;
};

/**
 * Delete a chat by ID
 * @param {string} id - Chat ID
 */
export const deleteChat = (id) => {
    const chats = getItem(config.storage.chats, {});
    delete chats[id];
    setItem(config.storage.chats, chats);
};

/**
 * Get list of all saved chats
 * @returns {Array}
 */
export const getChatList = () => {
    const chats = getItem(config.storage.chats, {});
    return Object.values(chats)
        .sort((a, b) => b.updatedAt - a.updatedAt);
};

/**
 * Clear all saved chats
 */
export const clearAllChats = () => {
    removeItem(config.storage.chats);
};

// ============ Settings Storage ============

/**
 * Save user settings
 * @param {Object} settings - Settings object
 */
export const saveSettings = (settings) => {
    const current = getItem(config.storage.settings, {});
    const updated = { ...current, ...settings };
    setItem(config.storage.settings, updated);
    eventBus.emit(Events.SETTINGS_CHANGED, updated);
};

/**
 * Load user settings
 * @returns {Object}
 */
export const loadSettings = () => {
    return getItem(config.storage.settings, {
        theme: 'light',
        streamingEnabled: true,
        model: config.defaultModel
    });
};

/**
 * Get a specific setting
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value
 * @returns {*}
 */
export const getSetting = (key, defaultValue = null) => {
    const settings = loadSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
};

/**
 * Set a specific setting
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 */
export const setSetting = (key, value) => {
    saveSettings({ [key]: value });
};

// ============ Current Chat State ============

/**
 * Save current chat history (temporary/working chat)
 * @param {Array} messages - Messages array
 */
export const saveCurrentChat = (messages) => {
    setItem(config.storage.chatHistory, messages);
};

/**
 * Load current chat history
 * @returns {Array}
 */
export const loadCurrentChat = () => {
    return getItem(config.storage.chatHistory, []);
};

/**
 * Clear current chat history
 */
export const clearCurrentChat = () => {
    removeItem(config.storage.chatHistory);
};

// ============ Model Storage ============

/**
 * Save current model selection
 * @param {string} modelId - Model ID
 */
export const saveCurrentModel = (modelId) => {
    setItem(config.storage.currentModel, modelId);
};

/**
 * Load current model selection
 * @returns {string}
 */
export const loadCurrentModel = () => {
    return getItem(config.storage.currentModel, config.defaultModel);
};

export default {
    saveChat,
    loadChat,
    deleteChat,
    getChatList,
    clearAllChats,
    saveSettings,
    loadSettings,
    getSetting,
    setSetting,
    saveCurrentChat,
    loadCurrentChat,
    clearCurrentChat,
    saveCurrentModel,
    loadCurrentModel
};
