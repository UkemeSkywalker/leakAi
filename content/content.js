// LeakAI Content Script
// This script will be injected into all web pages to monitor text inputs

// Note: Initial load message will be logged after extension state is determined

/**
 * Global logging utility that respects extension enabled state
 */
window.LeakAILogger = {
    log: function(message, ...args) {
        if (window.LeakAI && window.LeakAI.contentScript && window.LeakAI.contentScript.extensionEnabled) {
            console.log(message, ...args);
        }
    },
    warn: function(message, ...args) {
        if (window.LeakAI && window.LeakAI.contentScript && window.LeakAI.contentScript.extensionEnabled) {
            console.warn(message, ...args);
        }
    },
    error: function(message, ...args) {
        // Always log errors regardless of extension state
        console.error(message, ...args);
    },
    // Always log certain system messages regardless of extension state
    system: function(message, ...args) {
        console.log(message, ...args);
    }
};

/**
 * TooltipManager class - Manages tooltip display for detected sensitive data
 * Handles tooltip creation, positioning, and content generation
 * Enhanced for click-based interactions with precise text underlining
 */
class TooltipManager {
    constructor() {
        this.currentTooltip = null;
        this.showDelay = 300; // 300ms delay before showing tooltip (reduced)
        this.hideDelay = 500; // 500ms delay before hiding tooltip (increased)
        this.showTimer = null;
        this.hideTimer = null;
        this.clickOutsideHandler = null;
        
        // Initialize click-outside handling
        this._initializeClickOutsideHandling();
        
        window.LeakAILogger.log('LeakAI TooltipManager initialized with click-based interactions');
    }

    /**
     * Show tooltip for a detection
     * @param {Element} targetElement - Element that triggered the tooltip
     * @param {Object} detection - Detection result
     * @param {Object} position - Position coordinates {x, y}
     */
    showTooltip(targetElement, detection, position) {
        // Clear any existing timers
        this._clearTimers();

        // Set timer to show tooltip after delay
        this.showTimer = setTimeout(() => {
            this._createAndShowTooltip(targetElement, detection, position);
        }, this.showDelay);
    }

    /**
     * Hide the current tooltip
     * @param {boolean} immediate - Whether to hide immediately or with delay
     */
    hideTooltip(immediate = false) {
        this._clearTimers();

        if (immediate) {
            this._removeTooltip();
        } else {
            this.hideTimer = setTimeout(() => {
                this._removeTooltip();
            }, this.hideDelay);
        }
    }

    /**
     * Show tooltip on click for underlined text spans (Requirement 5.1)
     * @param {HTMLElement} targetSpan - Underlined text span that was clicked
     * @param {Object} detection - Detection result
     * @param {Object} position - Position coordinates {x, y}
     */
    showTooltipOnClick(targetSpan, detection, position) {
        if (!targetSpan || !detection) {
            return;
        }

        // Clear any existing timers and tooltips
        this._clearTimers();
        this._removeTooltip();

        // Create and show tooltip immediately (no delay for clicks)
        this._createAndShowTooltip(targetSpan, detection, position);
        
        // Enable click-outside handling to hide tooltip (Requirement 5.2)
        this._enableClickOutsideHandling();
        
        window.LeakAILogger.log('LeakAI tooltip shown on click for:', detection.type);
    }

    /**
     * Hide tooltip when clicking outside of underlined text (Requirement 5.2)
     * @param {Event} event - Click event
     */
    hideTooltipOnClickOutside(event) {
        if (!this.currentTooltip) {
            return;
        }

        // Check if click is on an underlined text span
        if (this.isClickOnUnderlinedText(event)) {
            return; // Don't hide if clicking on another underlined text
        }

        // Check if click is on the tooltip itself
        if (this.currentTooltip.contains(event.target)) {
            return; // Don't hide if clicking on tooltip
        }

        // Hide tooltip immediately
        this.hideTooltip(true);
        this._disableClickOutsideHandling();
        
        window.LeakAILogger.log('LeakAI tooltip hidden on click outside');
    }

    /**
     * Check if a click event is on underlined text (Requirement 5.6)
     * @param {Event} event - Click event
     * @returns {boolean} True if click is on underlined text
     */
    isClickOnUnderlinedText(event) {
        if (!event || !event.target) {
            return false;
        }

        // Check if the clicked element is an underlined text span
        const span = event.target.closest('.leakai-underline-span');
        return span !== null;
    }

    /**
     * Get detection data from an underlined text span
     * @param {HTMLElement} span - Underlined text span element
     * @returns {Object|null} Detection object or null if not found
     */
    getDetectionFromSpan(span) {
        if (!span) {
            return null;
        }

        try {
            const detectionData = span.getAttribute('data-leakai-detection');
            if (detectionData) {
                return JSON.parse(detectionData);
            }
        } catch (error) {
            console.error('LeakAI failed to parse detection data from span:', error);
        }

        return null;
    }

    /**
     * Create and show tooltip
     * @param {Element} targetElement - Target element (input or underlined span)
     * @param {Object} detection - Detection result
     * @param {Object} position - Position coordinates
     */
    _createAndShowTooltip(targetElement, detection, position) {
        // Remove existing tooltip
        this._removeTooltip();

        // Create tooltip element
        const tooltip = this._createTooltipElement(detection, targetElement);
        
        // Mark if this tooltip was triggered by a click on underlined text
        if (targetElement && targetElement.classList.contains('leakai-underline-span')) {
            tooltip.setAttribute('data-click-triggered', 'true');
        }
        
        // Add to document
        document.body.appendChild(tooltip);
        
        // Position tooltip
        this._positionTooltip(tooltip, targetElement, position);
        
        // Show tooltip with animation
        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });
        
        // Store reference
        this.currentTooltip = tooltip;
        
        // Add event listeners for tooltip interaction
        this._addTooltipEventListeners(tooltip, detection, targetElement);
        
        window.LeakAILogger.log('LeakAI tooltip shown for:', detection.type);
    }

    /**
     * Create tooltip DOM element
     * @param {Object} detection - Detection result
     * @param {Element} targetElement - Target element
     * @returns {Element} Tooltip element
     */
    _createTooltipElement(detection, targetElement = null) {
        const tooltip = document.createElement('div');
        tooltip.className = 'leakai-tooltip';
        tooltip.setAttribute('data-leakai-tooltip', 'true');
        
        // Create tooltip content
        const content = this._generateTooltipContent(detection, targetElement);
        tooltip.innerHTML = content;
        
        return tooltip;
    }

    /**
     * Generate tooltip content HTML
     * @param {Object} detection - Detection result
     * @param {Element} targetElement - Target element
     * @returns {string} HTML content
     */
    _generateTooltipContent(detection, targetElement = null) {
        const typeDisplayName = this._getTypeDisplayName(detection.type);
        const riskDisplayName = this._getRiskDisplayName(detection.riskLevel);
        const explanation = this._getDetectionExplanation(detection);
        
        return `
            <div class="leakai-tooltip-header">
                <div class="leakai-tooltip-icon risk-${detection.riskLevel}"></div>
                <div class="leakai-tooltip-title">${typeDisplayName} Detected</div>
            </div>
            
            <div class="leakai-tooltip-content">
                ${explanation}
            </div>
            
            <div class="leakai-tooltip-details">
                <strong>Risk Level:</strong> ${riskDisplayName}<br>
                <strong>Detected Text:</strong> "${this._truncateText(detection.text, 50)}"
                ${detection.context ? `<br><strong>Context:</strong> "${this._truncateText(detection.context, 60)}"` : ''}
            </div>
            
            <div class="leakai-tooltip-actions">
                ${this._generateActionButtons(detection.suggestions, targetElement)}
            </div>
            
            <div class="leakai-tooltip-confidence">
                Confidence: ${Math.round(detection.confidence * 100)}%
            </div>
        `;
    }

    /**
     * Get display name for detection type
     * @param {string} type - Detection type
     * @returns {string} Display name
     */
    _getTypeDisplayName(type) {
        const typeNames = {
            'email': 'Email Address',
            'phone': 'Phone Number',
            'credit_card': 'Credit Card',
            'api_key': 'API Key',
            'crypto_seed': 'Crypto Seed Phrase',
            'crypto_private_key': 'Private Key',
            'crypto_address': 'Crypto Address',
            'health_info': 'Health Information',
            'company_confidential': 'Company Confidential',
            'person_name': 'Person Name',
            'location': 'Location',
            'organization': 'Organization'
        };
        
        return typeNames[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get display name for risk level
     * @param {string} riskLevel - Risk level
     * @returns {string} Display name
     */
    _getRiskDisplayName(riskLevel) {
        const riskNames = {
            'low': 'Low Risk',
            'medium': 'Medium Risk',
            'high': 'High Risk'
        };
        
        return riskNames[riskLevel] || riskLevel.toUpperCase();
    }

    /**
     * Get explanation for detection
     * @param {Object} detection - Detection result
     * @returns {string} Explanation text
     */
    _getDetectionExplanation(detection) {
        const explanations = {
            'email': 'This appears to be an email address. Consider if this should be shared publicly.',
            'phone': 'This looks like a phone number. Phone numbers can be used to identify individuals.',
            'credit_card': 'This appears to be a credit card number. Never share credit card details online.',
            'api_key': 'This looks like an API key or credential. API keys should be kept secret.',
            'crypto_seed': 'This appears to be a cryptocurrency seed phrase. Seed phrases provide full access to crypto wallets.',
            'crypto_private_key': 'This looks like a private key. Private keys provide full access to cryptocurrency accounts.',
            'crypto_address': 'This appears to be a cryptocurrency address. Consider the privacy implications.',
            'health_info': 'This may contain health-related information, which is considered sensitive.',
            'company_confidential': 'This appears to contain company confidential information.',
            'person_name': 'This looks like a person\'s name. Consider privacy implications.',
            'location': 'This appears to be a location or address. Location data can be sensitive.',
            'organization': 'This looks like an organization name that may be confidential.'
        };
        
        return explanations[detection.type] || 'This content has been flagged as potentially sensitive.';
    }

    /**
     * Generate action buttons HTML
     * @param {Array} suggestions - Available actions
     * @param {Element} targetElement - Target element for checking undo availability
     * @returns {string} HTML for action buttons
     */
    _generateActionButtons(suggestions, targetElement = null) {
        if (!suggestions || suggestions.length === 0) {
            return '';
        }

        const actionLabels = {
            'mask': 'Mask',
            'remove': 'Remove',
            'replace': 'Replace',
            'encrypt': 'Encrypt',
            'ignore_once': 'Ignore Once',
            'undo': 'Undo'
        };

        let buttons = suggestions.map((action, index) => {
            const label = actionLabels[action] || action;
            const isPrimary = index === 0 ? 'primary' : '';
            return `<button class="leakai-tooltip-action ${isPrimary}" data-action="${action}">${label}</button>`;
        });

        // Add undo button if undo is available
        if (targetElement && window.LeakAI && window.LeakAI.actionMenu && window.LeakAI.actionMenu.canUndo(targetElement)) {
            buttons.push(`<button class="leakai-tooltip-action undo" data-action="undo">↶ Undo</button>`);
        }

        return buttons.join('');
    }

    /**
     * Truncate text for display
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    _truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Position tooltip relative to target element or clicked underlined text
     * @param {Element} tooltip - Tooltip element
     * @param {Element} targetElement - Target element (input or underlined span)
     * @param {Object} position - Position coordinates
     */
    _positionTooltip(tooltip, targetElement, position) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;
        
        let x = position.x;
        let y = position.y;
        
        // Enhanced positioning for underlined text spans (Requirement 5.1)
        if (targetElement && targetElement.classList.contains('leakai-underline-span')) {
            const spanRect = targetElement.getBoundingClientRect();
            
            // Position tooltip relative to the center of the clicked span
            x = spanRect.left + (spanRect.width / 2) - (tooltipRect.width / 2);
            y = spanRect.bottom + 5; // Position just below the underlined text
            
            // Ensure tooltip doesn't go off-screen horizontally
            if (x + tooltipRect.width > viewportWidth - 10) {
                x = viewportWidth - tooltipRect.width - 10;
            }
            if (x < 10) {
                x = 10;
            }
            
            // Check if there's enough space below, otherwise position above
            const spaceBelow = viewportHeight - (spanRect.bottom - scrollY);
            if (spaceBelow < tooltipRect.height + 20) {
                y = spanRect.top - tooltipRect.height - 5;
                tooltip.classList.add('position-top');
            } else {
                tooltip.classList.add('position-bottom');
            }
        } else {
            // Original positioning logic for element-level tooltips
            // Adjust horizontal position to keep tooltip in viewport
            if (x + tooltipRect.width > viewportWidth) {
                x = viewportWidth - tooltipRect.width - 10;
            }
            if (x < 10) {
                x = 10;
            }
            
            // Position above or below based on available space
            const spaceAbove = position.y - scrollY;
            const spaceBelow = viewportHeight - (position.y - scrollY);
            
            if (spaceBelow < tooltipRect.height + 20 && spaceAbove > tooltipRect.height + 20) {
                // Position above
                y = position.y - tooltipRect.height - 10;
                tooltip.classList.add('position-top');
            } else {
                // Position below
                y = position.y + 10; // Reduced gap to make tooltip closer
                tooltip.classList.add('position-bottom');
            }
        }
        
        // Apply position
        tooltip.style.left = `${x + scrollX}px`;
        tooltip.style.top = `${y + scrollY}px`;
    }

    /**
     * Add event listeners to tooltip
     * @param {Element} tooltip - Tooltip element
     * @param {Object} detection - Detection result
     * @param {Element} targetElement - Target element (input or underlined span)
     */
    _addTooltipEventListeners(tooltip, detection, targetElement = null) {
        // Handle action button clicks
        const actionButtons = tooltip.querySelectorAll('.leakai-tooltip-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const action = button.getAttribute('data-action');
                window.LeakAILogger.log(`LeakAI tooltip action clicked: ${action} for ${detection.type}`);
                
                // Find the actual input element for actions
                let inputElement = targetElement;
                if (targetElement && targetElement.classList.contains('leakai-underline-span')) {
                    // If target is an underlined span, find the associated input element
                    const overlay = targetElement.closest('.leakai-text-overlay');
                    if (overlay) {
                        // Get input element from overlay data
                        const overlayContainer = overlay.parentElement;
                        if (overlayContainer && window.LeakAI && window.LeakAI.textOverlayManager) {
                            // Find the input element associated with this overlay
                            for (const [input, overlayData] of window.LeakAI.textOverlayManager.overlays) {
                                if (overlayData.element === overlay) {
                                    inputElement = input;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Handle undo action specially
                if (action === 'undo' && inputElement && window.LeakAI && window.LeakAI.actionMenu) {
                    window.LeakAI.actionMenu.undoLastAction(inputElement);
                } else if (window.LeakAI && window.LeakAI.actionMenu) {
                    // Execute the action through the action menu system
                    window.LeakAI.actionMenu.executeAction(action, detection, tooltip);
                }
                
                // Hide the tooltip after action and disable click-outside handling
                this.hideTooltip(true);
                this._disableClickOutsideHandling();
            });
        });

        // For click-based tooltips, we don't need hover behavior
        // Instead, prevent the tooltip from closing when clicking on it
        tooltip.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click-outside handling
        });

        // Keep tooltip visible when hovering over it (for better UX)
        tooltip.addEventListener('mouseenter', () => {
            this._clearTimers();
        });

        // Only hide on mouse leave if not in click mode
        tooltip.addEventListener('mouseleave', () => {
            // Only auto-hide if tooltip was shown via hover, not click
            if (!tooltip.hasAttribute('data-click-triggered')) {
                this.hideTooltip();
            }
        });
    }

    /**
     * Remove current tooltip
     */
    _removeTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
            
            // Disable click-outside handling when tooltip is removed
            this._disableClickOutsideHandling();
        }
    }

    /**
     * Clear all timers
     */
    _clearTimers() {
        if (this.showTimer) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
    }

    /**
     * Get current tooltip element
     * @returns {Element|null} Current tooltip element
     */
    getCurrentTooltip() {
        return this.currentTooltip;
    }

    /**
     * Check if tooltip is currently visible
     * @returns {boolean} True if tooltip is visible
     */
    isVisible() {
        return this.currentTooltip !== null;
    }

    /**
     * Initialize click-outside handling system
     * @private
     */
    _initializeClickOutsideHandling() {
        this.clickOutsideHandler = (event) => {
            this.hideTooltipOnClickOutside(event);
        };
    }

    /**
     * Enable click-outside handling
     * @private
     */
    _enableClickOutsideHandling() {
        if (this.clickOutsideHandler) {
            // Use capture phase to ensure we catch clicks before other handlers
            document.addEventListener('click', this.clickOutsideHandler, true);
        }
    }

    /**
     * Disable click-outside handling
     * @private
     */
    _disableClickOutsideHandling() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler, true);
        }
    }
}

