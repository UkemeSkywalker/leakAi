// LeakAI Phone Number Detection Pattern Matcher
// Detects phone numbers in E.164 and common formats with validation and normalization

/**
 * PhoneDetector class for detecting phone numbers in text
 */
class PhoneDetector {
  constructor() {
    // E.164 format: +1234567890 (1-15 digits)
    this.e164Regex = /\+[1-9]\d{1,14}\b/g;
    
    // US/Canada format variations  
    this.usFormatRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    
    // International format with country codes
    this.intlFormatRegex = /(?:\+|00)[1-9]\d{0,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g;
    
    // Generic phone pattern (fallback)
    this.genericPhoneRegex = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    
    // Context keywords for phone number identification
    this.phoneContextKeywords = ['phone', 'tel', 'call', 'mobile', 'cell', 'number', 'contact'];
    this.personalContextKeywords = ['my phone', 'personal', 'private', 'home', 'mobile'];
    this.businessContextKeywords = ['office', 'work', 'business', 'company', 'support'];
  }

  /**
   * Detects phone numbers in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    const foundRanges = []; // Track overlapping ranges

    // Try different regex patterns in order of preference
    const patterns = [
      { regex: this.e164Regex, type: 'e164', priority: 1 },
      { regex: this.usFormatRegex, type: 'us_format', priority: 2 },
      { regex: this.intlFormatRegex, type: 'international', priority: 3 },
      { regex: this.genericPhoneRegex, type: 'generic', priority: 4 }
    ];

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0; // Reset regex state
      let match;

      while ((match = pattern.regex.exec(text)) !== null) {
        const phoneNumber = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + phoneNumber.length;

        // Check for overlapping ranges (prefer higher priority matches)
        const isOverlapping = foundRanges.some(range => 
          (startIndex >= range.start && startIndex < range.end) ||
          (endIndex > range.start && endIndex <= range.end) ||
          (startIndex <= range.start && endIndex >= range.end)
        );

        if (isOverlapping) {
          continue;
        }

        // Validate the phone number
        if (this.validate(phoneNumber)) {
          foundRanges.push({ start: startIndex, end: endIndex });

          // Extract context around the phone number
          const context = this.extractContext(text, startIndex, endIndex);
          
          // Normalize the phone number
          const normalized = this.normalizeNumber(phoneNumber);
          
          // Calculate confidence based on format and context
          const confidence = this.calculateConfidence(phoneNumber, context, pattern.type);
          
          // Determine risk level based on context
          const riskLevel = this.determineRiskLevel(context);
          
          // Create detection result
          const detection = this.createDetectionResult({
            phoneNumber,
            startIndex,
            endIndex,
            confidence,
            riskLevel,
            context,
            metadata: {
              normalized,
              format: pattern.type,
              country: this.extractCountryCode(normalized),
              contextType: this.analyzeContextType(context)
            }
          });

          detections.push(detection);
        }
      }
    }

    return detections;
  }

  /**
   * Validates phone number format and length
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if phone number is valid
   */
  validate(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Must have at least 7 digits (minimum for a valid phone number)
    const digitCount = cleaned.replace(/\+/g, '').length;
    if (digitCount < 7 || digitCount > 15) {
      return false;
    }

    // E.164 format validation
    if (cleaned.startsWith('+')) {
      // Must be +[country code][number], total 8-16 characters
      if (cleaned.length < 8 || cleaned.length > 16) {
        return false;
      }
      // Country code must be 1-4 digits
      const countryCodeMatch = cleaned.match(/^\+(\d{1,4})/);
      if (!countryCodeMatch) {
        return false;
      }
    }

    // Check for obviously invalid patterns (but be less strict for testing)
    const digitsOnly = cleaned.replace(/\+/g, '');
    if (digitsOnly.length >= 7 && /^(\d)\1+$/.test(digitsOnly)) {
      // All same digits (like 1111111111) - but allow shorter sequences
      return false;
    }

    return true;
  }

  /**
   * Normalizes phone number to E.164 format when possible
   * @param {string} phone - Phone number to normalize
   * @returns {string} Normalized phone number
   */
  normalizeNumber(phone) {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If already in E.164 format, return as-is
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Handle US/Canada numbers with leading 1
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // Handle US/Canada numbers (assume +1 if 10 digits)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    // For other formats, add + if not present (best guess)
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }

  /**
   * Extracts context around the detected phone number
   * @param {string} text - Full text
   * @param {number} startIndex - Start index of phone number
   * @param {number} endIndex - End index of phone number
   * @returns {string} Context string
   */
  extractContext(text, startIndex, endIndex) {
    const contextRadius = 50; // Characters before and after
    const contextStart = Math.max(0, startIndex - contextRadius);
    const contextEnd = Math.min(text.length, endIndex + contextRadius);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Calculates confidence score for the phone number detection
   * @param {string} phone - Detected phone number
   * @param {string} context - Surrounding context
   * @param {string} formatType - Type of format detected
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(phone, context, formatType) {
    let confidence = 0.6; // Base confidence

    // Adjust based on format type
    switch (formatType) {
      case 'e164':
        confidence += 0.3; // E.164 is most reliable
        break;
      case 'us_format':
        confidence += 0.2; // US format is quite reliable
        break;
      case 'international':
        confidence += 0.15; // International format is good
        break;
      case 'generic':
        confidence += 0.1; // Generic format is less reliable
        break;
    }

    // Adjust based on context
    const contextLower = context.toLowerCase();
    if (this.phoneContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.1;
    }

    if (this.personalContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.05;
    }

    // Check for phone number length (more digits = higher confidence)
    const digitCount = phone.replace(/[^\d]/g, '').length;
    if (digitCount >= 10) {
      confidence += 0.05;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Determines risk level based on context
   * @param {string} context - Surrounding context
   * @returns {string} Risk level
   */
  determineRiskLevel(context) {
    const contextLower = context.toLowerCase();
    
    // High risk indicators
    if (contextLower.includes('verification') || 
        contextLower.includes('2fa') || 
        contextLower.includes('two-factor') ||
        contextLower.includes('sms code') ||
        contextLower.includes('auth')) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Medium risk indicators
    if (this.personalContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium';
    }

    // Default to low risk for general phone number detection
    return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.LOW) || 'low';
  }

  /**
   * Extracts country code from normalized phone number
   * @param {string} normalizedPhone - Normalized phone number
   * @returns {string} Country code or 'unknown'
   */
  extractCountryCode(normalizedPhone) {
    if (!normalizedPhone.startsWith('+')) {
      return 'unknown';
    }

    // Common country codes (ordered by length, longest first)
    const countryCodes = {
      '+1': 'US/CA',
      '+44': 'UK',
      '+49': 'DE',
      '+33': 'FR',
      '+39': 'IT',
      '+34': 'ES',
      '+86': 'CN',
      '+81': 'JP',
      '+91': 'IN',
      '+61': 'AU'
    };

    // Try to match known country codes
    for (const [code, country] of Object.entries(countryCodes)) {
      if (normalizedPhone.startsWith(code)) {
        return country;
      }
    }

    // Extract first 1-3 digits as country code (most country codes are 1-3 digits)
    const match = normalizedPhone.match(/^\+(\d{1,3})/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Analyzes the type of context around the phone number
   * @param {string} context - Context string
   * @returns {string} Context type
   */
  analyzeContextType(context) {
    const contextLower = context.toLowerCase();
    
    if (this.personalContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'personal';
    }
    
    if (this.businessContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'business';
    }
    
    return 'neutral';
  }

  /**
   * Creates a detection result object for phone number detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ phoneNumber, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.PHONE,
        text: phoneNumber,
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
      id: `phone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'phone',
      text: phoneNumber,
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
  module.exports = PhoneDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.PhoneDetector = PhoneDetector;
}