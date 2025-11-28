# AGENTS.md — AI Agent Guidelines for Lampira

This document provides guidelines for AI agents (GitHub Copilot, Claude, Cursor, etc.) working on the Lampira codebase.

## Project Overview

Lampira is a Perplexity-style AI research engine built with vanilla JavaScript and ES6 modules. It uses OpenRouter for API access with web search capabilities.

## Code Style

### JavaScript

- **ES6 Modules** — Use `import`/`export` syntax, no CommonJS
- **No Framework** — Pure vanilla JS, no React/Vue/Angular
- **JSDoc Comments** — Document all exported functions with JSDoc
- **Const by Default** — Use `const` unless reassignment is needed
- **Arrow Functions** — Prefer arrow functions for callbacks and short functions
- **Template Literals** — Use backticks for string interpolation
- **Async/Await** — Prefer over `.then()` chains

```javascript
/**
 * Send a chat message
 * @param {string} content - Message content
 * @param {Object} options - Additional options
 * @returns {Promise<Object>}
 */
export const sendMessage = async (content, options = {}) => {
    // Implementation
};
```

### CSS

- **BEM-ish Naming** — Use descriptive class names like `.message-content`, `.source-card`
- **CSS Variables** — Define colors and spacing as variables when appropriate
- **Mobile-First** — Base styles for mobile, media queries for larger screens
- **No CSS-in-JS** — All styles in `css/styles.css`

```css
/* Component sections marked with comments */
/* ============ Component Name ============ */
.component {
    /* Layout */
    display: flex;
    /* Spacing */
    padding: 16px;
    /* Visual */
    background: #ffffff;
    border-radius: 8px;
}
```

### HTML

- **Semantic Elements** — Use `<main>`, `<aside>`, `<nav>`, etc.
- **Accessibility** — Include `title` attributes on buttons, proper ARIA labels
- **Data Attributes** — Use `data-*` for JS hooks, not classes

## Architecture Patterns

### Event-Driven Communication

Components communicate via the EventBus:

```javascript
import eventBus, { Events } from '../utils/events.js';

// Subscribe
eventBus.on(Events.AI_STREAMING, ({ chunk, fullContent }) => {
    // Handle streaming
});

// Emit
eventBus.emit(Events.MESSAGE_SEND, { content });
```

### Module Organization

```
js/
├── api/          # API clients and fetch utilities
├── components/   # UI components (DOM manipulation)
├── services/     # Business logic and state
└── utils/        # Pure utility functions
```

### State Management

- **No Global State** — State lives in services
- **LocalStorage** — Persistence via `services/storage.js`
- **Immutable Updates** — Return new objects/arrays, don't mutate

### Error Handling

- **APIError Class** — Use for all API errors
- **Try/Catch** — Wrap async operations
- **User Feedback** — Show notifications for errors

```javascript
try {
    await sendMessage(content);
} catch (error) {
    eventBus.emit(Events.AI_ERROR, error);
}
```

## File-Specific Guidelines

### `js/config.js`

Central configuration. Add new settings here with sensible defaults. Never commit API keys.

### `js/api/base.js`

Low-level fetch wrapper. Handle streaming, errors, and retries here.

### `js/api/openrouter.js`

OpenRouter-specific logic. Add model params, web search config here.

### `js/services/chat.js`

Chat state and AI interaction orchestration. Manages history, streaming state, abort controller.

### `js/components/messageList.js`

Message rendering. Handle markdown parsing, source citations, and streaming UI updates.

### `js/utils/events.js`

Event constants and bus. Add new event types to the `Events` object.

## Common Tasks

### Adding a New Feature

1. Add config options to `js/config.js`
2. Create/update service in `js/services/`
3. Create/update component in `js/components/`
4. Add event types to `js/utils/events.js` if needed
5. Add CSS to `css/styles.css`

### Adding a New Model

1. Add to `config.models` array in `js/config.js`
2. Model selector will auto-populate

### Adding a New API Parameter

1. Update `js/api/openrouter.js` to include the parameter
2. Add config option if user-configurable

### Styling Changes

1. Find the relevant section in `css/styles.css` (marked with comments)
2. Follow existing patterns for spacing, colors
3. Test collapsed sidebar state

## Testing Checklist

Before submitting changes:

- [ ] App loads without console errors
- [ ] Chat sends and receives messages
- [ ] Streaming displays incrementally
- [ ] Sources appear after response
- [ ] Sidebar collapses/expands correctly
- [ ] Works in collapsed sidebar mode
- [ ] Mobile responsive layout works

## Don't

- Don't add npm dependencies
- Don't use a bundler (Webpack, Vite, etc.)
- Don't use TypeScript (vanilla JS only)
- Don't store API keys in code
- Don't use `var` — use `const`/`let`
- Don't use jQuery or other DOM libraries
- Don't add inline styles — use CSS classes

## Do

- Do use semantic HTML
- Do add JSDoc comments
- Do handle errors gracefully
- Do test streaming behavior
- Do maintain mobile responsiveness
- Do follow existing code patterns
