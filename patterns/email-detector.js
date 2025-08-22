// LeakAI Email Detection Pattern Matcher
// Detects email addresses using regex patterns with validation and context extraction

/**
 * EmailDetector class for detecting email addresses in text
 */
class EmailDetector {
  constructor() {
    // Comprehensive email regex pattern
    // Matches most valid email formats including international domains
    this.emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    
    // More restrictive pattern for higher confidence matches
    this.strictEmailRegex = /\b[A-Za-z0-9][A-Za-z0-9._%+-]*[A-Za-z0-9]@[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]\.[A-Za-z]{2,}\b/g;
    
    // Simple validation regex (non-global for validation)
    this.validationRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    
    // Context keywords that might indicate personal vs business context
    this.personalContextKeywords = ['personal', 'private', 'home', 'my email', 'contact me'];
    this.businessContextKeywords = ['work', 'office', 'business', 'company', 'corporate'];
  }

  /**
   * Detects email addresses in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    // Reset regex lastIndex to ensure we get all matches
    this.emailRegex.lastIndex = 0;
    let match;

    while ((match = this.emailRegex.exec(text)) !== null) {
      const email = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + email.length;

      // Validate the email format
      if (this.validate(email)) {
        // Extract context around the email
        const context = this.extractContext(text, startIndex, endIndex);
        
        // Calculate confidence based on email format and context
        const confidence = this.calculateConfidence(email, context);
        
        // Determine risk level based on context
        const riskLevel = this.determineRiskLevel(context);
        
        // Create detection result
        const detection = this.createDetectionResult({
          email,
          startIndex,
          endIndex,
          confidence,
          riskLevel,
          context,
          metadata: {
            domain: this.extractDomain(email),
            isPersonalDomain: this.isPersonalDomain(email),
            contextType: this.analyzeContextType(context)
          }
        });

        detections.push(detection);
      }
    }

    // Reset regex lastIndex after use
    this.emailRegex.lastIndex = 0;
    return detections;
  }

  /**
   * Validates email format using additional checks beyond regex
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  validate(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic format check using non-global regex
    if (!this.validationRegex.test(email)) {
      return false;
    }

    // Additional validation rules
    const parts = email.split('@');
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domain] = parts;

    // Local part validation
    if (localPart.length === 0 || localPart.length > 64) {
      return false;
    }

    // Domain validation
    if (domain.length === 0 || domain.length > 253) {
      return false;
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return false;
    }

    // Check for leading/trailing dots in local part
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return false;
    }

    // Check for valid domain structure
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return false;
    }

    // Check each domain part
    for (const part of domainParts) {
      if (part.length === 0 || part.startsWith('-') || part.endsWith('-')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extracts context around the detected email
   * @param {string} text - Full text
   * @param {number} startIndex - Start index of email
   * @param {number} endIndex - End index of email
   * @returns {string} Context string
   */
  extractContext(text, startIndex, endIndex) {
    const contextRadius = 50; // Characters before and after
    const contextStart = Math.max(0, startIndex - contextRadius);
    const contextEnd = Math.min(text.length, endIndex + contextRadius);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Calculates confidence score for the email detection
   * @param {string} email - Detected email
   * @param {string} context - Surrounding context
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(email, context) {
    let confidence = 0.7; // Base confidence for regex match

    // Use non-global regex for testing to avoid state issues
    const strictRegex = /^[A-Za-z0-9][A-Za-z0-9._%+-]*[A-Za-z0-9]@[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]\.[A-Za-z]{2,}$/;
    
    // Increase confidence for strict regex match
    if (strictRegex.test(email)) {
      confidence += 0.2;
    }

    // Adjust based on domain reputation
    if (this.isPersonalDomain(email)) {
      confidence += 0.1; // Personal domains are more likely to be real emails
    }

    // Adjust based on context
    const contextLower = context.toLowerCase();
    if (this.personalContextKeywords.some(keyword => contextLower.includes(keyword))) {
      confidence += 0.05;
    }

    if (contextLower.includes('email') || contextLower.includes('contact')) {
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
    if (contextLower.includes('password') || 
        contextLower.includes('login') || 
        contextLower.includes('account') ||
        contextLower.includes('signin') ||
        contextLower.includes('sign in')) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Medium risk indicators
    if (this.personalContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium';
    }

    // Default to low risk for general email detection
    return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.LOW) || 'low';
  }

  /**
   * Extracts domain from email address
   * @param {string} email - Email address
   * @returns {string} Domain part
   */
  extractDomain(email) {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }

  /**
   * Checks if email uses a personal domain (gmail, yahoo, etc.)
   * @param {string} email - Email address
   * @returns {boolean} True if personal domain
   */
  isPersonalDomain(email) {
    const domain = this.extractDomain(email);
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    
    return personalDomains.includes(domain);
  }

  /**
   * Analyzes the type of context around the email
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
   * Creates a detection result object for email detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ email, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.EMAIL,
        text: email,
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
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'email',
      text: email,
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
  module.exports = EmailDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.EmailDetector = EmailDetector;
}