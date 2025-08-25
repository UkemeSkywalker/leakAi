/**
 * TextMeasurementEngine - Accurate text positioning and measurement system
 * 
 * This class provides precise text measurement capabilities for the LeakAI extension's
 * precise text underlining feature. It uses canvas-based measurement and font analysis
 * to calculate exact character positions within input elements.
 * 
 * Requirements addressed:
 * - 1.4: Handle line breaks and multi-line text scenarios
 * - 1.5: Maintain underline positioning during scrolling
 * - 6.1: Handle special characters, emojis, and Unicode
 * - 6.2: Adapt to mixed font sizes and styles
 */
class TextMeasurementEngine {
    constructor() {
        this.measurementCanvas = null;
        this.measurementContext = null;
        this.fontStyleCache = new Map();
        this.textMetricsCache = new Map();
        this.cacheMaxSize = 1000;
        this.cacheCleanupThreshold = 1200;
        
        this._initializeMeasurementCanvas();
        
        window.LeakAILogger?.log('TextMeasurementEngine initialized');
    }

    /**
     * Initialize the canvas used for text measurement
     * @private
     */
    _initializeMeasurementCanvas() {
        try {
            this.measurementCanvas = document.createElement('canvas');
            this.measurementContext = this.measurementCanvas.getContext('2d');
            
            // Set canvas size for accurate measurements
            this.measurementCanvas.width = 2000;
            this.measurementCanvas.height = 1000;
            
            // Ensure high DPI accuracy
            const devicePixelRatio = window.devicePixelRatio || 1;
            if (devicePixelRatio > 1) {
                this.measurementCanvas.width *= devicePixelRatio;
                this.measurementCanvas.height *= devicePixelRatio;
                this.measurementContext.scale(devicePixelRatio, devicePixelRatio);
            }
            
        } catch (error) {
            console.error('TextMeasurementEngine: Failed to initialize canvas:', error);
            this.measurementCanvas = null;
            this.measurementContext = null;
        }
    }

    /**
     * Measure text dimensions and characteristics
     * @param {string} text - Text to measure
     * @param {FontStyle} fontStyle - Font style object
     * @returns {TextMetrics} Text measurement results
     */
    measureText(text, fontStyle) {
        if (!text || !fontStyle) {
            return this._getEmptyTextMetrics();
        }

        // Check cache first
        const cacheKey = this._generateCacheKey(text, fontStyle);
        if (this.textMetricsCache.has(cacheKey)) {
            return this.textMetricsCache.get(cacheKey);
        }

        let metrics;
        
        if (this.measurementContext) {
            metrics = this._measureTextWithCanvas(text, fontStyle);
        } else {
            // Fallback to DOM-based measurement
            metrics = this._measureTextWithDOM(text, fontStyle);
        }

        // Cache the result
        this._cacheTextMetrics(cacheKey, metrics);
        
        return metrics;
    }

    /**
     * Calculate precise character positions within text
     * @param {string} text - Text to analyze
     * @param {FontStyle} fontStyle - Font style object
     * @returns {Position[]} Array of character positions
     */
    calculateCharacterPositions(text, fontStyle) {
        if (!text || !fontStyle) {
            return [];
        }

        const positions = [];
        let currentX = 0;
        let currentY = 0;
        let currentLine = 0;

        // Set up measurement context
        if (this.measurementContext) {
            this._applyFontStyleToContext(fontStyle);
        }

        // Process each character
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            // Handle line breaks
            if (char === '\n') {
                positions.push({
                    x: currentX,
                    y: currentY,
                    line: currentLine,
                    character: i,
                    width: 0,
                    height: parseFloat(fontStyle.lineHeight) || parseFloat(fontStyle.fontSize) * 1.2
                });
                
                currentX = 0;
                currentY += parseFloat(fontStyle.lineHeight) || parseFloat(fontStyle.fontSize) * 1.2;
                currentLine++;
                continue;
            }

            // Measure character width
            const charWidth = this._measureCharacterWidth(char, fontStyle);
            
            positions.push({
                x: currentX,
                y: currentY,
                line: currentLine,
                character: i,
                width: charWidth,
                height: parseFloat(fontStyle.lineHeight) || parseFloat(fontStyle.fontSize) * 1.2
            });

            currentX += charWidth;
        }

