/**
 * OverlayEventHandler - Comprehensive event handling system for overlay interactions
 * 
 * This class manages all event handling for the precise text underlining system,
 * including click delegation, input field monitoring, and cleanup mechanisms.
 * 
 * Requirements addressed:
 * - 5.3: Click event delegation for underlined text spans
 * - 5.5: Handle multiple overlapping detections in click events
 * - 1.5: Handle input field scrolling and resizing
 */
class OverlayEventHandler {
    constructor(tooltipManager, textOverlayManager) {
        this.tooltipManager = tooltipManager;
        this.textOverlayManager = textOverlayManager;
        
        // Event listener tracking for cleanup
        this.eventListeners = new Map(); // Map of elements to their event listeners
        this.globalEventListeners = []; // Global event listeners
        
        // Throttling for performance
        this.scrollThrottle = new Map(); // Throttle timers for scroll events
        this.resizeThrottle = null; // Throttle timer for resize events
        this.throttleDelay = 16; // ~60fps
        
        // Initialize global event handling
        this._initializeGlobalEventHandling();
        
        window.LeakAILogger?.log('OverlayEventHandler initialized');
    }

    /**
     * Initialize global event handling for overlay interactions
     * @private
     */
    _initializeGlobalEventHandling() {
        // Global click handler for underlined text spans (Requirement 5.3)
        const globalClickHandler = (event) => {
            this.handleGlobalClick(event);
        };
        
        // Global resize handler for all overlays
        const globalResizeHandler = () => {
            this.handleGlobalResize();
        };
        
        // Global scroll handler for document-level scrolling
        const globalScrollHandler = () => {
            this.handleGlobalScroll();
        };
        
        // Add global event listeners
        document.addEventListener('click', globalClickHandler, true);
        window.addEventListener('resize', globalResizeHandler, { passive: true });
        document.addEventListener('scroll', globalScrollHandler, { passive: true });
        
        // Store for cleanup
        this.globalEventListeners.push(
            { element: document, event: 'click', handler: globalClickHandler, useCapture: true },
            { element: window, event: 'resize', handler: globalResizeHandler },
            { element: document, event: 'scroll', handler: globalScrollHandler }
        );
    }

    /**
     * Add event listeners for a specific input element and its overlay
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     */
    addInputEventListeners(inputElement, overlayElement) {
        if (!inputElement || !overlayElement) {
            return;
        }

        // Remove existing listeners first
        this.removeInputEventListeners(inputElement);

        const listeners = [];

        // Input scroll handler (Requirement 1.5)
        const scrollHandler = (event) => {
            this.handleInputScroll(inputElement, overlayElement, event);
        };

        // Input resize handler (using ResizeObserver for better performance)
        let resizeObserver = null;
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver((entries) => {
                this.handleInputResize(inputElement, overlayElement, entries);
            });
            resizeObserver.observe(inputElement);
        }

        // Input focus/blur handlers for overlay visibility
        const focusHandler = (event) => {
            this.handleInputFocus(inputElement, overlayElement, event);
        };

        const blurHandler = (event) => {
            this.handleInputBlur(inputElement, overlayElement, event);
        };

        // Input value change handlers for overlay updates
        const inputHandler = (event) => {
            this.handleInputChange(inputElement, overlayElement, event);
        };

        // Keyboard navigation handlers for accessibility
        const keydownHandler = (event) => {
            this.handleInputKeydown(inputElement, overlayElement, event);
        };

        // Add event listeners
        inputElement.addEventListener('scroll', scrollHandler, { passive: true });
        inputElement.addEventListener('focus', focusHandler);
        inputElement.addEventListener('blur', blurHandler);
        inputElement.addEventListener('input', inputHandler);
        inputElement.addEventListener('keydown', keydownHandler);

        // Store listeners for cleanup
        listeners.push(
            { element: inputElement, event: 'scroll', handler: scrollHandler },
            { element: inputElement, event: 'focus', handler: focusHandler },
            { element: inputElement, event: 'blur', handler: blurHandler },
            { element: inputElement, event: 'input', handler: inputHandler },
            { element: inputElement, event: 'keydown', handler: keydownHandler }
        );

        // Store all listeners and resize observer
        this.eventListeners.set(inputElement, {
            listeners: listeners,
            resizeObserver: resizeObserver
        });

