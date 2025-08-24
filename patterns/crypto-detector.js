// LeakAI Cryptocurrency Detection Patterns
// Detects cryptocurrency-related sensitive data including seed phrases, private keys, and wallet addresses

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
 * BIP-39 word list (first 100 words for initial implementation)
 * Full list contains 2048 words - this is a subset for testing
 */
const BIP39_WORDS = new Set([
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'against', 'age',
    'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
    'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also',
    'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient',
    'anger', 'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna',
    'antique', 'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'area',
    'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest', 'arrive',
    'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset', 'assist'
]);

/**
 * Cryptocurrency detector class for seed phrases, private keys, and wallet addresses
 */
class CryptoDetector {
    constructor() {
        this.name = 'CryptoDetector';
        // Note: Initialization message will be logged when extension state is available
    }

    /**
     * Main detection method for all cryptocurrency-related patterns
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} Array of detection objects
     */
    detect(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const detections = [];

        // Detect seed phrases
        detections.push(...this.detectSeedPhrase(text));

        // Detect private keys
        detections.push(...this.detectPrivateKey(text));

        // Detect cryptocurrency addresses
        detections.push(...this.detectWalletAddress(text));

        return detections;
    }

    /**
     * Detect BIP-39 seed phrases (12+ word sequences)
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} Array of seed phrase detections
     */
    detectSeedPhrase(text) {
        const detections = [];
        
        // Split text into words and clean them
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .split(/\s+/)
            .filter(word => word.length > 0);

        // Track already detected ranges to avoid overlaps
        const detectedRanges = [];

        // Look for sequences of 12+ consecutive BIP-39 words
        for (let i = 0; i <= words.length - 12; i++) {
            // Skip if this position is already covered by a previous detection
            if (detectedRanges.some(range => i >= range.start && i < range.end)) {
                continue;
            }

            const sequence = words.slice(i, i + 24); // Check up to 24 words
            const validSequence = this._findValidSeedSequence(sequence);
            
            if (validSequence.length >= 12) {
                // Find the position in original text
                const startIndex = this._findSequenceInText(text, validSequence, i);
                
                if (startIndex !== -1) {
                    const sequenceText = validSequence.join(' ');
                    const endIndex = startIndex + sequenceText.length;
                    const context = this._extractContext(text, startIndex, sequenceText.length);
                    
                    // Mark this range as detected
                    detectedRanges.push({ start: i, end: i + validSequence.length });
                    
                    detections.push(createDetectionResult({
                        type: DetectionType.CRYPTO_SEED,
                        text: sequenceText,
                        startIndex: startIndex,
                        endIndex: endIndex,
                        confidence: this._calculateSeedPhraseConfidence(validSequence),
                        riskLevel: RiskLevel.HIGH, // Seed phrases are always high risk
                        context: context,
                        suggestions: [Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                        metadata: {
                            wordCount: validSequence.length,
                            detectionMethod: 'bip39_wordlist',
                            validWords: validSequence.length
                        }
                    }));
                }
            }
        }

        return detections;
    }

    /**
     * Find the longest valid BIP-39 word sequence starting from the beginning
     * @param {Array<string>} words - Array of words to check
     * @returns {Array<string>} Valid BIP-39 word sequence
     */
    _findValidSeedSequence(words) {
        const validSequence = [];
        
        for (const word of words) {
            if (BIP39_WORDS.has(word)) {
                validSequence.push(word);
            } else {
                break; // Stop at first non-BIP39 word
            }
        }
        
        return validSequence;
    }

    /**
     * Find the position of a word sequence in the original text
     * @param {string} text - Original text
     * @param {Array<string>} sequence - Word sequence to find
     * @param {number} wordIndex - Approximate word index
     * @returns {number} Start index in text, or -1 if not found
     */
    _findSequenceInText(text, sequence, wordIndex) {
        const lowerText = text.toLowerCase();
        
        // Try exact match first
        const sequenceText = sequence.join(' ');
        let index = lowerText.indexOf(sequenceText);
        if (index !== -1) {
            return index;
        }
        
        // Try with flexible spacing and punctuation
        const flexiblePattern = sequence.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s,.:;!?-]+');
        const regex = new RegExp(flexiblePattern, 'i');
        const match = lowerText.match(regex);
        
        if (match) {
            return lowerText.indexOf(match[0]);
        }
        
        // Try finding the first word and then checking if the sequence follows
        const firstWord = sequence[0];
        let searchStart = 0;
        
        while (true) {
            const firstWordIndex = lowerText.indexOf(firstWord, searchStart);
            if (firstWordIndex === -1) break;
            
            // Extract text starting from first word and check if sequence matches
            const remainingText = lowerText.substring(firstWordIndex);
            const testMatch = remainingText.match(regex);
            
            if (testMatch && testMatch.index === 0) {
                return firstWordIndex;
            }
            
            searchStart = firstWordIndex + 1;
        }
        
        return -1;
    }

    /**
     * Calculate confidence score for seed phrase detection
     * @param {Array<string>} sequence - Valid BIP-39 word sequence
     * @returns {number} Confidence score (0-1)
     */
    _calculateSeedPhraseConfidence(sequence) {
        const wordCount = sequence.length;
        
        // Base confidence based on word count
        let confidence = 0.5;
        
        if (wordCount >= 12) confidence = 0.8;
        if (wordCount >= 15) confidence = 0.9;
        if (wordCount >= 18) confidence = 0.95;
        if (wordCount >= 24) confidence = 0.99;
        
        // Bonus for exact standard lengths (12, 15, 18, 21, 24)
        const standardLengths = [12, 15, 18, 21, 24];
        if (standardLengths.includes(wordCount)) {
            confidence = Math.min(1.0, confidence + 0.05);
        }
        
        return Math.round(confidence * 100) / 100;
    }

