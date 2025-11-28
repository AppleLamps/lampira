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
 * Replace undefined inline citations with proper source numbers or remove them
 * Handles patterns like [undefined](url) and replaces with numbered citations
 * @param {string} markdown - Markdown text
 * @param {Array} sources - Array of source objects with url and title
 * @returns {string}
 */
const fixInlineCitations = (markdown, sources = []) => {
    if (!markdown) return '';

    // Build a map of URLs to source numbers
    const urlToNumber = new Map();
    if (sources && sources.length > 0) {
        sources.forEach((source, index) => {
            if (source.url) {
                urlToNumber.set(source.url, index + 1);
            }
        });
    }

    // Replace [undefined](url) or [text](url) patterns with numbered citations
    // This regex matches markdown links
    let result = markdown.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, url) => {
        // If the text is "undefined" or empty, try to replace with source number
        if (text === 'undefined' || text === '' || text === 'null') {
            const sourceNum = urlToNumber.get(url);
            if (sourceNum) {
                // Replace with a superscript-style citation number
                return `[${sourceNum}](${url})`;
            }
            // If URL not in sources, just remove the undefined link entirely
            return '';
        }
        // Keep the original link if it has proper text
        return match;
    });

    // Also clean up any remaining standalone "undefined" text that might appear
    // (but be careful not to remove legitimate uses of the word)
    result = result.replace(/\s*\bundefined\b(?:\s*[;,.]?\s*)?(?=\s|$|\n)/gi, ' ');

    // Clean up multiple spaces
    result = result.replace(/  +/g, ' ');

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
            return sanitizeHtml(html);
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
