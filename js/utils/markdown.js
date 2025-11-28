/**
 * Markdown Parser
 * Simple markdown to HTML converter for AI responses
 */

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
 * Parse inline markdown elements
 * @param {string} text - Text to parse
 * @returns {string}
 */
const parseInline = (text) => {
    // Escape HTML first
    let result = escapeHtml(text);

    // Bold: **text** or __text__
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    result = result.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+?)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code: `code`
    result = result.replace(/`([^`]+?)`/g, '<code class="inline-code">$1</code>');

    // Links: [text](url)
    result = result.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    return result;
};

/**
 * Parse markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
export const parseMarkdown = (markdown) => {
    if (!markdown) return '';

    const lines = markdown.split('\n');
    const result = [];
    let inCodeBlock = false;
    let codeBlockContent = [];
    let codeBlockLang = '';
    let inList = false;
    let listItems = [];
    let listType = 'ul';

    const flushList = () => {
        if (listItems.length > 0) {
            const tag = listType;
            result.push(`<${tag}>${listItems.join('')}</${tag}>`);
            listItems = [];
            inList = false;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                const code = codeBlockContent.join('\n');
                const langClass = codeBlockLang ? ` class="language-${codeBlockLang}"` : '';
                result.push(`<pre><code${langClass}>${escapeHtml(code)}</code></pre>`);
                codeBlockContent = [];
                codeBlockLang = '';
                inCodeBlock = false;
            } else {
                // Start code block
                flushList();
                codeBlockLang = line.slice(3).trim();
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // Empty line
        if (line.trim() === '') {
            flushList();
            result.push('');
            continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            flushList();
            const level = headerMatch[1].length;
            const text = parseInline(headerMatch[2]);
            result.push(`<h${level}>${text}</h${level}>`);
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
            flushList();
            result.push('<hr>');
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            flushList();
            const text = parseInline(line.slice(2));
            result.push(`<blockquote>${text}</blockquote>`);
            continue;
        }

        // Unordered list
        const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                flushList();
                inList = true;
                listType = 'ul';
            }
            listItems.push(`<li>${parseInline(ulMatch[2])}</li>`);
            continue;
        }

        // Ordered list
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
        if (olMatch) {
            if (!inList || listType !== 'ol') {
                flushList();
                inList = true;
                listType = 'ol';
            }
            listItems.push(`<li>${parseInline(olMatch[2])}</li>`);
            continue;
        }

        // Regular paragraph
        flushList();
        result.push(`<p>${parseInline(line)}</p>`);
    }

    // Close any open code block
    if (inCodeBlock) {
        const code = codeBlockContent.join('\n');
        result.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
    }

    // Flush remaining list
    flushList();

    // Join and clean up empty paragraphs
    return result
        .filter(line => line !== '')
        .join('\n');
};

/**
 * Parse markdown with syntax highlighting placeholder
 * (Can be enhanced with Prism.js or highlight.js later)
 * @param {string} markdown - Markdown text
 * @returns {string}
 */
export const parseMarkdownWithHighlight = (markdown) => {
    return parseMarkdown(markdown);
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

export default { parseMarkdown, parseMarkdownWithHighlight, stripMarkdown };
