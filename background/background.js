// LeakAI Background Service Worker
// Handles extension lifecycle, settings, and cross-tab coordination

/**
 * BackgroundScript class - Manages extension lifecycle, settings, and cross-tab coordination
 */
class BackgroundScript {
  constructor() {
    this.settings = null;
    this.connectedTabs = new Map(); // Track connected content scripts
    this.messageHandlers = new Map(); // Message type handlers
    this.settingsCache = null;
    this.lastSettingsUpdate = 0;
    
    // Simple logging system that checks extension state
    this.log = (message, ...args) => {
      if (this.settingsCache && this.settingsCache.enabled) {
        console.log(message, ...args);
      }
    };
    
    // Always log system messages (like initialization and settings changes)
    this.systemLog = (message, ...args) => {
      console.log(message, ...args);
    };
    
    this.systemLog('LeakAI BackgroundScript initialized');
  }

  /**
   * Initialize the background script
   */
  async initialize() {
    try {
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize settings
      await this.initializeSettings();
      
      this.systemLog('LeakAI background script initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background script:', error);
    }
  }

  /**
   * Set up message handlers for different message types
   */
  setupMessageHandlers() {
    this.messageHandlers.set('GET_SETTINGS', this.handleGetSettings.bind(this));
    this.messageHandlers.set('UPDATE_SETTINGS', this.handleUpdateSettings.bind(this));
    this.messageHandlers.set('RESET_SETTINGS', this.handleResetSettings.bind(this));
    this.messageHandlers.set('TAB_CONNECTED', this.handleTabConnected.bind(this));
    this.messageHandlers.set('TAB_DISCONNECTED', this.handleTabDisconnected.bind(this));
    this.messageHandlers.set('SYNC_REQUEST', this.handleSyncRequest.bind(this));
    this.messageHandlers.set('PING', this.handlePing.bind(this));
  }

