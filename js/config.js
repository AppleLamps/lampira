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
        enabled: false, // Default to chat mode (no web search)
        engine: 'native', // 'native', 'exa', or undefined for auto
        maxResults: 10,
        searchContextSize: 'high' // 'low', 'medium', 'high'
    },

    // Chat settings
    chat: {
        maxHistoryLength: 50,
        // System prompt for regular chat mode (no web search)
        systemPromptChat: `You are Lampira, a helpful AI assistant. You provide accurate, thoughtful, and well-structured responses.

GUIDELINES:
1. Be helpful, harmless, and honest
2. Provide clear and concise answers
3. Structure complex answers with clear headings when appropriate
4. If you're unsure about something, say so
5. Be conversational but professional

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        // System prompt for web search mode
        systemPromptWeb: `You are Lampira, an AI-powered research engine. Your purpose is to provide accurate, well-researched answers using real-time web search results.

GUIDELINES:
1. ALWAYS use the web search results provided to answer questions
2. CITE sources inline within your text using markdown links: [Source Title](url)
3. Synthesize information from MULTIPLE sources when available
4. If sources conflict, acknowledge the discrepancy
5. For time-sensitive topics (news, prices, events), prioritize recent information
6. If search results are insufficient, clearly state what information is missing
7. Structure complex answers with clear headings
8. Be concise but comprehensive
9. DO NOT include a separate "Sources" section at the end of your response - sources are automatically displayed separately in the UI

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        streamingEnabled: true
    },

    // Storage keys
    storage: {
        currentModel: 'Lampira_current_model',
        chatHistory: 'Lampira_chat_history',
        settings: 'Lampira_settings',
        chats: 'Lampira_saved_chats',
        generatedImages: 'Lampira_generated_images'
    },

    // UI settings
    ui: {
        typingSpeed: 20, // ms per character for typing effect
        autoScrollDelay: 100
    },

    // Image generation settings
    imageGen: {
        imageSize: 'landscape_4_3', // 'square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'
        numInferenceSteps: 30, // Higher = better quality but slower (10-50)
        numImages: 1,
        enableSafetyChecker: true
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
