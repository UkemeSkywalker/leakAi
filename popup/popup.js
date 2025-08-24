// LeakAI Popup Script
// Handles popup interface and user controls

/**
 * PopupController class - Manages popup interface and user interactions
 */
class PopupController {
  constructor() {
    this.settings = null;
    this.isLoading = false;
    this.elements = {};
    this.stats = {
      detectionsToday: 0,
      blockedSubmissions: 0
    };
    
    console.log('LeakAI PopupController initialized');
  }

  /**
   * Initialize the popup interface
   */
  async initialize() {
    try {
      this.setLoadingState(true);
      
      // Cache DOM elements first
      this.cacheElements();
      
      // Ensure we have default settings as fallback
      if (!this.settings) {
        this.settings = this.getDefaultSettings();
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current settings (this may update this.settings)
      await this.loadSettings();
      
      // Ensure settings are still valid after loading
      if (!this.settings) {
        console.warn('Settings still null after loading, using defaults');
        this.settings = this.getDefaultSettings();
      }
      
      // Update UI with current settings
      this.updateUI();
      
      // Load statistics
      await this.loadStatistics();
      
      this.setLoadingState(false);
      console.log('LeakAI popup initialized successfully');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      
      // Ensure we have fallback settings even on error
      if (!this.settings) {
        this.settings = this.getDefaultSettings();
      }
      
      this.showError('Failed to load extension settings');
      this.updateUI(); // Update UI with fallback settings
      this.setLoadingState(false);
    }
  }

  /**
   * Cache frequently used DOM elements
   */
  cacheElements() {
    try {
      this.elements = {
        // Status elements
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        
        // Master toggle
        masterToggle: document.getElementById('masterToggle'),
        
        // Sections
        categoriesSection: document.getElementById('categoriesSection'),
        statsSection: document.getElementById('statsSection'),
        
        // Statistics
        detectionsToday: document.getElementById('detectionsToday'),
        blockedSubmissions: document.getElementById('blockedSubmissions'),
        
        // Footer buttons
        settingsBtn: document.getElementById('settingsBtn'),
        helpBtn: document.getElementById('helpBtn'),
        versionText: document.getElementById('versionText'),
        
        // Container
        container: document.querySelector('.popup-container')
      };

      // Cache all category toggles
      this.elements.categoryToggles = {};
      const categoryInputs = document.querySelectorAll('[data-category]');
      if (categoryInputs && categoryInputs.length > 0) {
        categoryInputs.forEach(input => {
          if (input && input.dataset && input.dataset.category) {
            const category = input.dataset.category;
            this.elements.categoryToggles[category] = input;
          }
        });
        console.log(`Cached ${Object.keys(this.elements.categoryToggles).length} category toggles`);
      } else {
        console.warn('No category toggles found in DOM');
      }

      // Log missing elements for debugging
      const missingElements = [];
      Object.entries(this.elements).forEach(([key, element]) => {
        if (!element && key !== 'categoryToggles') {
          missingElements.push(key);
        }
      });
      
      if (missingElements.length > 0) {
        console.warn('Missing DOM elements:', missingElements);
      }
      
    } catch (error) {
      console.error('Error caching DOM elements:', error);
      // Initialize empty elements object to prevent further errors
      this.elements = {
        categoryToggles: {}
      };
    }
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Master toggle
    if (this.elements.masterToggle) {
      this.elements.masterToggle.addEventListener('change', (e) => {
        this.handleMasterToggle(e.target.checked);
      });
    }

    // Category toggles
    Object.entries(this.elements.categoryToggles).forEach(([category, element]) => {
      element.addEventListener('change', (e) => {
        this.handleCategoryToggle(category, e.target.checked);
      });
    });

    // Footer buttons
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.addEventListener('click', () => {
        this.openAdvancedSettings();
      });
    }

    if (this.elements.helpBtn) {
      this.elements.helpBtn.addEventListener('click', () => {
        this.openHelp();
      });
    }

    // Listen for settings updates from background script
    if (chrome && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SETTINGS_UPDATED') {
          this.handleSettingsUpdate(message.data.settings);
        }
      });
    }
  }

  /**
   * Load current settings from background script
   */
  async loadSettings() {
    try {
      // Check if Chrome extension APIs are available
      if (!chrome || !chrome.runtime) {
        console.warn('Chrome extension APIs not available, using default settings');
        this.settings = this.getDefaultSettings();
        return;
      }

      const response = await this.sendMessage('GET_SETTINGS');
      if (response && response.success) {
        this.settings = response.data;
        console.log('Settings loaded:', this.settings);
      } else {
        console.warn('Failed to load settings from background, using defaults:', response?.error);
        this.settings = this.getDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      console.warn('Using default settings due to error');
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * Load statistics from storage or background script
   */
  async loadStatistics() {
    try {
      // For now, we'll use placeholder statistics
      // In a full implementation, this would come from the background script
      this.stats = {
        detectionsToday: Math.floor(Math.random() * 50),
        blockedSubmissions: Math.floor(Math.random() * 10)
      };
      
      this.updateStatistics();
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Use default stats on error
      this.updateStatistics();
    }
  }

  /**
   * Update the UI with current settings
   */
  updateUI() {
    // Ensure settings exist before updating UI
    if (!this.settings) {
      console.warn('Settings not available, using defaults for UI update');
      this.settings = this.getDefaultSettings();
    }

    // Ensure detectionCategories exists
    if (!this.settings.detectionCategories) {
      console.warn('Detection categories not found in settings, initializing defaults');
      this.settings.detectionCategories = this.getDefaultSettings().detectionCategories;
    }

    // Update master toggle
    if (this.elements.masterToggle) {
      this.elements.masterToggle.checked = Boolean(this.settings.enabled);
    }

    // Update status indicator
    this.updateStatusIndicator();

    // Update category toggles
    if (this.elements.categoryToggles && this.settings.detectionCategories) {
      Object.entries(this.elements.categoryToggles).forEach(([category, element]) => {
        if (element && category in this.settings.detectionCategories) {
          element.checked = Boolean(this.settings.detectionCategories[category]);
        }
      });
    }

    // Update container state
    if (this.elements.container) {
      this.elements.container.classList.toggle('disabled', !this.settings.enabled);
    }

    // Update version info
    if (this.elements.versionText) {
      try {
        if (chrome && chrome.runtime && chrome.runtime.getManifest) {
          const manifest = chrome.runtime.getManifest();
          this.elements.versionText.textContent = `v${manifest.version}`;
        } else {
          this.elements.versionText.textContent = 'v1.0.0';
        }
      } catch (error) {
        console.warn('Could not get manifest version:', error);
        this.elements.versionText.textContent = 'v1.0.0';
      }
    }
  }

  /**
   * Update status indicator based on current settings
   */
  updateStatusIndicator() {
    if (!this.elements.statusDot || !this.elements.statusText) return;

    const { statusDot, statusText } = this.elements;
    
    // Remove existing classes
    statusDot.classList.remove('disabled', 'loading');
    
    if (this.isLoading) {
      statusDot.classList.add('loading');
      statusText.textContent = 'Loading...';
    } else if (!this.settings || !this.settings.enabled) {
      statusDot.classList.add('disabled');
      statusText.textContent = this.settings ? 'Disabled' : 'Not Connected';
    } else {
      // Count enabled categories safely
      const detectionCategories = this.settings.detectionCategories || {};
      const enabledCategories = Object.values(detectionCategories)
        .filter(enabled => Boolean(enabled)).length;
      
      statusText.textContent = `Active (${enabledCategories} categories)`;
    }
  }

  /**
   * Update statistics display
   */
  updateStatistics() {
    if (this.elements.detectionsToday) {
      this.elements.detectionsToday.textContent = this.stats.detectionsToday.toString();
    }
    
    if (this.elements.blockedSubmissions) {
      this.elements.blockedSubmissions.textContent = this.stats.blockedSubmissions.toString();
    }
  }

  /**
   * Handle master toggle change
   */
  async handleMasterToggle(enabled) {
    try {
      this.setLoadingState(true);
      
      const updatedSettings = {
        ...this.settings,
        enabled
      };

      await this.updateSettings(updatedSettings);
      console.log(`Extension ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating master toggle:', error);
      this.showError('Failed to update extension settings');
      
      // Revert toggle state
      if (this.elements.masterToggle) {
        this.elements.masterToggle.checked = this.settings?.enabled || false;
      }
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Handle category toggle change
   */
  async handleCategoryToggle(category, enabled) {
    try {
      const updatedSettings = {
        ...this.settings,
        detectionCategories: {
          ...this.settings.detectionCategories,
          [category]: enabled
        }
      };

      await this.updateSettings(updatedSettings);
      console.log(`Category ${category} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Error updating category ${category}:`, error);
      this.showError(`Failed to update ${category} detection`);
      
      // Revert toggle state
      const toggleElement = this.elements.categoryToggles[category];
      if (toggleElement) {
        toggleElement.checked = this.settings?.detectionCategories?.[category] || false;
      }
    }
  }

  /**
   * Update settings via background script
   */
  async updateSettings(settings) {
    try {
      // If Chrome APIs are not available, just update locally
      if (!chrome || !chrome.runtime) {
        console.warn('Chrome extension APIs not available, updating settings locally only');
        this.settings = settings;
        this.updateUI();
        return;
      }

      console.log('Popup updating settings via background script:', settings);

      const response = await this.sendMessage('UPDATE_SETTINGS', {
        settings,
        partial: false
      });

      if (response && response.success) {
        this.settings = response.data;
        this.updateUI();
        console.log('Settings successfully updated and synced:', this.settings);
        
        // Show brief success feedback
        this.showSuccessFeedback();
      } else {
        console.warn('Failed to update settings via background script, updating locally:', response?.error);
        this.settings = settings;
        this.updateUI();
        this.showError('Settings may not be synced across tabs');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      // Fall back to local update
      console.warn('Falling back to local settings update');
      this.settings = settings;
      this.updateUI();
      this.showError('Settings update failed, changes may not persist');
    }
  }

  /**
   * Show brief success feedback
   */
  showSuccessFeedback() {
    if (this.elements.statusText) {
      const originalText = this.elements.statusText.textContent;
      this.elements.statusText.textContent = 'Settings Updated';
      
      setTimeout(() => {
        this.updateStatusIndicator(); // Restore original status
      }, 1500);
    }
  }

  /**
   * Handle settings update from background script
   */
  handleSettingsUpdate(newSettings) {
    console.log('Received settings update:', newSettings);
    this.settings = newSettings;
    this.updateUI();
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    this.isLoading = loading;
    this.updateStatusIndicator();
    
    // Disable/enable controls during loading
    if (this.elements && this.elements.masterToggle) {
      this.elements.masterToggle.disabled = loading;
    }
    
    if (this.elements && this.elements.categoryToggles) {
      Object.values(this.elements.categoryToggles).forEach(element => {
        if (element) {
          element.disabled = loading;
        }
      });
    }
  }

  /**
   * Show error message to user
   */
  showError(message) {
    console.error('Popup error:', message);
    
    // Update status to show error
    if (this.elements.statusText) {
      this.elements.statusText.textContent = 'Error';
    }
    
    if (this.elements.statusDot) {
      this.elements.statusDot.classList.add('disabled');
    }
    
    // In a full implementation, you might show a toast or modal
    // For now, we'll just log the error
  }

  /**
   * Open advanced settings (placeholder)
   */
  openAdvancedSettings() {
    console.log('Opening advanced settings...');
    try {
      if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (chrome && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
      } else {
        console.warn('Cannot open advanced settings - Chrome APIs not available');
        alert('Advanced settings not available in this context');
      }
    } catch (error) {
      console.error('Error opening advanced settings:', error);
      alert('Could not open advanced settings');
    }
  }

  /**
   * Open help and support (placeholder)
   */
  openHelp() {
    console.log('Opening help...');
    try {
      if (chrome && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ 
          url: 'https://github.com/your-repo/leakai-extension/wiki' 
        });
      } else {
        console.warn('Cannot open help - Chrome APIs not available');
        window.open('https://github.com/your-repo/leakai-extension/wiki', '_blank');
      }
    } catch (error) {
      console.error('Error opening help:', error);
      window.open('https://github.com/your-repo/leakai-extension/wiki', '_blank');
    }
  }

  /**
   * Send message to background script
   */
  async sendMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
      // Check if Chrome extension APIs are available
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('Chrome extension APIs not available');
        reject(new Error('Chrome extension APIs not available'));
        return;
      }

      try {
        chrome.runtime.sendMessage({ type, data }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            console.error('No response from background script');
            reject(new Error('No response from background script'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
      }
    });
  }

  /**
   * Get default settings when background script is not available
   */
  getDefaultSettings() {
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
        company_confidential: false,
        person_name: false,
        location: false,
        organization: false
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('LeakAI popup DOM loaded');
  console.log('Chrome extension context available:', !!(chrome && chrome.runtime));
  
  try {
    const popup = new PopupController();
    await popup.initialize();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    
    // Show error in UI
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Initialization Error';
    }
    
    const statusDot = document.getElementById('statusDot');
    if (statusDot) {
      statusDot.classList.add('disabled');
    }
  }
});

// Add some immediate debugging
console.log('LeakAI popup script loaded');
console.log('Document ready state:', document.readyState);
console.log('Chrome object available:', typeof chrome !== 'undefined');
console.log('Chrome runtime available:', !!(typeof chrome !== 'undefined' && chrome.runtime));

// If DOM is already loaded, initialize immediately
if (document.readyState === 'loading') {
  console.log('DOM still loading, waiting for DOMContentLoaded');
} else {
  console.log('DOM already loaded, initializing immediately');
  setTimeout(async () => {
    try {
      const popup = new PopupController();
      await popup.initialize();
    } catch (error) {
      console.error('Failed to initialize popup immediately:', error);
    }
  }, 0);
}