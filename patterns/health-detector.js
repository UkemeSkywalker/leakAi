// LeakAI Health Information Detection Pattern Matcher
// Detects health-related information using medical terminology patterns

/**
 * HealthDetector class for detecting health information in text
 */
class HealthDetector {
  constructor() {
    // Medical condition patterns
    this.medicalConditions = [
      'diabetes', 'hypertension', 'cancer', 'depression', 'anxiety', 'asthma',
      'arthritis', 'heart disease', 'stroke', 'alzheimer', 'parkinson',
      'epilepsy', 'schizophrenia', 'bipolar', 'ptsd', 'adhd', 'autism',
      'fibromyalgia', 'lupus', 'multiple sclerosis', 'crohn', 'ibs',
      'hepatitis', 'hiv', 'aids', 'tuberculosis', 'pneumonia', 'bronchitis'
    ];

    // Medical procedure patterns
    this.medicalProcedures = [
      'surgery', 'operation', 'biopsy', 'chemotherapy', 'radiation',
      'dialysis', 'transplant', 'bypass', 'angioplasty', 'endoscopy',
      'colonoscopy', 'mammography', 'mri', 'ct scan', 'x-ray', 'ultrasound',
      'blood test', 'urine test', 'ecg', 'ekg', 'eeg'
    ];

    // Medication patterns
    this.medications = [
      'prescription', 'medication', 'pills', 'tablets', 'capsules',
      'insulin', 'antibiotics', 'painkillers', 'antidepressants',
      'blood pressure medication', 'cholesterol medication',
      'aspirin', 'ibuprofen', 'acetaminophen', 'morphine', 'codeine'
    ];

    // Health record identifiers
    this.healthRecords = [
      'medical record', 'patient record', 'health record', 'medical history',
      'patient id', 'medical id', 'hospital record', 'chart number',
      'mrn', 'medical record number', 'patient number'
    ];

    // Insurance and billing terms
    this.insuranceTerms = [
      'health insurance', 'medical insurance', 'insurance claim',
      'policy number', 'group number', 'member id', 'subscriber id',
      'copay', 'deductible', 'medicare', 'medicaid', 'hmo', 'ppo'
    ];

    // Sensitive health identifiers (higher risk)
    this.sensitiveIdentifiers = [
      'ssn', 'social security number', 'date of birth', 'dob',
      'patient ssn', 'medical ssn', 'insurance ssn'
    ];

    // Context keywords that increase confidence
    this.medicalContextKeywords = [
      'doctor', 'physician', 'nurse', 'hospital', 'clinic', 'medical',
      'health', 'patient', 'diagnosis', 'treatment', 'therapy', 'care'
    ];

    // High-risk context keywords
    this.highRiskContextKeywords = [
      'confidential', 'private', 'personal health', 'medical records',
      'patient information', 'hipaa', 'protected health information', 'phi'
    ];

    // Compile regex patterns for efficient matching
    this._compilePatterns();
  }

  /**
   * Compile regex patterns from keyword arrays
   */
  _compilePatterns() {
    // Create case-insensitive regex patterns
    this.conditionRegex = new RegExp(`\\b(${this.medicalConditions.join('|')})\\b`, 'gi');
    this.procedureRegex = new RegExp(`\\b(${this.medicalProcedures.join('|')})\\b`, 'gi');
    this.medicationRegex = new RegExp(`\\b(${this.medications.join('|')})\\b`, 'gi');
    this.recordRegex = new RegExp(`\\b(${this.healthRecords.join('|')})\\b`, 'gi');
    this.insuranceRegex = new RegExp(`\\b(${this.insuranceTerms.join('|')})\\b`, 'gi');
    this.sensitiveRegex = new RegExp(`\\b(${this.sensitiveIdentifiers.join('|')})\\b`, 'gi');
  }

