/**
 * Sidebar Component
 * Handles sidebar interactions and chat history display
 */

import { $, $$, createElement, addClass, removeClass, toggleClass } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { getChatList, loadChat, deleteChat } from '../services/storage.js';
import { clearHistory, loadChatHistory } from '../services/chat.js';

// DOM Elements
let sidebar;
let newChatBtn;
let chatHistoryContainer;
let collapseBtn;

/**
 * Initialize sidebar component
 */
export const init = () => {
    sidebar = $('.sidebar');
    newChatBtn = $('.nav-item.active'); // New Chat button
    collapseBtn = $('.collapse-btn');

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

    // Collapse button
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            toggleSidebar();
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
};

/**
 * Handle new chat creation
 */
const handleNewChat = () => {
    clearHistory();

    // Remove active state from chat history items
    $$('.chat-history-item').forEach(item => removeClass(item, 'active'));

    // Focus on input
    const searchInput = $('.search-input');
    if (searchInput) searchInput.focus();
};

/**
 * Toggle sidebar collapsed state
 */
const toggleSidebar = () => {
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
 * Expand sidebar (when clicking on collapsed sidebar)
 */
const expandSidebar = () => {
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
        }, [
            createElement('span', { className: 'chat-history-icon' }, [
                createChatIcon()
            ]),
            createElement('span', { className: 'chat-history-title' }, chat.title)
        ]);

        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleChatSelect(chat.id);
        });

        chatHistoryContainer.appendChild(item);
    });
};

/**
 * Create chat icon SVG
 */
const createChatIcon = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.innerHTML = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
    return svg;
};

/**
 * Handle chat selection from history
 * @param {string} chatId - Chat ID
 */
const handleChatSelect = (chatId) => {
    const chat = loadChat(chatId);
    if (chat) {
        loadChatHistory(chatId, chat.messages);

        // Update active state
        $$('.chat-history-item').forEach(item => {
            toggleClass(item, 'active', item.dataset.chatId === chatId);
        });
    }
};

/**
 * Show/hide sidebar
 * @param {boolean} show
 */
export const setSidebarVisible = (show) => {
    toggleClass(sidebar, 'collapsed', !show);
};

/**
 * Check if sidebar is collapsed
 * @returns {boolean}
 */
export const isCollapsed = () => {
    return sidebar?.classList.contains('collapsed') || false;
};

export default { init, setSidebarVisible, isCollapsed, renderChatHistory };