        return positions;
    }

    /**
     * Calculate line breaks for text within a container
     * @param {string} text - Text to analyze
     * @param {number} containerWidth - Available width for text
     * @param {FontStyle} fontStyle - Font style object
     * @returns {LineBreak[]} Array of line break information
     */
    calculateLineBreaks(text, containerWidth, fontStyle) {
        if (!text || containerWidth <= 0 || !fontStyle) {
            return [];
        }

        const lineBreaks = [];
        const words = text.split(/(\s+)/); // Split on whitespace but keep separators
        let currentLine = 0;
        let currentLineWidth = 0;
        let currentLineStart = 0;
        let currentPosition = 0;

        // Set up measurement context
        if (this.measurementContext) {
            this._applyFontStyleToContext(fontStyle);
        }

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = this._measureTextWidth(word, fontStyle);

            // Check if word fits on current line
            if (currentLineWidth + wordWidth > containerWidth && currentLineWidth > 0) {
                // Word doesn't fit, create line break
                lineBreaks.push({
                    line: currentLine,
                    startIndex: currentLineStart,
                    endIndex: currentPosition,
                    width: currentLineWidth,
                    text: text.substring(currentLineStart, currentPosition)
                });

                currentLine++;
                currentLineStart = currentPosition;
                currentLineWidth = wordWidth;
            } else {
                currentLineWidth += wordWidth;
            }

            currentPosition += word.length;
        }

        // Add final line
        if (currentPosition > currentLineStart) {
            lineBreaks.push({
                line: currentLine,
                startIndex: currentLineStart,
                endIndex: currentPosition,
                width: currentLineWidth,
                text: text.substring(currentLineStart, currentPosition)
            });
        }

        return lineBreaks;
    }

    /**
     * Extract font style information from an element
     * @param {Element} element - DOM element to analyze
     * @returns {FontStyle} Font style object
     */
    getElementFontStyle(element) {
        if (!element) {
            return this._getDefaultFontStyle();
        }

        // Check cache first
        const elementId = element.getAttribute('data-leakai-font-id') || 
                         `${element.tagName}-${Date.now()}-${Math.random()}`;
        
        if (!element.getAttribute('data-leakai-font-id')) {
            element.setAttribute('data-leakai-font-id', elementId);
        }

        if (this.fontStyleCache.has(elementId)) {
            return this.fontStyleCache.get(elementId);
        }

        const computedStyle = window.getComputedStyle(element);
        
        const fontStyle = {
            fontFamily: computedStyle.fontFamily || 'Arial, sans-serif',
            fontSize: computedStyle.fontSize || '14px',
            fontWeight: computedStyle.fontWeight || 'normal',
            fontStyle: computedStyle.fontStyle || 'normal',
            lineHeight: computedStyle.lineHeight || 'normal',
            letterSpacing: computedStyle.letterSpacing || 'normal',
            textTransform: computedStyle.textTransform || 'none'
        };

        // Normalize line height
        if (fontStyle.lineHeight === 'normal') {
            fontStyle.lineHeight = `${parseFloat(fontStyle.fontSize) * 1.2}px`;
        }

        // Cache the result
        this.fontStyleCache.set(elementId, fontStyle);
        
        return fontStyle;
    }

    /**
     * Get element dimensions including padding and borders
     * @param {Element} element - DOM element to measure
     * @returns {Dimensions} Element dimensions
     */
    getElementDimensions(element) {
        if (!element) {
            return { width: 0, height: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 } };
        }

        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        return {
            width: rect.width,
            height: rect.height,
            padding: {
                top: parseFloat(computedStyle.paddingTop) || 0,
                right: parseFloat(computedStyle.paddingRight) || 0,
                bottom: parseFloat(computedStyle.paddingBottom) || 0,
                left: parseFloat(computedStyle.paddingLeft) || 0
            },
            border: {
                top: parseFloat(computedStyle.borderTopWidth) || 0,
                right: parseFloat(computedStyle.borderRightWidth) || 0,
                bottom: parseFloat(computedStyle.borderBottomWidth) || 0,
                left: parseFloat(computedStyle.borderLeftWidth) || 0
            },
            scrollLeft: element.scrollLeft || 0,
            scrollTop: element.scrollTop || 0
        };
    }

    /**
     * Get text bounds for a specific range within an element
     * @param {Element} element - DOM element containing the text
     * @param {number} startIndex - Start character index
     * @param {number} endIndex - End character index
     * @returns {Rectangle} Bounding rectangle for the text range
     */
    getTextBounds(element, startIndex, endIndex) {
        if (!element || startIndex < 0 || endIndex <= startIndex) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const text = this._getElementText(element);
        if (startIndex >= text.length) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        // Try DOM-based measurement first for contenteditable elements (more accurate)
        if (element.contentEditable === 'true') {
            const domBounds = this._getTextBoundsWithDOM(element, startIndex, endIndex, text);
            if (domBounds.width > 0 && domBounds.height > 0) {
                return domBounds;
            }
        }

        // Fallback to canvas-based measurement
        const fontStyle = this.getElementFontStyle(element);
        const dimensions = this.getElementDimensions(element);
        const positions = this.calculateCharacterPositions(text, fontStyle);

        if (positions.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        // Find bounds for the specified range
        const startPos = positions[Math.min(startIndex, positions.length - 1)];
        const endPos = positions[Math.min(endIndex - 1, positions.length - 1)];

        const x = startPos.x + dimensions.padding.left;
        const y = startPos.y + dimensions.padding.top;
        const width = (endPos.x + endPos.width) - startPos.x;
        const height = Math.max(startPos.height, endPos.y - startPos.y + endPos.height);

        return { x, y, width, height };
    }

    /**
     * Get scroll offset for an element
     * @param {Element} element - DOM element
     * @returns {Offset} Scroll offset
     */
    getScrollOffset(element) {
        if (!element) {
            return { x: 0, y: 0 };
        }

        return {
            x: element.scrollLeft || 0,
            y: element.scrollTop || 0
        };
    }

    /**
     * Measure text using canvas context (most accurate method)
     * @param {string} text - Text to measure
     * @param {FontStyle} fontStyle - Font style object
     * @returns {TextMetrics} Measurement results
     * @private
     */
    _measureTextWithCanvas(text, fontStyle) {
        if (!this.measurementContext) {
            return this._measureTextWithDOM(text, fontStyle);
        }

        try {
            this._applyFontStyleToContext(fontStyle);
            
            const metrics = this.measurementContext.measureText(text);
            const fontSize = parseFloat(fontStyle.fontSize);
            const lineHeight = parseFloat(fontStyle.lineHeight) || fontSize * 1.2;

            // Calculate character widths
            const characterWidths = [];
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\n') {
                    characterWidths.push(0);
                } else {
                    const charMetrics = this.measurementContext.measureText(char);
                    characterWidths.push(charMetrics.width);
                }
            }

            return {
                width: metrics.width,
                height: lineHeight,
                characterWidths: characterWidths,
                lineHeight: lineHeight,
                baseline: metrics.actualBoundingBoxAscent || fontSize * 0.8,
                ascent: metrics.actualBoundingBoxAscent || fontSize * 0.8,
                descent: metrics.actualBoundingBoxDescent || fontSize * 0.2
            };

        } catch (error) {
            console.warn('TextMeasurementEngine: Canvas measurement failed, falling back to DOM:', error);
            return this._measureTextWithDOM(text, fontStyle);
        }
    }

    /**
     * Measure text using DOM elements (fallback method)
     * @param {string} text - Text to measure
     * @param {FontStyle} fontStyle - Font style object
     * @returns {TextMetrics} Measurement results
     * @private
     */
    _measureTextWithDOM(text, fontStyle) {
        const measurementElement = this._createMeasurementElement(fontStyle);
        
        try {
            measurementElement.textContent = text;
            document.body.appendChild(measurementElement);
            
            const rect = measurementElement.getBoundingClientRect();
            const fontSize = parseFloat(fontStyle.fontSize);
            const lineHeight = parseFloat(fontStyle.lineHeight) || fontSize * 1.2;

            // Estimate character widths
            const characterWidths = [];
            const avgCharWidth = rect.width / text.length;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '\n') {
                    characterWidths.push(0);
                } else {
                    // Use average width as approximation
                    characterWidths.push(avgCharWidth);
                }
            }

            return {
                width: rect.width,
                height: lineHeight,
                characterWidths: characterWidths,
                lineHeight: lineHeight,
                baseline: fontSize * 0.8,
                ascent: fontSize * 0.8,
                descent: fontSize * 0.2
            };

        } finally {
            if (measurementElement.parentNode) {
                measurementElement.parentNode.removeChild(measurementElement);
            }
        }
    }

    /**
     * Apply font style to canvas context
     * @param {FontStyle} fontStyle - Font style object
     * @private
     */
    _applyFontStyleToContext(fontStyle) {
        if (!this.measurementContext) return;

        const font = `${fontStyle.fontStyle} ${fontStyle.fontWeight} ${fontStyle.fontSize} ${fontStyle.fontFamily}`;
        this.measurementContext.font = font;
        this.measurementContext.textBaseline = 'alphabetic';
        this.measurementContext.textAlign = 'left';
    }

    /**
     * Create a DOM element for text measurement
     * @param {FontStyle} fontStyle - Font style object
     * @returns {Element} Measurement element
     * @private
     */
    _createMeasurementElement(fontStyle) {
        const element = document.createElement('span');
        
        element.style.position = 'absolute';
        element.style.visibility = 'hidden';
        element.style.whiteSpace = 'pre';
        element.style.top = '-9999px';
        element.style.left = '-9999px';
        element.style.fontFamily = fontStyle.fontFamily;
        element.style.fontSize = fontStyle.fontSize;
        element.style.fontWeight = fontStyle.fontWeight;
        element.style.fontStyle = fontStyle.fontStyle;
        element.style.lineHeight = fontStyle.lineHeight;
        element.style.letterSpacing = fontStyle.letterSpacing;
        element.style.textTransform = fontStyle.textTransform;
        
        return element;
    }

    /**
     * Measure the width of a single character
     * @param {string} char - Character to measure
     * @param {FontStyle} fontStyle - Font style object
     * @returns {number} Character width in pixels
     * @private
     */
    _measureCharacterWidth(char, fontStyle) {
        if (char === '\n') {
            return 0;
        }

        if (this.measurementContext) {
            try {
                this._applyFontStyleToContext(fontStyle);
                const metrics = this.measurementContext.measureText(char);
                return metrics.width;
            } catch (error) {
                // Fallback to average character width
                return parseFloat(fontStyle.fontSize) * 0.6;
            }
        }

        // Fallback estimation
        return parseFloat(fontStyle.fontSize) * 0.6;
    }

    /**
     * Measure the width of text
     * @param {string} text - Text to measure
     * @param {FontStyle} fontStyle - Font style object
     * @returns {number} Text width in pixels
     * @private
     */
    _measureTextWidth(text, fontStyle) {
        if (!text) return 0;

        if (this.measurementContext) {
            try {
                this._applyFontStyleToContext(fontStyle);
                const metrics = this.measurementContext.measureText(text);
                return metrics.width;
            } catch (error) {
                // Fallback to estimation
                return text.length * parseFloat(fontStyle.fontSize) * 0.6;
            }
        }

        // Fallback estimation
        return text.length * parseFloat(fontStyle.fontSize) * 0.6;
    }

    /**
     * Get text content from an element
     * @param {Element} element - DOM element
     * @returns {string} Text content
     * @private
     */
    _getElementText(element) {
        if (!element) return '';

        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            return element.value || '';
        } else if (element.contentEditable === 'true' || element.getAttribute('role') === 'textbox') {
            return element.textContent || element.innerText || '';
        }
        
        return '';
    }

    /**
     * Generate cache key for text metrics
     * @param {string} text - Text content
     * @param {FontStyle} fontStyle - Font style object
     * @returns {string} Cache key
     * @private
     */
    _generateCacheKey(text, fontStyle) {
        const fontKey = `${fontStyle.fontFamily}-${fontStyle.fontSize}-${fontStyle.fontWeight}-${fontStyle.fontStyle}`;
        const textHash = this._simpleHash(text);
        return `${fontKey}-${textHash}`;
    }

    /**
     * Simple hash function for text
     * @param {string} text - Text to hash
     * @returns {string} Hash value
     * @private
     */
    _simpleHash(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Cache text metrics with size management
     * @param {string} key - Cache key
     * @param {TextMetrics} metrics - Metrics to cache
     * @private
     */
    _cacheTextMetrics(key, metrics) {
        this.textMetricsCache.set(key, metrics);
        
        // Clean up cache if it's getting too large
        if (this.textMetricsCache.size >= this.cacheCleanupThreshold) {
            this._cleanupCache();
        }
    }

    /**
     * Clean up old cache entries
     * @private
     */
    _cleanupCache() {
        if (this.textMetricsCache.size <= this.cacheMaxSize) {
            return; // No cleanup needed
        }

        const entries = Array.from(this.textMetricsCache.entries());
        const keepCount = this.cacheMaxSize;
        
        // Keep the most recently accessed entries (simple LRU approximation)
        const entriesToKeep = entries.slice(-keepCount);
        
        this.textMetricsCache.clear();
        entriesToKeep.forEach(([key, value]) => {
            this.textMetricsCache.set(key, value);
        });

        window.LeakAILogger?.log(`TextMeasurementEngine: Cleaned cache, kept ${entriesToKeep.length} entries`);
    }

    /**
     * Get default font style
     * @returns {FontStyle} Default font style
     * @private
     */
    _getDefaultFontStyle() {
        return {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: '16.8px',
            letterSpacing: 'normal',
            textTransform: 'none'
        };
    }

    /**
     * Get empty text metrics
     * @returns {TextMetrics} Empty metrics
     * @private
     */
    _getEmptyTextMetrics() {
        return {
            width: 0,
            height: 0,
            characterWidths: [],
            lineHeight: 0,
            baseline: 0,
            ascent: 0,
            descent: 0
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.textMetricsCache.clear();
        this.fontStyleCache.clear();
        
        if (this.measurementCanvas) {
            this.measurementCanvas = null;
            this.measurementContext = null;
        }

        window.LeakAILogger?.log('TextMeasurementEngine destroyed');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            textMetricsCacheSize: this.textMetricsCache.size,
            fontStyleCacheSize: this.fontStyleCache.size,
            cacheMaxSize: this.cacheMaxSize
        };
    }

    /**
     * Get text bounds using DOM Range API (more accurate for contenteditable)
     * @param {Element} element - DOM element
     * @param {number} startIndex - Start character index
     * @param {number} endIndex - End character index
     * @param {string} text - Element text content
     * @returns {Rectangle} Bounding rectangle
     * @private
     */
    _getTextBoundsWithDOM(element, startIndex, endIndex, text) {
        try {
            // Create a range for the text selection
            const range = document.createRange();
            const textNode = this._findTextNode(element, startIndex);
            
            if (!textNode) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }

            // Calculate the offset within the text node
            const nodeOffset = this._getTextNodeOffset(element, textNode, startIndex);
            const rangeStart = startIndex - nodeOffset;
            const rangeEnd = Math.min(endIndex - nodeOffset, textNode.textContent.length);

            if (rangeStart < 0 || rangeEnd <= rangeStart) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }

            // Set range boundaries
            range.setStart(textNode, rangeStart);
            range.setEnd(textNode, rangeEnd);

            // Get bounding rectangle
            const rect = range.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            // Convert to element-relative coordinates
            return {
                x: rect.left - elementRect.left,
                y: rect.top - elementRect.top,
                width: rect.width,
                height: rect.height
            };

        } catch (error) {
            console.warn('TextMeasurementEngine: DOM-based measurement failed:', error);
            return { x: 0, y: 0, width: 0, height: 0 };
        }
    }

    /**
     * Find the text node containing the character at the given index
     * @param {Element} element - Container element
     * @param {number} charIndex - Character index
     * @returns {Text|null} Text node or null
     * @private
     */
    _findTextNode(element, charIndex) {
        let currentIndex = 0;
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            if (currentIndex + nodeLength > charIndex) {
                return node;
            }
            currentIndex += nodeLength;
        }

        return null;
    }

    /**
     * Get the character offset of a text node within its container
     * @param {Element} container - Container element
     * @param {Text} targetNode - Target text node
     * @param {number} charIndex - Character index
     * @returns {number} Offset
     * @private
     */
    _getTextNodeOffset(container, targetNode, charIndex) {
        let offset = 0;
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node === targetNode) {
                return offset;
            }
            offset += node.textContent.length;
        }

        return 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextMeasurementEngine;
} else if (typeof window !== 'undefined') {
    window.TextMeasurementEngine = TextMeasurementEngine;
}