  /**
   * Detects health information in the given text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  detect(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const detections = [];
    
    // Detect different types of health information
    detections.push(...this._detectMedicalConditions(text));
    detections.push(...this._detectMedicalProcedures(text));
    detections.push(...this._detectMedications(text));
    detections.push(...this._detectHealthRecords(text));
    detections.push(...this._detectInsuranceTerms(text));
    detections.push(...this._detectSensitiveIdentifiers(text));

    // Remove duplicates and overlapping detections
    return this._removeDuplicates(detections);
  }

  /**
   * Detect medical conditions in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectMedicalConditions(text) {
    return this._detectPattern(text, this.conditionRegex, 'medical_condition', 'medium');
  }

  /**
   * Detect medical procedures in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectMedicalProcedures(text) {
    return this._detectPattern(text, this.procedureRegex, 'medical_procedure', 'medium');
  }

  /**
   * Detect medications in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectMedications(text) {
    return this._detectPattern(text, this.medicationRegex, 'medication', 'medium');
  }

  /**
   * Detect health records in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectHealthRecords(text) {
    return this._detectPattern(text, this.recordRegex, 'health_record', 'high');
  }

  /**
   * Detect insurance terms in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectInsuranceTerms(text) {
    return this._detectPattern(text, this.insuranceRegex, 'health_insurance', 'medium');
  }

  /**
   * Detect sensitive health identifiers in text
   * @param {string} text - Text to analyze
   * @returns {Array} Array of detection results
   */
  _detectSensitiveIdentifiers(text) {
    return this._detectPattern(text, this.sensitiveRegex, 'sensitive_health_id', 'high');
  }

  /**
   * Generic pattern detection method
   * @param {string} text - Text to analyze
   * @param {RegExp} regex - Regex pattern to match
   * @param {string} subtype - Subtype of health information
   * @param {string} baseRiskLevel - Base risk level for this pattern type
   * @returns {Array} Array of detection results
   */
  _detectPattern(text, regex, subtype, baseRiskLevel) {
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
      const confidence = this.calculateConfidence(matchedText, context, subtype);
      
      // Determine final risk level based on context
      const riskLevel = this.determineRiskLevel(context, baseRiskLevel);
      
      // Create detection result
      const detection = this.createDetectionResult({
        text: matchedText,
        startIndex,
        endIndex,
        confidence,
        riskLevel,
        context,
        metadata: {
          subtype,
          baseRiskLevel,
          contextAnalysis: this.analyzeContext(context)
        }
      });

      detections.push(detection);
    }

