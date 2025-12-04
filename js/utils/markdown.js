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
 * @param {string} originalMarkdown - Original markdown for safe fallback
 * @returns {string}
 */
const sanitizeHtml = (html, originalMarkdown = '') => {
    if (typeof window.DOMPurify !== 'undefined') {
        return window.DOMPurify.sanitize(html, {
            ADD_ATTR: ['target', 'rel'],  // Allow target and rel attributes for links
            ADD_TAGS: ['iframe'],          // Allow iframes if needed
            FORBID_TAGS: ['script', 'style'],
            FORBID_ATTR: ['onerror', 'onload', 'onclick']
        });
    }
    // SECURITY: Fail safe - if DOMPurify is not available, return escaped text only
    // This prevents XSS attacks when the CDN fails to load
    console.error('DOMPurify not loaded. Rendering safe fallback (escaped text only).');
    return escapeHtml(originalMarkdown).replace(/\n/g, '<br>');
};

/**
 * Remove inline sources section from content
 * The sources are displayed in a separate UI component, so we strip them from the markdown
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
const stripInlineSources = (markdown) => {
    if (!markdown) return '';

    // Remove "Sources:" section and everything after it (commonly at the end of responses)
    // Matches various formats: "Sources:", "**Sources:**", "### Sources", "## Sources", etc.
    // Also handles lists of undefined links that follow
    const sourcesPatterns = [
        // Match "Sources:" header and following list items (including undefined links)
        /\n+(?:\*\*)?(?:#{0,3}\s*)?Sources:?\*?\*?\s*\n(?:[-*•]\s*(?:\[(?:undefined|.*?)\]\(.*?\)|.*?)\n?)*/gi,
        // Match standalone "Sources:" with bullet list of links
        /\n+Sources:\s*\n(?:[-*•]\s*\[.*?\]\(.*?\)\s*\n?)*/gi,
        // Match just a list of undefined links at the end
        /\n+(?:[-*•]\s*\[undefined\]\(.*?\)\s*\n?)+$/gi
    ];

    let result = markdown;
    for (const pattern of sourcesPatterns) {
        result = result.replace(pattern, '\n');
    }

    return result.trim();
};

/**
 * Remove inline citations completely
 * Sources are displayed in a separate UI component, so we remove inline links entirely
 * @param {string} markdown - Markdown text
 * @param {Array} sources - Array of source objects with url and title
 * @returns {string}
 */
const fixInlineCitations = (markdown, sources = []) => {
    if (!markdown) return '';

    // Build a set of source URLs to identify citation links
    const sourceUrls = new Set();
    if (sources && sources.length > 0) {
        sources.forEach((source) => {
            if (source.url) {
                sourceUrls.add(source.url);
            }
        });
    }

    // Remove citation links entirely - these are displayed in the sources cards
    // Match [undefined](url), [number](url), or links that point to source URLs
    let result = markdown.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, url) => {
        // If the text is "undefined", empty, null, or just a number - remove it
        if (text === 'undefined' || text === '' || text === 'null' || /^\d+$/.test(text)) {
            return '';
        }
        // If the URL is a source URL, remove the link but keep the text (if meaningful)
        if (sourceUrls.has(url)) {
            return '';
        }
        // Keep other links (regular content links, not citations)
        return match;
    });

    // Also clean up any remaining standalone "undefined" text
    result = result.replace(/\s*\bundefined\b(?:\s*[;,.]?\s*)?(?=\s|$|\n)/gi, ' ');

    // Clean up multiple spaces and trailing periods after removed citations
    result = result.replace(/\s+\./g, '.');
    result = result.replace(/  +/g, ' ');
    result = result.replace(/\.\s*\./g, '.');

    return result.trim();
};

/**
 * Parse markdown to HTML
 * @param {string} markdown - Markdown text
 * @param {Array} sources - Optional array of sources for citation fixing
 * @returns {string}
 */
export const parseMarkdown = (markdown, sources = []) => {
    if (!markdown) return '';

    // Configure marked on first use
    if (!markedConfigured) {
        markedConfigured = configureMarked();
    }

    // Fix inline citations (replace undefined with source numbers)
    let cleanedMarkdown = fixInlineCitations(markdown, sources);

    // Strip inline sources section (displayed separately in UI)
    cleanedMarkdown = stripInlineSources(cleanedMarkdown);

    // Use marked if available
    if (typeof window.marked !== 'undefined') {
        try {
            const html = window.marked.parse(cleanedMarkdown);
            return sanitizeHtml(html, cleanedMarkdown);
        } catch (error) {
            console.error('Marked parsing error:', error);
            return escapeHtml(cleanedMarkdown);
        }
    }

    // Fallback: return escaped text if marked not available
    return escapeHtml(cleanedMarkdown).replace(/\n/g, '<br>');
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
