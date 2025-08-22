// LeakAI Content Script
// This script will be injected into all web pages to monitor text inputs

console.log('LeakAI content script loaded');

/**
 * TooltipManager class - Manages tooltip display for detected sensitive data
 * Handles tooltip creation, positioning, and content generation
 */
class TooltipManager {
    constructor() {
        this.currentTooltip = null;
        this.showDelay = 300; // 300ms delay before showing tooltip (reduced)
        this.hideDelay = 500; // 500ms delay before hiding tooltip (increased)
        this.showTimer = null;
        this.hideTimer = null;
        
        console.log('LeakAI TooltipManager initialized');
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
     * Create and show tooltip
     * @param {Element} targetElement - Target element
     * @param {Object} detection - Detection result
     * @param {Object} position - Position coordinates
     */
    _createAndShowTooltip(targetElement, detection, position) {
        // Remove existing tooltip
        this._removeTooltip();

        // Create tooltip element
        const tooltip = this._createTooltipElement(detection, targetElement);
        
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
        
        console.log('LeakAI tooltip shown for:', detection.type);
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
     * Position tooltip relative to target element
     * @param {Element} tooltip - Tooltip element
     * @param {Element} targetElement - Target element
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
        
        // Apply position
        tooltip.style.left = `${x + scrollX}px`;
        tooltip.style.top = `${y + scrollY}px`;
    }

    /**
     * Add event listeners to tooltip
     * @param {Element} tooltip - Tooltip element
     * @param {Object} detection - Detection result
     * @param {Element} targetElement - Target element
     */
    _addTooltipEventListeners(tooltip, detection, targetElement = null) {
        // Handle action button clicks
        const actionButtons = tooltip.querySelectorAll('.leakai-tooltip-action');
        actionButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const action = button.getAttribute('data-action');
                console.log(`LeakAI tooltip action clicked: ${action} for ${detection.type}`);
                
                // Handle undo action specially
                if (action === 'undo' && targetElement && window.LeakAI && window.LeakAI.actionMenu) {
                    window.LeakAI.actionMenu.undoLastAction(targetElement);
                } else if (window.LeakAI && window.LeakAI.actionMenu) {
                    // Execute the action through the action menu system
                    window.LeakAI.actionMenu.executeAction(action, detection, tooltip);
                }
                
                // Hide the tooltip after action
                this.hideTooltip(true);
            });
        });

        // Keep tooltip visible when hovering over it
        tooltip.addEventListener('mouseenter', () => {
            this._clearTimers();
        });

        tooltip.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    /**
     * Remove current tooltip
     */
    _removeTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
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
}

/**
 * UIRenderer class - Handles visual indicators for detected sensitive data
 * Applies category-specific underlines and manages visual feedback
 */
class UIRenderer {
    constructor() {
        this.renderedElements = new Map(); // Track elements with rendered detections
        this.detectionSpans = new Map(); // Track detection span elements
        this.tooltipManager = new TooltipManager();
        
        console.log('LeakAI UIRenderer initialized');
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

            console.log(`LeakAI rendering ${detections.length} detections for ${element.tagName}`);

            // Use non-intrusive visual indicators that don't modify the actual input
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
        
        console.log(`LeakAI applied ${highestRisk} risk styling with ${primaryCategory} category to ${element.tagName}`);
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
        
        console.log(`LeakAI cleared styling from ${element.tagName}`);
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
        // Store reference to bound functions for later removal
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
     * Get statistics about rendered detections
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            renderedElements: this.renderedElements.size,
            totalDetectionSpans: Array.from(this.detectionSpans.values()).reduce((sum, spans) => sum + spans.length, 0),
            tooltipVisible: this.tooltipManager.isVisible()
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
        
        console.log('LeakAI ActionMenu initialized');
    }

    /**
     * Execute a remediation action
     * @param {string} action - Action to execute (mask, remove, replace, encrypt, ignore_once)
     * @param {Object} detection - Detection result object
     * @param {Element} tooltipElement - Tooltip element that triggered the action
     */
    executeAction(action, detection, tooltipElement) {
        console.log(`LeakAI executing action: ${action} for detection:`, detection);

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
        
        console.log(`LeakAI masked "${detection.text}" → "${maskedText}"`);
    }

    /**
     * Execute remove action - delete the sensitive data
     * @param {Element} inputElement - Input element
     * @param {Object} detection - Detection result
     */
    _executeRemoveAction(inputElement, detection) {
        // Use precise text replacement to maintain cursor position
        this._replaceTextRange(inputElement, detection.startIndex, detection.endIndex, '');
        
        console.log(`LeakAI removed "${detection.text}"`);
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
            
            console.log(`LeakAI replaced "${detection.text}" with "${replacement}"`);
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
        
        console.log(`LeakAI encrypted "${detection.text}" → "${token}"`);
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
        
        console.log(`LeakAI ignoring detection: "${detection.text}"`);
        
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
        // Look for elements with detection data that matches
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
        
        console.log(`LeakAI action feedback shown for: ${action}`);
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
            console.log('LeakAI no actions to undo');
            return false;
        }

