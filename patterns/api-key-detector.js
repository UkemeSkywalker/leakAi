// LeakAI API Key and Credential Detection Pattern Matcher
// Detects API keys and credentials using known patterns and entropy analysis

/**
 * ApiKeyDetector class for detecting API keys and credentials in text
 */
class ApiKeyDetector {
  constructor() {
    // Known API key patterns with their characteristics
    this.apiKeyPatterns = {
      aws_access_key: {
        regex: /\bAKIA[0-9A-Z]{16}\b/g,
        name: 'AWS Access Key',
        entropy: false,
        minLength: 20,
        maxLength: 20
      },
      aws_secret_key: {
        regex: /\b[A-Za-z0-9/+=]{40}\b/g,
        name: 'AWS Secret Key',
        entropy: true,
        minEntropy: 4.0,
        minLength: 40,
        maxLength: 40,
        contextKeywords: ['aws', 'secret', 'access_secret']
      },
      github_token: {
        regex: /\bgh[pousr]_[A-Za-z0-9]{38}\b/g,
        name: 'GitHub Personal Access Token',
        entropy: false,
        minLength: 42,
        maxLength: 42
      },
      stripe_publishable: {
        regex: /\bpk_(live|test)_[A-Za-z0-9]{24}\b/g,
        name: 'Stripe Publishable Key',
        entropy: false,
        minLength: 32,
        maxLength: 32
      },
      stripe_secret: {
        regex: /\bsk_(live|test)_[A-Za-z0-9]{24}\b/g,
        name: 'Stripe Secret Key',
        entropy: false,
        minLength: 32,
        maxLength: 32
      },
      google_api_key: {
        regex: /\bAIza[A-Za-z0-9_-]{35}\b/g,
        name: 'Google API Key',
        entropy: false,
        minLength: 39,
        maxLength: 39
      },
      slack_token: {
        regex: /\bxox[bpra]-[0-9]{10,12}-[0-9]{10,12}(?:-[0-9]{10,12})?-[A-Za-z0-9]{6,32}\b/g,
        name: 'Slack Token',
        entropy: false,
        minLength: 40,
        maxLength: 70
      },
      high_entropy: {
        regex: /\b[A-Za-z0-9+/=]{20,}\b/g,
        name: 'High Entropy String',
        entropy: true,
        minEntropy: 4.0,
        minLength: 20,
        maxLength: 100
      }
    };

    // Context keywords for different types of credentials
    this.sensitiveContextKeywords = ['secret', 'private', 'confidential'];
    this.apiContextKeywords = ['api', 'token', 'key', 'auth', 'bearer', 'authentication', 'credential'];
    this.configContextKeywords = ['config', 'env', 'environment', 'setting'];
    
    // Invalid patterns to exclude (but be less strict for testing)
    this.invalidPatterns = [
      /^example$/i,      // Only if the entire key is "example"
      /^test123$/i,      // Only if the entire key is "test123"
      /^dummy$/i,        // Only if the entire key is "dummy"
      /^placeholder$/i,  // Only if the entire key is "placeholder"
      /^sample$/i,       // Only if the entire key is "sample"
      /^[a-z]+$/i,       // All lowercase letters
      /^[A-Z]+$/,        // All uppercase letters
      /^[0-9]+$/,        // All numbers
      /(.)\1{10,}/       // Repeated characters (10+ times)
    ];
  }

  /**
   * Detects API keys and credentials in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    const foundRanges = []; // Track overlapping ranges

    // Process each pattern type
    for (const [patternKey, pattern] of Object.entries(this.apiKeyPatterns)) {
      pattern.regex.lastIndex = 0; // Reset regex state
      let match;

      while ((match = pattern.regex.exec(text)) !== null) {
        const apiKey = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + apiKey.length;

        // Check for overlapping ranges
        const isOverlapping = foundRanges.some(range => 
          (startIndex >= range.start && startIndex < range.end) ||
          (endIndex > range.start && endIndex <= range.end) ||
          (startIndex <= range.start && endIndex >= range.end)
        );

        if (isOverlapping) {
          continue;
        }

        // Extract context around the API key
        const context = this.extractContext(text, startIndex, endIndex);
        
        // Calculate entropy if needed
        const entropy = pattern.entropy ? this.calculateEntropy(apiKey) : null;

        // Validate the API key
        if (this.validate(apiKey, pattern, context, entropy)) {
          foundRanges.push({ start: startIndex, end: endIndex });

          // Calculate confidence based on pattern and context
          const confidence = this.calculateConfidence(apiKey, context, pattern);
          
          // Determine risk level based on context and pattern
          const riskLevel = this.determineRiskLevel(context, pattern);
          
          // Create detection result
          const detection = this.createDetectionResult({
            apiKey,
            startIndex,
            endIndex,
            confidence,
            riskLevel,
            context,
            metadata: {
              keyType: pattern.name,
              masked: this.maskApiKey(apiKey),
              entropy: entropy,
              contextType: this.analyzeContextType(context),
              patternType: patternKey
            }
          });

          detections.push(detection);
        }
      }
    }

    return detections;
  }

  /**
   * Validates API key based on pattern rules and context
   * @param {string} apiKey - API key to validate
   * @param {Object} pattern - Pattern configuration
   * @param {string} context - Surrounding context
   * @param {number|null} entropy - Calculated entropy (if applicable)
   * @returns {boolean} True if API key is valid
   */
  validate(apiKey, pattern, context, entropy) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Check length constraints
    if (pattern.minLength && apiKey.length < pattern.minLength) {
      return false;
    }
    if (pattern.maxLength && apiKey.length > pattern.maxLength) {
      return false;
    }

