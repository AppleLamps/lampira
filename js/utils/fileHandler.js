/**
 * File Handler Utilities
 * Handles file validation, type checking, and base64 conversion
 */

// Default file type configurations
export const FILE_TYPES = {
    IMAGE: {
        mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
        maxSize: 20 * 1024 * 1024, // 20MB
        label: 'image'
    },
    PDF: {
        mimeTypes: ['application/pdf'],
        extensions: ['.pdf'],
        maxSize: 50 * 1024 * 1024, // 50MB
        label: 'PDF'
    }
};

/**
 * Convert a File to base64 data URL
 * @param {File} file - File to convert
 * @returns {Promise<string>} Base64 data URL
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
    });
};

/**
 * Validate file type against allowed MIME types
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {boolean}
 */
export const isValidType = (file, allowedTypes) => {
    return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean}
 */
export const isValidSize = (file, maxSize) => {
    return file.size <= maxSize;
};

/**
 * Get human-readable file size
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate and read files, converting to base64
 * @param {File[]} files - Array of files to process
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Promise<Array<{file: File, base64: string}>>}
 * @throws {Error} If validation fails
 */
export const validateAndReadFiles = async (files, allowedTypes, maxSize) => {
    const processed = [];
    
    for (const file of files) {
        // Validate type
        if (!isValidType(file, allowedTypes)) {
            throw new Error(`Invalid file type: ${file.type || 'unknown'}. Allowed: ${allowedTypes.join(', ')}`);
        }
        
        // Validate size
        if (!isValidSize(file, maxSize)) {
            throw new Error(`File too large: ${file.name} (${formatFileSize(file.size)}). Maximum: ${formatFileSize(maxSize)}`);
        }
        
        // Convert to base64
        const base64 = await fileToBase64(file);
        processed.push({ file, base64 });
    }
    
    return processed;
};

/**
 * Validate and read image files
 * @param {File[]} files - Array of image files
 * @returns {Promise<Array<{file: File, base64: string}>>}
 */
export const validateAndReadImages = async (files) => {
    return validateAndReadFiles(files, FILE_TYPES.IMAGE.mimeTypes, FILE_TYPES.IMAGE.maxSize);
};

/**
 * Validate and read PDF files
 * @param {File[]} files - Array of PDF files
 * @returns {Promise<Array<{file: File, base64: string}>>}
 */
export const validateAndReadPDFs = async (files) => {
    return validateAndReadFiles(files, FILE_TYPES.PDF.mimeTypes, FILE_TYPES.PDF.maxSize);
};

/**
 * Sort files by type category
 * @param {File[]} files - Array of files to sort
 * @returns {{images: File[], pdfs: File[], unsupported: File[]}}
 */
export const sortFilesByType = (files) => {
    const result = {
        images: [],
        pdfs: [],
        unsupported: []
    };

    for (const file of files) {
        if (isValidType(file, FILE_TYPES.IMAGE.mimeTypes)) {
            result.images.push(file);
        } else if (isValidType(file, FILE_TYPES.PDF.mimeTypes) || file.name.toLowerCase().endsWith('.pdf')) {
            result.pdfs.push(file);
        } else {
            result.unsupported.push(file);
        }
    }

    return result;
};

/**
 * Process mixed files - validate and convert to base64
 * @param {File[]} files - Array of files to process
 * @returns {Promise<{images: Array<{file: File, base64: string}>, pdfs: Array<{file: File, base64: string}>, errors: string[]}>}
 */
export const processFiles = async (files) => {
    const sorted = sortFilesByType(files);
    const result = {
        images: [],
        pdfs: [],
        errors: []
    };

    // Report unsupported files
    for (const file of sorted.unsupported) {
        result.errors.push(`Unsupported file type: ${file.type || file.name}`);
    }

    // Process images
    for (const file of sorted.images) {
        try {
            if (!isValidSize(file, FILE_TYPES.IMAGE.maxSize)) {
                result.errors.push(`Image too large: ${file.name}. Maximum size is ${formatFileSize(FILE_TYPES.IMAGE.maxSize)}.`);
                continue;
            }
            const base64 = await fileToBase64(file);
            result.images.push({ file, base64 });
        } catch (error) {
            result.errors.push(`Failed to process image: ${file.name}`);
        }
    }

    // Process PDFs
    for (const file of sorted.pdfs) {
        try {
            if (!isValidSize(file, FILE_TYPES.PDF.maxSize)) {
                result.errors.push(`PDF too large: ${file.name}. Maximum size is ${formatFileSize(FILE_TYPES.PDF.maxSize)}.`);
                continue;
            }
            const base64 = await fileToBase64(file);
            result.pdfs.push({ file, base64 });
        } catch (error) {
            result.errors.push(`Failed to process PDF: ${file.name}`);
        }
    }

    return result;
};

/**
 * Extract image files from clipboard items
 * @param {DataTransferItemList} items - Clipboard items
 * @returns {File[]}
 */
export const extractImagesFromClipboard = (items) => {
    const imageFiles = [];
    
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
        }
    }
    
    return imageFiles;
};

/**
 * Create a file input accept string
 * @param {Object} fileTypes - File type configuration object
 * @returns {string}
 */
export const createAcceptString = (...fileTypes) => {
    const extensions = [];
    const mimeTypes = [];
    
    for (const type of fileTypes) {
        extensions.push(...type.extensions);
        mimeTypes.push(...type.mimeTypes);
    }
    
    return [...extensions, ...mimeTypes].join(',');
};

export default {
    FILE_TYPES,
    fileToBase64,
    isValidType,
    isValidSize,
    formatFileSize,
    validateAndReadFiles,
    validateAndReadImages,
    validateAndReadPDFs,
    sortFilesByType,
    processFiles,
    extractImagesFromClipboard,
    createAcceptString
};

