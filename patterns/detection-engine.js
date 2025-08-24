// LeakAI Detection Engine
// Core detection orchestrator that coordinates all pattern matchers

(function() {
    'use strict';
    
    // Import data models (will work in both browser and Node.js)
    let DetectionType, RiskLevel, Action, createDetectionResult;

    if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment
        const dataModels = require('./data-models.js');
        DetectionType = dataModels.DetectionType;
        RiskLevel = dataModels.RiskLevel;
        Action = dataModels.Action;
        createDetectionResult = dataModels.createDetectionResult;
    } else {
        // Browser environment - get from global LeakAI namespace
        if (window.LeakAI) {
            DetectionType = window.LeakAI.DetectionType;
            RiskLevel = window.LeakAI.RiskLevel;
            Action = window.LeakAI.Action;
            createDetectionResult = window.LeakAI.createDetectionResult;
        }
    }

/**
 * Core detection engine that orchestrates all pattern matching and analysis
 */
class DetectionEngine {
    constructor() {
        this.detectors = new Map(); // Will hold pattern matcher instances
        this.cache = new Map(); // Cache for detection results
        this.cacheMaxSize = 1000; // Maximum cache entries
        this.cacheTTL = 300000; // Cache TTL: 5 minutes
        this.nerDetector = null; // Optional NER detector
        this.initialized = false;

        // Note: Initialization message will be logged when extension state is available
    }

    /**
     * Initialize the detection engine (async for NER model loading)
     * @param {Object} options - Initialization options
     * @param {boolean} options.enableNER - Whether to enable NER model
     * @param {boolean} options.autoLoadNER - Whether to auto-load NER model
     */
    async initialize(options = {}) {
        if (this.initialized) {
            return;
        }

        // Initialize pattern detectors
        this._initializeDetectors();

        // Initialize NER detector if available and enabled
        if (options.enableNER !== false) {
            await this._initializeNERDetector(options);
        }

        this.initialized = true;
        if (window.LeakAILogger) {
            window.LeakAILogger.log('DetectionEngine initialization complete');
        }
    }

    /**
     * Initialize all pattern detectors
     */
    _initializeDetectors() {
        // Clear existing detectors
        this.detectors.clear();

        // Initialize detectors if available in browser environment
        if (typeof window !== 'undefined' && window.LeakAI) {
            if (window.LeakAI.EmailDetector) {
                this.detectors.set('email', new window.LeakAI.EmailDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI EmailDetector initialized');
            }
            
            if (window.LeakAI.PhoneDetector) {
                this.detectors.set('phone', new window.LeakAI.PhoneDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI PhoneDetector initialized');
            }
            
            if (window.LeakAI.CreditCardDetector) {
                this.detectors.set('creditCard', new window.LeakAI.CreditCardDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI CreditCardDetector initialized');
            }
            
            if (window.LeakAI.ApiKeyDetector) {
                this.detectors.set('apiKey', new window.LeakAI.ApiKeyDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI ApiKeyDetector initialized');
            }
            
            if (window.LeakAI.CryptoDetector) {
                this.detectors.set('crypto', new window.LeakAI.CryptoDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI CryptoDetector initialized');
            }
            
            if (window.LeakAI.HealthDetector) {
                this.detectors.set('health', new window.LeakAI.HealthDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI HealthDetector initialized');
            }
            
            if (window.LeakAI.CompanyConfidentialDetector) {
                this.detectors.set('companyConfidential', new window.LeakAI.CompanyConfidentialDetector());
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI CompanyConfidentialDetector initialized');
            }
        }

        if (window.LeakAILogger) {
            window.LeakAILogger.log(`LeakAI initialized ${this.detectors.size} pattern detectors`);
        }
    }

    /**
     * Initialize NER detector if available
     * @param {Object} options - NER initialization options
     */
    async _initializeNERDetector(options = {}) {
        try {
            let NERDetectorClass = null;
            
            // Check if NERDetector is available
            if (typeof window !== 'undefined' && window.LeakAI && window.LeakAI.NERDetector) {
                // Browser environment
                NERDetectorClass = window.LeakAI.NERDetector;
            } else if (typeof module !== 'undefined' && module.exports) {
                // Node.js environment - try to require the NER detector
                try {
                    NERDetectorClass = require('./ner-detector.js');
                } catch (requireError) {
                    if (window.LeakAILogger) window.LeakAILogger.log('LeakAI NERDetector module not found in Node.js environment');
                }
            }
            
            if (NERDetectorClass) {
                this.nerDetector = new NERDetectorClass();
                await this.nerDetector.initialize({
                    enableModel: options.enableNER !== false,
                    autoLoad: options.autoLoadNER === true
                });
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI NERDetector initialized');
            } else {
                if (window.LeakAILogger) window.LeakAILogger.log('LeakAI NERDetector not available, skipping NER initialization');
            }
        } catch (error) {
            console.error('LeakAI failed to initialize NER detector:', error);
            this.nerDetector = null;
        }
    }

    /**
     * Main detection method - orchestrates all detection strategies
     * @param {string} text - Text to analyze for sensitive data
     * @param {Object} options - Detection options
     * @returns {Array<DetectionResult>} Array of detection results
     */
    async detectSensitiveData(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // Check cache first
        const cacheKey = this._generateCacheKey(text, options);
        const cachedResult = this._getCachedResult(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        const detections = [];
        const enabledCategories = options.enabledCategories || {};

        // Run all available pattern detectors, but only if their categories are enabled
        for (const [name, detector] of this.detectors) {
            try {
                // Check if this detector's category is enabled
                if (!this._isDetectorEnabled(name, enabledCategories)) {
                    // Only log if we have enabled categories (extension is active)
                    if (enabledCategories && Object.values(enabledCategories).some(enabled => enabled)) {
                        if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI ${name} detector disabled by settings, skipping`);
                    }
                    continue;
                }

                const detectorResults = detector.detect(text);
                if (detectorResults && detectorResults.length > 0) {
                    // Filter results by category settings at the individual detection level
                    const filteredResults = detectorResults.filter(detection => 
                        this._isDetectionCategoryEnabled(detection.type, enabledCategories)
                    );
                    
                    if (filteredResults.length > 0) {
                        detections.push(...filteredResults);
                        if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI ${name} detector found ${filteredResults.length}/${detectorResults.length} enabled matches`);
                    } else {
                        // Only log if extension is active
                        if (enabledCategories && Object.values(enabledCategories).some(enabled => enabled)) {
                            if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI ${name} detector found ${detectorResults.length} matches but all categories disabled`);
                        }
                    }
                } else {
                    // Only log if extension is active
                    if (enabledCategories && Object.values(enabledCategories).some(enabled => enabled)) {
                        if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI ${name} detector found no matches`);
                    }
                }
            } catch (error) {
                console.error(`LeakAI ${name} detector failed:`, error);
            }
        }

        // Run NER detector if available and enabled
        if (this.nerDetector && options.enableNER !== false && this._isNEREnabled(enabledCategories)) {
            try {
                const nerResults = await this.nerDetector.detect(text);
                if (nerResults && nerResults.length > 0) {
                    detections.push(...nerResults);
                    if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI NER detector found ${nerResults.length} matches`);
                }
            } catch (error) {
                console.error('LeakAI NER detector failed:', error);
            }
        }

        // If no detectors are available, fall back to placeholder detection
        if (this.detectors.size === 0) {
            console.warn('LeakAI no pattern detectors available, using placeholder detection');
            const placeholderDetections = this._runPlaceholderDetection(text);
            detections.push(...placeholderDetections);
        }

        // Remove duplicates and overlapping detections
        const uniqueDetections = this._removeDuplicateDetections(detections);

        // Cache the results
        this._cacheResults(cacheKey, uniqueDetections);

        return uniqueDetections;
    }

    /**
     * Check if a detector is enabled based on settings
     * @param {string} detectorName - Name of the detector
     * @param {Object} enabledCategories - Enabled categories from settings
     * @returns {boolean} True if detector should run
     */
    _isDetectorEnabled(detectorName, enabledCategories) {
        // If no settings provided, assume all detectors are enabled
        if (!enabledCategories || Object.keys(enabledCategories).length === 0) {
            return true;
        }

        // Map detector names to category settings
        const detectorCategoryMap = {
            'email': 'email',
            'phone': 'phone',
            'creditCard': 'credit_card',
            'apiKey': 'api_key',
            'crypto': ['crypto_seed', 'crypto_private_key', 'crypto_address'],
            'health': 'health_info',
            'companyConfidential': 'company_confidential'
        };

        const categories = detectorCategoryMap[detectorName];
        if (!categories) {
            // Unknown detector, assume enabled
            return true;
        }

        // Check if any of the detector's categories are enabled
        if (Array.isArray(categories)) {
            return categories.some(category => enabledCategories[category] === true);
        } else {
            return enabledCategories[categories] === true;
        }
    }

    /**
     * Check if NER detection is enabled based on settings
     * @param {Object} enabledCategories - Enabled categories from settings
     * @returns {boolean} True if NER should run
     */
    _isNEREnabled(enabledCategories) {
        // If no settings provided, assume NER is enabled
        if (!enabledCategories || Object.keys(enabledCategories).length === 0) {
            return true;
        }

        // NER detects person names, locations, and organizations
        const nerCategories = ['person_name', 'location', 'organization'];
        return nerCategories.some(category => enabledCategories[category] === true);
    }

    /**
     * Check if a specific detection type/category is enabled
     * @param {string} detectionType - The detection type (e.g., 'email', 'credit_card')
     * @param {Object} enabledCategories - Enabled categories from settings
     * @returns {boolean} True if this detection type should be included
     */
    _isDetectionCategoryEnabled(detectionType, enabledCategories) {
        // If no settings provided, assume all categories are enabled
        if (!enabledCategories || Object.keys(enabledCategories).length === 0) {
            return true;
        }

        // Map detection types to settings keys
        const detectionTypeMap = {
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

        const settingsKey = detectionTypeMap[detectionType];
        if (!settingsKey) {
            console.warn(`LeakAI unknown detection type: ${detectionType}`);
            return true; // Unknown types are enabled by default
        }

        const isEnabled = enabledCategories[settingsKey] === true;
        // Only log if extension is active (has some enabled categories)
        if (enabledCategories && Object.values(enabledCategories).some(enabled => enabled)) {
            if (window.LeakAILogger) window.LeakAILogger.log(`LeakAI detection type ${detectionType} enabled: ${isEnabled}`);
        }
        return isEnabled;
    }

    /**
     * Remove duplicate and overlapping detections
     * @param {Array<Object>} detections - Array of detection results
     * @returns {Array<Object>} Filtered detection results
     */
    _removeDuplicateDetections(detections) {
        if (detections.length <= 1) {
            return detections;
        }

        // Sort by start index
        const sorted = detections.sort((a, b) => a.startIndex - b.startIndex);
        const filtered = [];

        for (const detection of sorted) {
            // Check if this detection overlaps with any existing detection
            const overlaps = filtered.some(existing => {
                return (detection.startIndex < existing.endIndex && 
                        detection.endIndex > existing.startIndex);
            });

            if (!overlaps) {
                filtered.push(detection);
            } else {
                // If there's an overlap, keep the one with higher confidence
                const overlappingIndex = filtered.findIndex(existing => 
                    detection.startIndex < existing.endIndex && 
                    detection.endIndex > existing.startIndex
                );
                
                if (overlappingIndex !== -1 && detection.confidence > filtered[overlappingIndex].confidence) {
                    filtered[overlappingIndex] = detection;
                }
            }
        }

        return filtered;
    }

    /**
     * Placeholder detection method - fallback when no pattern detectors are available
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} Basic detection objects
     */
    _runPlaceholderDetection(text) {
        const detections = [];

        // Simple email detection for testing
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        let match;
        while ((match = emailRegex.exec(text)) !== null) {
            detections.push({
                type: DetectionType.EMAIL,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                rawConfidence: 0.8, // Will be adjusted by scoring
                context: this._extractContext(text, match.index, match[0].length)
            });
        }

        // Simple phone detection for testing
        const phoneRegex = /\b\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
        while ((match = phoneRegex.exec(text)) !== null) {
            detections.push({
                type: DetectionType.PHONE,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                rawConfidence: 0.7,
                context: this._extractContext(text, match.index, match[0].length)
            });
        }

        return detections;
    }

    /**
     * Apply confidence scoring to detections
     * @param {Array<Object>} detections - Raw detection objects
     * @returns {Array<Object>} Detections with confidence scores
     */
    _scoreConfidence(detections) {
        return detections.map(detection => {
            let confidence = detection.rawConfidence || 0.5;

            // Adjust confidence based on context
            if (detection.context) {
                // Higher confidence if surrounded by relevant keywords
                const contextLower = detection.context.toLowerCase();
                if (detection.type === DetectionType.EMAIL) {
                    if (contextLower.includes('email') || contextLower.includes('contact')) {
                        confidence = Math.min(1.0, confidence + 0.1);
                    }
                }
                if (detection.type === DetectionType.PHONE) {
                    if (contextLower.includes('phone') || contextLower.includes('call')) {
                        confidence = Math.min(1.0, confidence + 0.1);
                    }
                }
            }

            return {
                ...detection,
                confidence: Math.round(confidence * 100) / 100 // Round to 2 decimal places
            };
        });
    }

    /**
     * Categorize risk levels for detections
     * @param {Array<Object>} detections - Detections with confidence scores
     * @returns {Array<DetectionResult>} Complete DetectionResult objects
     */
    _categorizeRisk(detections) {
        return detections.map(detection => {
            let riskLevel = RiskLevel.LOW;
            let suggestions = [Action.MASK, Action.REMOVE, Action.IGNORE_ONCE];

            // Determine risk level based on type and confidence
            if (detection.type === DetectionType.EMAIL || detection.type === DetectionType.PHONE) {
                if (detection.confidence >= 0.8) {
                    riskLevel = RiskLevel.MEDIUM;
                } else {
                    riskLevel = RiskLevel.LOW;
                }
            }

            // Add type-specific suggestions
            if (detection.type === DetectionType.EMAIL) {
                suggestions.push(Action.REPLACE);
            }

            // Create proper DetectionResult object
            return createDetectionResult({
                type: detection.type,
                text: detection.text,
                startIndex: detection.startIndex,
                endIndex: detection.endIndex,
                confidence: detection.confidence,
                riskLevel: riskLevel,
                context: detection.context || '',
                suggestions: suggestions,
                metadata: {
                    detectionMethod: 'placeholder_regex',
                    processingTime: Date.now()
                }
            });
        });
    }

    /**
     * Extract context around detected text
     * @param {string} text - Full text
     * @param {number} startIndex - Start of detected text
     * @param {number} length - Length of detected text
     * @returns {string} Context string
     */
    _extractContext(text, startIndex, length) {
        const contextRadius = 20; // Characters before and after
        const contextStart = Math.max(0, startIndex - contextRadius);
        const contextEnd = Math.min(text.length, startIndex + length + contextRadius);
        return text.substring(contextStart, contextEnd);
    }

    /**
     * Generate cache key for detection results
     * @param {string} text - Input text
     * @param {Object} options - Detection options
     * @returns {string} Cache key
     */
    _generateCacheKey(text, options) {
        const optionsStr = JSON.stringify(options);
        return `${text.length}_${this._simpleHash(text)}_${this._simpleHash(optionsStr)}`;
    }

    /**
     * Simple hash function for cache keys
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get cached detection result
     * @param {string} cacheKey - Cache key
     * @returns {Array<DetectionResult>|null} Cached result or null
     */
    _getCachedResult(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.result;
        }

        // Remove expired entry
        if (cached) {
            this.cache.delete(cacheKey);
        }

        return null;
    }

    /**
     * Cache detection results
     * @param {string} cacheKey - Cache key
     * @param {Array<DetectionResult>} result - Detection results to cache
     */
    _cacheResults(cacheKey, result) {
        // Implement simple LRU by removing oldest entries when cache is full
        if (this.cache.size >= this.cacheMaxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });
    }

    /**
     * Check if NER model is available and loaded
     * @returns {boolean} True if NER model is loaded
     */
    isModelAvailable() {
        return this.nerDetector && this.nerDetector.isModelAvailable();
    }

    /**
     * Load NER model if not already loaded
     * @returns {Promise<boolean>} Success status
     */
    async loadNERModel() {
        if (!this.nerDetector) {
            console.warn('LeakAI NER detector not initialized');
            return false;
        }
        
        return await this.nerDetector.loadModel();
    }

    /**
     * Get NER detector status
     * @returns {Object|null} NER detector status or null if not available
     */
    getNERStatus() {
        return this.nerDetector ? this.nerDetector.getStatus() : null;
    }

    /**
     * Get cache statistics for debugging
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cacheMaxSize,
            ttl: this.cacheTTL
        };
    }

    /**
     * Clear the detection cache
     */
    clearCache() {
        this.cache.clear();
    }
}

    // Export for both Node.js and browser environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = DetectionEngine;
    } else {
        // Note: Loading message will be logged when extension state is available
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.DetectionEngine = DetectionEngine;
        // Note: Load success message will be logged when extension state is available
    }

    // Note: Script execution message will be logged when extension state is available
})(); // End IIFE