// Note: OverlayEventHandler is now implemented in patterns/overlay-event-handler.js
// This placeholder class maintains compatibility until full integration

/**
 * UIRenderer class - Handles visual indicators for detected sensitive data
 * Applies category-specific underlines and manages visual feedback
 */
class UIRenderer {
    constructor() {
        this.renderedElements = new Map(); // Track elements with rendered detections
        this.detectionSpans = new Map(); // Track detection span elements
        this.tooltipManager = new TooltipManager();
        this.overlayEventHandler = null; // Will be initialized when TextOverlayManager is available
        
        window.LeakAILogger.log('LeakAI UIRenderer initialized with enhanced tooltip system');
    }

    /**
     * Render detections for an element
     * @param {Element} element - Element containing detected text
     * @param {Array} detections - Detection results
     */
    renderDetections(element, detections) {
        if (!element || !detections) {
            return;
        }

        try {
            // Clear existing detections first
            this.clearDetections(element);

            if (detections.length === 0) {
                return;
            }

            window.LeakAILogger.log(`LeakAI rendering ${detections.length} detections for ${element.tagName}`);

            // Try to use precise text overlays first (Requirements 1.1, 1.2)
            if (this.shouldUsePreciseOverlays(element, detections)) {
                const overlayRendered = this.renderWithPreciseOverlays(element, detections);
                
                if (overlayRendered) {
                    window.LeakAILogger.log('LeakAI used precise text overlays for rendering');
                    return;
                }
            }

            // Fallback to non-intrusive visual indicators
            this._renderNonIntrusiveDetections(element, detections);

            // Store rendered detections
            this.renderedElements.set(element, detections);

        } catch (error) {
            console.error('LeakAI rendering failed:', error);
        }
    }

    /**
     * Clear detections for an element
     * @param {Element} element - Element to clear detections from
     */
    clearDetections(element) {
        if (!element) {
            return;
        }

        try {
            // Clear precise overlays if present (lifecycle management)
            if (element.classList.contains('leakai-has-overlay') && 
                window.LeakAI && window.LeakAI.textOverlayManager) {
                window.LeakAI.textOverlayManager.destroyOverlay(element);
                element.classList.remove('leakai-has-overlay');
                
                // Clean up overlay update listeners
                this._cleanupOverlayUpdateListeners(element);
            }

            // Remove visual indicators without touching the input content
            this._clearNonIntrusiveDetections(element);

            // Remove from tracking
            this.renderedElements.delete(element);
            this.detectionSpans.delete(element);

        } catch (error) {
            console.error('LeakAI clearing detections failed:', error);
        }
    }

    /**
     * Render non-intrusive visual detections
     * @param {Element} element - Input element
     * @param {Array} detections - Detection results
     */
    _renderNonIntrusiveDetections(element, detections) {
        // Add visual indicator classes to the element itself
        element.classList.add('leakai-has-detections');
        
        // Determine if we should use border approach for better compatibility
        if (this._shouldUseBorderApproach(element)) {
            element.classList.add('use-border');
        }
        
        // Determine the highest risk level for the element styling
        const highestRisk = this._getHighestRiskLevel(detections);
        element.classList.add(`leakai-risk-${highestRisk}`);
        
        // Add category-specific styling for different underline styles
        const primaryCategory = this._getPrimaryCategory(detections);
        if (primaryCategory) {
            element.classList.add(`leakai-category-${primaryCategory}`);
        }
        
        // Store detections for tooltip access
        element.setAttribute('data-leakai-detections', JSON.stringify(detections));
        
        // Add hover event listeners for tooltips
        this._addElementEventListeners(element, detections);
        
        window.LeakAILogger.log(`LeakAI applied ${highestRisk} risk styling with ${primaryCategory} category to ${element.tagName}`);
    }

    /**
     * Clear non-intrusive visual detections
     * @param {Element} element - Input element
     */
    _clearNonIntrusiveDetections(element) {
        // Remove visual indicator classes
        element.classList.remove('leakai-has-detections', 'use-border');
        element.classList.remove('leakai-risk-low', 'leakai-risk-medium', 'leakai-risk-high');
        element.classList.remove('leakai-category-pii', 'leakai-category-financial', 'leakai-category-credentials', 'leakai-category-crypto', 'leakai-category-health');
        
        // Remove detection data
        element.removeAttribute('data-leakai-detections');
        
        // Remove event listeners
        this._removeElementEventListeners(element);
        
        window.LeakAILogger.log(`LeakAI cleared styling from ${element.tagName}`);
    }

    /**
     * Get the highest risk level from detections
     * @param {Array} detections - Detection results
     * @returns {string} Highest risk level
     */
    _getHighestRiskLevel(detections) {
        const riskOrder = { 'low': 1, 'medium': 2, 'high': 3 };
        let highestRisk = 'low';
        
        detections.forEach(detection => {
            if (riskOrder[detection.riskLevel] > riskOrder[highestRisk]) {
                highestRisk = detection.riskLevel;
            }
        });
        
        return highestRisk;
    }

    /**
     * Get the primary category from detections for styling
     * @param {Array} detections - Detection results
     * @returns {string} Primary category
     */
    _getPrimaryCategory(detections) {
        if (!detections || detections.length === 0) return null;
        
        // Priority order for categories (highest priority first)
        const categoryPriority = {
            'credentials': 5,
            'financial': 4,
            'crypto': 3,
            'health': 2,
            'pii': 1
        };
        
        let primaryCategory = null;
        let highestPriority = 0;
        
        detections.forEach(detection => {
            const category = detection.type.toLowerCase();
            const priority = categoryPriority[category] || 0;
            
            if (priority > highestPriority) {
                highestPriority = priority;
                primaryCategory = category;
            }
        });
        
        return primaryCategory;
    }

    /**
     * Determine if we should use border approach instead of pseudo-elements
     * @param {Element} element - Element to check
     * @returns {boolean} Whether to use border approach
     */
    _shouldUseBorderApproach(element) {
        // Check if we're in Gmail or other complex web apps
        const hostname = window.location.hostname;
        const isGmail = hostname.includes('mail.google.com');
        const isOutlook = hostname.includes('outlook.') || hostname.includes('office.com');
        const isComplexApp = isGmail || isOutlook;
        
        // Check if element has contenteditable or role="textbox"
        const isContentEditable = element.contentEditable === 'true' || 
                                 element.getAttribute('role') === 'textbox';
        
        // Check if element has complex styling that might interfere
        const computedStyle = window.getComputedStyle(element);
        const hasComplexBorder = computedStyle.borderBottomWidth !== '0px' && 
                                computedStyle.borderBottomWidth !== '1px';
        
        // Use border approach for complex apps or contenteditable elements
        return isComplexApp || isContentEditable || hasComplexBorder;
    }

    /**
     * Add event listeners to element for tooltip interaction
     * @param {Element} element - Input element
     * @param {Array} detections - Detection results
     */
    _addElementEventListeners(element, detections) {
        // Check if element has precise text overlays
        const hasOverlay = element.classList.contains('leakai-has-overlay');
        
        if (hasOverlay) {
            // For elements with precise overlays, tooltips are handled by click events on underlined spans
            // No need to add hover listeners to the element itself
            window.LeakAILogger.log('LeakAI element has overlay, skipping hover listeners');
            return;
        }

        // For elements without overlays, use traditional hover-based tooltips
        const mouseEnterHandler = (event) => {
            const rect = element.getBoundingClientRect();
            const position = {
                x: rect.left + rect.width / 2,
                y: rect.bottom
            };
            
            // Show tooltip with all detections
            const primaryDetection = detections[0]; // Show first/highest priority detection
            this.tooltipManager.showTooltip(element, primaryDetection, position);
        };
        
        const mouseLeaveHandler = (event) => {
            this.tooltipManager.hideTooltip();
        };
        
        element.addEventListener('mouseenter', mouseEnterHandler);
        element.addEventListener('mouseleave', mouseLeaveHandler);
        
        // Store handlers for cleanup
        element._leakaiHandlers = {
            mouseEnter: mouseEnterHandler,
            mouseLeave: mouseLeaveHandler
        };
    }