    regex.lastIndex = 0; // Reset regex state
    return detections;
  }

  /**
   * Extracts context around the detected health information
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
   * Calculates confidence score for the health information detection
   * @param {string} matchedText - Detected text
   * @param {string} context - Surrounding context
   * @param {string} subtype - Subtype of health information
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(matchedText, context, subtype) {
    let confidence = 0.6; // Base confidence for pattern match

    const contextLower = context.toLowerCase();
    const matchedLower = matchedText.toLowerCase();

    // Increase confidence if surrounded by medical context keywords
    const medicalContextCount = this.medicalContextKeywords.filter(keyword => 
      contextLower.includes(keyword)
    ).length;
    
    confidence += Math.min(0.3, medicalContextCount * 0.1);

    // Increase confidence for specific subtypes in appropriate contexts
    if (subtype === 'medical_condition' && 
        (contextLower.includes('diagnosed') || contextLower.includes('suffering') || 
         contextLower.includes('treatment for'))) {
      confidence += 0.15;
    }

    if (subtype === 'medication' && 
        (contextLower.includes('prescribed') || contextLower.includes('taking') || 
         contextLower.includes('dosage'))) {
      confidence += 0.15;
    }

    if (subtype === 'health_record' && 
        (contextLower.includes('record number') || contextLower.includes('patient id'))) {
      confidence += 0.2;
    }

    // Decrease confidence for very common terms that might be false positives
    const commonFalsePositives = ['care', 'health', 'medical'];
    if (commonFalsePositives.includes(matchedLower) && medicalContextCount === 0) {
      confidence -= 0.2;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Determines risk level based on context and base risk
   * @param {string} context - Surrounding context
   * @param {string} baseRiskLevel - Base risk level for the pattern type
   * @returns {string} Final risk level
   */
  determineRiskLevel(context, baseRiskLevel) {
    const contextLower = context.toLowerCase();
    
    // Check for high-risk context indicators
    if (this.highRiskContextKeywords.some(keyword => contextLower.includes(keyword))) {
      return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
    }

    // Check for sensitive information context
    if (contextLower.includes('confidential') || 
        contextLower.includes('private') || 
        contextLower.includes('personal')) {
      // Upgrade medium to high, keep high as high
      if (baseRiskLevel === 'medium') {
        return (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high';
      }
    }

    // Return base risk level mapped to proper enum
    const riskLevelMap = {
      'low': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.LOW) || 'low',
      'medium': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.MEDIUM) || 'medium',
      'high': (typeof window !== 'undefined' && window.LeakAI?.RiskLevel?.HIGH) || 'high'
    };

    return riskLevelMap[baseRiskLevel] || riskLevelMap['medium'];
  }

  /**
   * Analyzes the context to provide additional metadata
   * @param {string} context - Context string
   * @returns {Object} Context analysis
   */
  analyzeContext(context) {
    const contextLower = context.toLowerCase();
    
    const analysis = {
      hasMedicalContext: this.medicalContextKeywords.some(keyword => contextLower.includes(keyword)),
      hasHighRiskContext: this.highRiskContextKeywords.some(keyword => contextLower.includes(keyword)),
      isConfidential: contextLower.includes('confidential') || contextLower.includes('private'),
      contextType: 'general'
    };

    // Determine context type
    if (contextLower.includes('hospital') || contextLower.includes('clinic')) {
      analysis.contextType = 'clinical';
    } else if (contextLower.includes('insurance') || contextLower.includes('claim')) {
      analysis.contextType = 'insurance';
    } else if (contextLower.includes('record') || contextLower.includes('chart')) {
      analysis.contextType = 'records';
    } else if (analysis.hasMedicalContext) {
      analysis.contextType = 'medical';
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
        // If there's an overlap, keep the one with higher priority
        const overlappingIndex = filtered.findIndex(existing => 
          detection.startIndex < existing.endIndex && 
          detection.endIndex > existing.startIndex
        );
        
        if (overlappingIndex !== -1) {
          // Priority order: sensitive_health_id > health_record > others
          const currentPriority = this._getSubtypePriority(detection.metadata.subtype);
          const existingPriority = this._getSubtypePriority(filtered[overlappingIndex].metadata.subtype);
          
          if (currentPriority > existingPriority || 
              (currentPriority === existingPriority && detection.confidence > filtered[overlappingIndex].confidence)) {
            filtered[overlappingIndex] = detection;
          }
        }
      }
    }

    return filtered;
  }

  /**
   * Get priority for subtype (higher number = higher priority)
   * @param {string} subtype - Detection subtype
   * @returns {number} Priority value
   */
  _getSubtypePriority(subtype) {
    const priorities = {
      'sensitive_health_id': 5,
      'health_record': 4,
      'medication': 3,
      'medical_procedure': 2,
      'health_insurance': 2,
      'medical_condition': 1
    };
    return priorities[subtype] || 0;
  }

  /**
   * Creates a detection result object for health information detection
   * @param {Object} params - Detection parameters
   * @returns {Object} Detection result
   */
  createDetectionResult({ text, startIndex, endIndex, confidence, riskLevel, context, metadata }) {
    // Use the global createDetectionResult function if available
    if (typeof window !== 'undefined' && window.LeakAI?.createDetectionResult) {
      return window.LeakAI.createDetectionResult({
        type: window.LeakAI.DetectionType.HEALTH_INFO,
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
      id: `health_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'health_info',
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
  module.exports = HealthDetector;
} else {
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.HealthDetector = HealthDetector;
}