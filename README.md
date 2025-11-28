# Lampira AI

A fast, open-source AI research engine built with vanilla JavaScript. Lampira provides Perplexity-style answers with real-time web search, source citations, and a clean, modern interface.

![Lampira AI](https://img.shields.io/badge/AI-Research%20Engine-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow)

## Features

- **Real-time Web Search** — Powered by OpenRouter's web search plugin with native xAI integration
- **Source Citations** — Every answer includes clickable source cards with favicons and domain info
- **Streaming Responses** — Watch answers appear in real-time with SSE streaming
- **Chat History** — Conversations are automatically saved to localStorage
- **Collapsible Sidebar** — Icon-only mode for more screen space
- **No Build Tools** — Pure vanilla JavaScript with ES6 modules
- **Responsive Design** — Works on desktop and mobile devices

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Lampira.git
cd Lampira
```

### 2. Get an OpenRouter API Key

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Create an API key in your dashboard
3. The app will prompt you to enter your API key on first use

### 3. Serve the Application

Since Lampira uses ES6 modules, you need to serve it via HTTP (not `file://`):

**Using Python:**

```bash
python -m http.server 8080
```

**Using Node.js:**

```bash
npx serve .
```

**Using VS Code:**
Install the "Live Server" extension and click "Go Live"

### 4. Open in Browser

Navigate to `http://localhost:8080` and start asking questions!

## Architecture

Lampira uses a modular vanilla JavaScript architecture with an event-driven design:

```
Lampira/
├── index.html              # Main HTML entry point
├── css/
│   └── styles.css          # Complete stylesheet
└── js/
    ├── app.js              # Application bootstrap
    ├── config.js           # Central configuration
    ├── api/
    │   ├── base.js         # Fetch wrapper with streaming
    │   └── openrouter.js   # OpenRouter API client
    ├── components/
    │   ├── messageList.js  # Message rendering with citations
    │   ├── modelSelector.js # Model dropdown
    │   ├── searchBox.js    # Search input handling
    │   └── sidebar.js      # Sidebar with collapse
    ├── services/
    │   ├── chat.js         # Chat state management
    │   ├── models.js       # Model configuration
    │   └── storage.js      # localStorage persistence
    └── utils/
        ├── dom.js          # DOM helper functions
        ├── events.js       # Pub/sub event bus
        └── markdown.js     # Markdown parser
```

### Key Design Decisions

- **No Framework** — Vanilla JS for simplicity and zero dependencies
- **ES6 Modules** — Native browser modules, no bundler required
- **Event Bus** — Decoupled components communicate via pub/sub
- **LocalStorage** — Chat history persists across sessions
- **SSE Streaming** — Real-time response streaming with AbortController support

## Configuration

Edit `js/config.js` to customize:

```javascript
const config = {
    // API settings
    api: {
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: localStorage.getItem('openrouter_api_key') || ''
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
| `chat:cleared` | Chat history cleared |
| `sidebar:toggle` | Sidebar collapsed/expanded |

### Chat Service

```javascript
import { sendUserMessage, clearHistory, cancelCurrentRequest } from './services/chat.js';

// Send a message
await sendUserMessage('What is quantum computing?');

// Cancel ongoing request
cancelCurrentRequest();

// Clear chat
clearHistory();
```

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
