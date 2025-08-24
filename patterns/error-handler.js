// LeakAI Error Handler
// Comprehensive error handling system with graceful degradation

(function() {
    'use strict';

    /**
     * ErrorHandler class - Provides comprehensive error handling and recovery
     */
    class ErrorHandler {
        constructor() {
            this.errorCounts = new Map(); // Track error frequencies
            this.disabledComponents = new Set(); // Track disabled components
            this.errorThresholds = {
                detector: 5, // Max errors before disabling a detector
                ui: 3, // Max UI errors before fallback
                storage: 2 // Max storage errors before fallback
            };
            this.recoveryAttempts = new Map(); // Track recovery attempts
            this.maxRecoveryAttempts = 3;
            this.errorLog = []; // Keep recent error history
            this.maxErrorLogSize = 100;
            
            // Bind methods to preserve context
            this.handleDetectionError = this.handleDetectionError.bind(this);
            this.handleUIError = this.handleUIError.bind(this);
            this.handleStorageError = this.handleStorageError.bind(this);
            this.handleNetworkError = this.handleNetworkError.bind(this);
            
            this.log('ErrorHandler initialized');
        }

        /**
         * Handle detection engine errors with graceful degradation
         * @param {Error} error - The error that occurred
         * @param {string} detectorName - Name of the detector that failed
         * @param {string} text - Text being processed when error occurred
         * @param {Object} context - Additional context information
         * @returns {Array} Empty array or fallback detection results
         */
        handleDetectionError(error, detectorName, text = '', context = {}) {
            const errorKey = `detector_${detectorName}`;
            this.logError(error, 'DETECTION', { detectorName, textLength: text.length, ...context });
            
            // Increment error count
            const errorCount = this.incrementErrorCount(errorKey);
            
            // Check if we should disable this detector
            if (errorCount >= this.errorThresholds.detector) {
                this.disableComponent(detectorName, 'detector');
                this.warn(`Detector ${detectorName} disabled after ${errorCount} errors`);
                return [];
            }
            
            // Try recovery if not too many attempts
            const recoveryKey = `${errorKey}_recovery`;
            const recoveryCount = this.recoveryAttempts.get(recoveryKey) || 0;
            
            if (recoveryCount < this.maxRecoveryAttempts) {
                this.recoveryAttempts.set(recoveryKey, recoveryCount + 1);
                this.log(`Attempting recovery for ${detectorName} (attempt ${recoveryCount + 1})`);
                
                // Try to recover by reinitializing the detector
                try {
                    if (this.tryDetectorRecovery(detectorName)) {
                        this.log(`Successfully recovered ${detectorName}`);
                        // Reset error count on successful recovery
                        this.errorCounts.set(errorKey, 0);
                        return [];
                    }
                } catch (recoveryError) {
                    this.error(`Recovery failed for ${detectorName}:`, recoveryError);
                }
            }
            
            // Return empty results to continue with other detectors
            return [];
        }

        /**
         * Handle UI rendering errors with fallback behaviors
         * @param {Error} error - The error that occurred
         * @param {Element} element - DOM element involved in the error
         * @param {string} operation - UI operation that failed
         * @param {Object} context - Additional context information
         * @returns {boolean} True if error was handled successfully
         */
        handleUIError(error, element, operation = 'unknown', context = {}) {
            const errorKey = `ui_${operation}`;
            this.logError(error, 'UI', { 
                operation, 
                elementTag: element?.tagName, 
                elementId: element?.id,
                ...context 
            });
            
            const errorCount = this.incrementErrorCount(errorKey);
            
            // Remove problematic UI elements to prevent cascading failures
            try {
                this.cleanupProblematicUIElements(element, operation);
            } catch (cleanupError) {
                this.error('UI cleanup failed:', cleanupError);
            }
            
            // Check if we should disable UI features
            if (errorCount >= this.errorThresholds.ui) {
                this.disableComponent(operation, 'ui');
                this.warn(`UI operation ${operation} disabled after ${errorCount} errors`);
                
                // Enable fallback UI mode
                this.enableFallbackUI();
                return false;
            }
            
            // Try to recover the UI operation
            try {
                return this.tryUIRecovery(element, operation, context);
            } catch (recoveryError) {
                this.error(`UI recovery failed for ${operation}:`, recoveryError);
                return false;
            }
        }

        /**
         * Handle storage errors with fallback mechanisms
         * @param {Error} error - The error that occurred
         * @param {string} operation - Storage operation that failed
         * @param {*} data - Data involved in the operation
         * @param {Object} context - Additional context information
         * @returns {*} Fallback result or null
         */
        handleStorageError(error, operation, data = null, context = {}) {
            const errorKey = `storage_${operation}`;
            this.logError(error, 'STORAGE', { operation, dataType: typeof data, ...context });
            
            const errorCount = this.incrementErrorCount(errorKey);
            
            // Try fallback storage mechanisms
            if (errorCount >= this.errorThresholds.storage) {
                this.warn(`Storage operation ${operation} using fallback after ${errorCount} errors`);
                return this.tryStorageFallback(operation, data, context);
            }
            
            // Try to recover storage operation
            try {
                return this.tryStorageRecovery(operation, data, context);
            } catch (recoveryError) {
                this.error(`Storage recovery failed for ${operation}:`, recoveryError);
                return this.tryStorageFallback(operation, data, context);
            }
        }

        /**
         * Handle network/communication errors
         * @param {Error} error - The error that occurred
         * @param {string} operation - Network operation that failed
         * @param {Object} context - Additional context information
         * @returns {*} Fallback result or null
         */
        handleNetworkError(error, operation, context = {}) {
            const errorKey = `network_${operation}`;
            this.logError(error, 'NETWORK', { operation, ...context });
            
            // Network errors are often temporary, so we're more lenient
            const errorCount = this.incrementErrorCount(errorKey);
            
            if (errorCount >= 10) { // Higher threshold for network errors
                this.warn(`Network operation ${operation} disabled after ${errorCount} errors`);
                this.disableComponent(operation, 'network');
                return null;
            }
            
            // Implement exponential backoff for network operations
            const backoffDelay = Math.min(1000 * Math.pow(2, errorCount), 30000); // Max 30 seconds
            this.log(`Network operation ${operation} will retry after ${backoffDelay}ms`);
            
            return { retry: true, delay: backoffDelay };
        }

        /**
         * Try to recover a failed detector
         * @param {string} detectorName - Name of the detector to recover
         * @returns {boolean} True if recovery was successful
         */
        tryDetectorRecovery(detectorName) {
            try {
                // Attempt to reinitialize the detector
                if (typeof window !== 'undefined' && window.LeakAI && window.LeakAI.detectionEngine) {
                    const engine = window.LeakAI.detectionEngine;
                    
                    // Try to recreate the detector instance
                    const detectorClass = this.getDetectorClass(detectorName);
                    if (detectorClass) {
                        const newDetector = new detectorClass();
                        engine.detectors.set(detectorName, newDetector);
                        this.log(`Successfully recreated ${detectorName} detector`);
                        return true;
                    }
                }
                return false;
            } catch (error) {
                this.error(`Detector recovery failed for ${detectorName}:`, error);
                return false;
            }
        }

        /**
         * Try to recover a failed UI operation
         * @param {Element} element - DOM element involved
         * @param {string} operation - UI operation that failed
         * @param {Object} context - Additional context
         * @returns {boolean} True if recovery was successful
         */
        tryUIRecovery(element, operation, context) {
            try {
                switch (operation) {
                    case 'underline':
                        return this.recoverUnderlineOperation(element, context);
                    case 'tooltip':
                        return this.recoverTooltipOperation(element, context);
                    case 'modal':
                        return this.recoverModalOperation(element, context);
                    default:
                        this.log(`No specific recovery for UI operation: ${operation}`);
                        return false;
                }
            } catch (error) {
                this.error(`UI recovery attempt failed:`, error);
                return false;
            }
        }

        /**
         * Try storage fallback mechanisms
         * @param {string} operation - Storage operation
         * @param {*} data - Data involved
         * @param {Object} context - Additional context
         * @returns {*} Fallback result
         */
        tryStorageFallback(operation, data, context) {
            try {
                switch (operation) {
                    case 'save':
                        return this.fallbackSave(data, context);
                    case 'load':
                        return this.fallbackLoad(context);
                    case 'clear':
                        return this.fallbackClear(context);
                    default:
                        this.warn(`No fallback available for storage operation: ${operation}`);
                        return null;
                }
            } catch (error) {
                this.error(`Storage fallback failed:`, error);
                return null;
            }
        }

        /**
         * Try storage recovery mechanisms
         * @param {string} operation - Storage operation
         * @param {*} data - Data involved
         * @param {Object} context - Additional context
         * @returns {*} Recovery result
         */
        tryStorageRecovery(operation, data, context) {
            // Implement retry logic with exponential backoff
            const retryDelay = 100 * Math.pow(2, this.getErrorCount(`storage_${operation}`));
            
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        // Retry the original operation
                        const result = await this.retryStorageOperation(operation, data, context);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, Math.min(retryDelay, 5000)); // Max 5 second delay
            });
        }

        /**
         * Clean up problematic UI elements
         * @param {Element} element - Element that caused the error
         * @param {string} operation - Operation that failed
         */
        cleanupProblematicUIElements(element, operation) {
            if (!element) return;
            
            try {
                // Remove LeakAI-specific classes and attributes
                const leakaiClasses = Array.from(element.classList).filter(cls => cls.startsWith('leakai-'));
                leakaiClasses.forEach(cls => element.classList.remove(cls));
                
                // Remove LeakAI-specific attributes
                const leakaiAttrs = Array.from(element.attributes)
                    .filter(attr => attr.name.startsWith('data-leakai-'))
                    .map(attr => attr.name);
                leakaiAttrs.forEach(attr => element.removeAttribute(attr));
                
                // Remove event listeners if they exist
                if (element._leakaiHandlers) {
                    Object.entries(element._leakaiHandlers).forEach(([event, handler]) => {
                        element.removeEventListener(event.replace('on', ''), handler);
                    });
                    delete element._leakaiHandlers;
                }
                
                this.log(`Cleaned up problematic UI elements for ${operation}`);
            } catch (cleanupError) {
                this.error('UI cleanup failed:', cleanupError);
            }
        }

        /**
         * Enable fallback UI mode with minimal functionality
         */
        enableFallbackUI() {
            try {
                // Disable complex UI features and enable simple alternatives
                if (typeof window !== 'undefined' && window.LeakAI && window.LeakAI.uiRenderer) {
                    window.LeakAI.uiRenderer.fallbackMode = true;
                    this.log('Enabled fallback UI mode');
                }
                
                // Add fallback CSS for basic visual indicators
                this.injectFallbackCSS();
            } catch (error) {
                this.error('Failed to enable fallback UI:', error);
            }
        }

        /**
         * Inject minimal fallback CSS
         */
        injectFallbackCSS() {
            try {
                if (typeof document === 'undefined') return;
                
                const existingStyle = document.getElementById('leakai-fallback-css');
                if (existingStyle) return;
                
                const style = document.createElement('style');
                style.id = 'leakai-fallback-css';
                style.textContent = `
                    .leakai-fallback-indicator {
                        border: 2px solid #ff6b6b !important;
                        background-color: rgba(255, 107, 107, 0.1) !important;
                    }
                    .leakai-fallback-tooltip {
                        position: absolute;
                        background: #333;
                        color: white;
                        padding: 5px;
                        border-radius: 3px;
                        font-size: 12px;
                        z-index: 10000;
                    }
                `;
                document.head.appendChild(style);
                this.log('Injected fallback CSS');
            } catch (error) {
                this.error('Failed to inject fallback CSS:', error);
            }
        }

        /**
         * Get detector class by name
         * @param {string} detectorName - Name of the detector
         * @returns {Function|null} Detector class constructor
         */
        getDetectorClass(detectorName) {
            if (typeof window === 'undefined' || !window.LeakAI) return null;
            
            const detectorMap = {
                'email': window.LeakAI.EmailDetector,
                'phone': window.LeakAI.PhoneDetector,
                'creditCard': window.LeakAI.CreditCardDetector,
                'apiKey': window.LeakAI.ApiKeyDetector,
                'crypto': window.LeakAI.CryptoDetector,
                'health': window.LeakAI.HealthDetector,
                'companyConfidential': window.LeakAI.CompanyConfidentialDetector,
                'ner': window.LeakAI.NERDetector
            };
            
            return detectorMap[detectorName] || null;
        }

        /**
         * Recover underline operation
         * @param {Element} element - Target element
         * @param {Object} context - Context information
         * @returns {boolean} Success status
         */
        recoverUnderlineOperation(element, context) {
            try {
                // Use simple border-based fallback
                element.style.borderBottom = '2px solid #ff6b6b';
                element.title = 'Sensitive data detected (fallback mode)';
                return true;
            } catch (error) {
                this.error('Underline recovery failed:', error);
                return false;
            }
        }

        /**
         * Recover tooltip operation
         * @param {Element} element - Target element
         * @param {Object} context - Context information
         * @returns {boolean} Success status
         */
        recoverTooltipOperation(element, context) {
            try {
                // Use simple title attribute as fallback
                element.title = context.tooltipText || 'Sensitive data detected';
                return true;
            } catch (error) {
                this.error('Tooltip recovery failed:', error);
                return false;
            }
        }

        /**
         * Recover modal operation
         * @param {Element} element - Target element
         * @param {Object} context - Context information
         * @returns {boolean} Success status
         */
        recoverModalOperation(element, context) {
            try {
                // Use simple alert as fallback
                const message = context.modalMessage || 'Sensitive data detected. Please review before submitting.';
                setTimeout(() => alert(message), 100);
                return true;
            } catch (error) {
                this.error('Modal recovery failed:', error);
                return false;
            }
        }

        /**
         * Fallback save operation using localStorage
         * @param {*} data - Data to save
         * @param {Object} context - Context information
         * @returns {boolean} Success status
         */
        fallbackSave(data, context) {
            try {
                if (typeof localStorage === 'undefined') return false;
                
                const key = context.key || 'leakai_fallback_data';
                localStorage.setItem(key, JSON.stringify(data));
                this.log('Used localStorage fallback for save operation');
                return true;
            } catch (error) {
                this.error('Fallback save failed:', error);
                return false;
            }
        }

        /**
         * Fallback load operation using localStorage
         * @param {Object} context - Context information
         * @returns {*} Loaded data or null
         */
        fallbackLoad(context) {
            try {
                if (typeof localStorage === 'undefined') return null;
                
                const key = context.key || 'leakai_fallback_data';
                const data = localStorage.getItem(key);
                if (data) {
                    this.log('Used localStorage fallback for load operation');
                    return JSON.parse(data);
                }
                return null;
            } catch (error) {
                this.error('Fallback load failed:', error);
                return null;
            }
        }

        /**
         * Fallback clear operation using localStorage
         * @param {Object} context - Context information
         * @returns {boolean} Success status
         */
        fallbackClear(context) {
            try {
                if (typeof localStorage === 'undefined') return false;
                
                const key = context.key || 'leakai_fallback_data';
                localStorage.removeItem(key);
                this.log('Used localStorage fallback for clear operation');
                return true;
            } catch (error) {
                this.error('Fallback clear failed:', error);
                return false;
            }
        }

        /**
         * Retry storage operation
         * @param {string} operation - Operation to retry
         * @param {*} data - Data involved
         * @param {Object} context - Context information
         * @returns {Promise<*>} Operation result
         */
        async retryStorageOperation(operation, data, context) {
            // This would implement the actual retry logic for Chrome storage
            // For now, we'll simulate it
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        // Simulate retry success
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                }, 100);
            });
        }

        /**
         * Log an error with context information
         * @param {Error} error - The error to log
         * @param {string} category - Error category
         * @param {Object} context - Additional context
         */
        logError(error, category, context = {}) {
            const errorEntry = {
                timestamp: Date.now(),
                category,
                message: error.message,
                stack: error.stack,
                context,
                id: this.generateErrorId()
            };
            
            // Add to error log
            this.errorLog.push(errorEntry);
            
            // Trim error log if too large
            if (this.errorLog.length > this.maxErrorLogSize) {
                this.errorLog.shift();
            }
            
            // Log to console
            console.error(`LeakAI ${category} Error [${errorEntry.id}]:`, error.message, context);
            
            // Send to background script for centralized logging if available
            this.reportErrorToBackground(errorEntry);
        }

        /**
         * Generate unique error ID
         * @returns {string} Unique error identifier
         */
        generateErrorId() {
            return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        /**
         * Report error to background script
         * @param {Object} errorEntry - Error entry to report
         */
        reportErrorToBackground(errorEntry) {
            try {
                if (typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                        type: 'ERROR_REPORT',
                        data: errorEntry
                    }).catch(err => {
                        // Ignore if background script is not available
                    });
                }
            } catch (error) {
                // Ignore errors in error reporting to prevent infinite loops
            }
        }

        /**
         * Increment error count for a component
         * @param {string} errorKey - Error key to increment
         * @returns {number} New error count
         */
        incrementErrorCount(errorKey) {
            const currentCount = this.errorCounts.get(errorKey) || 0;
            const newCount = currentCount + 1;
            this.errorCounts.set(errorKey, newCount);
            return newCount;
        }

        /**
         * Get error count for a component
         * @param {string} errorKey - Error key to check
         * @returns {number} Current error count
         */
        getErrorCount(errorKey) {
            return this.errorCounts.get(errorKey) || 0;
        }

        /**
         * Disable a component due to repeated errors
         * @param {string} componentName - Name of the component
         * @param {string} componentType - Type of the component
         */
        disableComponent(componentName, componentType) {
            const componentKey = `${componentType}_${componentName}`;
            this.disabledComponents.add(componentKey);
            this.warn(`Component ${componentName} (${componentType}) has been disabled due to repeated errors`);
        }

        /**
         * Check if a component is disabled
         * @param {string} componentName - Name of the component
         * @param {string} componentType - Type of the component
         * @returns {boolean} True if component is disabled
         */
        isComponentDisabled(componentName, componentType) {
            const componentKey = `${componentType}_${componentName}`;
            return this.disabledComponents.has(componentKey);
        }

        /**
         * Re-enable a disabled component
         * @param {string} componentName - Name of the component
         * @param {string} componentType - Type of the component
         */
        enableComponent(componentName, componentType) {
            const componentKey = `${componentType}_${componentName}`;
            this.disabledComponents.delete(componentKey);
            
            // Reset error counts
            const errorKey = `${componentType}_${componentName}`;
            this.errorCounts.set(errorKey, 0);
            
            this.log(`Component ${componentName} (${componentType}) has been re-enabled`);
        }

        /**
         * Get error statistics
         * @returns {Object} Error statistics
         */
        getErrorStats() {
            return {
                totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
                errorsByComponent: Object.fromEntries(this.errorCounts),
                disabledComponents: Array.from(this.disabledComponents),
                recentErrors: this.errorLog.slice(-10), // Last 10 errors
                errorLogSize: this.errorLog.length
            };
        }

        /**
         * Clear error history and re-enable components
         */
        resetErrorState() {
            this.errorCounts.clear();
            this.disabledComponents.clear();
            this.recoveryAttempts.clear();
            this.errorLog = [];
            this.log('Error state has been reset');
        }

        /**
         * Logging methods that respect extension state
         */
        log(message, ...args) {
            if (typeof window !== 'undefined' && window.LeakAILogger) {
                window.LeakAILogger.log(`[ErrorHandler] ${message}`, ...args);
            } else {
                console.log(`[ErrorHandler] ${message}`, ...args);
            }
        }

        warn(message, ...args) {
            if (typeof window !== 'undefined' && window.LeakAILogger) {
                window.LeakAILogger.warn(`[ErrorHandler] ${message}`, ...args);
            } else {
                console.warn(`[ErrorHandler] ${message}`, ...args);
            }
        }

        error(message, ...args) {
            // Always log errors regardless of extension state
            console.error(`[ErrorHandler] ${message}`, ...args);
        }
    }

    // Export for both Node.js and browser environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ErrorHandler;
    } else if (typeof window !== 'undefined') {
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.ErrorHandler = ErrorHandler;
        
        // Create global error handler instance
        window.LeakAI.errorHandler = new ErrorHandler();
        
        // Set up global error handlers
        window.addEventListener('error', (event) => {
            window.LeakAI.errorHandler.logError(event.error || new Error(event.message), 'GLOBAL', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            window.LeakAI.errorHandler.logError(event.reason, 'PROMISE', {
                type: 'unhandledrejection'
            });
        });
        
        console.log('LeakAI ErrorHandler loaded and global error handlers set up');
    }
})();