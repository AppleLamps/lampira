/**
 * Fal.ai API Client
 * Handles communication with the image generation API
 */

import { APIError } from './base.js';
import config from '../config.js';

/**
 * Generate an image from a text prompt
 * @param {string} prompt - Text description of the image to generate
 * @returns {Promise<Object>} - Response containing image URL
 */
export const generateImage = async (prompt) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new APIError('Prompt is required', 400);
    }

    const url = `${config.api.baseUrl}/image`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: response.statusText };
            }
            throw new APIError(
                errorData.error || 'Image generation failed',
                response.status,
                errorData
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        throw new APIError(error.message || 'Network error', 0);
    }
};

export default { generateImage };
