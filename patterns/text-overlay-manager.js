/**
 * TextOverlayManager - Core overlay management system for precise text underlining
 * 
 * This class creates and manages overlay elements that provide Grammarly-style
 * precise text underlining for the LeakAI extension. It works with the TextMeasurementEngine
 * to position underlines exactly over detected sensitive text portions.
 * 
 * Requirements addressed:
 * - 1.1: Underline only specific detected text portions, not entire input field
 * - 1.2: Handle multiple sensitive data items independently
 * - 2.1: Work with standard HTML input fields
 * - 2.2: Work with textarea elements with multi-line support
 * - 2.3: Work with contenteditable elements
 */
class TextOverlayManager {
    constructor(textMeasurementEngine, eventHandler = null) {
        this.textMeasurementEngine = textMeasurementEngine;
        this.eventHandler = eventHandler;
        this.overlays = new Map(); // Map of input elements to their overlay data
        this.overlayContainer = null;
        this.resizeObserver = null;
        this.mutationObserver = null;
        
        this._initializeOverlayContainer();
        this._initializeObservers();
        
        window.LeakAILogger?.log('TextOverlayManager initialized');
    }

    /**
     * Create overlay for an input element with detections
     * @param {Element} inputElement - Input element to overlay
     * @param {Array} detections - Array of detection objects
     * @returns {OverlayElement} Created overlay element data
     */
    createOverlay(inputElement, detections) {
        if (!inputElement || !detections || detections.length === 0) {
            return null;
        }

        try {
            // Remove existing overlay if present
            this.destroyOverlay(inputElement);

            // Create overlay element
            const overlayElement = this._createOverlayElement(inputElement);
            
            // Generate underline spans for detections
            const underlineSpans = this.generateUnderlineSpans(detections, inputElement);
            
            // Add spans to overlay
            underlineSpans.forEach(span => {
                overlayElement.appendChild(span);
            });

            // Position overlay over input element
            this.positionOverlay(overlayElement, inputElement);

            // Create overlay data object
            const overlayData = {
                element: overlayElement,
                inputElement: inputElement,
                underlineSpans: underlineSpans,
                detections: detections,
                isActive: true
            };

            // Store overlay data
            this.overlays.set(inputElement, overlayData);

            // Add overlay to container
            this.overlayContainer.appendChild(overlayElement);

            // Set up synchronization
            this.synchronizeWithInput(overlayElement, inputElement);

            // Set up event handling through the event handler
            if (this.eventHandler && typeof this.eventHandler.addInputEventListeners === 'function') {
                this.eventHandler.addInputEventListeners(inputElement, overlayElement);
            }

            window.LeakAILogger?.log(`TextOverlayManager: Created overlay with ${underlineSpans.length} underline spans`);
            
            return overlayData;

        } catch (error) {
            console.error('TextOverlayManager: Failed to create overlay:', error);
            return null;
        }
    }

    /**
     * Update existing overlay with new detections
     * @param {Element} inputElement - Input element
     * @param {Array} detections - Updated detection array
     */
    updateOverlay(inputElement, detections) {
        const overlayData = this.overlays.get(inputElement);
        
        if (!overlayData) {
            // No existing overlay, create new one
            return this.createOverlay(inputElement, detections);
        }

        if (!detections || detections.length === 0) {
            // No detections, destroy overlay
            this.destroyOverlay(inputElement);
            return;
        }

        try {
            // Clear existing underline spans
            overlayData.underlineSpans.forEach(span => {
                if (span.parentNode) {
                    span.parentNode.removeChild(span);
                }
            });

            // Generate new underline spans
            const newUnderlineSpans = this.generateUnderlineSpans(detections, inputElement);
            
            // Add new spans to overlay
            newUnderlineSpans.forEach(span => {
                overlayData.element.appendChild(span);
            });

            // Update overlay data
            overlayData.underlineSpans = newUnderlineSpans;
            overlayData.detections = detections;

            // Reposition overlay
            this.positionOverlay(overlayData.element, inputElement);

            window.LeakAILogger?.log(`TextOverlayManager: Updated overlay with ${newUnderlineSpans.length} underline spans`);

        } catch (error) {
            console.error('TextOverlayManager: Failed to update overlay:', error);
        }
    }

