/**
 * Sidebar Component
 * Handles sidebar interactions and chat history display
 */

import { $, $$, createElement, addClass, removeClass, toggleClass } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { getChatList, loadChat, deleteChat } from '../services/storage.js';
import { clearHistory, loadChatHistory, getCurrentChatId } from '../services/chat.js';
import { createChatIcon, TRASH_PATH, IMAGE_PATH } from '../utils/icons.js';

// DOM Elements
let sidebar;
let newChatBtn;
let chatHistoryContainer;
let collapseBtn;
let menuBtn;
let backdrop;
let imageGenNavItem;

// Current view state
let currentView = 'chat';

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

/**
 * Check if we're on mobile
 * @returns {boolean}
 */
const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

/**
 * Initialize sidebar component
 */
export const init = () => {
    sidebar = $('.sidebar');
    newChatBtn = $('.nav-item.active'); // New Chat button
    collapseBtn = $('.collapse-btn');

    // Create mobile menu button if it doesn't exist
    createMobileMenuButton();

    // Create backdrop for mobile overlay
    createBackdrop();

    // Create Image Generation nav item
    createImageGenNavItem();

    // Create chat history container if it doesn't exist
    chatHistoryContainer = $('.chat-history');
    if (!chatHistoryContainer) {
        chatHistoryContainer = createElement('div', { className: 'chat-history' });
        const navSection = $('.nav-section');
        const divider = $('.nav-divider');
        if (divider) {
            navSection.insertBefore(chatHistoryContainer, divider);
        }
    }

    setupEventListeners();
    renderChatHistory();

    // Subscribe to events
    eventBus.on(Events.CHAT_SAVED, renderChatHistory);
    eventBus.on(Events.CHAT_CLEARED, () => {
        $$('.chat-history-item').forEach(item => removeClass(item, 'active'));
    });

    // Handle resize events
    window.addEventListener('resize', handleResize);

    // Initial setup based on screen size
    handleResize();
};

/**
 * Create mobile menu button
 */
const createMobileMenuButton = () => {
    menuBtn = $('.mobile-menu-btn');
    if (!menuBtn) {
        menuBtn = createElement('button', {
            className: 'mobile-menu-btn',
            title: 'Open menu'
        });
        menuBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
        `;
        // Insert at the beginning of main content
        const mainContent = $('.main-content');
        if (mainContent) {
            mainContent.insertBefore(menuBtn, mainContent.firstChild);
        }
    }
};

/**
 * Create backdrop for mobile sidebar
 */
const createBackdrop = () => {
    backdrop = $('.sidebar-backdrop');
    if (!backdrop) {
        backdrop = createElement('div', { className: 'sidebar-backdrop' });
        document.body.appendChild(backdrop);
    }
};

/**
 * Create Image Generation nav item
 */
const createImageGenNavItem = () => {
    const navSection = $('.nav-section');
    const divider = $('.nav-divider');

    if (!navSection || !divider) return;

    // Check if it already exists
    if ($('.nav-item-image-gen')) return;

    // Find the API nav item (first item after divider)
    const apiNavItem = divider.nextElementSibling;

    // Create Image Generation nav item
    imageGenNavItem = createElement('a', {
        href: '#',
        className: 'nav-item nav-item-image-gen'
    });
    imageGenNavItem.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${IMAGE_PATH}</svg>
        <span>Create Image</span>
    `;

    // Insert before API link
    if (apiNavItem) {
        navSection.insertBefore(imageGenNavItem, apiNavItem);
    } else {
        // Fallback: insert after divider
        divider.insertAdjacentElement('afterend', imageGenNavItem);
    }

    // Add click handler
    imageGenNavItem.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('images');

        // Close mobile sidebar if open
        if (isMobile()) {
            closeMobileSidebar();
        }
    });
};

/**
 * Setup event listeners
 */
const setupEventListeners = () => {
    // New Chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleNewChat();
        });
    }

    // Collapse button (desktop)
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            toggleSidebar();
        });
    }

    // Mobile menu button
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            openMobileSidebar();
        });
    }

    // Backdrop click to close
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            closeMobileSidebar();
        });
    }

    // Click on logo to expand when collapsed
    const logo = $('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            if (sidebar.classList.contains('collapsed')) {
                e.preventDefault();
                expandSidebar();
            }
        });
    }

    // Close sidebar when clicking a nav item on mobile
    $$('.nav-item', sidebar).forEach(item => {
        item.addEventListener('click', () => {
            if (isMobile() && sidebar.classList.contains('open')) {
                closeMobileSidebar();
            }
        });
    });
};

/**
 * Handle window resize
 */
