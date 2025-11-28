/**
 * Markdown Parser
 * Uses Marked library for parsing with DOMPurify for sanitization
 */

// Configure marked options
const configureMarked = () => {
    if (typeof window.marked === 'undefined') {
        console.warn('Marked library not loaded, falling back to basic parsing');
        return false;
    }

    // Configure marked options
    window.marked.setOptions({
        gfm: true,           // GitHub Flavored Markdown
        breaks: true,        // Convert \n to <br>
        headerIds: false,    // Don't add IDs to headers
        mangle: false,       // Don't mangle email addresses
    });

    // Custom renderer for links to open in new tab
    const renderer = new window.marked.Renderer();

    renderer.link = (href, title, text) => {
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    // Add language class to code blocks for highlight.js
    renderer.code = (code, language) => {
        const langClass = language ? `language-${language}` : '';
        const escapedCode = escapeHtml(code);
        return `<pre><code class="${langClass}">${escapedCode}</code></pre>`;
    };

    // Style inline code
    renderer.codespan = (code) => {
        return `<code class="inline-code">${escapeHtml(code)}</code>`;
    };

    window.marked.use({ renderer });
    return true;
};

// Track if marked has been configured
let markedConfigured = false;

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string}
 */
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Sanitize HTML using DOMPurify
 * @param {string} html - HTML to sanitize
 * @returns {string}
 */
const sanitizeHtml = (html) => {
    if (typeof window.DOMPurify !== 'undefined') {
        return window.DOMPurify.sanitize(html, {
            ADD_ATTR: ['target', 'rel'],  // Allow target and rel attributes for links
            ADD_TAGS: ['iframe'],          // Allow iframes if needed
            FORBID_TAGS: ['script', 'style'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick']
        });
    }
    // Fallback: return as-is if DOMPurify not available
    return html;
};

/**
 * Parse markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
export const parseMarkdown = (markdown) => {
    if (!markdown) return '';

    // Configure marked on first use
    if (!markedConfigured) {
        markedConfigured = configureMarked();
    }

    // Use marked if available
    if (typeof window.marked !== 'undefined') {
        try {
            const html = window.marked.parse(markdown);
            return sanitizeHtml(html);
        } catch (error) {
            console.error('Marked parsing error:', error);
            return escapeHtml(markdown);
        }
    }

    // Fallback: return escaped text if marked not available
    return escapeHtml(markdown).replace(/\n/g, '<br>');
};

/**
 * Parse markdown with syntax highlighting
 * Note: Highlighting is applied separately via highlightCodeBlocks()
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
export const parseMarkdownWithHighlight = (markdown) => {
    return parseMarkdown(markdown);
};

/**
 * Apply syntax highlighting to code blocks in a container
 * @param {HTMLElement} container - Container element with code blocks
 */
export const highlightCodeBlocks = (container) => {
    if (typeof window.hljs === 'undefined') {
        return;
    }

    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
        // Only highlight if not already highlighted
        if (!block.classList.contains('hljs')) {
            window.hljs.highlightElement(block);
        }
    });
};

/**
 * Strip markdown formatting (plain text)
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
export const stripMarkdown = (markdown) => {
    if (!markdown) return '';

    return markdown
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`[^`]+`/g, '')
        // Remove headers
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        // Remove links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove list markers
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .trim();
};

export default { parseMarkdown, parseMarkdownWithHighlight, highlightCodeBlocks, stripMarkdown };
