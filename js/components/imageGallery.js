/**
 * Image Gallery Component
 * Renders generated images in a masonry layout
 */

import { $, createElement, empty } from '../utils/dom.js';
import eventBus, { Events } from '../utils/events.js';
import { getImages, deleteImage as deleteImageFromStorage } from '../services/imageGen.js';
import { CLOSE_PATH, TRASH_PATH } from '../utils/icons.js';

// DOM Elements
let mainContent;
let galleryContainer;
let currentPlaceholder = null;

/**
 * Initialize image gallery component
 */
export const init = () => {
    mainContent = $('.main-content');

    // Create gallery container
    galleryContainer = $('.image-gallery');
    if (!galleryContainer) {
        galleryContainer = createElement('div', { className: 'image-gallery' });
        galleryContainer.style.display = 'none';
        mainContent.appendChild(galleryContainer);
    }

    // Subscribe to events
    eventBus.on(Events.IMAGE_GEN_START, handleGenStart);
    eventBus.on(Events.IMAGE_GEN_COMPLETE, handleGenComplete);
    eventBus.on(Events.IMAGE_GEN_ERROR, handleGenError);
    eventBus.on(Events.VIEW_CHANGED, handleViewChanged);

    // Render any existing images
    const images = getImages();
    if (images.length > 0) {
        renderImages(images);
    } else {
        renderEmptyState();
    }
};

/**
 * Handle view changed event
 * @param {Object} data
 */
const handleViewChanged = ({ view }) => {
    if (view === 'images') {
        show();
    } else {
        hide();
    }
};

/**
 * Show the gallery
 */
export const show = () => {
    if (galleryContainer) {
        galleryContainer.style.display = 'block';
        // Refresh images when showing
        const images = getImages();
        if (images.length > 0 || currentPlaceholder) {
            renderImages(images);
        } else {
            renderEmptyState();
        }
    }
};

/**
 * Hide the gallery
 */
export const hide = () => {
    if (galleryContainer) {
        galleryContainer.style.display = 'none';
    }
};

/**
 * Handle image generation start
 * @param {Object} data
 */
const handleGenStart = ({ prompt, placeholderId }) => {
    // Remove empty state if present
    const emptyState = $('.image-gallery-empty', galleryContainer);
    if (emptyState) {
        emptyState.remove();
    }

    // Create placeholder card with golden shimmer
    const placeholder = createElement('div', {
        className: 'image-card image-card-placeholder',
        dataset: { placeholderId }
    });

    const shimmer = createElement('div', { className: 'image-shimmer' });

    const promptOverlay = createElement('div', { className: 'image-prompt' });
    promptOverlay.innerHTML = `<span class="prompt-text">${escapeHtml(prompt)}</span>`;

    placeholder.appendChild(shimmer);
    placeholder.appendChild(promptOverlay);

    // Insert at the beginning
    if (galleryContainer.firstChild) {
        galleryContainer.insertBefore(placeholder, galleryContainer.firstChild);
    } else {
        galleryContainer.appendChild(placeholder);
    }

    currentPlaceholder = placeholder;
};

/**
 * Handle image generation complete
 * @param {Object} data
 */
const handleGenComplete = ({ image, placeholderId }) => {
    // Find and replace placeholder
    const placeholder = $(`[data-placeholder-id="${placeholderId}"]`, galleryContainer);

    if (placeholder) {
        // Get placeholder dimensions to maintain space during transition
        const placeholderRect = placeholder.getBoundingClientRect();

        // Create the image card
        const imageCard = createImageCard(image);

        // Set initial dimensions to match placeholder (prevents layout jump)
        imageCard.style.minHeight = `${placeholderRect.height}px`;

        // Add replacing class for fade out animation
        placeholder.classList.add('replacing');

        // Wait for fade out, then swap
        setTimeout(() => {
            placeholder.replaceWith(imageCard);

            // Clear the fixed height after image loads to allow natural sizing
            const img = imageCard.querySelector('img');
            if (img.complete) {
                imageCard.style.minHeight = '';
            } else {
                img.addEventListener('load', () => {
                    imageCard.style.minHeight = '';
                }, { once: true });
            }
        }, 250); // Slightly less than animation duration for smooth overlap
    } else {
        // If placeholder not found, just add the image
        const imageCard = createImageCard(image);
        if (galleryContainer.firstChild) {
            galleryContainer.insertBefore(imageCard, galleryContainer.firstChild);
        } else {
            galleryContainer.appendChild(imageCard);
        }
    }

    currentPlaceholder = null;
};

/**
 * Handle image generation error
 * @param {Object} data
 */
