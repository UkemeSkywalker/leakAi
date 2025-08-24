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

/**
 * Color scheme options for UI preferences
 */
const ColorScheme = {
  DEFAULT: 'default',
  HIGH_CONTRAST: 'high_contrast',
  DARK: 'dark'
};

/**
 * Model size options for NER models
 */
const ModelSize = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium'
};

/**
 * Creates a new ExtensionSettings object with default values
 * @param {Object} overrides - Optional settings to override defaults
 * @returns {ExtensionSettings} New settings object
 */
function createExtensionSettings(overrides = {}) {
  const defaultSettings = {
    enabled: true,
    detectionCategories: {
      [DetectionType.EMAIL]: true,
      [DetectionType.PHONE]: true,
      [DetectionType.CREDIT_CARD]: true,
      [DetectionType.API_KEY]: true,
      [DetectionType.CRYPTO_SEED]: true,
      [DetectionType.CRYPTO_PRIVATE_KEY]: true,
      [DetectionType.CRYPTO_ADDRESS]: true,
      [DetectionType.HEALTH_INFO]: true,
      [DetectionType.COMPANY_CONFIDENTIAL]: false, // Disabled by default
      [DetectionType.PERSON_NAME]: false, // Requires NER model
      [DetectionType.LOCATION]: false, // Requires NER model
      [DetectionType.ORGANIZATION]: false // Requires NER model
    },
    riskThresholds: {
      [RiskLevel.LOW]: 0.3,
      [RiskLevel.MEDIUM]: 0.6,
      [RiskLevel.HIGH]: 0.8
    },
    uiPreferences: {
      showTooltips: true,
      quietMode: false,
      colorScheme: ColorScheme.DEFAULT
    },
    modelSettings: {
      enableNER: false,
      modelSize: ModelSize.TINY,
      autoDownload: false
    },
    domainOverrides: {}
  };

  return mergeDeep(defaultSettings, overrides);
}

/**
 * Validates an ExtensionSettings object
 * @param {Object} settings - Settings object to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateExtensionSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('Settings must be an object');
  }

  // Validate required fields
  const requiredFields = ['enabled', 'detectionCategories', 'riskThresholds', 'uiPreferences'];
  for (const field of requiredFields) {
    if (!(field in settings)) {
      throw new Error(`Missing required settings field: ${field}`);
    }
  }

  // Validate enabled flag
  if (typeof settings.enabled !== 'boolean') {
    throw new Error('enabled must be a boolean');
  }

  // Validate detection categories
  if (!settings.detectionCategories || typeof settings.detectionCategories !== 'object') {
    throw new Error('detectionCategories must be an object');
  }

  // Validate each detection category
  for (const [category, enabled] of Object.entries(settings.detectionCategories)) {
    if (!Object.values(DetectionType).includes(category)) {
      throw new Error(`Invalid detection category: ${category}`);
    }
    if (typeof enabled !== 'boolean') {
      throw new Error(`Detection category ${category} must be a boolean`);
    }
  }

  // Validate risk thresholds
  const { riskThresholds } = settings;
  if (!riskThresholds || typeof riskThresholds !== 'object') {
    throw new Error('riskThresholds must be an object');
  }

  for (const [level, threshold] of Object.entries(riskThresholds)) {
    if (!Object.values(RiskLevel).includes(level)) {
      throw new Error(`Invalid risk level: ${level}`);
    }
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new Error(`${level} threshold must be a number between 0 and 1`);
    }
  }

  // Validate UI preferences
  const { uiPreferences } = settings;
  if (!uiPreferences || typeof uiPreferences !== 'object') {
    throw new Error('uiPreferences must be an object');
  }

  if (typeof uiPreferences.showTooltips !== 'boolean') {
    throw new Error('showTooltips must be a boolean');
  }

  if (typeof uiPreferences.quietMode !== 'boolean') {
    throw new Error('quietMode must be a boolean');
  }

  if (uiPreferences.colorScheme && !Object.values(ColorScheme).includes(uiPreferences.colorScheme)) {
    throw new Error(`Invalid color scheme: ${uiPreferences.colorScheme}`);
  }

  // Validate model settings (if present)
  if (settings.modelSettings) {
    const { modelSettings } = settings;
    if (typeof modelSettings !== 'object') {
      throw new Error('modelSettings must be an object');
    }

    if ('enableNER' in modelSettings && typeof modelSettings.enableNER !== 'boolean') {
      throw new Error('enableNER must be a boolean');
    }

    if (modelSettings.modelSize && !Object.values(ModelSize).includes(modelSettings.modelSize)) {
      throw new Error(`Invalid model size: ${modelSettings.modelSize}`);
    }

    if ('autoDownload' in modelSettings && typeof modelSettings.autoDownload !== 'boolean') {
      throw new Error('autoDownload must be a boolean');
    }
  }

  // Validate domain overrides (if present)
  if (settings.domainOverrides) {
    if (typeof settings.domainOverrides !== 'object') {
      throw new Error('domainOverrides must be an object');
    }
    // Additional domain-specific validation could be added here
  }

  return true;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}

/**
 * Creates a domain-specific settings override
 * @param {string} domain - Domain name (e.g., 'example.com')
 * @param {Object} overrides - Settings to override for this domain
 * @returns {Object} Domain override object
 */
function createDomainOverride(domain, overrides) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain must be a non-empty string');
  }

  return {
    domain,
    enabled: overrides.enabled !== undefined ? overrides.enabled : true,
    detectionCategories: overrides.detectionCategories || {},
    riskThresholds: overrides.riskThresholds || {},
    customRules: overrides.customRules || [],
    lastUpdated: Date.now()
  };
}

// Export all enums and functions
if (typeof module !== 'undefined' && module.exports) {
  // Node.js environment
  module.exports = {
    DetectionType,
    RiskLevel,
    Action,
    ColorScheme,
    ModelSize,
    createDetectionResult,
    validateDetectionResult,
    createExtensionSettings,
    validateExtensionSettings,
    createDomainOverride,
    mergeDeep
  };
} else {
  // Browser environment
  // Note: Loading message will be logged when extension state is available
  window.LeakAI = window.LeakAI || {};
  window.LeakAI.DetectionType = DetectionType;
  window.LeakAI.RiskLevel = RiskLevel;
  window.LeakAI.Action = Action;
  window.LeakAI.ColorScheme = ColorScheme;
  window.LeakAI.ModelSize = ModelSize;
  window.LeakAI.createDetectionResult = createDetectionResult;
  window.LeakAI.validateDetectionResult = validateDetectionResult;
  window.LeakAI.createExtensionSettings = createExtensionSettings;
  window.LeakAI.validateExtensionSettings = validateExtensionSettings;
  window.LeakAI.createDomainOverride = createDomainOverride;
  window.LeakAI.mergeDeep = mergeDeep;
  // Note: Load success message will be logged when extension state is available
}