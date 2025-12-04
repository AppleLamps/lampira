/**
 * Base API Utilities
 * Fetch wrapper with error handling and streaming support
 */

import config from '../config.js';

/**
 * Custom API Error class
 */
export class APIError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Base fetch wrapper with common configuration
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const baseFetch = async (endpoint, options = {}) => {
    const url = `${config.api.baseUrl}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    const fetchOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: response.statusText };
            }
            throw new APIError(
                errorData.error?.message || errorData.message || 'API request failed',
                response.status,
                errorData
            );
        }

        return response;
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(error.message || 'Network error', 0);
    }
};

/**
 * Make a JSON API request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
export const fetchJSON = async (endpoint, options = {}) => {
    const response = await baseFetch(endpoint, options);
    return response.json();
};

/**
 * Make a streaming API request (Server-Sent Events)
 * 
 * SSE Parsing Strategy:
 * - Uses a buffer approach that waits for complete lines (ending in \n) before parsing
 * - Handles various SSE termination signals: `data: [DONE]`, connection close, finish_reason
 * - Gracefully handles malformed JSON by logging and skipping (chunk may be split across reads)
 * - Preserves partial content on abort/error for graceful degradation
 * 
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {Object} callbacks - Callback functions
 * @param {AbortController} abortController - Optional abort controller for cancellation
 * @returns {Promise<void>}
 */
export const fetchStream = async (endpoint, body, { onChunk, onComplete, onError, onProcessing, onAnnotations }, abortController = null) => {
    const url = `${config.api.baseUrl}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json'
    };

    // Create abort controller if not provided
    const controller = abortController || new AbortController();

    // Track state across try-catch
    let fullContent = '';
    let annotations = [];
    let usage = null;
    let streamCompleted = false;

    /**
     * Parse a single SSE data line
     * @param {string} data - The data portion after "data: "
     * @returns {boolean} Whether to continue processing (false = stream done)
     */
    const parseSSEData = (data) => {
        // Handle stream termination signals
        // Different providers may send: [DONE], {"type":"done"}, or just close connection
        if (data === '[DONE]' || data === 'done' || data === '') {
            return false;
        }

        try {
            const parsed = JSON.parse(data);

            // Check for mid-stream errors
            if (parsed.error) {
                const errorMessage = parsed.error.message || 'Stream error occurred';
                throw new APIError(errorMessage, parsed.error.code || 500, parsed.error);
            }

            // Extract content from delta
            const content = parsed.choices?.[0]?.delta?.content || '';

            if (content) {
                fullContent += content;
                if (onChunk) onChunk(content, fullContent);
            }

            // Extract web search annotations (URL citations)
            const deltaAnnotations = parsed.choices?.[0]?.delta?.annotations;
            if (deltaAnnotations && Array.isArray(deltaAnnotations)) {
                for (const annotation of deltaAnnotations) {
                    if (annotation.type === 'url_citation' && annotation.url_citation) {
                        // Avoid duplicates
                        const exists = annotations.some(a => a.url === annotation.url_citation.url);
                        if (!exists) {
                            annotations.push({
                                url: annotation.url_citation.url,
                                title: annotation.url_citation.title || new URL(annotation.url_citation.url).hostname,
                                startIndex: annotation.start_index,
                                endIndex: annotation.end_index
                            });
                            if (onAnnotations) onAnnotations([...annotations]);
                        }
                    }
                }
            }

            // Check for finish reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason) {
                if (finishReason === 'error') {
                    throw new APIError('Stream terminated due to error', 500, parsed);
                }
                // 'stop', 'length', 'content_filter' etc. indicate normal completion
                // Don't return false here - let the stream close naturally or send [DONE]
            }

            // Capture usage stats from final chunk
            if (parsed.usage) {
                usage = parsed.usage;
            }

            return true;
        } catch (e) {
            // Re-throw API errors
            if (e instanceof APIError) throw e;
            // Log and skip invalid JSON (may be split across chunks, or non-standard format)
            console.debug('Skipping non-JSON SSE data:', data.substring(0, 100));
            return true;
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ...body,
                stream: true,
                stream_options: { include_usage: true }
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: response.statusText };
            }
            throw new APIError(
                errorData.error?.message || 'Stream request failed',
                response.status,
                errorData
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                // Connection closed by server
                // Process any remaining complete lines in buffer
                if (buffer.trim()) {
                    const remainingLines = buffer.split('\n');
                    for (const line of remainingLines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const shouldContinue = parseSSEData(trimmedLine.slice(6));
                            if (!shouldContinue) break;
                        }
                    }
                }
                streamCompleted = true;
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            // Split on newlines, keeping incomplete line in buffer
            // This ensures we only parse complete SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep last (potentially incomplete) line

            for (const line of lines) {
                const trimmedLine = line.trim();

                // Handle OpenRouter processing comments (SSE comments start with ':')
                if (trimmedLine.startsWith(':')) {
                    if (trimmedLine.includes('OPENROUTER PROCESSING') && onProcessing) {
                        onProcessing();
                    }
                    continue;
                }

                // Handle empty lines (SSE event separator)
                if (!trimmedLine) continue;

                // Handle data lines
                if (trimmedLine.startsWith('data: ')) {
                    const shouldContinue = parseSSEData(trimmedLine.slice(6));
                    if (!shouldContinue) {
                        streamCompleted = true;
                        if (onComplete) onComplete(fullContent, usage, annotations);
                        return;
                    }
                }
                // Ignore other SSE fields (event:, id:, retry:) - not used by OpenRouter
            }
        }

        // Stream ended normally (connection closed)
        if (onComplete) onComplete(fullContent, usage, annotations);

    } catch (error) {
        // Handle abort - still call onComplete with partial content
        if (error.name === 'AbortError') {
            if (onComplete) onComplete(fullContent, usage, annotations);
            return;
        }

        if (onError) {
            onError(error instanceof APIError ? error : new APIError(error.message, 0));
        } else {
            throw error;
        }
    }
};

/**
 * Retry wrapper for API calls
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise<*>}
 */
export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on client errors (4xx)
            if (error instanceof APIError && error.status >= 400 && error.status < 500) {
                throw error;
            }

            // Wait before retrying
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }

    throw lastError;
};

export default { baseFetch, fetchJSON, fetchStream, withRetry, APIError };