    /**
     * Remove event listeners from element
     * @param {Element} element - Input element
     */
    _removeElementEventListeners(element) {
        if (element._leakaiHandlers) {
            element.removeEventListener('mouseenter', element._leakaiHandlers.mouseEnter);
            element.removeEventListener('mouseleave', element._leakaiHandlers.mouseLeave);
            delete element._leakaiHandlers;
        }
    }



    /**
     * Check if element is contenteditable
     * @param {Element} element - Element to check
     * @returns {boolean} True if contenteditable
     */
    _isContentEditable(element) {
        const contentEditable = element.getAttribute('contenteditable');
        return contentEditable === 'true' || contentEditable === '';
    }

    /**
     * Get text content from element
     * @param {Element} element - Element to get text from
     * @returns {string} Text content
     */
    _getElementText(element) {
        if (!element) {
            return '';
        }

        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            return element.value || '';
        } else if (this._isContentEditable(element)) {
            return element.textContent || element.innerText || '';
        }
        
        return '';
    }

    /**
     * Get rendered detections for an element
     * @param {Element} element - Element to get detections for
     * @returns {Array} Rendered detections
     */
    getRenderedDetections(element) {
        return this.renderedElements.get(element) || [];
    }

    /**
     * Initialize TextOverlayManager integration for precise text underlining
     * This method should be called when TextOverlayManager is available
     */
    initializeTextOverlayIntegration() {
        if (window.LeakAI && window.LeakAI.textOverlayManager) {
            // Initialize the comprehensive event handler
            if (!this.overlayEventHandler && typeof OverlayEventHandler !== 'undefined') {
                this.overlayEventHandler = new OverlayEventHandler(
                    this.tooltipManager,
                    window.LeakAI.textOverlayManager
                );
            }
            
            // Set the event handler for the TextOverlayManager
            window.LeakAI.textOverlayManager.eventHandler = this.overlayEventHandler;
            
            // Set up periodic cleanup for performance maintenance (Requirement 4.4)
            if (!this.overlayCleanupInterval) {
                this.overlayCleanupInterval = setInterval(() => {
                    this._cleanupInactiveOverlays();
                }, 60000); // Clean up every minute
            }
            
            window.LeakAILogger.log('LeakAI TextOverlayManager integration initialized with comprehensive event handling and performance monitoring');
        }
    }

    /**
     * Check if an element should use precise text overlays instead of element-level styling
     * @param {Element} element - Input element
     * @param {Array} detections - Detection results
     * @returns {boolean} True if should use overlays
     */
    shouldUsePreciseOverlays(element, detections) {
        // Check if TextOverlayManager is available
        if (!window.LeakAI || !window.LeakAI.textOverlayManager) {
            return false;
        }

        // Check if element is suitable for precise overlays (Requirement 2.1, 2.2, 2.3)
        const tagName = element.tagName.toLowerCase();
        const isTextInput = tagName === 'input' || tagName === 'textarea' || element.contentEditable === 'true';
        
        if (!isTextInput) {
            return false;
        }

        // Check if detections have proper indices for precise positioning
        const hasValidIndices = detections.some(detection => 
            detection.startIndex !== undefined && 
            detection.endIndex !== undefined &&
            (detection.match || detection.text) // Check for either match or text property
        );

        if (!hasValidIndices) {
            return false;
        }

        // Performance check - avoid overlays for very long text (Requirement 4.4)
        const text = this._getElementText(element);
        if (text.length > 10000) {
            window.LeakAILogger.log('LeakAI skipping precise overlays for long text (>10k chars)');
            return false;
        }

        // Check for complex styling that might interfere (Requirement 6.6)
        const computedStyle = window.getComputedStyle(element);
        const hasComplexTransforms = computedStyle.transform !== 'none' || 
                                   computedStyle.perspective !== 'none';
        
        if (hasComplexTransforms) {
            window.LeakAILogger.log('LeakAI skipping precise overlays due to complex CSS transforms');
            return false;
        }

        // Check if element is visible and has dimensions
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return false;
        }

        // Check system performance before enabling overlays (Requirement 4.4)
        if (!this._canHandleOverlayPerformance()) {
            return false;
        }

        // All checks passed - use precise overlays
        return true;
    }

    /**
     * Render detections using precise text overlays when possible
     * @param {Element} element - Input element
     * @param {Array} detections - Detection results
     * @returns {boolean} True if overlay was successfully created
     */
    renderWithPreciseOverlays(element, detections) {
        if (!window.LeakAI || !window.LeakAI.textOverlayManager) {
            return false;
        }

        try {
            // Clear any existing overlay first (lifecycle management)
            if (element.classList.contains('leakai-has-overlay')) {
                window.LeakAI.textOverlayManager.destroyOverlay(element);
                element.classList.remove('leakai-has-overlay');
            }

            // Create overlay with precise underlines
            const overlayData = window.LeakAI.textOverlayManager.createOverlay(element, detections);
            
            if (overlayData) {
                // Mark element as having overlay to skip hover listeners
                element.classList.add('leakai-has-overlay');
                
                // Store overlay data for tracking and lifecycle management
                this.renderedElements.set(element, detections);
                
                // Set up overlay update listeners for text changes (Requirement 2.4)
                this._setupOverlayUpdateListeners(element, detections);
                
                window.LeakAILogger.log(`LeakAI rendered precise overlays for ${detections.length} detections`);
                return true;
            } else {
                window.LeakAILogger.log('LeakAI failed to create overlay, falling back to element-level styling');
            }
        } catch (error) {
            console.error('LeakAI failed to render precise overlays:', error);
            window.LeakAILogger.log('LeakAI falling back to element-level styling due to error');
        }

        return false;
    }

    /**
     * Set up listeners to update overlays when text changes
     * @param {Element} element - Input element
     * @param {Array} detections - Current detections
     * @private
     */
    _setupOverlayUpdateListeners(element, detections) {
        if (!element || !window.LeakAI || !window.LeakAI.textOverlayManager) {
            return;
        }

        // Throttled update function to avoid excessive overlay updates (Requirement 4.4)
        let updateTimeout = null;
        const throttledUpdate = () => {
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            updateTimeout = setTimeout(() => {
                try {
                    // Check if element still has overlay
                    if (element.classList.contains('leakai-has-overlay')) {
                        // Get current detections for this element
                        const currentDetections = this.renderedElements.get(element);
                        if (currentDetections) {
                            // Update overlay with current detections
                            window.LeakAI.textOverlayManager.updateOverlay(element, currentDetections);
                        }
                    }
                } catch (error) {
                    console.error('LeakAI failed to update overlay:', error);
                }
            }, 100); // 100ms throttle
        };

        // Add input event listener for text changes
        const inputHandler = throttledUpdate;
        element.addEventListener('input', inputHandler, { passive: true });

        // Add scroll event listener for overlay synchronization
        const scrollHandler = () => {
            if (window.LeakAI && window.LeakAI.textOverlayManager) {
                const overlayData = window.LeakAI.textOverlayManager.overlays.get(element);
                if (overlayData) {
                    window.LeakAI.textOverlayManager.handleInputScroll(element, overlayData.element);
                }
            }
        };
        element.addEventListener('scroll', scrollHandler, { passive: true });

        // Store handlers for cleanup
        if (!element._leakaiOverlayHandlers) {
            element._leakaiOverlayHandlers = [];
        }
        
        element._leakaiOverlayHandlers.push(
            { event: 'input', handler: inputHandler },
            { event: 'scroll', handler: scrollHandler }
        );
    }

    /**
     * Clean up overlay update listeners
     * @param {Element} element - Input element
     * @private
     */
    _cleanupOverlayUpdateListeners(element) {
        if (element._leakaiOverlayHandlers) {
            element._leakaiOverlayHandlers.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
            delete element._leakaiOverlayHandlers;
        }
    }

    /**
     * Update existing overlay with new detections (lifecycle management)
     * @param {Element} element - Input element
     * @param {Array} detections - New detection results
     */
    updateOverlayDetections(element, detections) {
        if (!element || !window.LeakAI || !window.LeakAI.textOverlayManager) {
            return;
        }

        // Check if element has an overlay
        if (!element.classList.contains('leakai-has-overlay')) {
            // No overlay exists, create one if detections are present
            if (detections && detections.length > 0 && this.shouldUsePreciseOverlays(element, detections)) {
                this.renderWithPreciseOverlays(element, detections);
            }
            return;
        }

        try {
            if (!detections || detections.length === 0) {
                // No detections, destroy overlay
                window.LeakAI.textOverlayManager.destroyOverlay(element);
                element.classList.remove('leakai-has-overlay');
                this._cleanupOverlayUpdateListeners(element);
                this.renderedElements.delete(element);
            } else {
                // Update overlay with new detections
                window.LeakAI.textOverlayManager.updateOverlay(element, detections);
                this.renderedElements.set(element, detections);
            }
            
            window.LeakAILogger.log(`LeakAI updated overlay with ${detections ? detections.length : 0} detections`);
        } catch (error) {
            console.error('LeakAI failed to update overlay detections:', error);
            // Fall back to recreating the overlay
            this.clearDetections(element);
            if (detections && detections.length > 0) {
                this.renderDetections(element, detections);
            }
        }
    }

    /**
     * Check if the system can handle overlay performance requirements
     * @returns {boolean} True if system can handle overlays
     * @private
     */
    _canHandleOverlayPerformance() {
        // Check if we have too many active overlays (Requirement 4.4)
        if (window.LeakAI && window.LeakAI.textOverlayManager) {
            const overlayCount = window.LeakAI.textOverlayManager.overlays.size;
            if (overlayCount > 10) {
                window.LeakAILogger.log('LeakAI too many active overlays, using fallback styling');
                return false;
            }
        }

        // Check if we have too many rendered elements
        if (this.renderedElements.size > 20) {
            window.LeakAILogger.log('LeakAI too many rendered elements, using fallback styling');
            return false;
        }

        // Check basic browser performance indicators
        if (typeof performance !== 'undefined' && performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
            if (memoryUsage > 0.8) {
                window.LeakAILogger.log('LeakAI high memory usage detected, using fallback styling');
                return false;
            }
        }

        return true;
    }

    /**
     * Clean up inactive overlays to maintain performance
     * @private
     */
    _cleanupInactiveOverlays() {
        if (!window.LeakAI || !window.LeakAI.textOverlayManager) {
            return;
        }

        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

        // Check for elements that are no longer in the DOM
        for (const [element, overlayData] of window.LeakAI.textOverlayManager.overlays) {
            if (!document.contains(element)) {
                window.LeakAI.textOverlayManager.destroyOverlay(element);
                this.renderedElements.delete(element);
                window.LeakAILogger.log('LeakAI cleaned up overlay for removed element');
            }
        }

        // Clean up rendered elements that are no longer in DOM
        for (const element of this.renderedElements.keys()) {
            if (!document.contains(element)) {
                this.clearDetections(element);
                window.LeakAILogger.log('LeakAI cleaned up detections for removed element');
            }
        }
    }

    /**
     * Get statistics about rendered detections
     * @returns {Object} Statistics
     */
    getStats() {
        const overlayStats = window.LeakAI && window.LeakAI.textOverlayManager ? 
            { overlayCount: window.LeakAI.textOverlayManager.overlays.size } : 
            { overlayCount: 0 };

        return {
            renderedElements: this.renderedElements.size,
            totalDetectionSpans: Array.from(this.detectionSpans.values()).reduce((sum, spans) => sum + spans.length, 0),
            tooltipVisible: this.tooltipManager.isVisible(),
            canHandleOverlayPerformance: this._canHandleOverlayPerformance(),
            ...overlayStats
        };
    }
}

/**
 * ActionMenu class - Handles user interaction and remediation actions
 * Provides functionality for mask, remove, replace, encrypt, and ignore actions
 */
class ActionMenu {
    constructor() {
        this.undoStack = new Map(); // Store undo information per element
        this.maxUndoHistory = 10; // Maximum undo operations to remember
        
        window.LeakAILogger.log('LeakAI ActionMenu initialized');
    }

