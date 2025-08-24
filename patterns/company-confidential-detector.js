// LeakAI Company Confidential Detection Pattern Matcher
// Detects company-confidential information using configurable organizational terms

/**
 * CompanyConfidentialDetector class for detecting company-confidential information in text
 */
class CompanyConfidentialDetector {
  constructor(customConfig = {}) {
    // Default company-confidential patterns
    this.defaultPatterns = {
      // Project codenames and internal projects
      projectCodenames: [
        'project alpha', 'project beta', 'project gamma', 'project delta',
        'operation', 'initiative', 'program', 'codename', 'internal project'
      ],

      // Client and customer information
      clientTerms: [
        'client', 'customer', 'account', 'prospect', 'lead',
        'client list', 'customer list', 'client database',
        'client information', 'customer data', 'account details'
      ],

      // Financial and business sensitive terms
      financialTerms: [
        'revenue', 'profit', 'loss', 'budget', 'forecast', 'quarterly results',
        'financial data', 'earnings', 'cost', 'pricing', 'margin',
        'contract value', 'deal size', 'sales figures'
      ],

      // Strategic and competitive information
      strategicTerms: [
        'strategy', 'roadmap', 'competitive analysis', 'market research',
        'business plan', 'strategic plan', 'competitive intelligence',
        'merger', 'acquisition', 'partnership', 'joint venture'
      ],

      // Internal processes and systems
      internalTerms: [
        'internal', 'proprietary', 'confidential', 'restricted',
        'company confidential', 'internal use only', 'not for distribution',
        'trade secret', 'intellectual property', 'ip'
      ],

      // Employee and HR information
      employeeTerms: [
        'employee id', 'staff id', 'personnel', 'hr data',
        'salary', 'compensation', 'performance review',
        'employee list', 'org chart', 'organizational chart'
      ]
    };

    // Merge with custom configuration
    this.patterns = this._mergePatterns(this.defaultPatterns, customConfig.patterns || {});
    
    // Custom organizational rules
    this.organizationalRules = customConfig.organizationalRules || [];
    
    // Company-specific terms (can be configured per organization)
    this.companySpecificTerms = customConfig.companySpecificTerms || [];

    // Context keywords that increase confidence
    this.confidentialContextKeywords = [
      'confidential', 'restricted', 'internal', 'proprietary', 'sensitive',
      'do not share', 'not for external', 'company only', 'employees only'
    ];

    // High-risk context keywords
    this.highRiskContextKeywords = [
      'top secret', 'highly confidential', 'executive only', 'board level',
      'classified', 'need to know', 'restricted access'
    ];

    // Compile regex patterns for efficient matching
    this._compilePatterns();
  }

  /**
   * Merge default patterns with custom patterns
   * @param {Object} defaultPatterns - Default pattern categories
   * @param {Object} customPatterns - Custom pattern categories
   * @returns {Object} Merged patterns
   */
  _mergePatterns(defaultPatterns, customPatterns) {
    const merged = { ...defaultPatterns };
    
    for (const [category, terms] of Object.entries(customPatterns)) {
      if (merged[category]) {
        merged[category] = [...merged[category], ...terms];
      } else {
        merged[category] = terms;
      }
    }
    
    return merged;
  }

