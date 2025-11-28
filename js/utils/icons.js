/**
 * Centralized Icon Management
 * All SVG icons used throughout the application
 */

/**
 * Create an SVG element from a path string
 * @param {string} innerHTML - SVG inner content
 * @param {Object} options - SVG attributes
 * @returns {SVGElement}
 */
export const createSvgElement = (innerHTML, options = {}) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', options.viewBox || '0 0 24 24');
    svg.setAttribute('fill', options.fill || 'none');
    svg.setAttribute('stroke', options.stroke || 'currentColor');
    svg.setAttribute('stroke-width', options.strokeWidth || '2');

    if (options.width) svg.setAttribute('width', options.width);
    if (options.height) svg.setAttribute('height', options.height);
    if (options.className) svg.setAttribute('class', options.className);

    svg.innerHTML = innerHTML;
    return svg;
};

/**
 * Get SVG HTML string for inline use
 * @param {string} innerHTML - SVG inner content
 * @param {Object} options - SVG attributes
 * @returns {string}
 */
export const getSvgString = (innerHTML, options = {}) => {
    const viewBox = options.viewBox || '0 0 24 24';
    const fill = options.fill || 'none';
    const stroke = options.stroke || 'currentColor';
    const strokeWidth = options.strokeWidth || '2';
    const width = options.width ? ` width="${options.width}"` : '';
    const height = options.height ? ` height="${options.height}"` : '';
    const className = options.className ? ` class="${options.className}"` : '';

    return `<svg viewBox="${viewBox}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${width}${height}${className}>${innerHTML}</svg>`;
};

// ============ Icon Paths ============

// Brand / Logo
export const LOGO_PATH = '<path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"></path>';

// Navigation
export const PLUS_PATH = '<path d="M12 5v14M5 12h14"></path>';
export const CHEVRON_DOWN_PATH = '<polyline points="6 9 12 15 18 9"></polyline>';
export const CHEVRON_RIGHT_PATH = '<polyline points="9 18 15 12 9 6"></polyline>';

// Sidebar
export const SIDEBAR_PATH = '<rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path>';
export const MENU_PATH = '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>';

// Chat
export const CHAT_PATH = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';

// User / Avatar
export const USER_PATH = '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>';

// Actions
export const SIGN_IN_PATH = '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line>';
export const CODE_PATH = '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"></path>';
export const INFO_PATH = '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path>';
export const BOOK_PATH = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>';
export const DOCUMENT_PATH = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>';
export const LOCK_PATH = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
export const GITHUB_PATH = '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>';

// Media
export const IMAGE_PATH = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>';
export const MICROPHONE_PATH = '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>';
export const ATTACHMENT_PATH = '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>';

// Model / Time
export const CLOCK_PATH = '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>';

// Sources
export const SOURCES_PATH = '<path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>';

// Close / X
export const CLOSE_PATH = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';

// Stop (square)
export const STOP_PATH = '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"></rect>';

// Copy
export const COPY_PATH = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';

// Check (for copied feedback)
export const CHECK_PATH = '<polyline points="20 6 9 17 4 12"></polyline>';

// Send / Arrow
export const SEND_PATH = '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>';

// Globe / Web Search
export const GLOBE_PATH = '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>';

// Trash
export const TRASH_PATH = '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>';

// ============ Icon Components (SVG Strings) ============

export const icons = {
    // Logo
    logo: getSvgString(LOGO_PATH, { strokeWidth: '1.5', className: 'logo-icon' }),

    // Navigation
    plus: getSvgString(PLUS_PATH),
    chevronDown: getSvgString(CHEVRON_DOWN_PATH, { width: '12', height: '12' }),
    chevronRight: getSvgString(CHEVRON_RIGHT_PATH),

    // Sidebar
    sidebar: getSvgString(SIDEBAR_PATH, { width: '16', height: '16' }),
    menu: getSvgString(MENU_PATH),

    // Chat
    chat: getSvgString(CHAT_PATH),

    // User
    user: getSvgString(USER_PATH),
    userAvatar: getSvgString(USER_PATH),
    assistantAvatar: getSvgString(LOGO_PATH, { strokeWidth: '1.5' }),

    // Actions
    signIn: getSvgString(SIGN_IN_PATH),
    code: getSvgString(CODE_PATH),
    info: getSvgString(INFO_PATH),
    book: getSvgString(BOOK_PATH),
    document: getSvgString(DOCUMENT_PATH),
    lock: getSvgString(LOCK_PATH),
    github: getSvgString(GITHUB_PATH),

    // Media
    image: getSvgString(IMAGE_PATH),
    microphone: getSvgString(MICROPHONE_PATH),
    attachment: getSvgString(ATTACHMENT_PATH),

    // Model
    clock: getSvgString(CLOCK_PATH),

    // Sources
    sources: getSvgString(SOURCES_PATH, { width: '16', height: '16', className: 'sources-icon' }),
    sourcesChevron: getSvgString(CHEVRON_DOWN_PATH, { width: '16', height: '16', className: 'sources-chevron' }),

    // Close
    close: getSvgString(CLOSE_PATH),

    // Stop
    stop: getSvgString(STOP_PATH, { fill: 'currentColor' }),

    // Copy
    copy: getSvgString(COPY_PATH),
    check: getSvgString(CHECK_PATH),

    // Send
    send: getSvgString(SEND_PATH)
};

// ============ Icon Element Creators ============

/**
 * Create a chat icon SVG element
 * @returns {SVGElement}
 */
export const createChatIcon = () => {
    return createSvgElement(CHAT_PATH);
};

/**
 * Create a user avatar icon SVG element
 * @returns {SVGElement}
 */
export const createUserAvatarIcon = () => {
    return createSvgElement(USER_PATH);
};

/**
 * Create an assistant avatar icon SVG element
 * @returns {SVGElement}
 */
export const createAssistantAvatarIcon = () => {
    return createSvgElement(LOGO_PATH, { strokeWidth: '1.5' });
};

/**
 * Create a menu (hamburger) icon SVG element
 * @returns {SVGElement}
 */
export const createMenuIcon = () => {
    return createSvgElement(MENU_PATH);
};

/**
 * Create a close (X) icon SVG element
 * @returns {SVGElement}
 */
export const createCloseIcon = () => {
    return createSvgElement(CLOSE_PATH);
};

/**
 * Create a sources icon SVG element
 * @returns {SVGElement}
 */
export const createSourcesIcon = () => {
    return createSvgElement(SOURCES_PATH, { width: '16', height: '16', className: 'sources-icon' });
};

/**
 * Create a chevron down icon SVG element
 * @returns {SVGElement}
 */
export const createChevronDownIcon = () => {
    return createSvgElement(CHEVRON_DOWN_PATH, { width: '16', height: '16', className: 'sources-chevron' });
};

export default icons;
