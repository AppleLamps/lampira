# Lampira AI

A fast, open-source AI research engine built with vanilla JavaScript. Lampira provides Perplexity-style answers with real-time web search, source citations, and a clean, modern interface.

![Lampira AI](https://img.shields.io/badge/AI-Research%20Engine-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow)

## Features

- **Real-time Web Search** — Powered by OpenRouter's web search plugin with native xAI integration
- **Source Citations** — Every answer includes collapsible source cards with favicons and domain info
- **Streaming Responses** — Watch answers appear in real-time with SSE streaming
- **Image Uploads** — Attach images to your messages for multimodal AI analysis (supports PNG, JPEG, WebP, GIF)
- **Syntax Highlighting** — Code blocks are beautifully highlighted with Highlight.js
- **Copy Code Buttons** — One-click copy for code snippets
- **Follow-up Suggestions** — AI-generated follow-up questions for deeper exploration
- **Stop Generation** — Cancel AI responses mid-stream
- **Chat History** — Conversations are automatically saved to localStorage with easy deletion
- **Collapsible Sidebar** — Icon-only mode for more screen space
- **Mobile Responsive** — Full mobile support with drawer-style sidebar
- **No Build Tools** — Pure vanilla JavaScript with ES6 modules

## Quick Start

### Option 1: Deploy to Vercel (Recommended)

1. Fork this repository
2. Import to [Vercel](https://vercel.com)
3. Add your OpenRouter API key as an environment variable:
   - Name: `OPENROUTER_API_KEY`
   - Value: Your API key from [OpenRouter](https://openrouter.ai/)
4. Deploy!

### Option 2: Local Development with Vercel CLI

```bash
# Clone the repository
git clone https://github.com/yourusername/Lampira.git
cd Lampira

# Install Vercel CLI
npm i -g vercel

# Create .env.local with your API key
echo "OPENROUTER_API_KEY=your_api_key_here" > .env.local

# Run development server
vercel dev
```

### Option 3: Static Hosting (requires API proxy)

Since the app uses serverless functions for API key security, you'll need to set up your own API proxy if not using Vercel.

## Architecture

Lampira uses a modular vanilla JavaScript architecture with an event-driven design:

```
Lampira/
├── index.html              # Main HTML entry point
├── vercel.json             # Vercel configuration
├── api/                    # Vercel serverless functions
│   ├── chat.js             # Chat endpoint (proxies to OpenRouter)
│   └── models.js           # Models endpoint
├── css/
│   └── styles.css          # Complete stylesheet with CSS variables
└── js/
    ├── app.js              # Application bootstrap
    ├── config.js           # Central configuration
    ├── api/
    │   ├── base.js         # Fetch wrapper with streaming
    │   └── openrouter.js   # OpenRouter API client
    ├── components/
    │   ├── messageList.js  # Message rendering with citations
    │   ├── modelSelector.js # Model dropdown
    │   ├── searchBox.js    # Search input with image upload
    │   └── sidebar.js      # Sidebar with mobile support
    ├── services/
    │   ├── chat.js         # Chat state management
    │   ├── models.js       # Model configuration
    │   └── storage.js      # localStorage persistence
    └── utils/
        ├── dom.js          # DOM helper functions
        ├── events.js       # Pub/sub event bus
        ├── icons.js        # Centralized SVG icons
        └── markdown.js     # Markdown parser (Marked + DOMPurify)
```

### Key Design Decisions

- **No Framework** — Vanilla JS for simplicity and minimal dependencies
- **ES6 Modules** — Native browser modules, no bundler required
- **Event Bus** — Decoupled components communicate via pub/sub
- **LocalStorage** — Chat history persists across sessions
- **SSE Streaming** — Real-time response streaming with AbortController support
- **Vercel Serverless** — API key stored securely server-side

### External Libraries (CDN)

- **[Marked](https://marked.js.org/)** — Markdown parsing
- **[DOMPurify](https://github.com/cure53/DOMPurify)** — HTML sanitization
- **[Highlight.js](https://highlightjs.org/)** — Syntax highlighting

## Configuration

Edit `js/config.js` to customize:

```javascript
const config = {
    // API settings (proxied through Vercel serverless functions)
    api: {
        baseUrl: '/api',
        siteUrl: window.location.origin,
        siteName: 'Lampira AI'
    },

    // Default model
    defaultModel: 'x-ai/grok-4-fast',

    // Web search settings
    webSearch: {
        enabled: true,
        engine: 'native',      // 'native', 'exa', or undefined
        maxResults: 10,
        searchContextSize: 'high'  // 'low', 'medium', 'high'
    },

    // Chat settings
    chat: {
        maxHistoryLength: 50,
        systemPrompt: '...',
        streamingEnabled: true
    }
};
```

### Environment Variables

When deploying to Vercel, set these environment variables:

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key (required) |

## Web Search

Lampira uses OpenRouter's web search capabilities to provide up-to-date information:

- **Native xAI Search** — Grok models have built-in web search via `search_context_size`
- **Plugin-based Search** — OpenRouter's web plugin with configurable result limits
- **URL Citations** — Annotations are parsed from the streaming response and displayed as source cards

### How It Works

1. User submits a query
2. Request includes `plugins: [{ id: 'web', max_results: 10 }]`
3. Model searches the web and incorporates results into its response
4. URL citations are extracted from the response annotations
5. Source cards are rendered below the AI's answer

## API Reference

### Events

The app uses a pub/sub event system. Key events:

| Event | Description |
|-------|-------------|
| `message:send` | User sends a message |
| `ai:streaming` | Streaming chunk received |
| `ai:complete` | Response complete |
| `ai:sources:updated` | Citations updated |
| `ai:suggestions` | Follow-up suggestions generated |
| `ai:cancelled` | Generation stopped by user |
| `chat:cleared` | Chat history cleared |
| `sidebar:toggle` | Sidebar collapsed/expanded |
| `loading:start` | Request started |
| `loading:end` | Request completed |

### Chat Service

```javascript
import { sendUserMessage, clearHistory, cancelCurrentRequest } from './services/chat.js';

// Send a message (with optional images)
await sendUserMessage('What is quantum computing?', { images: [] });

// Cancel ongoing request
cancelCurrentRequest();

// Clear chat
clearHistory();
```

### Image Upload

Images can be attached via:

- Click the image upload button
- Paste from clipboard (Ctrl+V)
- Drag and drop (coming soon)

Supported formats: PNG, JPEG, WebP, GIF (max 20MB)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

Requires ES6 module support and modern CSS features.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) — Unified API for AI models
- [xAI](https://x.ai/) — Grok model with native web search
- Inspired by [Perplexity AI](https://perplexity.ai/)
