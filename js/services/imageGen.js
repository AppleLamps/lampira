/**
 * Image Generation Service
 * Manages image generation state and persistence
 */

import config from '../config.js';
import eventBus, { Events } from '../utils/events.js';
import { generateImage as apiGenerateImage } from '../api/fal.js';

// In-memory image cache
let images = [];

// Loading state
let isGenerating = false;

/**
 * Load images from localStorage
 * @returns {Array}
 */
const loadImages = () => {
    try {
        const stored = localStorage.getItem(config.storage.generatedImages);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to load images from storage:', error);
        return [];
    }
};

/**
 * Save images to localStorage
 * @param {Array} imageList
 */
const saveImages = (imageList) => {
    try {
        localStorage.setItem(config.storage.generatedImages, JSON.stringify(imageList));
    } catch (error) {
        console.error('Failed to save images to storage:', error);
    }
};

/**
 * Initialize the service
 */
export const init = () => {
    images = loadImages();
};

/**
 * Get all generated images
 * @returns {Array}
 */
export const getImages = () => [...images];

/**
 * Check if currently generating
 * @returns {boolean}
 */
export const getIsGenerating = () => isGenerating;

/**
 * Add an image to the gallery
 * @param {Object} imageObj - Image object with url, prompt, timestamp
 * @returns {Object} The added image
 */
export const addImage = (imageObj) => {
    const image = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        url: imageObj.url,
        prompt: imageObj.prompt,
        timestamp: imageObj.timestamp || Date.now(),
        width: imageObj.width,
        height: imageObj.height
    };

    images.unshift(image); // Add to beginning (newest first)
    saveImages(images);

    return image;
};

/**
 * Delete an image from the gallery
 * @param {string} imageId - Image ID to delete
 * @returns {boolean} Success
 */
export const deleteImage = (imageId) => {
    const index = images.findIndex(img => img.id === imageId);
    if (index !== -1) {
        images.splice(index, 1);
        saveImages(images);
        return true;
    }
    return false;
};

/**
 * Clear all images
 */
export const clearImages = () => {
    images = [];
    saveImages(images);
};

/**
 * Generate a new image from a prompt
 * @param {string} prompt - Text prompt for image generation
 * @returns {Promise<Object>} The generated image object
 */
export const generate = async (prompt) => {
    if (isGenerating) {
        throw new Error('Already generating an image');
    }

    if (!prompt || !prompt.trim()) {
        throw new Error('Prompt cannot be empty');
    }

    isGenerating = true;

    // Create placeholder ID for loading state
    const placeholderId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    eventBus.emit(Events.IMAGE_GEN_START, { prompt, placeholderId });
    eventBus.emit(Events.LOADING_START);

    try {
        const result = await apiGenerateImage(prompt.trim());

        // Extract image from Fal.ai response
        // Fal.ai returns { images: [{ url, width, height }] }
        const imageData = result.images?.[0];

        if (!imageData || !imageData.url) {
            throw new Error('No image returned from API');
        }

        const image = addImage({
            url: imageData.url,
            prompt: prompt.trim(),
            timestamp: Date.now(),
            width: imageData.width,
            height: imageData.height
        });

        eventBus.emit(Events.IMAGE_GEN_COMPLETE, { image, placeholderId });
        eventBus.emit(Events.LOADING_END);

        return image;
    } catch (error) {
        eventBus.emit(Events.IMAGE_GEN_ERROR, { error, placeholderId });
        eventBus.emit(Events.LOADING_END);
        throw error;
    } finally {
        isGenerating = false;
    }
};

// Initialize on module load
init();

export default {
    init,
    getImages,
    getIsGenerating,
    addImage,
    deleteImage,
    clearImages,
    generate
};
