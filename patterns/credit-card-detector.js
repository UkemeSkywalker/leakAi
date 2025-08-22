// LeakAI Credit Card Detection Pattern Matcher
// Detects credit card numbers with Luhn validation and card type identification

/**
 * CreditCardDetector class for detecting credit card numbers in text
 */
class CreditCardDetector {
  constructor() {
    // Credit card number patterns (13-19 digits with optional separators)
    this.creditCardRegex = /\b(?:\d{4}[-\s]?){3}\d{1,4}\b|\b\d{13,19}\b/g;
    
    // Card type patterns
    this.cardTypes = {
      visa: {
        pattern: /^4\d{12}(?:\d{3})?$/,
        name: 'Visa',
        lengths: [13, 16, 19]
      },
      mastercard: {
        pattern: /^5[1-5]\d{14}$|^2(?:2(?:2[1-9]|[3-9]\d)|[3-6]\d{2}|7(?:[01]\d|20))\d{12}$/,
        name: 'Mastercard',
        lengths: [16]
      },
      amex: {
        pattern: /^3[47]\d{13}$/,
        name: 'American Express',
        lengths: [15]
      },
      discover: {
        pattern: /^6(?:011|5\d{2})\d{12}$/,
        name: 'Discover',
        lengths: [16]
      },
      diners: {
        pattern: /^3[0689]\d{11}$/,
        name: 'Diners Club',
        lengths: [14]
      },
      jcb: {
        pattern: /^35(?:2[89]|[3-8]\d)\d{12}$/,
        name: 'JCB',
        lengths: [16]
      }
    };
    
    // Context keywords for credit card identification
    this.cardContextKeywords = ['card', 'credit', 'payment', 'visa', 'mastercard', 'amex', 'discover'];
    this.sensitiveContextKeywords = ['payment', 'checkout', 'billing', 'purchase', 'transaction'];
  }

  /**
   * Detects credit card numbers in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    this.creditCardRegex.lastIndex = 0;
    let match;

    while ((match = this.creditCardRegex.exec(text)) !== null) {
      const cardNumber = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + cardNumber.length;

      // Clean the card number (remove spaces and hyphens)
      const cleanedNumber = this.cleanCardNumber(cardNumber);

      // Validate using Luhn algorithm and length
      if (this.validate(cleanedNumber)) {
        // Extract context around the card number
        const context = this.extractContext(text, startIndex, endIndex);
        
        // Identify card type
        const cardType = this.identifyCardType(cleanedNumber);
        
        // Calculate confidence based on card type and context
        const confidence = this.calculateConfidence(cleanedNumber, context, cardType);
        
        // Determine risk level (credit cards are always high risk)
        const riskLevel = this.determineRiskLevel(context);
        
        // Create detection result
        const detection = this.createDetectionResult({
          cardNumber,
          startIndex,
          endIndex,
          confidence,
          riskLevel,
          context,
          metadata: {
            cleaned: cleanedNumber,
            cardType: cardType.name,
            lastFour: cleanedNumber.slice(-4),
            maskedNumber: this.maskCardNumber(cleanedNumber),
            isValidLuhn: this.luhnValidation(cleanedNumber),
            contextType: this.analyzeContextType(context)
          }
        });

        detections.push(detection);
      }
    }

    this.creditCardRegex.lastIndex = 0;
    return detections;
  }

  /**
   * Validates credit card number using Luhn algorithm and length checks
   * @param {string} cardNumber - Credit card number to validate
   * @returns {boolean} True if card number is valid
   */
  validate(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }

    const cleaned = this.cleanCardNumber(cardNumber);
    
    // Check length (13-19 digits)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    // Check if all digits
    if (!/^\d+$/.test(cleaned)) {
      return false;
    }

    // Check for obviously invalid patterns
    if (/^(\d)\1+$/.test(cleaned)) {
      // All same digits (like 1111111111111111)
      return false;
    }

    if (cleaned.startsWith('0000') || cleaned.includes('000000')) {
      // Suspicious patterns
      return false;
    }

    // Validate using Luhn algorithm
    return this.luhnValidation(cleaned);
  }

  /**
   * Implements the Luhn algorithm for credit card validation
   * @param {string} cardNumber - Clean credit card number (digits only)
   * @returns {boolean} True if Luhn validation passes
   */
  luhnValidation(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }

    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Identifies the credit card type based on the number
   * @param {string} cardNumber - Clean credit card number
   * @returns {Object} Card type information
   */
  identifyCardType(cardNumber) {
    if (!cardNumber) {
      return { name: 'Unknown', pattern: null };
    }

    for (const [key, cardType] of Object.entries(this.cardTypes)) {
      if (cardType.pattern.test(cardNumber) && cardType.lengths.includes(cardNumber.length)) {
        return cardType;
      }
    }

    return { name: 'Unknown', pattern: null };
  }

  /**
   * Cleans credit card number by removing non-digit characters
   * @param {string} cardNumber - Raw credit card number
   * @returns {string} Cleaned card number (digits only)
   */
  cleanCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '';
    }
    return cardNumber.replace(/[^\d]/g, '');
  }

  /**
   * Masks credit card number for display (shows only last 4 digits)
   * @param {string} cardNumber - Clean credit card number
   * @returns {string} Masked card number
   */
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) {
      return '*'.repeat(cardNumber.length);
    }
    
    const lastFour = cardNumber.slice(-4);
    const maskedPart = '*'.repeat(cardNumber.length - 4);
    return maskedPart + lastFour;
  }

  /**
   * Extracts context around the detected credit card number
   * @param {string} text - Full text
   * @param {number} startIndex - Start index of card number
   * @param {number} endIndex - End index of card number
   * @returns {string} Context string
   */
  extractContext(text, startIndex, endIndex) {
    const contextRadius = 50; // Characters before and after
    const contextStart = Math.max(0, startIndex - contextRadius);
    const contextEnd = Math.min(text.length, endIndex + contextRadius);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Calculates confidence score for the credit card detection
   * @param {string} cardNumber - Clean card number
   * @param {string} context - Surrounding context
   * @param {Object} cardType - Identified card type
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(cardNumber, context, cardType) {
    let confidence = 0.7; // Base confidence for Luhn validation

    // Increase confidence for known card types
    if (cardType.name !== 'Unknown') {
      confidence += 0.2;
    }

    // Adjust based on context
    const contextLower = context.toLowerCase();
    if (this.cardContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.1;
    }

    // Higher confidence for longer card numbers (more specific)
    if (cardNumber.length >= 16) {
      confidence += 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Determines risk level based on context (credit cards are always high risk)
   * @param {string} context - Surrounding context
   * @returns {string} Risk level
   */
  determineRiskLevel(context) {
    // Credit card numbers are always high risk
    return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
  }

  /**
   * Analyzes the type of context around the credit card number
   * @param {string} context - Context string
   * @returns {string} Context type
   */
  analyzeContextType(context) {
    const contextLower = context.toLowerCase();
    
    if (this.sensitiveContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'payment';
    }
    
    if (this.cardContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'financial';
    }
    
    return 'neutral';
  }

  /**
   * Creates a detection result object for credit card detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ cardNumber, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.CREDIT_CARD,
        text: cardNumber,
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
      id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'credit_card',
      text: cardNumber,
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
  module.exports = CreditCardDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.CreditCardDetector = CreditCardDetector;
}