/**
 * Application Configuration
 * Central configuration for API endpoints, keys, and settings
 */

const config = {
    // API Configuration
    // In production, requests go to /api/* which proxies to OpenRouter
    // The API key is stored securely on the server (Vercel env vars)
    api: {
        baseUrl: '/api',
        siteUrl: window.location.origin,
        siteName: 'Lampira AI'
    },

    // Default model configuration
    defaultModel: 'x-ai/grok-4-fast',

    // Available models (can be fetched from API)
    models: [
        {
            id: 'x-ai/grok-4-fast',
            name: 'Grok 4 Fast',
            description: 'X.AI fastest model',
            contextLength: 131072
        }
    ],

    // Web search configuration
    webSearch: {
        enabled: true,
        engine: 'native', // 'native', 'exa', or undefined for auto
        maxResults: 10,
        searchContextSize: 'high' // 'low', 'medium', 'high'
    },

    // Chat settings
    chat: {
        maxHistoryLength: 50,
        systemPrompt: `You are Lampira, an AI-powered research engine. Your purpose is to provide accurate, well-researched answers using real-time web search results.

GUIDELINES:
1. ALWAYS use the web search results provided to answer questions
2. CITE your sources using markdown links: [Source Title](url)
3. Synthesize information from MULTIPLE sources when available
4. If sources conflict, acknowledge the discrepancy
5. For time-sensitive topics (news, prices, events), prioritize recent information
6. If search results are insufficient, clearly state what information is missing
7. Structure complex answers with clear headings
8. Be concise but comprehensive

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        streamingEnabled: true
    },

    // Storage keys
    storage: {
        currentModel: 'Lampira_current_model',
        chatHistory: 'Lampira_chat_history',
        settings: 'Lampira_settings',
        chats: 'Lampira_saved_chats'
    },

    // UI settings
    ui: {
        typingSpeed: 20, // ms per character for typing effect
        autoScrollDelay: 100
    }
};

/**
 * Get model by ID
 * @param {string} modelId
 * @returns {Object|undefined}
 */
export const getModelById = (modelId) => {
    return config.models.find(m => m.id === modelId);
};

export default config;