        window.LeakAILogger?.log('OverlayEventHandler: Added event listeners for input element');
    }

    /**
     * Remove event listeners for a specific input element
     * @param {Element} inputElement - Input element
     */
    removeInputEventListeners(inputElement) {
        if (!inputElement) {
            return;
        }

        const listenerData = this.eventListeners.get(inputElement);
        if (!listenerData) {
            return;
        }

        // Remove event listeners
        listenerData.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        // Disconnect resize observer
        if (listenerData.resizeObserver) {
            listenerData.resizeObserver.disconnect();
        }

        // Clear throttle timers
        if (this.scrollThrottle.has(inputElement)) {
            clearTimeout(this.scrollThrottle.get(inputElement));
            this.scrollThrottle.delete(inputElement);
        }

        // Remove from tracking
        this.eventListeners.delete(inputElement);

        window.LeakAILogger?.log('OverlayEventHandler: Removed event listeners for input element');
    }

    /**
     * Handle global click events for underlined text spans (Requirement 5.3)
     * @param {Event} event - Click event
     */
    handleGlobalClick(event) {
        if (!event || !event.target) {
            return;
        }

        // Check if click is on an underlined text span
        const span = event.target.closest('.leakai-underline-span');
        if (!span) {
            // Click is not on underlined text, let tooltip manager handle click-outside
            return;
        }

        try {
            // Get detection data from span
            const detection = this._getDetectionFromSpan(span);
            if (!detection) {
                window.LeakAILogger?.warn('OverlayEventHandler: No detection data found for clicked span');
                return;
            }

            // Handle multiple overlapping detections (Requirement 5.5)
            const overlappingDetections = this._getOverlappingDetections(span);
            if (overlappingDetections.length > 1) {
                this.handleOverlappingDetectionClick(event, overlappingDetections, span);
            } else {
                this.handleUnderlineClick(event, detection, span);
            }

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle global click:', error);
        }
    }

    /**
     * Handle click events on underlined text spans (Requirements 5.1, 5.2, 5.6)
     * @param {Event} event - Click event
     * @param {Object} detection - Detection object
     * @param {HTMLElement} span - Clicked underlined text span
     */
    handleUnderlineClick(event, detection, span) {
        if (!event || !detection || !span) {
            return;
        }

        try {
            // Prevent event bubbling to avoid triggering other click handlers
            event.preventDefault();
            event.stopPropagation();

            // Calculate position for tooltip relative to clicked span
            const spanRect = span.getBoundingClientRect();
            const position = {
                x: spanRect.left + (spanRect.width / 2),
                y: spanRect.bottom + window.scrollY
            };

            // Show tooltip on click (Requirement 5.1)
            this.tooltipManager.showTooltipOnClick(span, detection, position);

            // Add visual feedback for clicked span
            this._addClickFeedback(span);

            window.LeakAILogger?.log('OverlayEventHandler: Handled underline click for:', detection.type);

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle underline click:', error);
        }
    }

    /**
     * Handle multiple overlapping detections in click events (Requirement 5.5)
     * @param {Event} event - Click event
     * @param {Array} detections - Array of overlapping detections
     * @param {HTMLElement} span - Clicked span
     */
    handleOverlappingDetectionClick(event, detections, span) {
        if (!detections || detections.length === 0) {
            return;
        }

        try {
            // Get primary detection based on priority
            const primaryDetection = this._getPrimaryDetection(detections);
            
            // Handle click with primary detection
            this.handleUnderlineClick(event, primaryDetection, span);

            // Add special styling for overlapping detections
            span.classList.add('overlapping-active');
            
            // Store all overlapping detections for potential future use
            span.setAttribute('data-overlapping-detections', JSON.stringify(detections));

            window.LeakAILogger?.log(`OverlayEventHandler: Handled overlapping detection click with ${detections.length} detections`);

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle overlapping detection click:', error);
        }
    }

    /**
     * Handle input element scrolling (Requirement 1.5)
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Scroll event
     */
    handleInputScroll(inputElement, overlayElement, event) {
        if (!inputElement || !overlayElement) {
            return;
        }

        // Throttle scroll events for performance
        if (this.scrollThrottle.has(inputElement)) {
            return;
        }

        this.scrollThrottle.set(inputElement, setTimeout(() => {
            this.scrollThrottle.delete(inputElement);
            
            try {
                // Synchronize overlay scrolling with input
                if (this.textOverlayManager) {
                    this.textOverlayManager.handleInputScroll(inputElement, overlayElement);
                }

                // Hide tooltips during scrolling for better UX
                if (this.tooltipManager && this.tooltipManager.isVisible()) {
                    this.tooltipManager.hideTooltip(true);
                }

            } catch (error) {
                console.error('OverlayEventHandler: Failed to handle input scroll:', error);
            }
        }, this.throttleDelay));
    }

    /**
     * Handle input element resizing (Requirement 1.5)
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Array} entries - ResizeObserver entries
     */
    handleInputResize(inputElement, overlayElement, entries) {
        if (!inputElement || !overlayElement) {
            return;
        }

        try {
            // Reposition and update overlay
            if (this.textOverlayManager) {
                this.textOverlayManager.handleInputResize(inputElement, overlayElement);
            }

            // Hide tooltips during resizing
            if (this.tooltipManager && this.tooltipManager.isVisible()) {
                this.tooltipManager.hideTooltip(true);
            }

            window.LeakAILogger?.log('OverlayEventHandler: Handled input resize');

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle input resize:', error);
        }
    }

    /**
     * Handle global window resize events
     */
    handleGlobalResize() {
        // Throttle resize events
        if (this.resizeThrottle) {
            clearTimeout(this.resizeThrottle);
        }

        this.resizeThrottle = setTimeout(() => {
            try {
                // Update all active overlays
                if (this.textOverlayManager && this.textOverlayManager.overlays) {
                    for (const [inputElement, overlayData] of this.textOverlayManager.overlays) {
                        if (overlayData.isActive) {
                            this.textOverlayManager.positionOverlay(overlayData.element, inputElement);
                        }
                    }
                }

                // Hide tooltips during global resize
                if (this.tooltipManager && this.tooltipManager.isVisible()) {
                    this.tooltipManager.hideTooltip(true);
                }

            } catch (error) {
                console.error('OverlayEventHandler: Failed to handle global resize:', error);
            }
        }, this.throttleDelay);
    }

    /**
     * Handle global document scrolling
     */
    handleGlobalScroll() {
        try {
            // Update overlay positions for document scrolling
            if (this.textOverlayManager && this.textOverlayManager.overlays) {
                for (const [inputElement, overlayData] of this.textOverlayManager.overlays) {
                    if (overlayData.isActive) {
                        this.textOverlayManager.positionOverlay(overlayData.element, inputElement);
                    }
                }
            }

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle global scroll:', error);
        }
    }

    /**
     * Handle input element focus
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Focus event
     */
    handleInputFocus(inputElement, overlayElement, event) {
        try {
            // Ensure overlay is visible and properly positioned
            if (overlayElement) {
                overlayElement.style.display = 'block';
                if (this.textOverlayManager) {
                    this.textOverlayManager.positionOverlay(overlayElement, inputElement);
                }
            }

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle input focus:', error);
        }
    }

    /**
     * Handle input element blur
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Blur event
     */
    handleInputBlur(inputElement, overlayElement, event) {
        try {
            // Hide tooltips when input loses focus
            if (this.tooltipManager && this.tooltipManager.isVisible()) {
                // Small delay to allow for tooltip interactions
                setTimeout(() => {
                    if (!this._isTooltipInteractionActive()) {
                        this.tooltipManager.hideTooltip(true);
                    }
                }, 100);
            }

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle input blur:', error);
        }
    }

    /**
     * Handle input element value changes
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Input event
     */
    handleInputChange(inputElement, overlayElement, event) {
        try {
            // Hide tooltips during text changes
            if (this.tooltipManager && this.tooltipManager.isVisible()) {
                this.tooltipManager.hideTooltip(true);
            }

            // Trigger re-detection and overlay update
            // This will be handled by the main detection system
            window.LeakAILogger?.log('OverlayEventHandler: Input change detected, overlay update will be triggered');

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle input change:', error);
        }
    }

    /**
     * Handle keyboard navigation for accessibility
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Keydown event
     */
    handleInputKeydown(inputElement, overlayElement, event) {
        try {
            // Handle Escape key to hide tooltips
            if (event.key === 'Escape') {
                if (this.tooltipManager && this.tooltipManager.isVisible()) {
                    this.tooltipManager.hideTooltip(true);
                    event.preventDefault();
                }
            }

            // Handle Tab key navigation through underlined spans
            if (event.key === 'Tab') {
                this._handleTabNavigation(inputElement, overlayElement, event);
            }

        } catch (error) {
            console.error('OverlayEventHandler: Failed to handle input keydown:', error);
        }
    }

    /**
     * Clean up all event listeners and resources
     */
    cleanup() {
        try {
            // Remove all input-specific event listeners
            for (const inputElement of this.eventListeners.keys()) {
                this.removeInputEventListeners(inputElement);
            }

            // Remove global event listeners
            this.globalEventListeners.forEach(({ element, event, handler, useCapture }) => {
                element.removeEventListener(event, handler, useCapture);
            });

            // Clear throttle timers
            this.scrollThrottle.forEach(timer => clearTimeout(timer));
            this.scrollThrottle.clear();
            
            if (this.resizeThrottle) {
                clearTimeout(this.resizeThrottle);
                this.resizeThrottle = null;
            }

            // Clear references
            this.eventListeners.clear();
            this.globalEventListeners = [];

            window.LeakAILogger?.log('OverlayEventHandler: Cleanup completed');

        } catch (error) {
            console.error('OverlayEventHandler: Failed to cleanup:', error);
        }
    }

    /**
     * Get detection data from an underlined text span
     * @param {HTMLElement} span - Underlined text span element
     * @returns {Object|null} Detection object or null if not found
     * @private
     */
    _getDetectionFromSpan(span) {
        if (!span) {
            return null;
        }

        try {
            const detectionData = span.getAttribute('data-leakai-detection');
            if (detectionData) {
                return JSON.parse(detectionData);
            }
        } catch (error) {
            console.error('OverlayEventHandler: Failed to parse detection data from span:', error);
        }

        return null;
    }

    /**
     * Get overlapping detections from a span
     * @param {HTMLElement} span - Underlined text span element
     * @returns {Array} Array of detection objects
     * @private
     */
    _getOverlappingDetections(span) {
        if (!span) {
            return [];
        }

        try {
            // Check if span has overlapping detections data
            const overlappingData = span.getAttribute('data-overlapping-detections');
            if (overlappingData) {
                return JSON.parse(overlappingData);
            }

            // If no overlapping data, return the single detection
            const detection = this._getDetectionFromSpan(span);
            return detection ? [detection] : [];

        } catch (error) {
            console.error('OverlayEventHandler: Failed to get overlapping detections:', error);
            return [];
        }
    }

    /**
     * Get primary detection from overlapping detections based on priority
     * @param {Array} detections - Array of detections
     * @returns {Object} Primary detection
     * @private
     */
    _getPrimaryDetection(detections) {
        if (!detections || detections.length === 0) {
            return null;
        }

        if (detections.length === 1) {
            return detections[0];
        }

        // Priority order: high risk > medium risk > low risk
        const riskOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        
        // Secondary priority: certain detection types
        const typeOrder = {
            'credit_card': 10,
            'api_key': 9,
            'crypto_private_key': 8,
            'crypto_seed': 7,
            'health_info': 6,
            'email': 5,
            'phone': 4,
            'person_name': 3,
            'location': 2,
            'organization': 1
        };

        return detections.reduce((primary, current) => {
            const primaryRisk = riskOrder[primary.riskLevel] || 0;
            const currentRisk = riskOrder[current.riskLevel] || 0;
            
            if (currentRisk > primaryRisk) {
                return current;
            } else if (currentRisk === primaryRisk) {
                // Same risk level, use type priority
                const primaryType = typeOrder[primary.type] || 0;
                const currentType = typeOrder[current.type] || 0;
                return currentType > primaryType ? current : primary;
            }
            
            return primary;
        });
    }

    /**
     * Add visual feedback for clicked span
     * @param {HTMLElement} span - Clicked span
     * @private
     */
    _addClickFeedback(span) {
        if (!span) {
            return;
        }

        // Add clicked class for visual feedback
        span.classList.add('clicked');
        
        // Remove feedback after a short delay
        setTimeout(() => {
            span.classList.remove('clicked');
        }, 200);
    }

    /**
     * Check if tooltip interaction is currently active
     * @returns {boolean} True if tooltip interaction is active
     * @private
     */
    _isTooltipInteractionActive() {
        if (!this.tooltipManager || !this.tooltipManager.isVisible()) {
            return false;
        }

        const tooltip = this.tooltipManager.getCurrentTooltip();
        if (!tooltip) {
            return false;
        }

        // Check if tooltip was triggered by click (click-triggered tooltips stay open)
        return tooltip.hasAttribute('data-click-triggered');
    }

    /**
     * Handle Tab key navigation through underlined spans
     * @param {Element} inputElement - Input element
     * @param {Element} overlayElement - Overlay element
     * @param {Event} event - Keydown event
     * @private
     */
    _handleTabNavigation(inputElement, overlayElement, event) {
        if (!overlayElement) {
            return;
        }

        const spans = overlayElement.querySelectorAll('.leakai-underline-span[tabindex="0"]');
        if (spans.length === 0) {
            return;
        }

        const currentFocus = document.activeElement;
        const currentIndex = Array.from(spans).indexOf(currentFocus);

        if (currentIndex === -1) {
            // No span is currently focused, focus the first one
            if (!event.shiftKey) {
                spans[0].focus();
                event.preventDefault();
            }
        } else {
            // Navigate between spans
            let nextIndex;
            if (event.shiftKey) {
                // Shift+Tab: go to previous span
                nextIndex = currentIndex > 0 ? currentIndex - 1 : spans.length - 1;
            } else {
                // Tab: go to next span
                nextIndex = currentIndex < spans.length - 1 ? currentIndex + 1 : 0;
            }

            spans[nextIndex].focus();
            event.preventDefault();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayEventHandler;
}