    /**
     * Destroy overlay for an input element
     * @param {Element} inputElement - Input element
     */
    destroyOverlay(inputElement) {
        const overlayData = this.overlays.get(inputElement);
        
        if (!overlayData) {
            return;
        }

        try {
            // Remove overlay element from DOM
            if (overlayData.element && overlayData.element.parentNode) {
                overlayData.element.parentNode.removeChild(overlayData.element);
            }

            // Clean up event listeners through the event handler
            if (this.eventHandler && typeof this.eventHandler.removeInputEventListeners === 'function') {
                this.eventHandler.removeInputEventListeners(inputElement);
            }

            // Clean up overlay-specific event listeners
            this._removeOverlayEventListeners(overlayData.element);

            // Remove from tracking
            this.overlays.delete(inputElement);

            window.LeakAILogger?.log('TextOverlayManager: Destroyed overlay');

        } catch (error) {
            console.error('TextOverlayManager: Failed to destroy overlay:', error);
        }
    }

    /**
     * Position overlay element over input element
     * @param {Element} overlayElement - Overlay element to position
     * @param {Element} inputElement - Input element to overlay
     */
    positionOverlay(overlayElement, inputElement) {
        if (!overlayElement || !inputElement) {
            return;
        }

        try {
            const inputRect = inputElement.getBoundingClientRect();
            const dimensions = this.textMeasurementEngine.getElementDimensions(inputElement);
            const scrollOffset = this.textMeasurementEngine.getScrollOffset(inputElement);

            // Check if we're in a complex web app like Gmail
            const isComplexApp = this._isComplexWebApp();
            
            // Position overlay to match input element exactly
            overlayElement.style.position = 'absolute';
            
            // For complex apps, use more precise positioning
            if (isComplexApp) {
                // Use fixed positioning for better accuracy in complex layouts
                overlayElement.style.position = 'fixed';
                overlayElement.style.left = `${inputRect.left}px`;
                overlayElement.style.top = `${inputRect.top}px`;
                console.log('TextOverlayManager Debug: Using fixed positioning for complex app:', {
                    left: inputRect.left,
                    top: inputRect.top,
                    hostname: window.location.hostname
                });
            } else {
                // Standard absolute positioning
                overlayElement.style.left = `${inputRect.left + window.scrollX}px`;
                overlayElement.style.top = `${inputRect.top + window.scrollY}px`;
                console.log('TextOverlayManager Debug: Using absolute positioning:', {
                    left: inputRect.left + window.scrollX,
                    top: inputRect.top + window.scrollY
                });
            }
            
            overlayElement.style.width = `${inputRect.width}px`;
            overlayElement.style.height = `${inputRect.height}px`;
            overlayElement.style.pointerEvents = 'none'; // Allow clicks to pass through to input
            overlayElement.style.zIndex = '999999'; // Ensure overlay is on top
            overlayElement.style.overflow = 'hidden'; // Match input overflow behavior

            // Apply padding to match input element's text area
            overlayElement.style.paddingTop = `${dimensions.padding.top}px`;
            overlayElement.style.paddingRight = `${dimensions.padding.right}px`;
            overlayElement.style.paddingBottom = `${dimensions.padding.bottom}px`;
            overlayElement.style.paddingLeft = `${dimensions.padding.left}px`;

            // Handle scrolling offset
            if (scrollOffset.x !== 0 || scrollOffset.y !== 0) {
                overlayElement.scrollLeft = scrollOffset.x;
                overlayElement.scrollTop = scrollOffset.y;
            }

        } catch (error) {
            console.error('TextOverlayManager: Failed to position overlay:', error);
        }
    }

    /**
     * Check if we're in a complex web application that requires special handling
     * @returns {boolean} True if in complex web app
     * @private
     */
    _isComplexWebApp() {
        const hostname = window.location.hostname;
        const isGmail = hostname.includes('mail.google.com');
        const isOutlook = hostname.includes('outlook.') || hostname.includes('office.com');
        const isSlack = hostname.includes('slack.com');
        const isNotion = hostname.includes('notion.so');
        const isDiscord = hostname.includes('discord.com');
        
        return isGmail || isOutlook || isSlack || isNotion || isDiscord;
    }

    /**
     * Synchronize overlay with input element changes
     * @param {Element} overlayElement - Overlay element
     * @param {Element} inputElement - Input element
     */
    synchronizeWithInput(overlayElement, inputElement) {
        if (!overlayElement || !inputElement) {
            return;
        }

        // Handle input scrolling
        const handleScroll = () => {
            this.handleInputScroll(inputElement, overlayElement);
        };

        // Handle input resizing
        const handleResize = () => {
            this.handleInputResize(inputElement, overlayElement);
        };

        // Add event listeners
        inputElement.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        // Store event listeners for cleanup
        if (!overlayElement._leakaiEventListeners) {
            overlayElement._leakaiEventListeners = [];
        }
        
        overlayElement._leakaiEventListeners.push(
            { element: inputElement, event: 'scroll', handler: handleScroll },
            { element: window, event: 'resize', handler: handleResize }
        );
    }