  /**
   * Compile regex patterns from keyword arrays
   */
  _compilePatterns() {
    this.compiledPatterns = {};
    
    for (const [category, terms] of Object.entries(this.patterns)) {
      if (terms && terms.length > 0) {
        // Escape special regex characters and create word boundary patterns
        const escapedTerms = terms.map(term => 
          term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        );
        this.compiledPatterns[category] = new RegExp(
          `\\b(${escapedTerms.join('|')})\\b`, 'gi'
        );
      }
    }

    // Compile company-specific terms if provided
    if (this.companySpecificTerms.length > 0) {
      const escapedTerms = this.companySpecificTerms.map(term => 
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      this.compiledPatterns.companySpecific = new RegExp(
        `\\b(${escapedTerms.join('|')})\\b`, 'gi'
      );
    }
  }

  /**
   * Configure company-specific terms
   * @param {Array} terms - Array of company-specific terms to detect
   */
  configureCompanyTerms(terms) {
    this.companySpecificTerms = terms || [];
    this._compilePatterns(); // Recompile patterns with new terms
  }

  /**
   * Add organizational rule
   * @param {Object} rule - Organizational rule object
   * @param {string} rule.pattern - Pattern to match (can be regex pattern)
   * @param {string} rule.riskLevel - Risk level for matches
   * @param {string} rule.description - Description of the rule
   */
  addOrganizationalRule(rule) {
    if (rule && rule.pattern && rule.riskLevel) {
      this.organizationalRules.push({
        pattern: rule.pattern,
        riskLevel: rule.riskLevel,
        description: rule.description || 'Custom organizational rule',
        regex: new RegExp(rule.pattern, 'gi') // Use pattern as-is for regex
      });
    }
  }

  /**
   * Detects company-confidential information in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    
    // Detect different categories of company-confidential information
    for (const [category, regex] of Object.entries(this.compiledPatterns)) {
      if (regex) {
        detections.push(...this._detectPattern(text, regex, category));
      }
    }

    // Apply organizational rules
    detections.push(...this._applyOrganizationalRules(text));

    // Remove duplicates and overlapping detections
    return this._removeDuplicates(detections);
  }

  /**
   * Generic pattern detection method
   * @param {string} text - Text to analyze
   * @param {RegExp} regex - Regex pattern to match
   * @param {string} category - Category of company-confidential information
   * @returns {Array} Array of detection results
   */
  _detectPattern(text, regex, category) {
    const detections = [];
    regex.lastIndex = 0; // Reset regex state
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchedText = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + matchedText.length;

      // Extract context around the match
      const context = this.extractContext(text, startIndex, endIndex);
      
      // Calculate confidence based on context
      const confidence = this.calculateConfidence(matchedText, context, category);
      
      // Determine risk level based on category and context
      const riskLevel = this.determineRiskLevel(context, category);
      
      // Create detection result
      const detection = this.createDetectionResult({
        text: matchedText,
        startIndex,
        endIndex,
        confidence,
        riskLevel,
        context,
        metadata: {
          category,
          detectionMethod: 'pattern_matching',
          contextAnalysis: this.analyzeContext(context)
        }
      });

      detections.push(detection);
    }

    regex.lastIndex = 0; // Reset regex state
    return detections;
  }

  /**
   * Apply organizational rules to detect custom patterns
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _applyOrganizationalRules(text) {
    const detections = [];

    for (const rule of this.organizationalRules) {
      if (!rule.regex) continue;

      rule.regex.lastIndex = 0;
      let match;

      while ((match = rule.regex.exec(text)) !== null) {
        const matchedText = match[0];
        const startIndex = match.index;
        const endIndex = startIndex + matchedText.length;

        // Extract context around the match
        const context = this.extractContext(text, startIndex, endIndex);
        
        // Use rule-specified risk level
        const riskLevel = this._mapRiskLevel(rule.riskLevel);
        
        // Calculate confidence (higher for custom rules)
        const confidence = Math.min(0.9, this.calculateConfidence(matchedText, context, 'organizational_rule') + 0.2);
        
        // Create detection result
        const detection = this.createDetectionResult({
          text: matchedText,
          startIndex,
          endIndex,
          confidence,
          riskLevel,
          context,
          metadata: {
            category: 'organizational_rule',
            ruleDescription: rule.description,
            detectionMethod: 'organizational_rule',
            contextAnalysis: this.analyzeContext(context)
          }
        });

        detections.push(detection);
      }

      rule.regex.lastIndex = 0;
    }

    return detections;
  }

  /**
   * Map string risk level to proper enum value
   * @param {string} riskLevel - String risk level
   * @returns {string} Mapped risk level
   */
  _mapRiskLevel(riskLevel) {
    const riskLevelMap = {
      'low': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.LOW) || 'low',
      'medium': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium',
      'high': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high'
    };

