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
        this.nerModel = null; // Optional NER model (will be loaded later)
        this.initialized = false;

        console.log('LeakAI DetectionEngine initialized');
    }

    /**
     * Initialize the detection engine (async for future model loading)
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        // Initialize pattern detectors
        this._initializeDetectors();

        // Future: Load optional NER model here
        this.initialized = true;
        console.log('DetectionEngine initialization complete');
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
                console.log('LeakAI EmailDetector initialized');
            }
            
            if (window.LeakAI.PhoneDetector) {
                this.detectors.set('phone', new window.LeakAI.PhoneDetector());
                console.log('LeakAI PhoneDetector initialized');
            }
            
            if (window.LeakAI.CreditCardDetector) {
                this.detectors.set('creditCard', new window.LeakAI.CreditCardDetector());
                console.log('LeakAI CreditCardDetector initialized');
            }
            
            if (window.LeakAI.ApiKeyDetector) {
                this.detectors.set('apiKey', new window.LeakAI.ApiKeyDetector());
                console.log('LeakAI ApiKeyDetector initialized');
            }
            
            if (window.LeakAI.CryptoDetector) {
                this.detectors.set('crypto', new window.LeakAI.CryptoDetector());
                console.log('LeakAI CryptoDetector initialized');
            }
        }

        console.log(`LeakAI initialized ${this.detectors.size} pattern detectors`);
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

        // Run all available pattern detectors
        for (const [name, detector] of this.detectors) {
            try {
                const detectorResults = detector.detect(text);
                if (detectorResults && detectorResults.length > 0) {
                    detections.push(...detectorResults);
                    console.log(`LeakAI ${name} detector found ${detectorResults.length} matches`);
                }
            } catch (error) {
                console.error(`LeakAI ${name} detector failed:`, error);
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
     * Check if NER model is available (placeholder for future implementation)
     * @returns {boolean} True if NER model is loaded
     */
    isModelAvailable() {
        return this.nerModel !== null;
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
        console.log('LeakAI DetectionEngine loading in browser environment');
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.DetectionEngine = DetectionEngine;
        console.log('LeakAI DetectionEngine class loaded successfully');
    }

    console.log('LeakAI DetectionEngine script executed');
})(); // End IIFE