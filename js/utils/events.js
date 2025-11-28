/**
 * Event Bus
 * Simple pub/sub pattern for component communication
 */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} event - Optional event name
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).size : 0;
    }
}

// Singleton instance
const eventBus = new EventBus();

// Event name constants
export const Events = {
    // Chat events
    MESSAGE_SEND: 'message:send',
    MESSAGE_RECEIVED: 'message:received',
    CHAT_UPDATED: 'chat:updated',
    CHAT_CLEARED: 'chat:cleared',
    CHAT_LOADED: 'chat:loaded',

    // AI events
    AI_STREAMING: 'ai:streaming',
    AI_PROCESSING: 'ai:processing',
    AI_COMPLETE: 'ai:complete',
    AI_ERROR: 'ai:error',
    AI_CANCELLED: 'ai:cancelled',
    AI_SOURCES_UPDATED: 'ai:sources:updated',
    AI_SUGGESTIONS: 'ai:suggestions',

    // Model events
    MODEL_CHANGED: 'model:changed',
    MODELS_LOADED: 'models:loaded',

    // UI events
    SIDEBAR_TOGGLE: 'sidebar:toggle',
    LOADING_START: 'loading:start',
    LOADING_END: 'loading:end',

    // Storage events
    CHAT_SAVED: 'chat:saved',
    SETTINGS_CHANGED: 'settings:changed'
};

export { eventBus, EventBus };
export default eventBus;