    /**
     * Detect private keys in various formats
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} Array of private key detections
     */
    detectPrivateKey(text) {
        const detections = [];

        // Hex private key pattern (0x + 64 hex characters)
        const hexPattern = /\b0x[a-fA-F0-9]{64}\b/g;
        let match;
        while ((match = hexPattern.exec(text)) !== null) {
            const context = this._extractContext(text, match.index, match[0].length);
            
            detections.push(createDetectionResult({
                type: DetectionType.CRYPTO_PRIVATE_KEY,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.95,
                riskLevel: RiskLevel.HIGH,
                context: context,
                suggestions: [Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                metadata: {
                    format: 'hex',
                    detectionMethod: 'regex_pattern'
                }
            }));
        }

        // PEM private key pattern
        const pemPattern = /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g;
        while ((match = pemPattern.exec(text)) !== null) {
            const context = this._extractContext(text, match.index, match[0].length);
            
            detections.push(createDetectionResult({
                type: DetectionType.CRYPTO_PRIVATE_KEY,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.99,
                riskLevel: RiskLevel.HIGH,
                context: context,
                suggestions: [Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                metadata: {
                    format: 'pem',
                    detectionMethod: 'regex_pattern'
                }
            }));
        }

        // WIF (Wallet Import Format) pattern - Base58 encoded, starts with 5, K, or L
        const wifPattern = /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g;
        while ((match = wifPattern.exec(text)) !== null) {
            const context = this._extractContext(text, match.index, match[0].length);
            
            detections.push(createDetectionResult({
                type: DetectionType.CRYPTO_PRIVATE_KEY,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.85,
                riskLevel: RiskLevel.HIGH,
                context: context,
                suggestions: [Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                metadata: {
                    format: 'wif',
                    detectionMethod: 'regex_pattern'
                }
            }));
        }

        return detections;
    }

    /**
     * Detect cryptocurrency wallet addresses
     * @param {string} text - Text to analyze
     * @returns {Array<Object>} Array of wallet address detections
     */
    detectWalletAddress(text) {
        const detections = [];

        // Bitcoin address patterns
        const bitcoinPatterns = [
            /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, // Legacy addresses (1...)
            /\b3[a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,    // P2SH addresses (3...)
            /\bbc1[a-z0-9]{39,59}\b/g               // Bech32 addresses (bc1...)
        ];

        bitcoinPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const context = this._extractContext(text, match.index, match[0].length);
                const riskScore = this._analyzeAddressContext(context);
                
                detections.push(createDetectionResult({
                    type: DetectionType.CRYPTO_ADDRESS,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    confidence: 0.8,
                    riskLevel: riskScore.riskLevel,
                    context: context,
                    suggestions: [Action.MASK, Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                    metadata: {
                        currency: 'bitcoin',
                        contextAnalysis: riskScore.analysis,
                        detectionMethod: 'regex_pattern'
                    }
                }));
            }
        });

        // Ethereum address pattern (0x + 40 hex characters)
        const ethPattern = /\b0x[a-fA-F0-9]{40}\b/g;
        let match;
        while ((match = ethPattern.exec(text)) !== null) {
            const context = this._extractContext(text, match.index, match[0].length);
            const riskScore = this._analyzeAddressContext(context);
            
            detections.push(createDetectionResult({
                type: DetectionType.CRYPTO_ADDRESS,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                confidence: 0.75, // Lower confidence as hex strings can be other things
                riskLevel: riskScore.riskLevel,
                context: context,
                suggestions: [Action.MASK, Action.REMOVE, Action.REPLACE, Action.IGNORE_ONCE],
                metadata: {
                    currency: 'ethereum',
                    contextAnalysis: riskScore.analysis,
                    detectionMethod: 'regex_pattern'
                }
            }));
        }

        return detections;
    }

    /**
     * Analyze context around cryptocurrency address to determine risk level
     * @param {string} context - Context text around the address
     * @returns {Object} Risk analysis result
     */
    _analyzeAddressContext(context) {
        const lowerContext = context.toLowerCase();
        
        // High risk indicators - sending/transferring money
        const highRiskKeywords = ['send', 'transfer', 'pay', 'payment', 'withdraw', 'refund', 'deposit'];
        const hasHighRisk = highRiskKeywords.some(keyword => lowerContext.includes(keyword));
        
        // Low risk indicators - personal/informational context
        const lowRiskKeywords = ['my address', 'my wallet', 'receive', 'receiving', 'example', 'test'];
        const hasLowRisk = lowRiskKeywords.some(keyword => lowerContext.includes(keyword));
        
        if (hasHighRisk) {
            return {
                riskLevel: RiskLevel.HIGH,
                analysis: 'Transaction context detected'
            };
        } else if (hasLowRisk) {
            return {
                riskLevel: RiskLevel.LOW,
                analysis: 'Personal/informational context'
            };
        } else {
            return {
                riskLevel: RiskLevel.MEDIUM,
                analysis: 'Neutral context'
            };
        }
    }

    /**
     * Extract context around detected text
     * @param {string} text - Full text
     * @param {number} startIndex - Start of detected text
     * @param {number} length - Length of detected text
     * @returns {string} Context string
     */
    _extractContext(text, startIndex, length) {
        const contextRadius = 30; // Characters before and after
        const contextStart = Math.max(0, startIndex - contextRadius);
        const contextEnd = Math.min(text.length, startIndex + length + contextRadius);
        return text.substring(contextStart, contextEnd);
    }
}

    // Export for both Node.js and browser environments
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CryptoDetector;
    } else {
        window.LeakAI = window.LeakAI || {};
        window.LeakAI.CryptoDetector = CryptoDetector;
    }

    // Note: Class load message will be logged when extension state is available
})(); // End IIFE