const handleGenError = ({ error, placeholderId }) => {
    // Find and update placeholder with error state
    const placeholder = $(`[data-placeholder-id="${placeholderId}"]`, galleryContainer);

    if (placeholder) {
        placeholder.classList.add('image-card-error');
        placeholder.innerHTML = `
            <div class="image-error">
                <span class="error-icon">⚠️</span>
                <span class="error-text">${escapeHtml(error.message || 'Generation failed')}</span>
            </div>
        `;

        // Remove after delay
        setTimeout(() => {
            placeholder.remove();
            // Show empty state if no images
            const images = getImages();
            if (images.length === 0) {
                renderEmptyState();
            }
        }, 3000);
    }

    currentPlaceholder = null;
};

/**
 * Render all images
 * @param {Array} images
 */
const renderImages = (images) => {
    // Save placeholder if exists
    const savedPlaceholder = currentPlaceholder;

    empty(galleryContainer);

    // Re-add placeholder at the beginning if it exists
    if (savedPlaceholder) {
        galleryContainer.appendChild(savedPlaceholder);
    }

    images.forEach(image => {
        const imageCard = createImageCard(image);
        galleryContainer.appendChild(imageCard);
    });
};

/**
 * Render empty state
 */
const renderEmptyState = () => {
    if (currentPlaceholder) return; // Don't show empty state while generating

    empty(galleryContainer);

    const emptyState = createElement('div', { className: 'image-gallery-empty' });
    emptyState.innerHTML = `
        <div class="empty-icon">🎨</div>
        <h3>No images yet</h3>
        <p>Describe an image in the search box below to generate your first image.</p>
    `;

    galleryContainer.appendChild(emptyState);
};

/**
 * Create an image card element
 * @param {Object} image - Image object
 * @returns {HTMLElement}
 */
const createImageCard = (image) => {
    const card = createElement('div', {
        className: 'image-card',
        dataset: { imageId: image.id }
    });

    const img = createElement('img', {
        src: image.url,
        alt: image.prompt,
        loading: 'lazy'
    });

    // Handle image load for proper masonry layout
    img.addEventListener('load', () => {
        card.classList.add('loaded');
    });

    // Handle image error
    img.addEventListener('error', () => {
        card.classList.add('error');
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23666" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Cpath d="M12 8v4M12 16h.01"/%3E%3C/svg%3E';
    });

    const overlay = createElement('div', { className: 'image-overlay' });

    const promptText = createElement('div', { className: 'image-prompt' });
    promptText.innerHTML = `<span class="prompt-text">${escapeHtml(image.prompt)}</span>`;

    const actions = createElement('div', { className: 'image-actions' });

    // Download button
    const downloadBtn = createElement('button', {
        className: 'image-action-btn',
        title: 'Download image'
    });
    downloadBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadImage(image);
    });

    // Fullscreen button
    const fullscreenBtn = createElement('button', {
        className: 'image-action-btn',
        title: 'View fullscreen'
    });
    fullscreenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
    fullscreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openImageModal(image);
    });

    // Delete button
    const deleteBtn = createElement('button', {
        className: 'image-action-btn image-action-btn-delete',
        title: 'Delete image'
    });
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">${TRASH_PATH}</svg>`;
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteImage(image, card);
    });

    actions.appendChild(downloadBtn);
    actions.appendChild(fullscreenBtn);
    actions.appendChild(deleteBtn);

    overlay.appendChild(promptText);
    overlay.appendChild(actions);

    card.appendChild(img);
    card.appendChild(overlay);

    // Click to view fullscreen
    card.addEventListener('click', () => {
        openImageModal(image);
    });

    return card;
};

/**
 * Download an image
 * @param {Object} image - Image object
 */
const downloadImage = async (image) => {
    try {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `lampira-${image.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to download image:', error);
        // Fallback: open in new tab
        window.open(image.url, '_blank');
    }
};

/**
 * Handle image deletion with animation
 * @param {Object} image - Image object
 * @param {HTMLElement} card - Image card element
 */
const handleDeleteImage = (image, card) => {
    // Add fade out animation
    card.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';

    // Remove from storage and DOM after animation
    setTimeout(() => {
        deleteImageFromStorage(image.id);
        card.remove();

        // Show empty state if no images left
        const images = getImages();
        if (images.length === 0) {
            renderEmptyState();
        }
    }, 300);
};

/**
 * Open image in fullscreen modal
 * @param {Object} image - Image object
 */
const openImageModal = (image) => {
    const modal = createElement('div', { className: 'image-modal' });

    const content = createElement('div', { className: 'image-modal-content' });

    const img = createElement('img', {
        src: image.url,
        alt: image.prompt
    });

    const closeBtn = createElement('button', { className: 'image-modal-close' });
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">${CLOSE_PATH}</svg>`;
    closeBtn.addEventListener('click', () => modal.remove());

    const info = createElement('div', { className: 'image-modal-info' });
    info.innerHTML = `<p class="modal-prompt">${escapeHtml(image.prompt)}</p>`;

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    content.appendChild(img);
    content.appendChild(closeBtn);
    content.appendChild(info);
    modal.appendChild(content);
    document.body.appendChild(modal);
};

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

export default { init, show, hide };
