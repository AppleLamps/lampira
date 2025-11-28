/**
 * Model Selector Component
 * Handles model selection dropdown
 */

import { $, $$, createElement, addClass, removeClass, toggleClass } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { getModel, setModel, getAvailableModels, getModelDisplayName, refreshModels } from '../services/models.js';

// DOM Elements
let modelSelector;
let modelDropdown;
let isOpen = false;

/**
 * Initialize model selector component
 */
export const init = () => {
    modelSelector = $('.model-selector');

    if (!modelSelector) return;

    // Create dropdown container
    createDropdown();

    setupEventListeners();
    updateDisplay();

    // Subscribe to events
    eventBus.on(Events.MODEL_CHANGED, updateDisplay);
    eventBus.on(Events.MODELS_LOADED, updateDropdownList);

    // Fetch models from API
    refreshModels();
};

/**
 * Create dropdown element
 */
const createDropdown = () => {
    modelDropdown = createElement('div', { className: 'model-dropdown' });
    modelDropdown.style.display = 'none';

    // Position relative to selector
    const parent = modelSelector.parentElement;
    parent.style.position = 'relative';
    parent.appendChild(modelDropdown);

    updateDropdownList();
};

/**
 * Update dropdown list with available models
 */
const updateDropdownList = () => {
    if (!modelDropdown) return;

    const models = getAvailableModels();
    const currentModel = getModel();

    modelDropdown.innerHTML = '';

    // Group by provider
    const grouped = {};
    models.forEach(model => {
        const provider = model.id.split('/')[0] || 'other';
        if (!grouped[provider]) {
            grouped[provider] = [];
        }
        grouped[provider].push(model);
    });

    // Render groups
    Object.entries(grouped).forEach(([provider, providerModels]) => {
        // Provider header
        const header = createElement('div', { className: 'model-dropdown-header' }, formatProviderName(provider));
        modelDropdown.appendChild(header);

        // Models
        providerModels.forEach(model => {
            const item = createElement('div', {
                className: `model-dropdown-item ${model.id === currentModel ? 'active' : ''}`,
                dataset: { modelId: model.id }
            });

            const name = createElement('span', { className: 'model-name' }, model.name);
            const desc = createElement('span', { className: 'model-desc' }, model.description || '');

            item.appendChild(name);
            if (model.description) {
                item.appendChild(desc);
            }

            item.addEventListener('click', () => handleModelSelect(model.id));
            modelDropdown.appendChild(item);
        });
    });
};

/**
 * Format provider name for display
 * @param {string} provider
 * @returns {string}
 */
const formatProviderName = (provider) => {
    const names = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'meta-llama': 'Meta',
        'mistralai': 'Mistral',
        'x-ai': 'xAI'
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
    // Toggle dropdown
    modelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (isOpen && !modelDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeDropdown();
        }
    });
};

/**
 * Toggle dropdown visibility
 */
const toggleDropdown = () => {
    isOpen = !isOpen;
    modelDropdown.style.display = isOpen ? 'block' : 'none';
    toggleClass(modelSelector, 'active', isOpen);
};

/**
 * Close dropdown
 */
const closeDropdown = () => {
    isOpen = false;
    modelDropdown.style.display = 'none';
    removeClass(modelSelector, 'active');
};

/**
 * Handle model selection
 * @param {string} modelId
 */
const handleModelSelect = (modelId) => {
    setModel(modelId);
    closeDropdown();

    // Update active state in dropdown
    $$('.model-dropdown-item', modelDropdown).forEach(item => {
        toggleClass(item, 'active', item.dataset.modelId === modelId);
    });
};

/**
 * Update display with current model
 */
const updateDisplay = () => {
    if (!modelSelector) return;

    const modelId = getModel();
    const displayName = getModelDisplayName(modelId);

    // Find the text node in model selector
    const textNodes = Array.from(modelSelector.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE ||
            (node.nodeType === Node.ELEMENT_NODE && !node.querySelector('svg')));

    // Update the model name text
    const modelNameSpan = modelSelector.querySelector('.model-name-text');
    if (modelNameSpan) {
        modelNameSpan.textContent = displayName;
    } else {
        // Find and update the text content
        const children = Array.from(modelSelector.childNodes);
        for (let i = 0; i < children.length; i++) {
            if (children[i].nodeType === Node.TEXT_NODE && children[i].textContent.trim()) {
                children[i].textContent = ` ${displayName} `;
                break;
            }
        }
    }
};

/**
 * Get current dropdown state
 * @returns {boolean}
 */
export const isDropdownOpen = () => isOpen;

export default { init, isDropdownOpen, updateDisplay };
