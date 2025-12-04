/**
 * Fal.ai API Client
 * Handles communication with the image generation API
 */

import { APIError } from './base.js';
import config from '../config.js';

/**
 * Generate an image from a text prompt
 * @param {string} prompt - Text description of the image to generate
 * @param {Object} options - Optional generation parameters (overrides config defaults)
 * @returns {Promise<Object>} - Response containing image URL
 */
export const generateImage = async (prompt, options = {}) => {
    if (!prompt || typeof prompt !== 'string') {
        throw new APIError('Prompt is required', 400);
    }

    const url = `${config.api.baseUrl}/image`;

    // Merge config defaults with any overrides
    const imageGenConfig = config.imageGen || {};
    const params = {
        prompt,
        image_size: options.imageSize || imageGenConfig.imageSize || 'landscape_4_3',
        num_inference_steps: options.numInferenceSteps || imageGenConfig.numInferenceSteps || 30,
        num_images: options.numImages || imageGenConfig.numImages || 1,
        enable_safety_checker: options.enableSafetyChecker ?? imageGenConfig.enableSafetyChecker ?? true
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
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