    /**
     * Generate underline spans for detected text portions
     * @param {Array} detections - Array of detection objects
     * @param {Element} inputElement - Input element containing the text
     * @returns {HTMLElement[]} Array of underline span elements
     */
    generateUnderlineSpans(detections, inputElement) {
        if (!detections || detections.length === 0 || !inputElement) {
            return [];
        }

        const spans = [];
        const text = this._getElementText(inputElement);
        const fontStyle = this.textMeasurementEngine.getElementFontStyle(inputElement);

        try {
            // Normalize detections to ensure they have proper indices
            const normalizedDetections = this._normalizeDetections(detections, text);
            
            // Handle overlapping and adjacent detections
            const processedDetections = this._processOverlappingDetections(normalizedDetections);

            // Process each detection
            processedDetections.forEach((detection, index) => {
                const spanElements = this._createUnderlineSpansForDetection(detection, text, fontStyle, inputElement, index);
                spans.push(...spanElements);
            });

            // Sort spans by position for consistent rendering
            spans.sort((a, b) => {
                const aStart = parseInt(a.getAttribute('data-start-index')) || 0;
                const bStart = parseInt(b.getAttribute('data-start-index')) || 0;
                return aStart - bStart;
            });

            window.LeakAILogger?.log(`TextOverlayManager: Generated ${spans.length} underline spans for ${processedDetections.length} detections`);

        } catch (error) {
            console.error('TextOverlayManager: Failed to generate underline spans:', error);
        }

        return spans;
    }

    /**
     * Apply detection-specific styling to underline span
     * @param {HTMLElement} span - Span element to style
     * @param {Object} detection - Detection object
     */
    applyDetectionStyling(span, detection) {
        if (!span || !detection) {
            return;
        }

        try {
            // Add base underline class
            span.classList.add('leakai-underline-span');

            // Apply risk level styling (Requirements 3.1, 3.2, 3.3)
            const riskLevel = this._getRiskLevel(detection);
            span.classList.add(`leakai-risk-${riskLevel}`);

            // Apply category-specific styling (Requirements 3.4, 3.5, 3.6)
            const category = this._getDetectionCategory(detection);
            if (category) {
                span.classList.add(`leakai-category-${category}`);
            }

            // Set CSS custom properties for advanced styling
            const riskColor = this._getRiskColor(riskLevel);
            const underlineStyle = this._getUnderlineStyle(category);
            
            span.style.setProperty('--leakai-risk-color', riskColor);
            span.style.setProperty('--leakai-underline-style', underlineStyle);

            // Apply direct border styling for immediate visual feedback
            this._applyDirectBorderStyling(span, riskLevel, category, riskColor, underlineStyle);

            // Store detection data for event handling
            span.setAttribute('data-leakai-detection', JSON.stringify(detection));
            span.setAttribute('data-leakai-risk', riskLevel);
            span.setAttribute('data-leakai-category', category || 'general');
            span.setAttribute('data-detection-type', detection.type || 'unknown');

            // Add accessibility attributes
            span.setAttribute('role', 'button');
            span.setAttribute('tabindex', '0');
            span.setAttribute('aria-label', `${riskLevel} risk ${category || 'sensitive'} data detected: ${detection.match || 'text'}`);

            window.LeakAILogger?.log(`TextOverlayManager: Applied ${riskLevel} risk styling with ${category || 'general'} category`);

        } catch (error) {
            console.error('TextOverlayManager: Failed to apply detection styling:', error);
        }
    }

    /**
     * Handle overlay click events
     * @param {Event} event - Click event
     * @param {Object} detection - Detection object
     */
    handleOverlayClick(event, detection) {
        if (!event || !detection) {
            return;
        }

        try {
            // Prevent event bubbling
            event.stopPropagation();

            // Get clicked span element
            const span = event.target.closest('.leakai-underline-span');
            if (!span) {
                return;
            }

            // Enable pointer events temporarily for tooltip interaction
            const overlay = span.closest('.leakai-text-overlay');
            if (overlay) {
                overlay.style.pointerEvents = 'auto';
                
                // Reset pointer events after a delay
                setTimeout(() => {
                    overlay.style.pointerEvents = 'none';
                }, 100);
            }

            // Notify event handler if available
            if (this.eventHandler && typeof this.eventHandler.handleUnderlineClick === 'function') {
                this.eventHandler.handleUnderlineClick(event, detection, span);
            }

            window.LeakAILogger?.log('TextOverlayManager: Handled overlay click for detection:', detection.type);

        } catch (error) {
            console.error('TextOverlayManager: Failed to handle overlay click:', error);
        }
    }