    return riskLevelMap[riskLevel.toLowerCase()] || riskLevelMap['medium'];
  }

  /**
   * Extracts context around the detected company-confidential information
   * @param {string} text - Full text
   * @param {number} startIndex - Start index of detection
   * @param {number} endIndex - End index of detection
   * @returns {string} Context string
   */
  extractContext(text, startIndex, endIndex) {
    const contextRadius = 60; // Characters before and after
    const contextStart = Math.max(0, startIndex - contextRadius);
    const contextEnd = Math.min(text.length, endIndex + contextRadius);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Calculates confidence score for the company-confidential detection
   * @param {string} matchedText - Detected text
   * @param {string} context - Surrounding context
   * @param {string} category - Category of detection
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(matchedText, context, category) {
    let confidence = 0.6; // Base confidence for pattern match

    const contextLower = context.toLowerCase();
    const matchedLower = matchedText.toLowerCase();

    // Increase confidence if surrounded by confidential context keywords
    const confidentialContextCount = this.confidentialContextKeywords.filter(keyword => 
      contextLower.includes(keyword)
    ).length;
    
    confidence += Math.min(0.3, confidentialContextCount * 0.1);

    // Increase confidence for specific categories in appropriate contexts
    if (category === 'projectCodenames' && 
        (contextLower.includes('working on') || contextLower.includes('codename'))) {
      confidence += 0.15;
    }

    if (category === 'clientTerms' && 
        (contextLower.includes('customer') || contextLower.includes('account'))) {
      confidence += 0.15;
    }

    if (category === 'financialTerms' && 
        (contextLower.includes('financial') || contextLower.includes('budget') || 
         contextLower.includes('revenue'))) {
      confidence += 0.15;
    }

    if (category === 'companySpecific') {
      confidence += 0.2; // Higher confidence for company-specific terms
    }

    // Decrease confidence for very common terms that might be false positives
    const commonFalsePositives = ['project', 'client', 'internal'];
    if (commonFalsePositives.includes(matchedLower) && confidentialContextCount === 0) {
      confidence -= 0.15; // Reduced penalty to avoid going too low
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Determines risk level based on context and category
   * @param {string} context - Surrounding context
   * @param {string} category - Category of detection
   * @returns {string} Risk level
   */
  determineRiskLevel(context, category) {
    const contextLower = context.toLowerCase();
    
    // Check for high-risk context indicators
    if (this.highRiskContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Check for confidential context
    if (this.confidentialContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Category-based risk levels
    const categoryRiskLevels = {
      'projectCodenames': 'high',
      'clientTerms': 'medium',
      'financialTerms': 'high',
      'strategicTerms': 'high',
      'internalTerms': 'high',
      'employeeTerms': 'high',
      'companySpecific': 'high'
    };

    const baseRiskLevel = categoryRiskLevels[category] || 'medium';
    
    // Map to proper enum values
    const riskLevelMap = {
      'low': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.LOW) || 'low',
      'medium': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium',
      'high': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high'
    };

    return riskLevelMap[baseRiskLevel];
  }

  /**
   * Analyzes the context to provide additional metadata
   * @param {string} context - Context string
   * @returns {Object} Context analysis
   */
  analyzeContext(context) {
    const contextLower = context.toLowerCase();
    
    const analysis = {
      hasConfidentialContext: this.confidentialContextKeywords.some(keyword => contextLower.includes(keyword)),
      hasHighRiskContext: this.highRiskContextKeywords.some(keyword => contextLower.includes(keyword)),
      isRestricted: contextLower.includes('restricted') || contextLower.includes('confidential'),
      contextType: 'general'
    };

    // Determine context type
    if (contextLower.includes('project') || contextLower.includes('initiative')) {
      analysis.contextType = 'project';
    } else if (contextLower.includes('client') || contextLower.includes('customer')) {
      analysis.contextType = 'client';
    } else if (contextLower.includes('financial') || contextLower.includes('budget')) {
      analysis.contextType = 'financial';
    } else if (contextLower.includes('strategic') || contextLower.includes('competitive')) {
      analysis.contextType = 'strategic';
    } else if (contextLower.includes('employee') || contextLower.includes('hr')) {
      analysis.contextType = 'hr';
    } else if (analysis.hasConfidentialContext) {
      analysis.contextType = 'confidential';
    }

    return analysis;
  }

  /**
   * Remove duplicate and overlapping detections
   * @param {Array} detections - Array of detection results
   * @returns {Array} Filtered detection results
   */
  _removeDuplicates(detections) {
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
   * Creates a detection result object for company-confidential detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ text, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.COMPANY_CONFIDENTIAL,
        text,
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
      id: `company_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'company_confidential',
      text,
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
  module.exports = CompanyConfidentialDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.CompanyConfidentialDetector = CompanyConfidentialDetector;
}