/**
 * NER (Named Entity Recognition) Detector using Transformers.js
 * Provides optional ML-based detection for names, locations, and organizations
 * Falls back to heuristic patterns when model is unavailable
 */

(function() {
    'use strict';

    // Import data models (will work in both browser and Node.js)
    let DetectionType, RiskLevel, Action;

    if (typeof module !== 'undefined' && module.exports) {
        // Node.js environment
        const dataModels = require('./data-models.js');
        DetectionType = dataModels.DetectionType;
        RiskLevel = dataModels.RiskLevel;
        Action = dataModels.Action;
    } else {
        // Browser environment - get from global LeakAI namespace
        if (window.LeakAI) {
            DetectionType = window.LeakAI.DetectionType;
            RiskLevel = window.LeakAI.RiskLevel;
            Action = window.LeakAI.Action;
        }
    }

class NERDetector {
    constructor() {
        this.pipeline = null;
        this.modelLoaded = false;
        this.modelLoading = false;
        this.fallbackEnabled = true;
        this.modelConfig = {
            task: 'token-classification',
            model: 'Xenova/bert-base-NER',
            revision: 'main'
        };
    }

    /**
     * Initialize the NER detector with optional model loading
     * @param {Object} options - Configuration options
     * @param {boolean} options.enableModel - Whether to load the ML model
     * @param {boolean} options.autoLoad - Whether to load model immediately
     */
    async initialize(options = {}) {
        const { enableModel = true, autoLoad = false } = options;
        
        if (!enableModel) {
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] ML model disabled, using fallback heuristics only');
            return;
        }

        if (autoLoad) {
            await this.loadModel();
        }
    }

    /**
     * Load the Transformers.js NER model
     * @returns {Promise<boolean>} Success status
     */
    async loadModel() {
        if (this.modelLoaded) {
            return true;
        }

        if (this.modelLoading) {
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Model already loading...');
            return false;
        }

        try {
            this.modelLoading = true;
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Starting model download...');
            
            // Check if Transformers.js is available
            // In browser environment, it should be loaded via script tag
            // In Node.js environment, we can import it
            let pipelineFunction;
            
            if (typeof window !== 'undefined') {
                // Browser environment - check for global pipeline
                if (typeof pipeline === 'undefined') {
                    console.warn('[NERDetector] Transformers.js not available in browser, using fallback');
                    this.modelLoading = false;
                    return false;
                }
                pipelineFunction = pipeline;
            } else {
                // Node.js environment - import the module
                try {
                    const { pipeline: importedPipeline } = require('@xenova/transformers');
                    pipelineFunction = importedPipeline;
                } catch (error) {
                    console.warn('[NERDetector] Transformers.js not available in Node.js, using fallback');
                    this.modelLoading = false;
                    return false;
                }
            }

            // Load the NER pipeline with progress indication
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Loading NER pipeline...');
            this.pipeline = await pipelineFunction(
                this.modelConfig.task,
                this.modelConfig.model,
                {
                    revision: this.modelConfig.revision,
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            if (window.LeakAILogger) window.LeakAILogger.log(`[NERDetector] Downloading model: ${percent}%`);
                        } else if (progress.status === 'loading') {
                            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Loading model into memory...');
                        }
                    }
                }
            );

            this.modelLoaded = true;
            this.modelLoading = false;
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Model loaded successfully');
            return true;

        } catch (error) {
            console.error('[NERDetector] Failed to load model:', error);
            this.modelLoading = false;
            this.modelLoaded = false;
            if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Falling back to heuristic detection');
            return false;
        }
    }

    /**
     * Check if the ML model is available and loaded
     * @returns {boolean} Model availability status
     */
    isModelAvailable() {
        return this.modelLoaded && this.pipeline !== null;
    }

    /**
     * Detect named entities in text using ML model or fallback heuristics
     * @param {string} text - Text to analyze
     * @returns {Promise<DetectionResult[]>} Array of detection results
     */
    async detect(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const results = [];

        // Try ML model first if available
        if (this.isModelAvailable()) {
            try {
                const mlResults = await this.detectWithModel(text);
                results.push(...mlResults);
            } catch (error) {
                console.error('[NERDetector] ML detection failed:', error);
                if (window.LeakAILogger) window.LeakAILogger.log('[NERDetector] Falling back to heuristics');
            }
        }

        // Use fallback heuristics if model unavailable or failed
        if (!this.isModelAvailable() || results.length === 0) {
            try {
                const heuristicResults = this.detectWithHeuristics(text);
                results.push(...heuristicResults);
            } catch (error) {
                console.error('[NERDetector] Heuristic detection failed:', error);
                // Return empty results if both ML and heuristic detection fail
            }
        }

        return results;
    }

    /**
     * Detect entities using the loaded ML model
     * @param {string} text - Text to analyze
     * @returns {Promise<DetectionResult[]>} Detection results
     */
    async detectWithModel(text) {
        if (!this.pipeline) {
            throw new Error('Model not loaded');
        }

        const results = [];
        
        try {
            // Run NER inference
            const entities = await this.pipeline(text);
            
            // Group consecutive tokens and convert to DetectionResult format
            const groupedEntities = this.groupConsecutiveEntities(entities, text);
            
            for (const entity of groupedEntities) {
                const detection = this.createDetectionResult(entity, text);
                if (detection) {
                    results.push(detection);
                }
            }

        } catch (error) {
            console.error('[NERDetector] Model inference failed:', error);
            throw error;
        }

        return results;
    }

    /**
     * Group consecutive NER tokens into complete entities
     * @param {Array} entities - Raw NER results
     * @param {string} text - Original text
     * @returns {Array} Grouped entities
     */
    groupConsecutiveEntities(entities, text) {
        const grouped = [];
        let currentGroup = null;

        // First, we need to handle the case where start/end are null
        // In this case, we'll use token positions and reconstruct text
        const hasCharPositions = entities.length > 0 && entities[0].start !== null;
        
        if (!hasCharPositions) {
            // Convert token-based entities to character-based
            entities = this.convertTokensToCharPositions(entities, text);
        }

        for (const entity of entities) {
            const label = entity.entity.replace(/^[BI]-/, ''); // Remove B- and I- prefixes
            
            if (entity.entity.startsWith('B-') || !currentGroup || currentGroup.label !== label) {
                // Start new group
                if (currentGroup) {
                    // Extract actual text from original text using positions
                    currentGroup.text = text.substring(currentGroup.start, currentGroup.end);
                    grouped.push(currentGroup);
                }
                currentGroup = {
                    label: label,
                    start: entity.start,
                    end: entity.end,
                    score: entity.score,
                    words: [entity.word]
                };
            } else if (entity.entity.startsWith('I-') && currentGroup && currentGroup.label === label) {
                // Continue current group - extend the end position
                currentGroup.end = entity.end;
                currentGroup.score = Math.min(currentGroup.score, entity.score); // Use minimum confidence
                currentGroup.words.push(entity.word);
            }
        }

        if (currentGroup) {
            // Extract actual text from original text using positions
            currentGroup.text = text.substring(currentGroup.start, currentGroup.end);
            grouped.push(currentGroup);
        }

        return grouped;
    }

    /**
     * Convert token-based entities to character-based positions
     * @param {Array} entities - Token-based entities
     * @param {string} text - Original text
     * @returns {Array} Character-based entities
     */
    convertTokensToCharPositions(entities, text) {
        // Convert entities to character positions using simple text search
        return entities.map(entity => {
            // Search for the word in the text (case-insensitive)
            const searchWord = entity.word.replace(/^##/, ''); // Remove BERT subword prefix
            const lowerText = text.toLowerCase();
            const lowerWord = searchWord.toLowerCase();
            
            // Find all occurrences of the word
            const occurrences = [];
            let index = lowerText.indexOf(lowerWord);
            while (index !== -1) {
                occurrences.push({
                    start: index,
                    end: index + searchWord.length
                });
                index = lowerText.indexOf(lowerWord, index + 1);
            }
            
            if (occurrences.length > 0) {
                // Use the first occurrence for now
                // In a more sophisticated implementation, we could use token order
                const occurrence = occurrences[0];
                return {
                    ...entity,
                    start: occurrence.start,
                    end: occurrence.end
                };
            }
            
            // If exact match fails, return null (will be filtered out)
            return {
                ...entity,
                start: null,
                end: null
            };
        }).filter(entity => {
            // Filter out entities with invalid positions or very short words
            return entity.start !== null && 
                   entity.end !== null && 
                   entity.end > entity.start &&
                   (entity.end - entity.start) >= 2; // At least 2 characters
        });
    }

    /**
     * Convert NER entity to DetectionResult format
     * @param {Object} entity - NER entity
     * @param {string} originalText - Original text (for context extraction)
     * @returns {DetectionResult|null} Detection result
     */
    createDetectionResult(entity, originalText) {
        const { label, start, end, score, text: detectedText } = entity;
        
        // Map NER labels to our detection types
        let detectionType;
        let riskLevel = RiskLevel.LOW;
        
        switch (label.toUpperCase()) {
            case 'PER':
            case 'PERSON':
                detectionType = DetectionType.PERSON_NAME;
                riskLevel = RiskLevel.MEDIUM;
                break;
            case 'LOC':
            case 'LOCATION':
                detectionType = DetectionType.LOCATION;
                riskLevel = RiskLevel.LOW;
                break;
            case 'ORG':
            case 'ORGANIZATION':
                detectionType = DetectionType.ORGANIZATION;
                riskLevel = RiskLevel.LOW;
                break;
            default:
                return null; // Skip unknown entity types
        }

        // Filter out very low confidence detections
        if (score < 0.5) {
            return null;
        }

        // Ensure we have valid text
        if (!detectedText || detectedText.trim().length === 0) {
            return null;
        }
        
        return {
            id: `ner_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: detectionType,
            text: detectedText,
            startIndex: start,
            endIndex: end,
            confidence: score,
            riskLevel: riskLevel,
            context: this.extractContext(originalText, start, end),
            suggestions: [Action.MASK, Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
            metadata: {
                source: 'ml_model',
                nerLabel: label,
                modelConfidence: score
            }
        };
    }

    /**
     * Fallback heuristic detection for when ML model is unavailable
     * @param {string} text - Text to analyze
     * @returns {DetectionResult[]} Detection results
     */
    detectWithHeuristics(text) {
        const results = [];
        
        // Simple heuristic patterns as fallback
        // Note: Order matters - more specific patterns should come first
        const patterns = [
            {
                regex: /\b(?:New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Nashville|Detroit|Oklahoma City|Portland|Las Vegas|Memphis|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans|Mountain View|Palo Alto|Redmond|Cupertino)\b/gi,
                type: DetectionType.LOCATION,
                riskLevel: RiskLevel.LOW,
                confidence: 0.4
            },
            {
                regex: /\b(?:Google|Microsoft|Apple|Amazon|Facebook|Meta|Tesla|Netflix|Adobe|Oracle|Salesforce|IBM|Intel|Cisco|Nvidia|PayPal|Uber|Airbnb|Twitter|LinkedIn|Spotify|Zoom|Slack|Dropbox|GitHub|Reddit|Pinterest|Snapchat|TikTok|WhatsApp|Instagram|YouTube)\b/g,
                type: DetectionType.ORGANIZATION,
                riskLevel: RiskLevel.LOW,
                confidence: 0.5
            },
            {
                regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
                type: DetectionType.PERSON_NAME,
                riskLevel: RiskLevel.LOW,
                confidence: 0.3
            }
        ];

        const usedRanges = []; // Track used text ranges to avoid overlaps
        
        for (const pattern of patterns) {
            let match;
            pattern.regex.lastIndex = 0; // Reset regex state
            while ((match = pattern.regex.exec(text)) !== null) {
                const startIndex = match.index;
                const endIndex = match.index + match[0].length;
                
                // Check if this range overlaps with any existing detection
                const overlaps = usedRanges.some(range => 
                    (startIndex < range.end && endIndex > range.start)
                );
                
                if (!overlaps) {
                    const detection = {
                        id: `ner_heuristic_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                        type: pattern.type,
                        text: match[0],
                        startIndex: startIndex,
                        endIndex: endIndex,
                        confidence: pattern.confidence,
                        riskLevel: pattern.riskLevel,
                        context: this.extractContext(text, startIndex, endIndex),
                        suggestions: [Action.MASK, Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                        metadata: {
                            source: 'heuristic',
                            pattern: pattern.regex.source
                        }
                    };
                    
                    results.push(detection);
                    usedRanges.push({ start: startIndex, end: endIndex });
                }
            }
        }

        return results;
    }

    /**
     * Extract surrounding context for a detection
     * @param {string} text - Full text
     * @param {number} start - Start index
     * @param {number} end - End index
     * @returns {string} Context string
     */
    extractContext(text, start, end) {
        const contextLength = 20;
        const contextStart = Math.max(0, start - contextLength);
        const contextEnd = Math.min(text.length, end + contextLength);
        
        let context = text.substring(contextStart, contextEnd);
        
        // Add ellipsis if context is truncated
        if (contextStart > 0) context = '...' + context;
        if (contextEnd < text.length) context = context + '...';
        
        return context;
    }

    /**
     * Get detector status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            modelLoaded: this.modelLoaded,
            modelLoading: this.modelLoading,
            fallbackEnabled: this.fallbackEnabled,
            modelConfig: this.modelConfig
        };
    }
}

    // Export for use in other modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = NERDetector;
    } else {
        // Browser environment
        // Note: Loading message will be logged when extension state is available
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.NERDetector = NERDetector;
        // Note: Load success message will be logged when extension state is available
    }

})(); // End IIFE