    /**
     * Execute a remediation action
     * @param {string} action - Action to execute (mask, remove, replace, encrypt, ignore_once)
     * @param {Object} detection - Detection result object
     * @param {Element} tooltipElement - Tooltip element that triggered the action
     */
    executeAction(action, detection, tooltipElement) {
        window.LeakAILogger.log(`LeakAI executing action: ${action} for detection:`, detection);
        
        // Track user activity
        if (window.LeakAI && window.LeakAI.contentScript) {
            window.LeakAI.contentScript.trackUserActivity();
        }

        // Find the input element that contains this detection
        const inputElement = this._findInputElementForDetection(detection, tooltipElement);
        if (!inputElement) {
            console.error('LeakAI could not find input element for action');
            return;
        }

        // Store current state for undo
        this._storeUndoState(inputElement, action, detection);

        // Execute the specific action
        switch (action) {
            case 'mask':
                this._executeMaskAction(inputElement, detection);
                break;
            case 'remove':
                this._executeRemoveAction(inputElement, detection);
                break;
            case 'replace':
                this._executeReplaceAction(inputElement, detection);
                break;
            case 'encrypt':
                this._executeEncryptAction(inputElement, detection);
                break;
            case 'ignore_once':
                this._executeIgnoreAction(inputElement, detection);
                break;
            default:
                console.warn(`LeakAI unknown action: ${action}`);
        }

        // Provide visual feedback
        this._showActionFeedback(inputElement, action);

        // Re-trigger detection after action to update UI
        setTimeout(() => {
            this._triggerRedetection(inputElement);
        }, 100);
    }

    /**
     * Execute mask action - replace sensitive data with masked version
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeMaskAction(inputElement, detection) {
        const currentText = this._getElementText(inputElement);
        const maskedText = this._generateMaskedText(detection.text, detection.type);
        
        // Use precise text replacement to maintain cursor position
        this._replaceTextRange(inputElement, detection.startIndex, detection.endIndex, maskedText);
        
        window.LeakAILogger.log(`LeakAI masked "${detection.text}" → "${maskedText}"`);
    }

    /**
     * Execute remove action - delete the sensitive data
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeRemoveAction(inputElement, detection) {
        // Use precise text replacement to maintain cursor position
        this._replaceTextRange(inputElement, detection.startIndex, detection.endIndex, '');
        
        window.LeakAILogger.log(`LeakAI removed "${detection.text}"`);
    }

    /**
     * Execute replace action - allow user to enter replacement text
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeReplaceAction(inputElement, detection) {
        const replacement = prompt(`Replace "${detection.text}" with:`, '');
        
        if (replacement !== null) { // User didn't cancel
            // Use precise text replacement to maintain cursor position
            this._replaceTextRange(inputElement, detection.startIndex, detection.endIndex, replacement);
            
            window.LeakAILogger.log(`LeakAI replaced "${detection.text}" with "${replacement}"`);
        }
    }

    /**
     * Execute encrypt action - replace with encrypted token (placeholder for now)
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeEncryptAction(inputElement, detection) {
        // For now, create a simple token - in a real implementation this would
        // integrate with an organizational vault system
        const token = `[ENCRYPTED:${detection.type.toUpperCase()}:${Date.now()}]`;
        
        // Use precise text replacement to maintain cursor position
        this._replaceTextRange(inputElement, detection.startIndex, detection.endIndex, token);
        
        window.LeakAILogger.log(`LeakAI encrypted "${detection.text}" → "${token}"`);
    }

    /**
     * Execute ignore action - temporarily ignore this detection
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeIgnoreAction(inputElement, detection) {
        // Mark this specific detection as ignored
        const ignoreKey = `${detection.text}_${detection.type}_${detection.startIndex}`;
        
        if (!inputElement._leakaiIgnored) {
            inputElement._leakaiIgnored = new Set();
        }
        
        inputElement._leakaiIgnored.add(ignoreKey);
        
        window.LeakAILogger.log(`LeakAI ignoring detection: "${detection.text}"`);
        
        // Clear visual indicators for this element
        if (window.LeakAI && window.LeakAI.contentScript) {
            window.LeakAI.contentScript.uiRenderer.clearDetections(inputElement);
        }
    }

    /**
     * Generate masked version of text based on detection type
     * @param {string} text - Original text
     * @param {string} type - Detection type
     * @returns {string} Masked text
     */
    _generateMaskedText(text, type) {
        switch (type) {
            case 'email':
                return this._maskEmail(text);
            case 'phone':
                return this._maskPhone(text);
            case 'credit_card':
                return this._maskCreditCard(text);
            case 'api_key':
                return this._maskApiKey(text);
            case 'crypto_seed':
            case 'crypto_private_key':
                return '[REDACTED]';
            case 'crypto_address':
                return this._maskCryptoAddress(text);
            default:
                return this._maskGeneric(text);
        }
    }

    /**
     * Mask email address
     * @param {string} email - Email address
     * @returns {string} Masked email
     */
    _maskEmail(email) {
        const atIndex = email.indexOf('@');
        if (atIndex <= 0) return '***@***.***';
        
        const username = email.substring(0, atIndex);
        const domain = email.substring(atIndex);
        
        if (username.length <= 1) {
            return '*' + domain;
        } else if (username.length <= 3) {
            return username[0] + '*'.repeat(username.length - 1) + domain;
        }
        
        // For longer usernames, show first char and mask the rest except last char
        return username[0] + '*'.repeat(Math.max(1, username.length - 2)) + username[username.length - 1] + domain;
    }

    /**
     * Mask phone number
     * @param {string} phone - Phone number
     * @returns {string} Masked phone number
     */
    _maskPhone(phone) {
        // Extract just the digits to determine structure
        const digits = phone.replace(/\D/g, '');
        
        if (digits.length < 7) {
            // Too short to be a real phone number, mask everything
            return '*'.repeat(phone.length);
        }
        
        // Preserve the original formatting structure
        let maskedPhone = phone;
        let digitIndex = 0;
        
        // Replace digits while preserving formatting
        for (let i = 0; i < phone.length; i++) {
            if (/\d/.test(phone[i])) {
                if (digitIndex < 3 || digitIndex >= digits.length - 4) {
                    // Keep first 3 and last 4 digits
                    digitIndex++;
                } else {
                    // Mask middle digits
                    maskedPhone = maskedPhone.substring(0, i) + '*' + maskedPhone.substring(i + 1);
                    digitIndex++;
                }
            }
        }
        
        return maskedPhone;
    }

    /**
     * Mask credit card number
     * @param {string} cardNumber - Credit card number
     * @returns {string} Masked credit card
     */
    _maskCreditCard(cardNumber) {
        const digits = cardNumber.replace(/\D/g, '');
        if (digits.length < 8) {
            return '*'.repeat(cardNumber.length);
        }
        
        // Preserve original formatting while masking digits
        let maskedCard = cardNumber;
        let digitIndex = 0;
        
        for (let i = 0; i < cardNumber.length; i++) {
            if (/\d/.test(cardNumber[i])) {
                if (digitIndex < 4 || digitIndex >= digits.length - 4) {
                    // Keep first 4 and last 4 digits
                    digitIndex++;
                } else {
                    // Mask middle digits
                    maskedCard = maskedCard.substring(0, i) + '*' + maskedCard.substring(i + 1);
                    digitIndex++;
                }
            }
        }
        
        return maskedCard;
    }

    /**
     * Mask API key
     * @param {string} apiKey - API key
     * @returns {string} Masked API key
     */
    _maskApiKey(apiKey) {
        if (apiKey.length <= 8) {
            return '*'.repeat(apiKey.length);
        }
        
        // Show first 4 characters and mask the rest
        return apiKey.substring(0, 4) + '*'.repeat(apiKey.length - 4);
    }

    /**
     * Mask cryptocurrency address
     * @param {string} address - Crypto address
     * @returns {string} Masked address
     */
    _maskCryptoAddress(address) {
        if (address.length <= 12) {
            return '*'.repeat(address.length);
        }
        
        // Show first 6 and last 6 characters
        const first6 = address.substring(0, 6);
        const last6 = address.substring(address.length - 6);
        const middle = '*'.repeat(address.length - 12);
        
        return first6 + middle + last6;
    }

    /**
     * Generic masking for unknown types
     * @param {string} text - Text to mask
     * @returns {string} Masked text
     */
    _maskGeneric(text) {
        if (text.length <= 4) {
            return '*'.repeat(text.length);
        }
        
        // Show first and last character, mask the middle
        return text[0] + '*'.repeat(text.length - 2) + text[text.length - 1];
    }