        const lastAction = undoHistory.pop();
        
        // Restore the previous text
        this._setElementText(element, lastAction.previousText);
        
        // Show undo feedback
        this._showUndoFeedback(element, lastAction.action);
        
        console.log(`LeakAI undid ${lastAction.action} action`);
        
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
        
        console.log(`LeakAI undo feedback shown for: ${originalAction}`);
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
        
        console.log('LeakAI ContentScript initialized');
    }

    /**
     * Initialize the content script
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Wait for detection engine to be available
            await this._waitForDetectionEngine();
            
            // Initialize detection engine
            if (this.detectionEngine) {
                await this.detectionEngine.initialize();
            }

            // Set up event listeners
            this._setupEventListeners();
            
            // Monitor existing elements
            this._scanExistingElements();
            
            this.isInitialized = true;
            console.log('LeakAI ContentScript initialization complete');
        } catch (error) {
            console.error('LeakAI ContentScript initialization failed:', error);
        }
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
                console.log(`LeakAI checking for DetectionEngine (attempt ${attempts})`);
                console.log('Current window.LeakAI:', window.LeakAI);
                
                if (window.LeakAI && window.LeakAI.DetectionEngine) {
                    console.log('LeakAI DetectionEngine found, creating instance');
                    this.detectionEngine = new window.LeakAI.DetectionEngine();
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('LeakAI DetectionEngine not found after maximum attempts');
                    console.log('Available window.LeakAI:', window.LeakAI);
                    console.log('Available window.LeakAI keys:', window.LeakAI ? Object.keys(window.LeakAI) : 'none');
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

        console.log('LeakAI event listeners set up');
    }

    /**
     * Scan existing elements on page load
     */
    _scanExistingElements() {
        const elements = this._getAllTextInputElements();
        elements.forEach(element => {
            this._addElementToMonitoring(element);
        });
        
        console.log(`LeakAI monitoring ${elements.length} existing text input elements`);
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
        
        console.log('LeakAI added element to monitoring:', element.tagName, element.type || 'contenteditable');
    }

    /**
     * Handle input events
     * @param {Event} event - Input event
     */
    _handleInputEvent(event) {
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
            console.log('LeakAI input cleared for element:', element.tagName);
            return;
        }

        // Skip detection for very short text (less than 3 characters)
        if (text.length < 3) {
            console.log('LeakAI skipping detection for very short text:', text);
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
        const element = event.target;
        
        if (!this._isTextInputElement(element)) {
            return;
        }

        console.log('LeakAI paste event detected on:', element.tagName);
        
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

        console.log('LeakAI focus in on text input:', element.tagName);
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

        console.log('LeakAI focus out from text input:', element.tagName);
        
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
                    console.log('LeakAI undo triggered via keyboard shortcut');
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
            console.log('LeakAI detected new text input elements via DOM changes');
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
        if (!this.detectionEngine) {
            console.warn('LeakAI detection engine not available, using fallback detection');
            this._performFallbackDetection(element, text);
            return;
        }

        try {
            console.log(`LeakAI performing detection on ${text.length} characters from ${element.tagName}`);
            
            const detections = await this.detectionEngine.detectSensitiveData(text);
            
            // Store detections for this element
            this.lastDetections.set(element, detections);
            
            // Filter out ignored detections and low confidence detections
            const filteredDetections = detections.filter(detection => 
                !this.actionMenu.isDetectionIgnored(element, detection) &&
                detection.confidence >= 0.6 // Minimum 60% confidence threshold
            );
            
            if (filteredDetections.length > 0) {
                console.log(`LeakAI detected ${filteredDetections.length} sensitive data items (${detections.length - filteredDetections.length} ignored):`, filteredDetections.map(d => ({
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
                console.log('LeakAI no sensitive data detected (or all ignored)');
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
            console.log(`${index + 1}. ${detection.type.toUpperCase()}: "${detection.text}"`);
            console.log(`   Risk: ${detection.riskLevel.toUpperCase()}, Confidence: ${(detection.confidence * 100).toFixed(1)}%`);
            console.log(`   Position: ${detection.startIndex}-${detection.endIndex}`);
            console.log(`   Context: "${detection.context}"`);
            console.log(`   Actions: ${detection.suggestions.join(', ')}`);
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
        console.log('LeakAI performing fallback detection');
        
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
            console.log(`LeakAI fallback detected ${filteredDetections.length} sensitive data items:`, filteredDetections);
            
            // Render visual indicators
            this.uiRenderer.renderDetections(element, filteredDetections);
            
            // Log detection results for debugging
            this._logDetectionResults(element, filteredDetections);
        } else {
            console.log('LeakAI fallback: no sensitive data detected');
            // Clear any existing visual indicators
            this.uiRenderer.clearDetections(element);
        }
        
        // Store detections for this element
        this.lastDetections.set(element, detections);
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
        
        contentScript.initialize().then(() => {
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