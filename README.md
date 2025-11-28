# Lampira AI

A fast, open-source AI research engine built with vanilla JavaScript. Lampira provides Perplexity-style answers with real-time web search, source citations, AI image generation, and a clean, modern interface.

![Lampira AI](https://img.shields.io/badge/AI-Research%20Engine-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow)

## Features

### Chat & Research

- **Dual Mode** — Toggle between Chat mode (conversation) and Web mode (research with sources)
- **Real-time Web Search** — Powered by OpenRouter's web search plugin with native xAI integration
- **Source Citations** — Every web search answer includes collapsible source cards with favicons and domain info
- **Streaming Responses** — Watch answers appear in real-time with SSE streaming
- **Follow-up Suggestions** — AI-generated follow-up questions in web search mode
- **Stop Generation** — Cancel AI responses mid-stream
- **Copy Response** — One-click copy button appears on hover for assistant messages

### File Attachments

- **Image Uploads** — Attach images to your messages for multimodal AI analysis (PNG, JPEG, WebP, GIF up to 20MB)
- **PDF Uploads** — Attach PDF documents for AI analysis and Q&A (up to 50MB, processed via OpenRouter)
- **Paste Support** — Paste images directly from clipboard (Ctrl+V)

### AI Image Generation

- **Text-to-Image** — Generate images from text descriptions using Fal.ai's Z-Image Turbo model
- **Masonry Gallery** — Beautiful masonry layout for generated images
- **Image Actions** — Download, view fullscreen, or delete generated images
- **Smooth Transitions** — Placeholder shimmer effect while generating

### Code & Markdown

- **Syntax Highlighting** — Code blocks are beautifully highlighted with Highlight.js
- **Copy Code Buttons** — One-click copy for code snippets
- **Full Markdown Support** — Headers, lists, tables, links, and more

### Interface

- **Chat History** — Conversations are automatically saved to localStorage with easy deletion
- **Collapsible Sidebar** — Icon-only mode for more screen space
- **Mobile Responsive** — Full mobile support with drawer-style sidebar
- **Dark-free Design** — Clean, minimal light interface

### Developer Experience

- **No Build Tools** — Pure vanilla JavaScript with ES6 modules
- **Event-Driven** — Decoupled components via pub/sub event bus
- **Secure API Keys** — Keys stored server-side via Vercel serverless functions

## Quick Start

### Option 1: Deploy to Vercel (Recommended)

1. Fork this repository
2. Import to [Vercel](https://vercel.com)
3. Add environment variables:
   - `OPENROUTER_API_KEY` — Your API key from [OpenRouter](https://openrouter.ai/)
   - `FAL_KEY` — Your API key from [Fal.ai](https://fal.ai/) (for image generation)
4. Deploy!

### Option 2: Local Development with Vercel CLI

```bash
# Clone the repository
git clone https://github.com/yourusername/Lampira.git
cd Lampira

# Install Vercel CLI
npm i -g vercel

# Create .env.local with your API keys
echo "OPENROUTER_API_KEY=your_openrouter_key_here" > .env.local
echo "FAL_KEY=your_fal_key_here" >> .env.local

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
├── AGENTS.md               # AI agent guidelines for development
├── api/                    # Vercel serverless functions
│   ├── chat.js             # Chat endpoint (proxies to OpenRouter)
│   ├── image.js            # Image generation endpoint (proxies to Fal.ai)
│   └── models.js           # Models endpoint
├── css/
│   └── styles.css          # Complete stylesheet with CSS variables
└── js/
    ├── app.js              # Application bootstrap
    ├── config.js           # Central configuration
    ├── api/
    │   ├── base.js         # Fetch wrapper with streaming
    │   ├── fal.js          # Fal.ai image generation client
    │   └── openrouter.js   # OpenRouter API client
    ├── components/
    │   ├── imageGallery.js # Image generation gallery
    │   ├── messageList.js  # Message rendering with citations
    │   ├── modelSelector.js # Model dropdown
    │   ├── searchBox.js    # Search input with file uploads
    │   └── sidebar.js      # Sidebar with view switching
    ├── services/
    │   ├── chat.js         # Chat state management
    │   ├── imageGen.js     # Image generation service
    │   ├── models.js       # Model configuration
    │   └── storage.js      # localStorage persistence
    └── utils/
        ├── dom.js          # DOM helper functions
        ├── events.js       # Pub/sub event bus
        ├── icons.js        # Centralized SVG icons
        └── markdown.js     # Markdown parser with citation fixing
```

### Key Design Decisions

- **No Framework** — Vanilla JS for simplicity and minimal dependencies
- **ES6 Modules** — Native browser modules, no bundler required
- **Event Bus** — Decoupled components communicate via pub/sub
- **LocalStorage** — Chat history and generated images persist across sessions
- **SSE Streaming** — Real-time response streaming with AbortController support
- **Vercel Serverless** — API keys stored securely server-side

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

    // Web search settings (used when web mode is enabled)
    webSearch: {
        enabled: false,        // Default to chat mode
        engine: 'native',      // 'native', 'exa', or undefined
        maxResults: 10,
        searchContextSize: 'high'  // 'low', 'medium', 'high'
    },

    // Chat settings
    chat: {
        maxHistoryLength: 50,
        systemPromptChat: '...',  // System prompt for chat mode
        systemPromptWeb: '...',   // System prompt for web search mode
        streamingEnabled: true
    }
};
```

### Environment Variables

When deploying to Vercel, set these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `FAL_KEY` | Your Fal.ai API key for image generation | Yes |

## Features in Detail

### Web Search Mode

Toggle web search with the globe button in the search bar:

- **Chat Mode (default)** — Direct conversation with the AI, no web search
- **Web Mode** — AI searches the web and cites sources in responses

When web search is enabled:

1. Request includes `plugins: [{ id: 'web', max_results: 10 }]`
2. Model searches the web and incorporates results
3. URL citations are extracted from response annotations
4. Source cards are rendered below the AI's answer
5. Follow-up questions are suggested

### PDF Document Analysis

Upload PDF files for AI analysis:

- Click the attach button (📎) and select a PDF
- PDFs are converted to base64 and sent to OpenRouter
- OpenRouter processes PDFs using its `pdf-text` engine (free) or `mistral-ocr` for scanned documents
- Ask questions about the document content

### Image Generation

Switch to "Create Image" in the sidebar:

- Enter a text description of the image you want
- Uses Fal.ai's Z-Image Turbo model (30 inference steps)
- Images appear in a masonry gallery
- Download, view fullscreen, or delete images
- Generated images are saved to localStorage

## API Reference

### Events

The app uses a pub/sub event system. Key events:

| Event | Description |
|-------|-------------|
| `message:send` | User sends a message |
| `ai:streaming` | Streaming chunk received |
| `ai:processing` | OpenRouter is processing |
| `ai:complete` | Response complete |
| `ai:sources:updated` | Citations updated during streaming |
| `ai:suggestions` | Follow-up suggestions generated |
| `ai:cancelled` | Generation stopped by user |
| `chat:cleared` | Chat history cleared |
| `chat:loaded` | Chat loaded from history |
| `view:changed` | Switched between chat/images view |
| `websearch:toggle` | Web search enabled/disabled |
| `image:gen:start` | Image generation started |
| `image:gen:complete` | Image generation complete |
| `image:gen:error` | Image generation failed |
| `sidebar:toggle` | Sidebar collapsed/expanded |
| `loading:start` | Request started |
| `loading:end` | Request completed |

### Chat Service

```javascript
import { sendUserMessage, clearHistory, cancelCurrentRequest } from './services/chat.js';

// Send a message with optional attachments
await sendUserMessage('What is quantum computing?', {
    images: [],           // Array of base64 image data URLs
    pdfs: [],             // Array of { data: base64, filename: string }
    webSearchEnabled: true
});

// Cancel ongoing request
cancelCurrentRequest();

// Clear chat
clearHistory();
```

### Image Generation Service

```javascript
import { generate, getImages, deleteImage } from './services/imageGen.js';

// Generate an image
const image = await generate('A beautiful sunset over mountains');

// Get all generated images
const images = getImages();

// Delete an image
deleteImage(imageId);
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
3. Read `AGENTS.md` for code style guidelines
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) — Unified API for AI models
- [Fal.ai](https://fal.ai/) — Fast image generation API
- [xAI](https://x.ai/) — Grok model with native web search
- Inspired by [Perplexity AI](https://perplexity.ai/)