    /**
     * Find the input element associated with a detection
     * @param {Object} detection - Detection result
     * @param {Element} tooltipElement - Tooltip element
     * @returns {Element|null} Input element
     */
    _findInputElementForDetection(detection, tooltipElement) {
        // First, try to find element from overlay system (for precise overlays)
        if (window.LeakAI && window.LeakAI.contentScript && window.LeakAI.contentScript.uiRenderer) {
            const uiRenderer = window.LeakAI.contentScript.uiRenderer;
            
            // Check rendered elements map for overlay-based detections
            for (const [element, detections] of uiRenderer.renderedElements) {
                const matchingDetection = detections.find(d => 
                    d.text === detection.text && 
                    d.type === detection.type && 
                    d.startIndex === detection.startIndex
                );
                
                if (matchingDetection) {
                    return element;
                }
            }
        }

        // Fallback: Look for elements with detection data attributes (for element-level styling)
        const elementsWithDetections = document.querySelectorAll('[data-leakai-detections]');
        
        for (const element of elementsWithDetections) {
            try {
                const detections = JSON.parse(element.getAttribute('data-leakai-detections'));
                const matchingDetection = detections.find(d => 
                    d.text === detection.text && 
                    d.type === detection.type && 
                    d.startIndex === detection.startIndex
                );
                
                if (matchingDetection) {
                    return element;
                }
            } catch (error) {
                console.warn('LeakAI failed to parse detection data:', error);
            }
        }
        
        // Last resort: try to find from tooltip context if available
        if (tooltipElement) {
            const overlay = tooltipElement.closest('.leakai-text-overlay');
            if (overlay && window.LeakAI && window.LeakAI.textOverlayManager) {
                // Find input element associated with this overlay
                for (const [input, overlayData] of window.LeakAI.textOverlayManager.overlays) {
                    if (overlayData.element === overlay) {
                        return input;
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * Get text content from element
     * @param {Element} element - Element to get text from
     * @returns {string} Text content
     */
    _getElementText(element) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            return element.value || '';
        } else if (element.getAttribute('contenteditable')) {
            return element.textContent || element.innerText || '';
        }
        
        return '';
    }

    /**
     * Set text content in element
     * @param {Element} element - Element to set text in
     * @param {string} text - New text content
     */
    _setElementText(element, text) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            // Store cursor position
            const cursorPos = element.selectionStart;
            
            element.value = text;
            
            // Restore cursor position (approximately)
            if (cursorPos !== null && cursorPos <= text.length) {
                element.setSelectionRange(cursorPos, cursorPos);
            }
            
            // Trigger input event to notify other scripts
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (element.getAttribute('contenteditable')) {
            // For contenteditable, we need to be more careful about cursor position
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            const cursorOffset = range ? range.startOffset : 0;
            
            element.textContent = text;
            
            // Try to restore cursor position
            if (range && cursorOffset <= text.length) {
                try {
                    const newRange = document.createRange();
                    const textNode = element.firstChild;
                    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                        newRange.setStart(textNode, Math.min(cursorOffset, textNode.length));
                        newRange.setEnd(textNode, Math.min(cursorOffset, textNode.length));
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                } catch (error) {
                    console.warn('LeakAI could not restore cursor position:', error);
                }
            }
            
            // Trigger input event for contenteditable
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Replace text in a specific range while maintaining cursor position
     * @param {Element} element - Element to modify
     * @param {number} startIndex - Start index of text to replace
     * @param {number} endIndex - End index of text to replace
     * @param {string} replacement - Replacement text
     */
    _replaceTextRange(element, startIndex, endIndex, replacement) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            const currentText = element.value;
            const cursorPos = element.selectionStart;
            
            // Calculate new text
            const newText = currentText.substring(0, startIndex) + 
                           replacement + 
                           currentText.substring(endIndex);
            
            // Set new text
            element.value = newText;
            
            // Calculate new cursor position
            let newCursorPos = cursorPos;
            if (cursorPos > endIndex) {
                // Cursor was after the replaced text
                newCursorPos = cursorPos - (endIndex - startIndex) + replacement.length;
            } else if (cursorPos > startIndex) {
                // Cursor was within the replaced text, move to end of replacement
                newCursorPos = startIndex + replacement.length;
            }
            
            // Set cursor position
            element.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
        } else if (element.getAttribute('contenteditable')) {
            const currentText = element.textContent;
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            const cursorOffset = range ? range.startOffset : 0;
            
            // Calculate new text
            const newText = currentText.substring(0, startIndex) + 
                           replacement + 
                           currentText.substring(endIndex);
            
            // Set new text
            element.textContent = newText;
            
            // Calculate new cursor position
            let newCursorOffset = cursorOffset;
            if (cursorOffset > endIndex) {
                // Cursor was after the replaced text
                newCursorOffset = cursorOffset - (endIndex - startIndex) + replacement.length;
            } else if (cursorOffset > startIndex) {
                // Cursor was within the replaced text, move to end of replacement
                newCursorOffset = startIndex + replacement.length;
            }
            
            // Try to restore cursor position
            try {
                const newRange = document.createRange();
                const textNode = element.firstChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                    const safeOffset = Math.min(newCursorOffset, textNode.length);
                    newRange.setStart(textNode, safeOffset);
                    newRange.setEnd(textNode, safeOffset);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            } catch (error) {
                console.warn('LeakAI could not restore cursor position:', error);
            }
            
            // Trigger input event
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /**
     * Store undo state for an action
     * @param {Element} element - Input element
     * @param {string} action - Action being performed
     * @param {Object} detection - Detection result
     */
    _storeUndoState(element, action, detection) {
        if (!this.undoStack.has(element)) {
            this.undoStack.set(element, []);
        }
        
        const undoHistory = this.undoStack.get(element);
        
        // Store current state
        const undoState = {
            action: action,
            detection: detection,
            previousText: this._getElementText(element),
            timestamp: Date.now()
        };
        
        undoHistory.push(undoState);
        
        // Limit undo history size
        if (undoHistory.length > this.maxUndoHistory) {
            undoHistory.shift();
        }
    }

    /**
     * Show visual feedback for action execution
     * @param {Element} element - Input element
     * @param {string} action - Action that was executed
     */
    _showActionFeedback(element, action) {
        // Add temporary visual feedback class
        element.classList.add('leakai-action-executed');
        element.classList.add(`leakai-action-${action}`);
        
        // Remove feedback after animation
        setTimeout(() => {
            element.classList.remove('leakai-action-executed');
            element.classList.remove(`leakai-action-${action}`);
        }, 1000);
        
        window.LeakAILogger.log(`LeakAI action feedback shown for: ${action}`);
    }

    /**
     * Trigger re-detection on an element
     * @param {Element} element - Element to re-scan
     */
    _triggerRedetection(element) {
        if (window.LeakAI && window.LeakAI.contentScript) {
            const text = this._getElementText(element);
            window.LeakAI.contentScript._performDetection(element, text);
        }
    }

    /**
     * Check if a detection should be ignored
     * @param {Element} element - Input element
     * @param {Object} detection - Detection result
     * @returns {boolean} True if detection should be ignored
     */
    isDetectionIgnored(element, detection) {
        if (!element._leakaiIgnored) {
            return false;
        }
        
        const ignoreKey = `${detection.text}_${detection.type}_${detection.startIndex}`;
        return element._leakaiIgnored.has(ignoreKey);
    }

    /**
     * Get undo history for an element
     * @param {Element} element - Input element
     * @returns {Array} Undo history
     */
    getUndoHistory(element) {
        return this.undoStack.get(element) || [];
    }

    /**
     * Clear undo history for an element
     * @param {Element} element - Input element
     */
    clearUndoHistory(element) {
        this.undoStack.delete(element);
    }

    /**
     * Undo the last action on an element
     * @param {Element} element - Input element
     * @returns {boolean} True if undo was successful
     */
    undoLastAction(element) {
        const undoHistory = this.undoStack.get(element);
        if (!undoHistory || undoHistory.length === 0) {
            window.LeakAILogger.log('LeakAI no actions to undo');
            return false;
        }

        const lastAction = undoHistory.pop();
        
        // Restore the previous text
        this._setElementText(element, lastAction.previousText);
        
        // Show undo feedback
        this._showUndoFeedback(element, lastAction.action);
        
        window.LeakAILogger.log(`LeakAI undid ${lastAction.action} action`);
        
        // Re-trigger detection after undo
        setTimeout(() => {
            this._triggerRedetection(element);
        }, 100);
        
        return true;
    }

    /**
     * Show visual feedback for undo action
     * @param {Element} element - Input element
     * @param {string} originalAction - Action that was undone
     */
    _showUndoFeedback(element, originalAction) {
        // Add temporary visual feedback class
        element.classList.add('leakai-undo-executed');
        element.classList.add(`leakai-undo-${originalAction}`);
        
        // Remove feedback after animation
        setTimeout(() => {
            element.classList.remove('leakai-undo-executed');
            element.classList.remove(`leakai-undo-${originalAction}`);
        }, 1000);
        
        window.LeakAILogger.log(`LeakAI undo feedback shown for: ${originalAction}`);
    }

    /**
     * Check if undo is available for an element
     * @param {Element} element - Input element
     * @returns {boolean} True if undo is available
     */
    canUndo(element) {
        const undoHistory = this.undoStack.get(element);
        return undoHistory && undoHistory.length > 0;
    }
}

/**
 * ContentScript class - Main content script for monitoring text inputs
 * Handles real-time text scanning and coordinates with detection engine
 */
class ContentScript {
    constructor() {
        this.detectionEngine = null;
        this.uiRenderer = new UIRenderer();
        this.actionMenu = new ActionMenu();
        this.isInitialized = false;
        this.monitoredElements = new Set(); // Track elements we're monitoring
        this.debounceTimers = new Map(); // Debounce timers for input events
        this.debounceDelay = 300; // 300ms debounce delay
        this.lastDetections = new Map(); // Cache last detections per element
        this.settings = null; // Extension settings
        this.extensionEnabled = true; // Track extension enabled state
        
        window.LeakAILogger.log('LeakAI ContentScript initialized');
    }

    /**
     * Conditional console logging - only logs when extension is enabled
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    _log(message, ...args) {
        if (this.extensionEnabled) {
            console.log(message, ...args);
        }
    }

    /**
     * Conditional console warning - only logs when extension is enabled
     * @param {string} message - Message to log
     * @param {...any} args - Additional arguments
     */
    _warn(message, ...args) {
        if (this.extensionEnabled) {
            console.warn(message, ...args);
        }
    }

    /**
     * Initialize the content script
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Load settings first
            await this._loadSettings();
            
            // Wait for detection engine to be available
            await this._waitForDetectionEngine();
            
            // Initialize detection engine
            if (this.detectionEngine) {
                await this.detectionEngine.initialize();
            }

            // Set up event listeners
            this._setupEventListeners();
            
            // Initialize form submission interception
            this.initializeFormInterception();
            
            // Monitor existing elements only if extension is enabled
            if (this.extensionEnabled) {
                this._scanExistingElements();
            }
            
            // Notify background script that this tab is connected
            this._notifyBackgroundConnection();
            
            this.isInitialized = true;
            window.LeakAILogger.system('LeakAI content script loaded and initialized, enabled:', this.extensionEnabled);
        } catch (error) {
            console.error('LeakAI ContentScript initialization failed:', error);
        }
    }

    /**
     * Load settings from background script
     */
    async _loadSettings() {
        try {
            if (chrome && chrome.runtime) {
                const response = await this._sendMessage('GET_SETTINGS');
                if (response && response.success) {
                    this.settings = response.data;
                    this.extensionEnabled = this.settings.enabled;
                    window.LeakAILogger.log('LeakAI settings loaded:', this.settings);
                } else {
                    console.warn('LeakAI failed to load settings, using defaults');
                    this._useDefaultSettings();
                }
            } else {
                console.warn('LeakAI Chrome APIs not available, using default settings');
                this._useDefaultSettings();
            }
        } catch (error) {
            console.error('LeakAI error loading settings:', error);
            this._useDefaultSettings();
        }
    }

    /**
     * Use default settings when background script is not available
     */
    _useDefaultSettings() {
        this.settings = {
            enabled: true,
            detectionCategories: {
                email: true,
                phone: true,
                credit_card: true,
                api_key: true,
                crypto_seed: true,
                crypto_private_key: true,
                crypto_address: true,
                health_info: true,
                company_confidential: false,
                person_name: false,
                location: false,
                organization: false
            }
        };
        this.extensionEnabled = this.settings.enabled;
    }

    /**
     * Send message to background script
     */
    async _sendMessage(type, data = {}) {
        return new Promise((resolve, reject) => {
            if (!chrome || !chrome.runtime) {
                reject(new Error('Chrome runtime not available'));
                return;
            }

            chrome.runtime.sendMessage({ type, data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Wait for detection engine to be available
     */
    async _waitForDetectionEngine() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkEngine = () => {
                attempts++;
                window.LeakAILogger.log(`LeakAI checking for DetectionEngine (attempt ${attempts})`);
                window.LeakAILogger.log('Current window.LeakAI:', window.LeakAI);
                
                if (window.LeakAI && window.LeakAI.DetectionEngine) {
                    window.LeakAILogger.log('LeakAI DetectionEngine found, creating instance');
                    this.detectionEngine = new window.LeakAI.DetectionEngine();
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('LeakAI DetectionEngine not found after maximum attempts');
                    window.LeakAILogger.log('Available window.LeakAI:', window.LeakAI);
                    window.LeakAILogger.log('Available window.LeakAI keys:', window.LeakAI ? Object.keys(window.LeakAI) : 'none');
                    reject(new Error('DetectionEngine not available'));
                } else {
                    // Check again in 100ms
                    setTimeout(checkEngine, 100);
                }
            };
            checkEngine();
        });
    }

    /**
     * Set up event listeners for text input monitoring
     */
    _setupEventListeners() {
        // Listen for input events on the document (using event delegation)
        document.addEventListener('input', this._handleInputEvent.bind(this), true);
        document.addEventListener('paste', this._handlePasteEvent.bind(this), true);
        
        // Listen for DOM changes to catch dynamically added elements
        const observer = new MutationObserver(this._handleDOMChanges.bind(this));
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });

        // Listen for focus events to track active elements
        document.addEventListener('focusin', this._handleFocusIn.bind(this), true);
        document.addEventListener('focusout', this._handleFocusOut.bind(this), true);

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyDown.bind(this), true);

        // Listen for messages from background script (settings updates)
        if (chrome && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this._handleMessage(message, sender, sendResponse);
            });
        }

        window.LeakAILogger.log('LeakAI event listeners set up');
    }

    /**
     * Handle messages from background script
     */
    _handleMessage(message, sender, sendResponse) {
        window.LeakAILogger.log('LeakAI content script received message:', message);
        
        switch (message.type) {
            case 'SETTINGS_UPDATED':
                this._handleSettingsUpdate(message.data.settings);
                sendResponse({ success: true });
                break;
            default:
                window.LeakAILogger.log('LeakAI unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }

    /**
     * Handle settings update from background script
     */
    _handleSettingsUpdate(newSettings) {
        // Always log settings updates (even when disabled) since this is a settings change event
        console.log('LeakAI settings updated:', newSettings);
        
        const wasEnabled = this.extensionEnabled;
        this.settings = newSettings;
        this.extensionEnabled = newSettings.enabled;
        
        // If extension was disabled, clear all visual indicators
        if (wasEnabled && !this.extensionEnabled) {
            window.LeakAILogger.system('LeakAI extension disabled, clearing all detections');
            this._clearAllDetections();
        }
        
        // If extension was enabled, re-scan existing elements
        if (!wasEnabled && this.extensionEnabled) {
            window.LeakAILogger.system('LeakAI extension enabled, scanning existing elements');
            this._scanExistingElements();
        }
        
        // If extension is enabled but settings changed, re-process all monitored elements
        if (this.extensionEnabled) {
            this._reprocessAllElements();
        }
    }

    /**
     * Clear all visual detections from all monitored elements
     */
    _clearAllDetections() {
        for (const element of this.monitoredElements) {
            this.uiRenderer.clearDetections(element);
            this.lastDetections.delete(element);
        }
    }

    /**
     * Reprocess all monitored elements with current settings
     */
    _reprocessAllElements() {
        for (const element of this.monitoredElements) {
            const text = this._getElementText(element);
            if (text && text.length > 0) {
                this._performDetection(element, text);
            }
        }
    }

    /**
     * Check if a detection category is enabled in settings
     * @param {string} detectionType - The detection type to check
     * @returns {boolean} True if category is enabled
     */
    _isCategoryEnabled(detectionType) {
        if (!this.settings || !this.settings.detectionCategories) {
            // If no settings, assume all categories are enabled
            return true;
        }

        // Map detection types to settings keys
        const categoryMap = {
            'email': 'email',
            'phone': 'phone', 
            'credit_card': 'credit_card',
            'api_key': 'api_key',
            'crypto_seed': 'crypto_seed',
            'crypto_private_key': 'crypto_private_key',
            'crypto_address': 'crypto_address',
            'health_info': 'health_info',
            'company_confidential': 'company_confidential',
            'person_name': 'person_name',
            'location': 'location',
            'organization': 'organization'
        };

        const settingsKey = categoryMap[detectionType];
        if (!settingsKey) {
            console.warn(`LeakAI unknown detection type: ${detectionType}`);
            return true; // Unknown types are enabled by default
        }

        const isEnabled = this.settings.detectionCategories[settingsKey] === true;
        this._log(`LeakAI category ${detectionType} (${settingsKey}) enabled: ${isEnabled}`);
        return isEnabled;
    }

    /**
     * Notify background script that this tab is connected
     */
    async _notifyBackgroundConnection() {
        try {
            if (chrome && chrome.runtime) {
                await this._sendMessage('TAB_CONNECTED');
                window.LeakAILogger.log('LeakAI notified background script of tab connection');
            }
        } catch (error) {
            window.LeakAILogger.log('LeakAI could not notify background script:', error.message);
        }
    }

    /**
     * Scan existing elements on page load
     */
    _scanExistingElements() {
        const elements = this._getAllTextInputElements();
        elements.forEach(element => {
            this._addElementToMonitoring(element);
        });
        
        window.LeakAILogger.log(`LeakAI monitoring ${elements.length} existing text input elements`);
    }

    /**
     * Get all text input elements on the page
     * @returns {Array<Element>} Array of text input elements
     */
    _getAllTextInputElements() {
        const elements = [];
        
        // Standard input elements
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="url"], input[type="tel"], input:not([type])');
        elements.push(...inputs);
        
        // Textarea elements
        const textareas = document.querySelectorAll('textarea');
        elements.push(...textareas);
        
        // Contenteditable elements
        const editables = document.querySelectorAll('[contenteditable="true"], [contenteditable=""]');
        elements.push(...editables);
        
        return elements;
    }

    /**
     * Add an element to monitoring
     * @param {Element} element - Element to monitor
     */
    _addElementToMonitoring(element) {
        if (this.monitoredElements.has(element)) {
            return;
        }

        this.monitoredElements.add(element);
        
        // Add a data attribute to mark as monitored
        element.setAttribute('data-leakai-monitored', 'true');
        
        window.LeakAILogger.log('LeakAI added element to monitoring:', element.tagName, element.type || 'contenteditable');
    }

    /**
     * Handle input events
     * @param {Event} event - Input event
     */
    _handleInputEvent(event) {
        // Check if extension is enabled before processing any input
        if (!this.extensionEnabled) {
            // Silent return when disabled - no console logs
            return;
        }

        const element = event.target;
        
        if (!this._isTextInputElement(element)) {
            return;
        }

        // Add to monitoring if not already monitored
        this._addElementToMonitoring(element);

        // Get text content
        const text = this._getElementText(element);
        
        if (!text || text.length === 0) {
            // Clear any existing detections for empty text
            this.lastDetections.delete(element);
            this.uiRenderer.clearDetections(element);
            window.LeakAILogger.log('LeakAI input cleared for element:', element.tagName);
            return;
        }

        // Skip detection for very short text (less than 3 characters)
        if (text.length < 3) {
            window.LeakAILogger.log('LeakAI skipping detection for very short text:', text);
            return;
        }

        // Debounce the detection to avoid excessive processing
        this._debounceDetection(element, text);
    }

    /**
     * Handle paste events
     * @param {Event} event - Paste event
     */
    _handlePasteEvent(event) {
        // Check if extension is enabled before processing any paste
        if (!this.extensionEnabled) {
            // Silent return when disabled - no console logs
            return;
        }

        const element = event.target;
        
        if (!this._isTextInputElement(element)) {
            return;
        }

        this._log('LeakAI paste event detected on:', element.tagName);
        
        // Add to monitoring if not already monitored
        this._addElementToMonitoring(element);

        // Handle paste with a slight delay to let the paste complete
        setTimeout(() => {
            const text = this._getElementText(element);
            if (text && text.length > 0) {
                this._performDetection(element, text);
            }
        }, 50);
    }

    /**
     * Handle focus in events
     * @param {Event} event - Focus event
     */
    _handleFocusIn(event) {
        const element = event.target;
        
        if (!this._isTextInputElement(element)) {
            return;
        }

        window.LeakAILogger.log('LeakAI focus in on text input:', element.tagName);
        this._addElementToMonitoring(element);
    }

    /**
     * Handle focus out events
     * @param {Event} event - Focus event
     */
    _handleFocusOut(event) {
        const element = event.target;
        
        if (!this._isTextInputElement(element)) {
            return;
        }

        window.LeakAILogger.log('LeakAI focus out from text input:', element.tagName);
        
        // Perform final detection on focus out
        const text = this._getElementText(element);
        if (text && text.length > 0) {
            this._performDetection(element, text);
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyDown(event) {
        // Check for Ctrl+Z (or Cmd+Z on Mac) for undo
        const isUndo = (event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey;
        
        if (isUndo) {
            const element = event.target;
            
            if (this._isTextInputElement(element) && this.actionMenu.canUndo(element)) {
                event.preventDefault();
                event.stopPropagation();
                
                const success = this.actionMenu.undoLastAction(element);
                if (success) {
                    window.LeakAILogger.log('LeakAI undo triggered via keyboard shortcut');
                }
            }
        }
    }

    /**
     * Handle DOM changes to catch dynamically added elements
     * @param {Array<MutationRecord>} mutations - DOM mutations
     */
    _handleDOMChanges(mutations) {
        let newElementsFound = false;
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node is a text input
                        if (this._isTextInputElement(node)) {
                            this._addElementToMonitoring(node);
                            newElementsFound = true;
                        }
                        
                        // Check for text inputs within the added node
                        const textInputs = node.querySelectorAll ? this._getAllTextInputElements().filter(el => node.contains(el)) : [];
                        textInputs.forEach(input => {
                            this._addElementToMonitoring(input);
                            newElementsFound = true;
                        });
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') {
                // Handle contenteditable attribute changes
                const element = mutation.target;
                if (this._isTextInputElement(element)) {
                    this._addElementToMonitoring(element);
                    newElementsFound = true;
                }
            }
        });
        
        if (newElementsFound) {
            window.LeakAILogger.log('LeakAI detected new text input elements via DOM changes');
        }
    }

    /**
     * Check if an element is a text input element
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is a text input
     */
    _isTextInputElement(element) {
        if (!element || !element.tagName) {
            return false;
        }

        const tagName = element.tagName.toLowerCase();
        
        // Check textarea
        if (tagName === 'textarea') {
            return true;
        }
        
        // Check input elements
        if (tagName === 'input') {
            const type = (element.type || 'text').toLowerCase();
            const textInputTypes = ['text', 'email', 'password', 'search', 'url', 'tel'];
            return textInputTypes.includes(type);
        }
        
        // Check contenteditable
        const contentEditable = element.getAttribute('contenteditable');
        if (contentEditable === 'true' || contentEditable === '') {
            return true;
        }
        
        return false;
    }

    /**
     * Get text content from an element
     * @param {Element} element - Element to get text from
     * @returns {string} Text content
     */
    _getElementText(element) {
        if (!element) {
            return '';
        }

        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            return element.value || '';
        } else if (element.getAttribute('contenteditable')) {
            return element.textContent || element.innerText || '';
        }
        
        return '';
    }

    /**
     * Debounce detection to avoid excessive processing
     * @param {Element} element - Element being typed in
     * @param {string} text - Current text content
     */
    _debounceDetection(element, text) {
        // Clear existing timer for this element
        if (this.debounceTimers.has(element)) {
            clearTimeout(this.debounceTimers.get(element));
        }

        // Set new timer
        const timer = setTimeout(() => {
            this._performDetection(element, text);
            this.debounceTimers.delete(element);
        }, this.debounceDelay);

        this.debounceTimers.set(element, timer);
    }

    /**
     * Perform detection on text content
     * @param {Element} element - Element containing the text
     * @param {string} text - Text to analyze
     */
    async _performDetection(element, text) {
        // Check if extension is enabled
        if (!this.extensionEnabled) {
            // Silent return when disabled - no console logs
            return;
        }

        if (!this.detectionEngine) {
            console.warn('LeakAI detection engine not available, using fallback detection');
            this._performFallbackDetection(element, text);
            return;
        }

        try {
            this._log(`LeakAI performing detection on ${text.length} characters from ${element.tagName}`);
            
            // Pass settings to detection engine for category filtering
            const detectionOptions = {
                enabledCategories: this.settings ? this.settings.detectionCategories : null
            };
            
            const detections = await this.detectionEngine.detectSensitiveData(text, detectionOptions);
            
            // Store detections for this element
            this.lastDetections.set(element, detections);
            
            // Filter out ignored detections, low confidence detections, and disabled categories
            const filteredDetections = detections.filter(detection => 
                !this.actionMenu.isDetectionIgnored(element, detection) &&
                detection.confidence >= 0.6 && // Minimum 60% confidence threshold
                this._isCategoryEnabled(detection.type) // Check if category is enabled
            );
            
            if (filteredDetections.length > 0) {
                window.LeakAILogger.log(`LeakAI detected ${filteredDetections.length} sensitive data items (${detections.length - filteredDetections.length} ignored):`, filteredDetections.map(d => ({
                    type: d.type,
                    text: d.text,
                    riskLevel: d.riskLevel,
                    confidence: d.confidence
                })));
                
                // Render visual indicators
                this.uiRenderer.renderDetections(element, filteredDetections);
                
                // Log detection results for debugging
                this._logDetectionResults(element, filteredDetections);
            } else {
                window.LeakAILogger.log('LeakAI no sensitive data detected (or all ignored)');
                // Clear any existing visual indicators
                this.uiRenderer.clearDetections(element);
            }
            
            // Store all detections (including ignored ones) for reference
            this.lastDetections.set(element, detections);
            
        } catch (error) {
            console.error('LeakAI detection failed:', error);
        }
    }

    /**
     * Log detection results for debugging
     * @param {Element} element - Element where detection occurred
     * @param {Array} detections - Detection results
     */
    _logDetectionResults(element, detections) {
        console.group(`LeakAI Detection Results for ${element.tagName}${element.type ? `[${element.type}]` : ''}`);
        
        detections.forEach((detection, index) => {
            window.LeakAILogger.log(`${index + 1}. ${detection.type.toUpperCase()}: "${detection.text}"`);
            window.LeakAILogger.log(`   Risk: ${detection.riskLevel.toUpperCase()}, Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
            window.LeakAILogger.log(`   Position: ${detection.startIndex}-${detection.endIndex}`);
            window.LeakAILogger.log(`   Context: "${detection.context}"`);
            window.LeakAILogger.log(`   Actions: ${detection.suggestions.join(', ')}`);
        });
        
        console.groupEnd();
    }

    /**
     * Get detection results for an element
     * @param {Element} element - Element to get detections for
     * @returns {Array} Detection results
     */
    getDetectionsForElement(element) {
        return this.lastDetections.get(element) || [];
    }

    /**
     * Get all monitored elements
     * @returns {Set<Element>} Set of monitored elements
     */
    getMonitoredElements() {
        return new Set(this.monitoredElements);
    }

    /**
     * Fallback detection method when detection engine is not available
     * @param {Element} element - Element containing the text
     * @param {string} text - Text to analyze
     */
    _performFallbackDetection(element, text) {
        window.LeakAILogger.log('LeakAI performing fallback detection');
        
        const detections = [];
        
        // Simple email detection
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        let match;
        while ((match = emailRegex.exec(text)) !== null) {
            detections.push({
                type: 'email',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.8,
                riskLevel: 'medium',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // Simple phone detection
        const phoneRegex = /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
        while ((match = phoneRegex.exec(text)) !== null) {
            detections.push({
                type: 'phone',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.7,
                riskLevel: 'medium',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // Simple credit card detection (basic Luhn check would be better)
        const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
        while ((match = ccRegex.exec(text)) !== null) {
            detections.push({
                type: 'credit_card',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.9,
                riskLevel: 'high',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // Filter out ignored detections and low confidence detections
        const filteredDetections = detections.filter(detection => 
            !this.actionMenu.isDetectionIgnored(element, detection) &&
            detection.confidence >= 0.6
        );
        
        if (filteredDetections.length > 0) {
            window.LeakAILogger.log(`LeakAI fallback detected ${filteredDetections.length} sensitive data items:`, filteredDetections);
            
            // Render visual indicators
            this.uiRenderer.renderDetections(element, filteredDetections);
            
            // Log detection results for debugging
            this._logDetectionResults(element, filteredDetections);
        } else {
            window.LeakAILogger.log('LeakAI fallback: no sensitive data detected');
            // Clear any existing visual indicators
            this.uiRenderer.clearDetections(element);
        }
        
        // Store detections for this element
        this.lastDetections.set(element, detections);
    }

    /**
     * Initialize form submission interception
     * Sets up event listeners to detect and prevent form submissions with high-risk content
     */
    initializeFormInterception() {
        window.LeakAILogger.log('LeakAI initializing form submission interception...');
        
        // Listen for form submissions using event delegation
        document.addEventListener('submit', this.handleFormSubmission.bind(this), true);
        
        // Also listen for button clicks that might trigger form submissions
        document.addEventListener('click', this.handleSubmitButtonClick.bind(this), true);
        
        console.log('LeakAI form interception initialized');
    }

    /**
     * Handle form submission events
     * @param {Event} event - Form submission event
     */
    handleFormSubmission(event) {
        console.log('LeakAI intercepted form submission:', event.target);
        
        try {
            const form = event.target;
            if (!form || form.tagName !== 'FORM') {
                return;
            }
            
            // Check if form was already approved by user
            if (form._leakaiApproved) {
                console.log('LeakAI allowing pre-approved form submission');
                // Clear approval flag for future submissions
                delete form._leakaiApproved;
                return;
            }
            
            // Scan all form inputs for sensitive data
            const formDetections = this.scanFormForSensitiveData(form);
            
            if (formDetections.length > 0) {
                console.log(`LeakAI found ${formDetections.length} sensitive data items in form submission`);
                
                // Check if we have high-risk detections that should block submission
                const highRiskDetections = formDetections.filter(d => d.riskLevel === 'high');
                const mediumRiskDetections = formDetections.filter(d => d.riskLevel === 'medium');
                
                if (highRiskDetections.length > 0 || mediumRiskDetections.length > 0) {
                    // Prevent form submission
                    event.preventDefault();
                    event.stopPropagation();
                    
                    console.log('LeakAI blocked form submission due to sensitive data');
                    
                    // Show warning modal
                    this.showFormSubmissionWarning(form, formDetections, event);
                    
                    return false;
                }
            }
            
            console.log('LeakAI allowing form submission - no high-risk data detected');
            
        } catch (error) {
            console.error('LeakAI form submission handling failed:', error);
            // Don't block submission if our detection fails
        }
    }

    /**
     * Handle submit button clicks that might trigger form submissions
     * @param {Event} event - Click event
     */
    handleSubmitButtonClick(event) {
        const button = event.target;
        
        // Check if this is a submit button
        if (!this.isSubmitButton(button)) {
            return;
        }
        
        console.log('LeakAI intercepted submit button click:', button);
        
        // Find the associated form
        const form = button.form || button.closest('form');
        if (!form) {
            return;
        }
        
        // For buttons that might submit via JavaScript, we need to check immediately
        // This handles cases where forms are submitted programmatically
        setTimeout(() => {
            const formDetections = this.scanFormForSensitiveData(form);
            
            if (formDetections.length > 0) {
                const highRiskDetections = formDetections.filter(d => d.riskLevel === 'high');
                const mediumRiskDetections = formDetections.filter(d => d.riskLevel === 'medium');
                
                if (highRiskDetections.length > 0 || mediumRiskDetections.length > 0) {
                    console.log('LeakAI detected sensitive data after submit button click');
                    // The actual form submission event will handle the blocking
                }
            }
        }, 10);
    }

    /**
     * Check if an element is a submit button
     * @param {Element} element - Element to check
     * @returns {boolean} True if element is a submit button
     */
    isSubmitButton(element) {
        if (!element) return false;
        
        const tagName = element.tagName.toLowerCase();
        
        // Check for input type="submit"
        if (tagName === 'input' && element.type === 'submit') {
            return true;
        }
        
        // Check for button type="submit" or default button behavior
        if (tagName === 'button') {
            const type = element.type || 'submit'; // Default button type is submit
            return type === 'submit';
        }
        
        // Check for elements with submit-like attributes or classes
        const submitIndicators = [
            'data-submit',
            'data-action="submit"',
            'onclick*submit',
            'class*submit'
        ];
        
        return submitIndicators.some(indicator => {
            if (indicator.includes('*')) {
                const [attr, value] = indicator.split('*');
                const attrValue = element.getAttribute(attr) || '';
                return attrValue.toLowerCase().includes(value);
            } else {
                return element.hasAttribute(indicator);
            }
        });
    }

    /**
     * Scan a form for sensitive data in all its inputs
     * @param {Element} form - Form element to scan
     * @returns {Array} Array of all detections found in the form
     */
    scanFormForSensitiveData(form) {
        console.log('LeakAI scanning form for sensitive data...');
        
        const allDetections = [];
        
        // Find all input elements in the form, but exclude hidden and readonly fields
        const inputs = form.querySelectorAll('input, textarea, [contenteditable="true"], [role="textbox"]');
        
        inputs.forEach(input => {
            try {
                // Skip hidden, readonly, or disabled inputs
                if (input.type === 'hidden' || 
                    input.readOnly || 
                    input.disabled ||
                    input.style.display === 'none' ||
                    input.style.visibility === 'hidden') {
                    console.log('LeakAI skipping hidden/readonly input:', input.name || input.type);
                    return;
                }
                
                console.log('LeakAI scanning input:', input.tagName, input.type, input.name);
                const text = this._getElementText(input);
                console.log('LeakAI extracted text:', text);
                if (!text || text.trim().length === 0) {
                    console.log('LeakAI skipping empty input');
                    return;
                }
                
                // Use the same detection logic as real-time scanning
                const detections = this.performFallbackDetection(input, text);
                
                // Add form context to detections
                detections.forEach(detection => {
                    detection.formElement = form;
                    detection.inputElement = input;
                    detection.inputName = input.name || input.id || input.placeholder || 'unnamed';
                });
                
                allDetections.push(...detections);
                
            } catch (error) {
                console.error('LeakAI error scanning form input:', error);
            }
        });
        
        console.log(`LeakAI form scan complete: found ${allDetections.length} detections`);
        return allDetections;
    }

    /**
     * Show form submission warning modal
     * @param {Element} form - Form element
     * @param {Array} detections - Detected sensitive data
     * @param {Event} originalEvent - Original form submission event
     */
    showFormSubmissionWarning(form, detections, originalEvent) {
        console.log('LeakAI showing form submission warning modal');
        
        // Create and show the warning modal
        const modal = this.createWarningModal(form, detections, originalEvent);
        document.body.appendChild(modal);
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });
        
        // Store the blocked submission for potential retry
        form._leakaiBlockedSubmission = {
            detections: detections,
            originalEvent: originalEvent,
            timestamp: Date.now(),
            modal: modal
        };
        
        console.log(`LeakAI modal shown with ${detections.length} detections`);
    }

    /**
     * Create warning modal DOM element
     * @param {Element} form - Form element
     * @param {Array} detections - Detected sensitive data
     * @param {Event} originalEvent - Original form submission event
     * @returns {Element} Modal element
     */
    createWarningModal(form, detections, originalEvent) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'leakai-warning-modal';
        modal.setAttribute('data-leakai-modal', 'true');
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'leakai-modal-content';
        
        // Modal header
        const header = this.createModalHeader(detections);
        modalContent.appendChild(header);
        
        // Detection list
        const detectionList = this.createDetectionList(detections);
        modalContent.appendChild(detectionList);
        
        // Modal actions
        const actions = this.createModalActions(form, detections, originalEvent, modal);
        modalContent.appendChild(actions);
        
        modal.appendChild(modalContent);
        
        // Add event listeners
        this.addModalEventListeners(modal, form, originalEvent);
        
        return modal;
    }

    /**
     * Create modal header
     * @param {Array} detections - Detected sensitive data
     * @returns {Element} Header element
     */
    createModalHeader(detections) {
        const header = document.createElement('div');
        header.className = 'leakai-modal-header';
        
        const highRiskCount = detections.filter(d => d.riskLevel === 'high').length;
        const mediumRiskCount = detections.filter(d => d.riskLevel === 'medium').length;
        const lowRiskCount = detections.filter(d => d.riskLevel === 'low').length;
        
        const icon = document.createElement('div');
        icon.className = 'leakai-modal-icon';
        icon.innerHTML = '⚠️';
        
        const title = document.createElement('h3');
        title.className = 'leakai-modal-title';
        title.textContent = 'Sensitive Data Detected';
        
        const subtitle = document.createElement('p');
        subtitle.className = 'leakai-modal-subtitle';
        subtitle.textContent = `Found ${detections.length} sensitive data item${detections.length !== 1 ? 's' : ''} in this form`;
        
        const riskSummary = document.createElement('div');
        riskSummary.className = 'leakai-risk-summary';
        
        if (highRiskCount > 0) {
            const highRiskBadge = document.createElement('span');
            highRiskBadge.className = 'leakai-risk-badge high';
            highRiskBadge.textContent = `${highRiskCount} High Risk`;
            riskSummary.appendChild(highRiskBadge);
        }
        
        if (mediumRiskCount > 0) {
            const mediumRiskBadge = document.createElement('span');
            mediumRiskBadge.className = 'leakai-risk-badge medium';
            mediumRiskBadge.textContent = `${mediumRiskCount} Medium Risk`;
            riskSummary.appendChild(mediumRiskBadge);
        }
        
        if (lowRiskCount > 0) {
            const lowRiskBadge = document.createElement('span');
            lowRiskBadge.className = 'leakai-risk-badge low';
            lowRiskBadge.textContent = `${lowRiskCount} Low Risk`;
            riskSummary.appendChild(lowRiskBadge);
        }
        
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(subtitle);
        header.appendChild(riskSummary);
        
        return header;
    }

    /**
     * Create detection list
     * @param {Array} detections - Detected sensitive data
     * @returns {Element} Detection list element
     */
    createDetectionList(detections) {
        const listContainer = document.createElement('div');
        listContainer.className = 'leakai-detection-list';
        
        const listTitle = document.createElement('h4');
        listTitle.textContent = 'Detected Items:';
        listContainer.appendChild(listTitle);
        
        const list = document.createElement('ul');
        list.className = 'leakai-detections';
        
        // Group detections by risk level
        const groupedDetections = {
            high: detections.filter(d => d.riskLevel === 'high'),
            medium: detections.filter(d => d.riskLevel === 'medium'),
            low: detections.filter(d => d.riskLevel === 'low')
        };
        
        // Add detections in risk order
        ['high', 'medium', 'low'].forEach(riskLevel => {
            groupedDetections[riskLevel].forEach(detection => {
                const listItem = this.createDetectionListItem(detection);
                list.appendChild(listItem);
            });
        });
        
        listContainer.appendChild(list);
        return listContainer;
    }

    /**
     * Create individual detection list item
     * @param {Object} detection - Detection result
     * @returns {Element} List item element
     */
    createDetectionListItem(detection) {
        const listItem = document.createElement('li');
        listItem.className = `leakai-detection-item risk-${detection.riskLevel}`;
        
        const typeIcon = document.createElement('span');
        typeIcon.className = 'leakai-detection-icon';
        typeIcon.textContent = this.getDetectionIcon(detection.type);
        
        const content = document.createElement('div');
        content.className = 'leakai-detection-content';
        
        const typeLabel = document.createElement('strong');
        typeLabel.textContent = this.getTypeDisplayName(detection.type);
        
        const detectedText = document.createElement('code');
        detectedText.className = 'leakai-detected-text';
        detectedText.textContent = this.truncateText(detection.text, 50);
        
        const fieldInfo = document.createElement('span');
        fieldInfo.className = 'leakai-field-info';
        fieldInfo.textContent = detection.inputName ? ` (in ${detection.inputName})` : '';
        
        const riskBadge = document.createElement('span');
        riskBadge.className = `leakai-risk-badge ${detection.riskLevel}`;
        riskBadge.textContent = detection.riskLevel.toUpperCase();
        
        content.appendChild(typeLabel);
        content.appendChild(document.createTextNode(': '));
        content.appendChild(detectedText);
        content.appendChild(fieldInfo);
        
        listItem.appendChild(typeIcon);
        listItem.appendChild(content);
        listItem.appendChild(riskBadge);
        
        return listItem;
    }

    /**
     * Create modal actions (buttons)
     * @param {Element} form - Form element
     * @param {Array} detections - Detected sensitive data
     * @param {Event} originalEvent - Original form submission event
     * @param {Element} modal - Modal element
     * @returns {Element} Actions element
     */
    createModalActions(form, detections, originalEvent, modal) {
        const actions = document.createElement('div');
        actions.className = 'leakai-modal-actions';
        
        const hasHighRisk = detections.some(d => d.riskLevel === 'high');
        
        // Cancel button (always available)
        const cancelButton = document.createElement('button');
        cancelButton.className = 'leakai-modal-button cancel';
        cancelButton.textContent = 'Cancel Submission';
        cancelButton.addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // Review button (go back to form)
        const reviewButton = document.createElement('button');
        reviewButton.className = 'leakai-modal-button review';
        reviewButton.textContent = 'Review & Fix';
        reviewButton.addEventListener('click', () => {
            this.closeModal(modal);
            this.highlightDetectedFields(detections);
        });
        
        // Proceed button (only for medium/low risk)
        if (!hasHighRisk) {
            const proceedButton = document.createElement('button');
            proceedButton.className = 'leakai-modal-button proceed';
            proceedButton.textContent = 'Proceed Anyway';
            proceedButton.addEventListener('click', () => {
                this.proceedWithSubmission(form, originalEvent, modal);
            });
            actions.appendChild(proceedButton);
        }
        
        actions.appendChild(reviewButton);
        actions.appendChild(cancelButton);
        
        // Add warning text for high-risk items
        if (hasHighRisk) {
            const warning = document.createElement('p');
            warning.className = 'leakai-high-risk-warning';
            warning.textContent = 'High-risk data detected. Please remove sensitive information before submitting.';
            actions.insertBefore(warning, actions.firstChild);
        }
        
        return actions;
    }

    /**
     * Add event listeners to modal
     * @param {Element} modal - Modal element
     * @param {Element} form - Form element
     * @param {Event} originalEvent - Original form submission event
     */
    addModalEventListeners(modal, form, originalEvent) {
        // Close on background click
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeModal(modal);
            }
        });
        
        // Close on Escape key
        const escapeHandler = (event) => {
            if (event.key === 'Escape') {
                this.closeModal(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Store escape handler for cleanup
        modal._escapeHandler = escapeHandler;
    }

    /**
     * Close the warning modal
     * @param {Element} modal - Modal element to close
     */
    closeModal(modal) {
        if (!modal || !modal.parentNode) {
            return;
        }
        
        console.log('LeakAI closing warning modal');
        
        // Track user activity to suppress test page alerts
        this.trackUserActivity();
        
        // Remove escape handler
        if (modal._escapeHandler) {
            document.removeEventListener('keydown', modal._escapeHandler);
        }
        
        // Hide with animation
        modal.classList.remove('visible');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    /**
     * Proceed with form submission
     * @param {Element} form - Form element
     * @param {Event} originalEvent - Original form submission event
     * @param {Element} modal - Modal element
     */
    proceedWithSubmission(form, originalEvent, modal) {
        console.log('LeakAI proceeding with form submission after user confirmation');
        
        // Track user activity
        this.trackUserActivity();
        
        // Close modal
        this.closeModal(modal);
        
        // Mark form as approved to bypass future interception
        form._leakaiApproved = true;
        
        // Re-submit the form
        setTimeout(() => {
            if (originalEvent && originalEvent.type === 'submit') {
                // Create new submit event
                const newSubmitEvent = new Event('submit', {
                    bubbles: true,
                    cancelable: true
                });
                form.dispatchEvent(newSubmitEvent);
            } else {
                // Fallback: call submit method
                form.submit();
            }
        }, 100);
    }

    /**
     * Highlight detected fields in the form
     * @param {Array} detections - Detected sensitive data
     */
    highlightDetectedFields(detections) {
        console.log('LeakAI highlighting detected fields');
        
        // Track user activity
        this.trackUserActivity();
        
        detections.forEach(detection => {
            if (detection.inputElement) {
                // Add highlight class
                detection.inputElement.classList.add('leakai-field-highlight');
                
                // Focus on first high-risk field
                if (detection.riskLevel === 'high') {
                    detection.inputElement.focus();
                    detection.inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                // Remove highlight after a few seconds
                setTimeout(() => {
                    detection.inputElement.classList.remove('leakai-field-highlight');
                }, 5000);
            }
        });
    }

    /**
     * Get icon for detection type
     * @param {string} type - Detection type
     * @returns {string} Icon character
     */
    getDetectionIcon(type) {
        const icons = {
            'email': '📧',
            'phone': '📞',
            'credit_card': '💳',
            'api_key': '🔑',
            'crypto_seed': '🌱',
            'crypto_private_key': '🔐',
            'crypto_address': '₿',
            'health_info': '🏥',
            'company_confidential': '🏢',
            'person_name': '👤',
            'location': '📍',
            'organization': '🏛️'
        };
        
        return icons[type] || '⚠️';
    }

    /**
     * Get display name for detection type
     * @param {string} type - Detection type
     * @returns {string} Display name
     */
    getTypeDisplayName(type) {
        const typeNames = {
            'email': 'Email Address',
            'phone': 'Phone Number',
            'credit_card': 'Credit Card',
            'api_key': 'API Key',
            'crypto_seed': 'Crypto Seed Phrase',
            'crypto_private_key': 'Private Key',
            'crypto_address': 'Crypto Address',
            'health_info': 'Health Information',
            'company_confidential': 'Company Confidential',
            'person_name': 'Person Name',
            'location': 'Location',
            'organization': 'Organization'
        };
        
        return typeNames[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Truncate text for display
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Perform fallback detection on text (extracted from existing method for reuse)
     * @param {Element} element - Input element
     * @param {string} text - Text to analyze
     * @returns {Array} Detection results
     */
    performFallbackDetection(element, text) {
        const detections = [];
        let match;
        
        // Simple email detection
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        while ((match = emailRegex.exec(text)) !== null) {
            detections.push({
                type: 'email',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.8,
                riskLevel: 'medium',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // Simple phone detection
        const phoneRegex = /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
        while ((match = phoneRegex.exec(text)) !== null) {
            detections.push({
                type: 'phone',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.7,
                riskLevel: 'medium',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // Simple credit card detection
        const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
        while ((match = ccRegex.exec(text)) !== null) {
            detections.push({
                type: 'credit_card',
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.9,
                riskLevel: 'high',
                context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                suggestions: ['mask', 'remove', 'replace', 'ignore_once']
            });
        }
        
        // More specific API key detection - look for common API key patterns
        const apiKeyPatterns = [
            // OpenAI API keys
            /\bsk-[A-Za-z0-9]{48}\b/g,
            // AWS Access Keys
            /\bAKIA[0-9A-Z]{16}\b/g,
            // Google API keys
            /\bAIza[0-9A-Za-z_-]{35}\b/g,
            // GitHub tokens
            /\bghp_[A-Za-z0-9]{36}\b/g,
            /\bgho_[A-Za-z0-9]{36}\b/g,
            /\bghu_[A-Za-z0-9]{36}\b/g,
            /\bghs_[A-Za-z0-9]{36}\b/g,
            /\bghr_[A-Za-z0-9]{36}\b/g,
            // Stripe keys
            /\bsk_live_[0-9a-zA-Z]{24}\b/g,
            /\bpk_live_[0-9a-zA-Z]{24}\b/g,
            // Generic high-entropy keys (but more restrictive)
            /\b[A-Za-z0-9]{32,64}\b/g
        ];

        apiKeyPatterns.forEach((regex, index) => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                // For the generic pattern (last one), check entropy and length
                if (index === apiKeyPatterns.length - 1) {
                    const entropy = this.calculateSimpleEntropy(match[0]);
                    const hasVariedChars = /[A-Z]/.test(match[0]) && /[a-z]/.test(match[0]) && /[0-9]/.test(match[0]);
                    
                    // Only flag if high entropy AND mixed case/numbers AND reasonable length
                    if (entropy < 4.0 || !hasVariedChars || match[0].length < 32) {
                        continue;
                    }
                }
                
                detections.push({
                    type: 'api_key',
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    confidence: index < apiKeyPatterns.length - 1 ? 0.9 : 0.7, // Higher confidence for specific patterns
                    riskLevel: 'high',
                    context: text.substring(Math.max(0, match.index - 20), Math.min(text.length, match.index + match[0].length + 20)),
                    suggestions: ['mask', 'remove', 'replace', 'ignore_once']
                });
            }
        });
        
        // Filter out ignored detections, low confidence detections, and false positives
        return detections.filter(detection => {
            // Skip ignored detections
            if (this.actionMenu.isDetectionIgnored(element, detection)) {
                return false;
            }
            
            // Skip low confidence detections
            if (detection.confidence < 0.6) {
                return false;
            }
            
            // Filter out common false positives for API keys
            if (detection.type === 'api_key') {
                const text = detection.text.toLowerCase();
                const context = detection.context.toLowerCase();
                
                // Skip WordPress nonces and similar tokens
                if (context.includes('nonce') || 
                    context.includes('csrf') || 
                    context.includes('token') ||
                    context.includes('turnstile') ||
                    context.includes('captcha') ||
                    context.includes('_wpcf7') ||
                    context.includes('wp_') ||
                    text.length > 64) { // Very long strings are likely not API keys
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Calculate simple entropy for string analysis
     * @param {string} str - String to analyze
     * @returns {number} Entropy value
     */
    calculateSimpleEntropy(str) {
        const freq = {};
        for (let char of str) {
            freq[char] = (freq[char] || 0) + 1;
        }
        
        let entropy = 0;
        const len = str.length;
        
        for (let char in freq) {
            const p = freq[char] / len;
            entropy -= p * Math.log2(p);
        }
        
        return entropy;
    }

    /**
     * Track user activity with LeakAI to suppress test page alerts
     */
    trackUserActivity() {
        try {
            sessionStorage.setItem('leakai-recent-activity', Date.now().toString());
        } catch (error) {
            // Ignore sessionStorage errors
            console.debug('LeakAI could not track user activity:', error);
        }
    }

    /**
     * Get statistics about the content script
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            monitoredElements: this.monitoredElements.size,
            activeDebounceTimers: this.debounceTimers.size,
            cachedDetections: this.lastDetections.size,
            isInitialized: this.isInitialized,
            uiRenderer: this.uiRenderer.getStats()
        };
    }
}

// Initialize content script when DOM is ready
let contentScript = null;

function initializeContentScript() {
    if (contentScript) {
        return;
    }
    
    // Add a small delay to ensure all scripts are loaded
    setTimeout(() => {
        console.log('LeakAI initializing ContentScript...');
        contentScript = new ContentScript();
        
        // Make content script available globally for debugging
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.contentScript = contentScript;
        window.LeakAI.actionMenu = contentScript.actionMenu;
        
        // Initialize TextOverlayManager and TextMeasurementEngine for precise text underlining
        try {
            if (typeof TextMeasurementEngine !== 'undefined' && typeof TextOverlayManager !== 'undefined') {
                window.LeakAI.textMeasurementEngine = new TextMeasurementEngine();
                window.LeakAI.textOverlayManager = new TextOverlayManager(window.LeakAI.textMeasurementEngine);
                window.LeakAILogger.log('LeakAI TextOverlayManager and TextMeasurementEngine initialized');
            } else {
                window.LeakAILogger.log('LeakAI TextOverlayManager or TextMeasurementEngine not available, using fallback styling');
            }
        } catch (error) {
            console.error('LeakAI failed to initialize TextOverlayManager:', error);
        }
        
        contentScript.initialize().then(() => {
            // Initialize TextOverlayManager integration if available
            if (contentScript.uiRenderer) {
                contentScript.uiRenderer.initializeTextOverlayIntegration();
            }
            
            console.log('LeakAI ContentScript ready');
        }).catch(error => {
            console.error('LeakAI ContentScript initialization failed:', error);
        });
    }, 100); // 100ms delay
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    // DOM is already ready
    initializeContentScript();
}