const handleResize = () => {
    if (isMobile()) {
        // On mobile, remove collapsed class and use open/close
        removeClass(sidebar, 'collapsed');
        removeClass(sidebar, 'open');
        // Show menu button
        if (menuBtn) menuBtn.style.display = '';
    } else {
        // On desktop, hide menu button and backdrop
        if (menuBtn) menuBtn.style.display = 'none';
        closeMobileSidebar();
    }
};

/**
 * Handle new chat creation
 */
const handleNewChat = () => {
    // Switch to chat view first
    switchView('chat');

    clearHistory();

    // Remove active state from chat history items
    $$('.chat-history-item').forEach(item => removeClass(item, 'active'));

    // Close mobile sidebar if open
    if (isMobile()) {
        closeMobileSidebar();
    }

    // Focus on input
    const searchInput = $('.search-input');
    if (searchInput) searchInput.focus();
};

/**
 * Switch between views (chat/images)
 * @param {string} view - 'chat' or 'images'
 */
export const switchView = (view) => {
    if (currentView === view) return;

    currentView = view;

    // Update active states in sidebar
    if (view === 'images') {
        removeClass(newChatBtn, 'active');
        if (imageGenNavItem) addClass(imageGenNavItem, 'active');
        $$('.chat-history-item').forEach(item => removeClass(item, 'active'));
    } else {
        if (imageGenNavItem) removeClass(imageGenNavItem, 'active');
        // Re-add active to New Chat only if no chat is selected
        if (!$('.chat-history-item.active')) {
            addClass(newChatBtn, 'active');
        }
    }

    // Show/hide containers
    const messageContainer = $('.message-container');
    const brandTitle = $('.brand-title');
    const imageGallery = $('.image-gallery');
    const mainContent = $('.main-content');
    const searchContainer = $('.search-container');

    if (view === 'images') {
        if (messageContainer) messageContainer.style.display = 'none';
        if (brandTitle) brandTitle.style.display = 'none';
        if (imageGallery) imageGallery.style.display = 'block';
        if (mainContent) addClass(mainContent, 'image-view');
        // Clear any inline styles on search container set by chat mode
        if (searchContainer) {
            searchContainer.style.position = '';
            searchContainer.style.bottom = '';
            searchContainer.style.top = '';
            searchContainer.style.backgroundColor = '';
            searchContainer.style.paddingTop = '';
            searchContainer.style.paddingBottom = '';
        }
    } else {
        if (imageGallery) imageGallery.style.display = 'none';
        if (mainContent) removeClass(mainContent, 'image-view');
        // Show brand title or message container based on chat state
        const hasMessages = messageContainer && messageContainer.children.length > 0;
        if (hasMessages) {
            if (messageContainer) messageContainer.style.display = 'flex';
            if (brandTitle) brandTitle.style.display = 'none';
        } else {
            if (messageContainer) messageContainer.style.display = 'none';
            if (brandTitle) brandTitle.style.display = '';
        }
    }

    // Emit view changed event
    eventBus.emit(Events.VIEW_CHANGED, { view });
};

/**
 * Get current view
 * @returns {string}
 */
export const getCurrentView = () => currentView;

/**
 * Open mobile sidebar (overlay mode)
 */
const openMobileSidebar = () => {
    addClass(sidebar, 'open');
    addClass(backdrop, 'visible');
    document.body.style.overflow = 'hidden'; // Prevent scroll
    eventBus.emit(Events.SIDEBAR_TOGGLE, { collapsed: false, mobile: true });
};

/**
 * Close mobile sidebar
 */
const closeMobileSidebar = () => {
    removeClass(sidebar, 'open');
    removeClass(backdrop, 'visible');
    document.body.style.overflow = ''; // Restore scroll
    eventBus.emit(Events.SIDEBAR_TOGGLE, { collapsed: true, mobile: true });
};

/**
 * Toggle sidebar collapsed state (desktop only)
 */