    /**
     * Handle input element scrolling
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     */
    handleInputScroll(inputElement, overlayElement) {
        if (!inputElement || !overlayElement) {
            return;
        }

        try {
            const scrollOffset = this.textMeasurementEngine.getScrollOffset(inputElement);
            
            // Synchronize overlay scrolling with input
            overlayElement.scrollLeft = scrollOffset.x;
            overlayElement.scrollTop = scrollOffset.y;

        } catch (error) {
            console.error('TextOverlayManager: Failed to handle input scroll:', error);
        }
    }

    /**
     * Handle input element resizing
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     */
    handleInputResize(inputElement, overlayElement) {
        if (!inputElement || !overlayElement) {
            return;
        }

        try {
            // Reposition overlay to match new input dimensions
            this.positionOverlay(overlayElement, inputElement);

            // Update underline spans if needed
            const overlayData = this.overlays.get(inputElement);
            if (overlayData && overlayData.detections) {
                this.updateOverlay(inputElement, overlayData.detections);
            }

        } catch (error) {
            console.error('TextOverlayManager: Failed to handle input resize:', error);
        }
    }

    /**
     * Normalize detections to ensure they have proper start/end indices
     * @param {Array} detections - Array of detection objects
     * @param {string} text - Full text content
     * @returns {Array} Normalized detections with indices
     * @private
     */
    _normalizeDetections(detections, text) {
        return detections.map((detection, index) => {
            const normalized = { ...detection };
            
            // Ensure we have a match string (use text property if match is not available)
            if (!normalized.match && normalized.text) {
                normalized.match = normalized.text;
            }
            
            if (!normalized.match) {
                window.LeakAILogger?.warn('TextOverlayManager: Detection missing match/text property', detection);
                return null;
            }

            // Calculate start index if not provided
            if (normalized.startIndex === undefined || normalized.startIndex === null) {
                // For multiple occurrences, we need to find the correct one
                // This is a limitation - ideally detections should include indices
                let searchStart = 0;
                for (let i = 0; i < index; i++) {
                    const prevDetection = detections[i];
                    if (prevDetection && prevDetection.match === normalized.match) {
                        const foundIndex = text.indexOf(prevDetection.match, searchStart);
                        if (foundIndex !== -1) {
                            searchStart = foundIndex + prevDetection.match.length;
                        }
                    }
                }
                
                normalized.startIndex = text.indexOf(normalized.match, searchStart);
            }

            // Calculate end index
            if (normalized.endIndex === undefined || normalized.endIndex === null) {
                normalized.endIndex = normalized.startIndex + normalized.match.length;
            }

            // Validate indices
            if (normalized.startIndex === -1 || normalized.startIndex >= text.length) {
                window.LeakAILogger?.warn('TextOverlayManager: Invalid detection indices', normalized);
                return null;
            }

            return normalized;
        }).filter(detection => detection !== null);
    }

    /**
     * Process overlapping and adjacent detections to handle them properly
     * @param {Array} detections - Normalized detections
     * @returns {Array} Processed detections
     * @private
     */
    _processOverlappingDetections(detections) {
        if (detections.length <= 1) {
            return detections;
        }

        // Sort by start index
        const sorted = [...detections].sort((a, b) => a.startIndex - b.startIndex);
        const processed = [];

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            const overlapping = [];

            // Find all detections that overlap with current
            for (let j = i + 1; j < sorted.length; j++) {
                const next = sorted[j];
                
                // Check if they overlap
                if (next.startIndex < current.endIndex) {
                    overlapping.push(next);
                } else {
                    break; // No more overlapping detections
                }
            }

            if (overlapping.length === 0) {
                // No overlap, add as-is
                processed.push(current);
            } else {
                // Handle overlapping detections
                const merged = this._mergeOverlappingDetections(current, overlapping);
                processed.push(...merged);
                
                // Skip the overlapping detections in the main loop
                i += overlapping.length;
            }
        }

