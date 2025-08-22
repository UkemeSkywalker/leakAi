// LeakAI Data Models and Interfaces
// Defines the core data structures used throughout the detection system

/**
 * Detection types enum - categories of sensitive data that can be detected
 */
const DetectionType = {
  EMAIL: 'email',
  PHONE: 'phone',
  CREDIT_CARD: 'credit_card',
  API_KEY: 'api_key',
  CRYPTO_SEED: 'crypto_seed',
  CRYPTO_PRIVATE_KEY: 'crypto_private_key',
  CRYPTO_ADDRESS: 'crypto_address',
  HEALTH_INFO: 'health_info',
  COMPANY_CONFIDENTIAL: 'company_confidential',
  PERSON_NAME: 'person_name',
  LOCATION: 'location',
  ORGANIZATION: 'organization'
};

/**
 * Risk levels enum - severity levels for detected sensitive data
 */
const RiskLevel = {
  LOW: 'low',        // Gray underline, informational only
  MEDIUM: 'medium',  // Amber underline, warning on submit
  HIGH: 'high'       // Red underline, block on submit
};

/**
 * Available remediation actions enum
 */
const Action = {
  MASK: 'mask',           // Replace with masked version
  REMOVE: 'remove',       // Delete the text
  REPLACE: 'replace',     // Allow user to enter replacement
  ENCRYPT: 'encrypt',     // Replace with encrypted token
  IGNORE_ONCE: 'ignore_once' // Temporarily ignore this instance
};

/**
 * Creates a new DetectionResult object
 * @param {Object} params - Detection result parameters
 * @param {string} params.type - DetectionType value
 * @param {string} params.text - Detected text content
 * @param {number} params.startIndex - Start position in original text
 * @param {number} params.endIndex - End position in original text
 * @param {number} params.confidence - Confidence score (0-1)
 * @param {string} params.riskLevel - RiskLevel value
 * @param {string} params.context - Surrounding text context
 * @param {Array} params.suggestions - Available remediation actions
 * @param {Object} params.metadata - Type-specific additional data
 * @returns {DetectionResult} New detection result object
 */
function createDetectionResult({
  type,
  text,
  startIndex,
  endIndex,
  confidence,
  riskLevel,
  context = '',
  suggestions = [],
  metadata = {}
}) {
  // Generate unique ID for this detection
  const id = `detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Validate required parameters
  if (!type || !Object.values(DetectionType).includes(type)) {
    throw new Error(`Invalid detection type: ${type}`);
  }
  
  if (!riskLevel || !Object.values(RiskLevel).includes(riskLevel)) {
    throw new Error(`Invalid risk level: ${riskLevel}`);
  }
  
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    throw new Error(`Invalid confidence score: ${confidence}. Must be between 0 and 1`);
  }
  
  if (typeof startIndex !== 'number' || typeof endIndex !== 'number' || startIndex >= endIndex) {
    throw new Error(`Invalid indices: startIndex=${startIndex}, endIndex=${endIndex}`);
  }
  
  // Validate suggestions array
  if (suggestions.length > 0) {
    const invalidActions = suggestions.filter(action => !Object.values(Action).includes(action));
    if (invalidActions.length > 0) {
      throw new Error(`Invalid actions: ${invalidActions.join(', ')}`);
    }
  }
  
  return {
    id,
    type,
    text,
    startIndex,
    endIndex,
    confidence,
    riskLevel,
    context,
    suggestions,
    metadata,
    timestamp: Date.now()
  };
}

/**
 * Validates a DetectionResult object
 * @param {Object} result - Detection result to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateDetectionResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Detection result must be an object');
  }
  
  const requiredFields = ['id', 'type', 'text', 'startIndex', 'endIndex', 'confidence', 'riskLevel'];
  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate field types and values
  if (!Object.values(DetectionType).includes(result.type)) {
    throw new Error(`Invalid detection type: ${result.type}`);
  }
  
  if (!Object.values(RiskLevel).includes(result.riskLevel)) {
    throw new Error(`Invalid risk level: ${result.riskLevel}`);
  }
  
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    throw new Error(`Invalid confidence score: ${result.confidence}`);
  }
  
  return true;
}

// Export all enums and functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    DetectionType,
    RiskLevel,
    Action,
    createDetectionResult,
    validateDetectionResult
  };
} else {
  // Browser environment
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.DetectionType = DetectionType;
  window.LeakAI.RiskLevel = RiskLevel;
  window.LeakAI.Action = Action;
  window.LeakAI.createDetectionResult = createDetectionResult;
  window.LeakAI.validateDetectionResult = validateDetectionResult;
}