    // Check entropy requirements
    if (pattern.entropy && pattern.minEntropy) {
      if (!entropy || entropy < pattern.minEntropy) {
        return false;
      }
    }

    // Check for invalid patterns
    for (const invalidPattern of this.invalidPatterns) {
      if (invalidPattern.test(apiKey)) {
        return false;
      }
    }

    // Special validation for AWS secret keys (need context keywords)
    if (pattern.name === 'AWS Secret Key') {
      const contextLower = context.toLowerCase();
      const hasAwsContext = pattern.contextKeywords.some(keyword => 
        contextLower.includes(keyword)
      );
      if (!hasAwsContext) {
        return false;
      }
    }

    // Check for repeated patterns (like AKIA1111111111111111)
    if (this.hasRepeatedPattern(apiKey)) {
      return false;
    }

    return true;
  }

  /**
   * Checks if string has repeated patterns that indicate it's not a real key
   * @param {string} str - String to check
   * @returns {boolean} True if has repeated patterns
   */
  hasRepeatedPattern(str) {
    // Check for repeated digits or characters
    const repeatedDigits = /(\d)\1{4,}/.test(str);
    const repeatedChars = /([A-Za-z])\1{4,}/.test(str);
    
    return repeatedDigits || repeatedChars;
  }

  /**
   * Calculates Shannon entropy of a string
   * @param {string} str - String to analyze
   * @returns {number} Entropy value
   */
  calculateEntropy(str) {
    if (!str || str.length <= 1) {
      return 0;
    }

    const charCounts = {};
    for (const char of str) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    let entropy = 0;
    const length = str.length;

    for (const count of Object.values(charCounts)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Masks API key for safe display
   * @param {string} apiKey - API key to mask
   * @returns {string} Masked API key
   */
  maskApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return '';
    }

    if (apiKey.length <= 2) {
      return '*'.repeat(apiKey.length);
    }

    if (apiKey.length <= 4) {
      return apiKey[0] + '*'.repeat(apiKey.length - 2) + apiKey[apiKey.length - 1];
    }

    if (apiKey.length <= 8) {
      // For keys 5-8 characters, show first and last, mask middle
      return apiKey[0] + '*'.repeat(apiKey.length - 2) + apiKey[apiKey.length - 1];
    }

    // Show first 4 and last 4 characters for longer keys
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(apiKey.length - 8);
    
    return start + middle + end;
  }

  /**
   * Extracts context around the detected API key
   * @param {string} text - Full text
   * @param {number} startIndex - Start index of API key
   * @param {number} endIndex - End index of API key
   * @returns {string} Context string
   */
  extractContext(text, startIndex, endIndex) {
    const contextRadius = 50; // Characters before and after
    const contextStart = Math.max(0, startIndex - contextRadius);
    const contextEnd = Math.min(text.length, endIndex + contextRadius);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Calculates confidence score for the API key detection
   * @param {string} apiKey - Detected API key
   * @param {string} context - Surrounding context
   * @param {Object} pattern - Pattern configuration
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(apiKey, context, pattern) {
    let confidence = 0.6; // Base confidence

    // Higher confidence for known patterns vs entropy-based
    if (!pattern.entropy) {
      confidence += 0.3; // Known patterns are more reliable
    } else {
      confidence += 0.1; // Entropy-based patterns are less certain
    }

    // Adjust based on context
    const contextLower = context.toLowerCase();
    
    if (this.apiContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.1;
    }

    if (this.sensitiveContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.05;
    }

    if (this.configContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.05;
    }

    // Higher confidence for longer keys (more specific)
    if (apiKey.length >= 32) {
      confidence += 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Determines risk level based on context and pattern
   * @param {string} context - Surrounding context
   * @param {Object} pattern - Pattern configuration
   * @returns {string} Risk level
   */
  determineRiskLevel(context, pattern) {
    const contextLower = context.toLowerCase();
    
    // High risk for secret keys and production contexts
    if (pattern.name.includes('Secret') || 
        contextLower.includes('secret') ||
        contextLower.includes('private') ||
        contextLower.includes('prod') ||
        contextLower.includes('live')) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Medium risk for test keys
    if (pattern.name.includes('Test') || 
        contextLower.includes('test') ||
        contextLower.includes('dev') ||
        contextLower.includes('development')) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium';
    }

    // Default to high risk for API keys (better safe than sorry)
    return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
  }

  /**
   * Analyzes the type of context around the API key
   * @param {string} context - Context string
   * @returns {string} Context type
   */
  analyzeContextType(context) {
    const contextLower = context.toLowerCase();
    
    // Check sensitive context first (highest priority)
    if (this.sensitiveContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'sensitive';
    }
    
    if (this.configContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'configuration';
    }
    
    if (this.apiContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'api';
    }
    
    return 'neutral';
  }

  /**
   * Creates a detection result object for API key detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ apiKey, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.API_KEY,
        text: apiKey,
        startIndex,
        endIndex,
        confidence,
        riskLevel,
        context,
        suggestions: [
          window.LeakAI.Action.MASK,
          window.LeakAI.Action.REMOVE,
          window.LeakAI.Action.REPLACE,
          window.LeakAI.Action.IGNORE_ONCE
        ],
        metadata
      });
    }

    // Fallback for testing environment
    return {
      id: `api_key_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'api_key',
      text: apiKey,
      startIndex,
      endIndex,
      confidence,
      riskLevel,
      context,
      suggestions: ['mask', 'remove', 'replace', 'ignore_once'],
      metadata,
      timestamp: Date.now()
    };
  }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiKeyDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.ApiKeyDetector = ApiKeyDetector;
}