        return processed;
    }

    /**
     * Merge overlapping detections into separate spans
     * @param {Object} primary - Primary detection
     * @param {Array} overlapping - Overlapping detections
     * @returns {Array} Array of detection objects for separate spans
     * @private
     */
    _mergeOverlappingDetections(primary, overlapping) {
        const result = [];
        
        // For overlapping detections, we create separate spans but mark them as overlapping
        // The primary detection gets priority for the overlapping region
        result.push({
            ...primary,
            isOverlapping: true,
            overlappingWith: overlapping.map(d => d.type || 'unknown')
        });

        // Create spans for non-overlapping portions of other detections
        overlapping.forEach(detection => {
            // Check if this detection extends beyond the primary
            if (detection.endIndex > primary.endIndex) {
                // Create a span for the non-overlapping portion
                result.push({
                    ...detection,
                    startIndex: Math.max(detection.startIndex, primary.endIndex),
                    match: detection.match.substring(
                        Math.max(0, primary.endIndex - detection.startIndex)
                    ),
                    isOverlapping: true,
                    overlappingWith: [primary.type || 'unknown']
                });
            }
            
            // If detection starts before primary, create a span for that portion
            if (detection.startIndex < primary.startIndex) {
                result.push({
                    ...detection,
                    endIndex: Math.min(detection.endIndex, primary.startIndex),
                    match: detection.match.substring(
                        0, 
                        Math.min(detection.match.length, primary.startIndex - detection.startIndex)
                    ),
                    isOverlapping: true,
                    overlappingWith: [primary.type || 'unknown']
                });
            }
        });

        return result;
    }

    /**
     * Create underline spans for a single detection (may create multiple spans for multi-line text)
     * @param {Object} detection - Detection object
     * @param {string} text - Full text content
     * @param {Object} fontStyle - Font style object
     * @param {Element} inputElement - Input element
     * @param {number} index - Detection index
     * @returns {HTMLElement[]} Array of span elements
     * @private
     */
    _createUnderlineSpansForDetection(detection, text, fontStyle, inputElement, index) {
        if (!detection || (!detection.match && !detection.text) || !text) {
            return [];
        }
        
        // Ensure we have a match property for consistency
        if (!detection.match && detection.text) {
            detection.match = detection.text;
        }

        try {
            const spans = [];
            const startIndex = detection.startIndex;
            const endIndex = detection.endIndex;
            
            if (startIndex === -1 || startIndex >= endIndex) {
                return [];
            }

            // Get text bounds for the detection
            const bounds = this.textMeasurementEngine.getTextBounds(inputElement, startIndex, endIndex);
            
            // Temporary debugging
            console.log('TextOverlayManager Debug: Text bounds for detection:', {
                detection: detection.match || detection.text,
                startIndex,
                endIndex,
                bounds,
                elementType: inputElement.tagName,
                isContentEditable: inputElement.contentEditable
            });
            
            if (!bounds || bounds.width === 0 || bounds.height === 0) {
                console.warn('TextOverlayManager: Invalid bounds for detection', detection, bounds);
                return [];
            }

            // Check if text spans multiple lines
            const detectedText = text.substring(startIndex, endIndex);
            const lineBreaks = detectedText.split('\n');
            
            if (lineBreaks.length > 1) {
                // Multi-line detection - create spans for each line
                spans.push(...this._createMultiLineSpans(detection, bounds, lineBreaks, inputElement, index));
            } else {
                // Single line detection
                const span = this._createSingleLineSpan(detection, bounds, inputElement, index);
                if (span) {
                    spans.push(span);
                }
            }

            return spans;

        } catch (error) {
            console.error('TextOverlayManager: Failed to create underline spans for detection:', error);
            return [];
        }
    }

    /**
     * Create spans for multi-line detections
     * @param {Object} detection - Detection object
     * @param {Object} bounds - Text bounds
     * @param {Array} lineBreaks - Array of text lines
     * @param {Element} inputElement - Input element
     * @param {number} index - Detection index
     * @returns {HTMLElement[]} Array of span elements
     * @private
     */
    _createMultiLineSpans(detection, bounds, lineBreaks, inputElement, index) {
        const spans = [];
        const fontStyle = this.textMeasurementEngine.getElementFontStyle(inputElement);
        let currentY = bounds.y;
        
        lineBreaks.forEach((lineText, lineIndex) => {
            if (lineText.trim().length === 0) {
                // Skip empty lines but account for line height
                currentY += parseFloat(fontStyle.lineHeight) || 20;
                return;
            }

            // Calculate bounds for this line
            const lineMetrics = this.textMeasurementEngine.measureText(lineText, fontStyle);
            const lineBounds = {
                x: bounds.x,
                y: currentY,
                width: lineMetrics.width,
                height: lineMetrics.height
            };

            const span = this._createSingleLineSpan(
                {
                    ...detection,
                    match: lineText,
                    isMultiLine: true,
                    lineIndex: lineIndex,
                    totalLines: lineBreaks.length
                },
                lineBounds,
                inputElement,
                `${index}-${lineIndex}`
            );

            if (span) {
                spans.push(span);
            }

            currentY += lineMetrics.height;
        });

        return spans;
    }

    /**
     * Create a single line span
     * @param {Object} detection - Detection object
     * @param {Object} bounds - Text bounds
     * @param {Element} inputElement - Input element
     * @param {string|number} spanId - Unique span identifier
     * @returns {HTMLElement} Span element
     * @private
     */
    _createSingleLineSpan(detection, bounds, inputElement, spanId) {
        try {
            // Create span element
            const span = document.createElement('span');
            span.className = 'leakai-underline-span';
            
            // Position span
            span.style.position = 'absolute';
            span.style.left = `${bounds.x}px`;
            span.style.top = `${bounds.y}px`;
            span.style.width = `${bounds.width}px`;
            span.style.height = `${bounds.height}px`;
            span.style.pointerEvents = 'auto';
            span.style.cursor = 'pointer';
            span.style.boxSizing = 'border-box';
            
            // Temporary debugging
            console.log('TextOverlayManager Debug: Created span with styles:', {
                left: bounds.x,
                top: bounds.y,
                width: bounds.width,
                height: bounds.height,
                text: detection.match || detection.text
            });
            
            // Store detection metadata
            span.setAttribute('data-start-index', detection.startIndex?.toString() || '0');
            span.setAttribute('data-end-index', detection.endIndex?.toString() || '0');
            span.setAttribute('data-detection-index', spanId.toString());
            span.setAttribute('data-detection-text', detection.match);
            
            // Mark multi-line spans
            if (detection.isMultiLine) {
                span.classList.add('multiline');
                span.setAttribute('data-line-index', detection.lineIndex?.toString() || '0');
                span.setAttribute('data-total-lines', detection.totalLines?.toString() || '1');
            }

            // Mark overlapping spans
            if (detection.isOverlapping) {
                span.classList.add('overlapping');
                span.setAttribute('data-overlapping-with', JSON.stringify(detection.overlappingWith || []));
            }
            
            // Apply detection-specific styling
            this.applyDetectionStyling(span, detection);
            
            // Add click event listener
            span.addEventListener('click', (event) => {
                this.handleOverlayClick(event, detection);
            });

            // Add keyboard event listener for accessibility
            span.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleOverlayClick(event, detection);
                }
            });

            return span;

        } catch (error) {
            console.error('TextOverlayManager: Failed to create single line span:', error);
            return null;
        }
    }

    /**
     * Apply direct border styling to span element
     * @param {HTMLElement} span - Span element
     * @param {string} riskLevel - Risk level
     * @param {string} category - Detection category
     * @param {string} riskColor - Risk color
     * @param {string} underlineStyle - Underline style
     * @private
     */
    _applyDirectBorderStyling(span, riskLevel, category, riskColor, underlineStyle) {
        try {
            // Apply base border styling
            span.style.borderBottom = `2px ${underlineStyle} ${riskColor}`;
            
            // Special handling for dotted patterns on specific categories
            if (category === 'pii' || category === 'health') {
                span.style.borderBottomStyle = 'dotted';
                
                // Use category-specific colors for dotted patterns
                if (category === 'pii') {
                    span.style.borderBottomColor = '#6c757d'; // Gray for PII
                } else if (category === 'health') {
                    span.style.borderBottomColor = '#fd7e14'; // Orange for health
                }
            }

            // Ensure financial and crypto use solid lines
            if (category === 'financial' || category === 'crypto') {
                span.style.borderBottomStyle = 'solid';
            }

            // Add hover effects
            span.addEventListener('mouseenter', () => {
                span.style.borderBottomWidth = '3px';
                span.style.opacity = '0.8';
            });

            span.addEventListener('mouseleave', () => {
                span.style.borderBottomWidth = '2px';
                span.style.opacity = '1';
            });

        } catch (error) {
            console.error('TextOverlayManager: Failed to apply direct border styling:', error);
        }
    }

    /**
     * Initialize overlay container
     * @private
     */
    _initializeOverlayContainer() {
        // Create container for all overlays
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'leakai-overlay-container';
        this.overlayContainer.style.position = 'absolute';
        this.overlayContainer.style.top = '0';
        this.overlayContainer.style.left = '0';
        this.overlayContainer.style.pointerEvents = 'none';
        this.overlayContainer.style.zIndex = '999999';
        
        // Add to document body
        document.body.appendChild(this.overlayContainer);
    }

    /**
     * Initialize observers for DOM changes
     * @private
     */
    _initializeObservers() {
        // Resize observer to handle element size changes
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                entries.forEach((entry) => {
                    const inputElement = entry.target;
                    const overlayData = this.overlays.get(inputElement);
                    
                    if (overlayData) {
                        this.handleInputResize(inputElement, overlayData.element);
                    }
                });
            });
        }

        // Mutation observer to handle DOM changes
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if any tracked input elements were removed
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const inputElements = node.querySelectorAll ? 
                                [node, ...node.querySelectorAll('input, textarea, [contenteditable]')] : 
                                [node];
                            
                            inputElements.forEach((element) => {
                                if (this.overlays.has(element)) {
                                    this.destroyOverlay(element);
                                }
                            });
                        }
                    });
                }
            });
        });

        // Start observing
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Create overlay element
     * @param {Element} inputElement - Input element to overlay
     * @returns {Element} Created overlay element
     * @private
     */
    _createOverlayElement(inputElement) {
        const overlay = document.createElement('div');
        overlay.className = 'leakai-text-overlay';
        overlay.style.position = 'absolute';
        overlay.style.pointerEvents = 'none';
        overlay.style.userSelect = 'none';
        overlay.style.overflow = 'hidden';
        
        // Copy relevant styles from input element
        const computedStyle = window.getComputedStyle(inputElement);
        overlay.style.fontFamily = computedStyle.fontFamily;
        overlay.style.fontSize = computedStyle.fontSize;
        overlay.style.fontWeight = computedStyle.fontWeight;
        overlay.style.fontStyle = computedStyle.fontStyle;
        overlay.style.lineHeight = computedStyle.lineHeight;
        overlay.style.letterSpacing = computedStyle.letterSpacing;
        overlay.style.textTransform = computedStyle.textTransform;
        overlay.style.whiteSpace = computedStyle.whiteSpace || 'pre-wrap';
        
        return overlay;
    }

    /**
     * Create underline span for a detection (legacy method - now delegates to new implementation)
     * @param {Object} detection - Detection object
     * @param {string} text - Full text content
     * @param {Object} fontStyle - Font style object
     * @param {Element} inputElement - Input element
     * @param {number} index - Detection index
     * @returns {HTMLElement} Created span element
     * @private
     */
    _createUnderlineSpan(detection, text, fontStyle, inputElement, index) {
        // Delegate to new multi-span creation method and return first span
        const spans = this._createUnderlineSpansForDetection(detection, text, fontStyle, inputElement, index);
        return spans.length > 0 ? spans[0] : null;
    }

    /**
     * Get text content from element
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
     * Get risk level from detection (Requirements 3.1, 3.2, 3.3)
     * @param {Object} detection - Detection object
     * @returns {string} Risk level (high, medium, low)
     * @private
     */
    _getRiskLevel(detection) {
        if (!detection) return 'low';
        
        // Check multiple possible risk indicators
        const riskIndicators = [
            detection.risk,
            detection.severity,
            detection.riskLevel,
            detection.priority
        ];

        for (const indicator of riskIndicators) {
            if (indicator) {
                const normalizedRisk = indicator.toString().toLowerCase();
                if (normalizedRisk === 'high' || normalizedRisk === 'critical' || normalizedRisk === '3') {
                    return 'high';
                }
                if (normalizedRisk === 'medium' || normalizedRisk === 'moderate' || normalizedRisk === '2') {
                    return 'medium';
                }
                if (normalizedRisk === 'low' || normalizedRisk === 'minor' || normalizedRisk === '1') {
                    return 'low';
                }
            }
        }

        // Determine risk based on detection type if no explicit risk level
        const type = (detection.type || '').toLowerCase();
        const category = (detection.category || '').toLowerCase();

        // High risk types
        if (type.includes('ssn') || type.includes('social') || 
            type.includes('credit') || type.includes('card') ||
            type.includes('passport') || type.includes('license') ||
            category === 'financial' || category === 'crypto') {
            return 'high';
        }

        // Medium risk types
        if (type.includes('email') || type.includes('phone') ||
            type.includes('address') || category === 'pii') {
            return 'medium';
        }

        // Health data is typically high risk
        if (category === 'health' || type.includes('health') || type.includes('medical')) {
            return 'high';
        }

        return 'low';
    }

    /**
     * Get detection category (Requirements 3.4, 3.5, 3.6)
     * @param {Object} detection - Detection object
     * @returns {string} Category name
     * @private
     */
    _getDetectionCategory(detection) {
        if (!detection) return 'general';
        
        // Check explicit category first
        if (detection.category) {
            return detection.category.toLowerCase();
        }

        // Infer category from detection type
        const type = (detection.type || '').toLowerCase();

        // PII categories
        if (type.includes('email') || type.includes('phone') || type.includes('address') ||
            type.includes('ssn') || type.includes('social') || type.includes('name') ||
            type.includes('passport') || type.includes('license') || type.includes('id')) {
            return 'pii';
        }

        // Health categories
        if (type.includes('health') || type.includes('medical') || type.includes('patient') ||
            type.includes('diagnosis') || type.includes('prescription') || type.includes('hipaa')) {
            return 'health';
        }

        // Financial categories
        if (type.includes('credit') || type.includes('card') || type.includes('bank') ||
            type.includes('account') || type.includes('routing') || type.includes('iban') ||
            type.includes('financial')) {
            return 'financial';
        }

        // Crypto categories (check before PII to avoid misclassification)
        if (type.includes('crypto') || type.includes('bitcoin') || type.includes('ethereum') ||
            type.includes('wallet') || type.includes('blockchain') || 
            (type.includes('private') && type.includes('key')) ||
            type.includes('bitcoin_address') || type.includes('eth_address')) {
            return 'crypto';
        }

        // API/Technical categories
        if (type.includes('api') || type.includes('key') || type.includes('token') ||
            type.includes('secret') || type.includes('password')) {
            return 'technical';
        }

        return 'general';
    }

    /**
     * Get risk color for styling (Requirements 3.1, 3.2, 3.3)
     * @param {string} riskLevel - Risk level
     * @returns {string} CSS color value
     * @private
     */
    _getRiskColor(riskLevel) {
        switch (riskLevel) {
            case 'high': 
                return '#dc3545'; // Red for high risk
            case 'medium': 
                return '#ffc107'; // Amber for medium risk
            case 'low': 
                return '#007bff'; // Blue for low risk
            default: 
                return '#6c757d'; // Gray for unknown
        }
    }

    /**
     * Get underline style for category (Requirements 3.4, 3.5, 3.6)
     * @param {string} category - Detection category
     * @returns {string} CSS border style
     * @private
     */
    _getUnderlineStyle(category) {
        switch (category) {
            case 'pii':
                return 'dotted'; // Dotted for PII
            case 'health':
                return 'dotted'; // Dotted for health data
            case 'financial':
                return 'solid'; // Solid for financial data
            case 'crypto':
                return 'solid'; // Solid for crypto data
            case 'technical':
                return 'dashed'; // Dashed for technical secrets
            default:
                return 'solid'; // Solid for general detections
        }
    }

    /**
     * Remove event listeners from overlay element
     * @param {Element} overlayElement - Overlay element
     * @private
     */
    _removeOverlayEventListeners(overlayElement) {
        if (!overlayElement || !overlayElement._leakaiEventListeners) {
            return;
        }

        try {
            overlayElement._leakaiEventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            
            delete overlayElement._leakaiEventListeners;

        } catch (error) {
            console.error('TextOverlayManager: Failed to remove event listeners:', error);
        }
    }

    /**
     * Clean up all resources
     */
    destroy() {
        try {
            // Destroy all overlays
            const inputElements = Array.from(this.overlays.keys());
            inputElements.forEach(element => {
                this.destroyOverlay(element);
            });

            // Remove overlay container
            if (this.overlayContainer && this.overlayContainer.parentNode) {
                this.overlayContainer.parentNode.removeChild(this.overlayContainer);
            }

            // Disconnect observers
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            }
            
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }

            // Clear references
            this.overlays.clear();
            this.overlayContainer = null;
            this.resizeObserver = null;
            this.mutationObserver = null;

            window.LeakAILogger?.log('TextOverlayManager destroyed');

        } catch (error) {
            console.error('TextOverlayManager: Failed to destroy:', error);
        }
    }

    /**
     * Get overlay data for an input element
     * @param {Element} inputElement - Input element
     * @returns {OverlayElement|null} Overlay data or null
     */
    getOverlay(inputElement) {
        return this.overlays.get(inputElement) || null;
    }

    /**
     * Check if element has overlay
     * @param {Element} inputElement - Input element
     * @returns {boolean} True if element has overlay
     */
    hasOverlay(inputElement) {
        return this.overlays.has(inputElement);
    }

    /**
     * Get statistics about current overlays
     * @returns {Object} Statistics object
     */
    getStats() {
        const stats = {
            totalOverlays: this.overlays.size,
            totalSpans: 0,
            overlaysByType: {}
        };

        this.overlays.forEach((overlayData) => {
            stats.totalSpans += overlayData.underlineSpans.length;
            
            overlayData.detections.forEach((detection) => {
                const type = detection.type || 'unknown';
                stats.overlaysByType[type] = (stats.overlaysByType[type] || 0) + 1;
            });
        });

        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextOverlayManager;
} else if (typeof window !== 'undefined') {
    window.TextOverlayManager = TextOverlayManager;
}