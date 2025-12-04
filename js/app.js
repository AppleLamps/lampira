/**
 * Lampira AI - Main Application Entry Point
 * Initializes all components and services
 */

import config from './config.js';
import eventBus, { Events } from './utils/events.js';

// Components
import sidebar from './components/sidebar.js';
import searchBox from './components/searchBox.js';
import messageList from './components/messageList.js';
import modelSelector from './components/modelSelector.js';
import imageGallery from './components/imageGallery.js';

// Services
import { refreshModels } from './services/models.js';

// Only log in development (localhost or explicit debug flag)
const isDev = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' ||
              window.localStorage.getItem('Lampira_debug') === 'true';

const log = (...args) => isDev && console.log(...args);
const warn = (...args) => isDev && console.warn(...args);

/**
 * Initialize the application
 */
const init = async () => {
    log('🚀 Initializing Lampira AI...');

    // Initialize components
    try {
        sidebar.init();
        searchBox.init();
        messageList.init();
        modelSelector.init();
        imageGallery.init();

        log('✅ Components initialized');
    } catch (error) {
        console.error('❌ Failed to initialize components:', error);
    }

    // Setup global error handler
    setupErrorHandler();

    // Refresh models list
    try {
        await refreshModels();
        log('✅ Models loaded');
    } catch (error) {
        warn('⚠️ Could not load models from API, using defaults');
    }

    log('✅ Lampira AI ready!');
};

/**
 * Setup global error handler
 */
const setupErrorHandler = () => {
    eventBus.on(Events.AI_ERROR, (error) => {
        console.error('AI Error:', error);

        let message = 'An error occurred while processing your request.';

        if (error.status === 401) {
            message = 'Invalid API key. Please check your OpenRouter API key.';
        } else if (error.status === 429) {
            message = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.status === 402) {
            message = 'Insufficient credits. Please add credits to your OpenRouter account.';
        } else if (error.message) {
            message = error.message;
        }

        // Show error to user
        showNotification(message, 'error');
    });

    eventBus.on(Events.IMAGE_GEN_ERROR, ({ error }) => {
        console.error('Image Generation Error:', error);

        let message = 'An error occurred while generating the image.';

        if (error.status === 401) {
            message = 'Invalid API key. Please check your Fal.ai API key.';
        } else if (error.status === 429) {
            message = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message) {
            message = error.message;
        }

        // Show error to user
        showNotification(message, 'error');
    });
};

/**
 * Show notification to user
 * @param {string} message
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
const showNotification = (message, type = 'info') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to document
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
};

/**
 * Expose API for external use
 */
window.Lampira = {
    eventBus,
    Events
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default { init };
