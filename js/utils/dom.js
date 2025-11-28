/**
 * DOM Utility Functions
 * Helper functions for common DOM operations
 */

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {Element|null}
 */
export const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Query selector all shorthand
 * @param {string} selector - CSS selector
 * @param {Element} context - Context element (default: document)
 * @returns {NodeList}
 */
export const $$ = (selector, context = document) => context.querySelectorAll(selector);

/**
 * Create an element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {Array|string|Element} children - Child elements or text
 * @returns {Element}
 */
export const createElement = (tag, attrs = {}, children = []) => {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            const event = key.slice(2).toLowerCase();
            element.addEventListener(event, value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });

    // Add children
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Element) {
            element.appendChild(child);
        }
    });

    return element;
};

/**
 * Show an element
 * @param {Element} element
 */
export const show = (element) => {
    if (element) element.style.display = '';
};

/**
 * Hide an element
 * @param {Element} element
 */
export const hide = (element) => {
    if (element) element.style.display = 'none';
};

/**
 * Toggle element visibility
 * @param {Element} element
 * @param {boolean} force - Optional force state
 */
export const toggle = (element, force) => {
    if (!element) return;
    if (force !== undefined) {
        element.style.display = force ? '' : 'none';
    } else {
        element.style.display = element.style.display === 'none' ? '' : 'none';
    }
};

/**
 * Add class to element
 * @param {Element} element
 * @param {string} className
 */
export const addClass = (element, className) => {
    if (element) element.classList.add(className);
};

/**
 * Remove class from element
 * @param {Element} element
 * @param {string} className
 */
export const removeClass = (element, className) => {
    if (element) element.classList.remove(className);
};

/**
 * Toggle class on element
 * @param {Element} element
 * @param {string} className
 * @param {boolean} force
 */
export const toggleClass = (element, className, force) => {
    if (element) element.classList.toggle(className, force);
};

/**
 * Check if element has class
 * @param {Element} element
 * @param {string} className
 * @returns {boolean}
 */
export const hasClass = (element, className) => {
    return element ? element.classList.contains(className) : false;
};

/**
 * Empty an element (remove all children)
 * @param {Element} element
 */
export const empty = (element) => {
    if (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
};

/**
 * Scroll element into view smoothly
 * @param {Element} element
 * @param {Object} options
 */
export const scrollIntoView = (element, options = { behavior: 'smooth', block: 'end' }) => {
    if (element) element.scrollIntoView(options);
};

export default { $, $$, createElement, show, hide, toggle, addClass, removeClass, toggleClass, hasClass, empty, scrollIntoView };