  /**
   * Set up Chrome extension event listeners
   */
  setupEventListeners() {
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates for cross-tab sync
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.syncSettingsToTab(tabId);
      }
    });

    // Handle tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.connectedTabs.delete(tabId);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.systemLog('LeakAI extension started');
      this.syncSettingsToAllTabs();
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.systemLog('LeakAI extension installed/updated:', details.reason);
      if (details.reason === 'install') {
        this.initializeSettings();
      }
    });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      this.log('Background script received message:', message);
      const { type, data } = message;
      this.log(`Background processing message type: ${type}`, data);

      const handler = this.messageHandlers.get(type);
      if (handler) {
        this.log(`Found handler for message type: ${type}`);
        const response = await handler(data, sender);
        this.log(`Handler response for ${type}:`, response);
        sendResponse({ success: true, data: response });
      } else {
        console.warn(`Unknown message type: ${type}`);
        sendResponse({ success: false, error: `Unknown message type: ${type}` });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle GET_SETTINGS message
   */
  async handleGetSettings(data, sender) {
    const settings = await this.getSettings();
    this.log('Sending settings to tab:', sender.tab?.id);
    return settings;
  }

  /**
   * Handle UPDATE_SETTINGS message
   */
  async handleUpdateSettings(data, sender) {
    const { settings, partial = false } = data;
    
    this.systemLog('Background script updating settings:', { settings, partial });
    
    if (partial) {
      // Merge with existing settings
      const currentSettings = await this.getSettings();
      const updatedSettings = this.mergeSettings(currentSettings, settings);
      await this.saveSettings(updatedSettings);
    } else {
      // Replace entire settings
      await this.saveSettings(settings);
    }

    // Sync to all tabs immediately
    await this.syncSettingsToAllTabs();
    
    const finalSettings = await this.getSettings();
    this.systemLog('Settings updated and synced to all tabs:', finalSettings);
    
    return finalSettings;
  }

  /**
   * Handle RESET_SETTINGS message
   */
  async handleResetSettings(data, sender) {
    await this.resetToDefaults();
    await this.syncSettingsToAllTabs();
    return await this.getSettings();
  }

  /**
   * Handle TAB_CONNECTED message
   */
  async handleTabConnected(data, sender) {
    const tabId = sender.tab?.id;
    if (tabId) {
      this.connectedTabs.set(tabId, {
        tabId,
        url: sender.tab.url,
        connected: Date.now()
      });
      this.log(`Tab ${tabId} connected, total tabs: ${this.connectedTabs.size}`);
      
      // Send current settings to newly connected tab
      await this.syncSettingsToTab(tabId);
    }
    return { connected: true, tabId };
  }

  /**
   * Handle TAB_DISCONNECTED message
   */
  async handleTabDisconnected(data, sender) {
    const tabId = sender.tab?.id;
    if (tabId) {
      this.connectedTabs.delete(tabId);
      this.log(`Tab ${tabId} disconnected, remaining tabs: ${this.connectedTabs.size}`);
    }
    return { disconnected: true, tabId };
  }

  /**
   * Handle SYNC_REQUEST message
   */
  async handleSyncRequest(data, sender) {
    const settings = await this.getSettings();
    return {
      settings,
      timestamp: this.lastSettingsUpdate
    };
  }

  /**
   * Handle PING message for connectivity testing
   */
  async handlePing(data, sender) {
    return {
      pong: true,
      timestamp: Date.now(),
      tabId: sender.tab?.id
    };
  }

  /**
   * Initialize settings system
   */
  async initializeSettings() {
    try {
      const existingSettings = await this.loadSettingsFromStorage();
      if (!existingSettings) {
        console.log('No existing settings found, creating defaults');
        await this.resetToDefaults();
      } else {
        this.settingsCache = existingSettings;
        console.log('Loaded existing settings from storage');
      }
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      await this.resetToDefaults();
    }
  }

  /**
   * Get current settings (from cache or storage)
   */
  async getSettings() {
    if (!this.settingsCache) {
      this.settingsCache = await this.loadSettingsFromStorage();
    }
    return this.settingsCache;
  }

  /**
   * Save settings to storage and update cache
   */
  async saveSettings(settings) {
    try {
      // Validate settings before saving
      this.validateSettings(settings);
      
      // Save to Chrome storage
      await chrome.storage.sync.set({ leakaiSettings: settings });
      
      // Update cache
      this.settingsCache = settings;
      this.lastSettingsUpdate = Date.now();
      
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Load settings from Chrome storage
   */
  async loadSettingsFromStorage() {
    try {
      const result = await chrome.storage.sync.get(['leakaiSettings']);
      return result.leakaiSettings || null;
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      return null;
    }
  }

  /**
   * Sync settings to a specific tab
   */
  async syncSettingsToTab(tabId) {
    try {
      const settings = await this.getSettings();
      await chrome.tabs.sendMessage(tabId, {
        type: 'SETTINGS_UPDATED',
        data: { settings, timestamp: this.lastSettingsUpdate }
      });
      console.log(`Settings synced to tab ${tabId}`);
    } catch (error) {
      // Tab might not have content script loaded yet, ignore error
      console.log(`Could not sync to tab ${tabId}:`, error.message);
    }
  }

  /**
   * Sync settings to all connected tabs
   */
  async syncSettingsToAllTabs() {
    const settings = await this.getSettings();
    console.log(`Syncing settings to ${this.connectedTabs.size} connected tabs:`, settings);
    
    // Also sync to all tabs, not just connected ones (in case content script loaded after connection)
    const allTabsPromise = this.syncSettingsToAllActiveTabs();
    const connectedTabsPromises = [];

    for (const [tabId] of this.connectedTabs) {
      connectedTabsPromises.push(this.syncSettingsToTab(tabId));
    }

    try {
      await Promise.allSettled([allTabsPromise, ...connectedTabsPromises]);
      console.log(`Settings synced to all tabs (${this.connectedTabs.size} connected + all active)`);
    } catch (error) {
      console.error('Error syncing settings to tabs:', error);
    }
  }

  /**
   * Sync settings to all active tabs (not just connected ones)
   */
  async syncSettingsToAllActiveTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const settings = await this.getSettings();
      
      const syncPromises = tabs.map(tab => {
        return chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          data: { settings, timestamp: this.lastSettingsUpdate }
        }).catch(error => {
          // Ignore errors for tabs without content script
          console.log(`Could not sync to tab ${tab.id}: ${error.message}`);
        });
      });
      
      await Promise.allSettled(syncPromises);
      console.log(`Attempted to sync settings to ${tabs.length} total tabs`);
    } catch (error) {
      console.error('Error syncing to all active tabs:', error);
    }
  }

  /**
   * Merge partial settings with existing settings
   */
  mergeSettings(currentSettings, partialSettings) {
    return {
      ...currentSettings,
      ...partialSettings,
      // Deep merge nested objects
      detectionCategories: {
        ...currentSettings.detectionCategories,
        ...(partialSettings.detectionCategories || {})
      },
      riskThresholds: {
        ...currentSettings.riskThresholds,
        ...(partialSettings.riskThresholds || {})
      },
      uiPreferences: {
        ...currentSettings.uiPreferences,
        ...(partialSettings.uiPreferences || {})
      },
      modelSettings: {
        ...currentSettings.modelSettings,
        ...(partialSettings.modelSettings || {})
      },
      domainOverrides: {
        ...currentSettings.domainOverrides,
        ...(partialSettings.domainOverrides || {})
      }
    };
  }

  /**
   * Reset settings to default values
   */
  async resetToDefaults() {
    const defaultSettings = this.getDefaultSettings();
    await this.saveSettings(defaultSettings);
    console.log('Settings reset to defaults');
  }

  /**
   * Get default settings configuration
   */
  getDefaultSettings() {
    // Use the createExtensionSettings function from data models
    // In a real extension, this would be available via the global LeakAI object
    // For now, we'll inline the default settings
    return {
      enabled: true,
      detectionCategories: {
        email: true,
        phone: true,
        credit_card: true,
        api_key: true,
        crypto_seed: true,
        crypto_private_key: true,
        crypto_address: true,
        health_info: true,
        company_confidential: false, // Disabled by default
        person_name: false, // Requires NER model
        location: false, // Requires NER model
        organization: false // Requires NER model
      },
      riskThresholds: {
        low: 0.3,
        medium: 0.6,
        high: 0.8
      },
      uiPreferences: {
        showTooltips: true,
        quietMode: false,
        colorScheme: 'default'
      },
      modelSettings: {
        enableNER: false,
        modelSize: 'tiny',
        autoDownload: false
      },
      domainOverrides: {}
    };
  }

  /**
   * Validate settings object using the validation function from data models
   */
  validateSettings(settings) {
    // In a real extension, this would use window.LeakAI.validateExtensionSettings
    // For now, we'll implement basic validation inline
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

    // Validate risk thresholds
    const { riskThresholds } = settings;
    if (!riskThresholds || typeof riskThresholds !== 'object') {
      throw new Error('riskThresholds must be an object');
    }

    const thresholdFields = ['low', 'medium', 'high'];
    for (const field of thresholdFields) {
      const value = riskThresholds[field];
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(`${field} threshold must be a number between 0 and 1`);
      }
    }

    console.log('Settings validation passed');
  }
}

// Initialize background script
console.log('LeakAI background service worker starting...');

try {
  const backgroundScript = new BackgroundScript();
  backgroundScript.initialize().then(() => {
    console.log('LeakAI background script initialized successfully');
  }).catch((error) => {
    console.error('Failed to initialize background script:', error);
  });
} catch (error) {
  console.error('Error creating background script:', error);
}

console.log('LeakAI background service worker started');