const toggleSidebar = () => {
    if (isMobile()) {
        // On mobile, use open/close instead
        if (sidebar.classList.contains('open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
        return;
    }

    toggleClass(sidebar, 'collapsed');
    const isCollapsedNow = sidebar.classList.contains('collapsed');

    // Update main content margin
    const mainContent = $('.main-content');
    if (mainContent) {
        toggleClass(mainContent, 'sidebar-collapsed', isCollapsedNow);
    }

    eventBus.emit(Events.SIDEBAR_TOGGLE, { collapsed: isCollapsedNow });
};

/**
 * Expand sidebar (when clicking on collapsed sidebar - desktop)
 */
const expandSidebar = () => {
    if (isMobile()) {
        openMobileSidebar();
        return;
    }

    removeClass(sidebar, 'collapsed');

    // Update main content margin
    const mainContent = $('.main-content');
    if (mainContent) {
        removeClass(mainContent, 'sidebar-collapsed');
    }

    eventBus.emit(Events.SIDEBAR_TOGGLE, { collapsed: false });
};

/**
 * Render chat history list
 */
const renderChatHistory = () => {
    if (!chatHistoryContainer) return;

    const chats = getChatList();
    chatHistoryContainer.innerHTML = '';

    if (chats.length === 0) return;

    // Only show recent chats (last 10)
    const recentChats = chats.slice(0, 10);

    recentChats.forEach(chat => {
        const item = createElement('a', {
            href: '#',
            className: 'nav-item chat-history-item',
            dataset: { chatId: chat.id }
        });

        // Chat icon
        const iconSpan = createElement('span', { className: 'chat-history-icon' });
        iconSpan.appendChild(createChatIcon());

        // Chat title
        const titleSpan = createElement('span', { className: 'chat-history-title' }, chat.title);

        // Delete button
        const deleteBtn = createElement('button', {
            className: 'chat-delete-btn',
            title: 'Delete chat'
        });
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${TRASH_PATH}</svg>`;
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteClick(deleteBtn, chat.id);
        });

        item.appendChild(iconSpan);
        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleChatSelect(chat.id);
        });

        chatHistoryContainer.appendChild(item);
    });
};

// Track which delete button is in confirm state
let pendingDeleteBtn = null;
let pendingDeleteTimeout = null;

/**
 * Handle delete button click (two-click to delete)
 * @param {HTMLElement} btn - The delete button
 * @param {string} chatId - Chat ID to delete
 */
const handleDeleteClick = (btn, chatId) => {
    // If this button is already in confirm state, delete
    if (btn.classList.contains('confirm')) {
        handleDeleteChat(chatId);
        return;
    }

    // Reset any other pending delete button
    if (pendingDeleteBtn && pendingDeleteBtn !== btn) {
        resetDeleteButton(pendingDeleteBtn);
    }

    // Clear any existing timeout
    if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
    }

    // Set this button to confirm state
    btn.classList.add('confirm');
    btn.title = 'Click again to delete';
    pendingDeleteBtn = btn;

    // Auto-reset after 3 seconds
    pendingDeleteTimeout = setTimeout(() => {
        resetDeleteButton(btn);
    }, 3000);
};

/**
 * Reset delete button to normal state
 * @param {HTMLElement} btn - The delete button
 */
const resetDeleteButton = (btn) => {
    if (btn) {
        btn.classList.remove('confirm');
        btn.title = 'Delete chat';
    }
    if (pendingDeleteBtn === btn) {
        pendingDeleteBtn = null;
    }
    if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteTimeout = null;
    }
};

/**
 * Handle chat deletion
 * @param {string} chatId - Chat ID to delete
 */
const handleDeleteChat = (chatId) => {
    // Reset pending state
    pendingDeleteBtn = null;
    if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteTimeout = null;
    }

    // Delete from storage
    deleteChat(chatId);

    // If this was the current chat, clear it
    const currentId = getCurrentChatId();
    if (currentId === chatId) {
        clearHistory();
    }

    // Re-render the chat history
    renderChatHistory();
};

/**
 * Handle chat selection from history
 * @param {string} chatId - Chat ID
 */
const handleChatSelect = (chatId) => {
    const chat = loadChat(chatId);
    if (chat) {
        // Switch to chat view first
        switchView('chat');

        loadChatHistory(chatId, chat.messages);

        // Update active state
        $$('.chat-history-item').forEach(item => {
            toggleClass(item, 'active', item.dataset.chatId === chatId);
        });

        // Remove active from New Chat button when a chat is selected
        removeClass(newChatBtn, 'active');

        // Close mobile sidebar if open
        if (isMobile()) {
            closeMobileSidebar();
        }
    }
};

/**
 * Show/hide sidebar
 * @param {boolean} show
 */
export const setSidebarVisible = (show) => {
    if (isMobile()) {
        if (show) {
            openMobileSidebar();
        } else {
            closeMobileSidebar();
        }
    } else {
        toggleClass(sidebar, 'collapsed', !show);
    }
};

/**
 * Check if sidebar is collapsed
 * @returns {boolean}
 */
export const isCollapsed = () => {
    if (isMobile()) {
        return !sidebar?.classList.contains('open');
    }
    return sidebar?.classList.contains('collapsed') || false;
};

/**
 * Check if sidebar is open (for mobile)
 * @returns {boolean}
 */
export const isOpen = () => {
    return sidebar?.classList.contains('open') || false;
};

export default { init, setSidebarVisible, isCollapsed, isOpen, renderChatHistory, getCurrentView, switchView };
