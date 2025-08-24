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
      
      // Cache DOM elements
      this.cacheElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current settings
      await this.loadSettings();
      
      // Update UI with current settings
      this.updateUI();
      
      // Load statistics
      await this.loadStatistics();
      
      this.setLoadingState(false);
      console.log('LeakAI popup initialized successfully');
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to load extension settings');
      this.setLoadingState(false);
    }
  }

  /**
   * Cache frequently used DOM elements
   */
  cacheElements() {
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
    categoryInputs.forEach(input => {
      const category = input.dataset.category;
      this.elements.categoryToggles[category] = input;
    });
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        this.handleSettingsUpdate(message.data.settings);
      }
    });
  }

  /**
   * Load current settings from background script
   */
  async loadSettings() {
    try {
      const response = await this.sendMessage('GET_SETTINGS');
      if (response.success) {
        this.settings = response.data;
        console.log('Settings loaded:', this.settings);
      } else {
        throw new Error(response.error || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      throw error;
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
    if (!this.settings) return;

    // Update master toggle
    if (this.elements.masterToggle) {
      this.elements.masterToggle.checked = this.settings.enabled;
    }

    // Update status indicator
    this.updateStatusIndicator();

    // Update category toggles
    Object.entries(this.elements.categoryToggles).forEach(([category, element]) => {
      if (this.settings.detectionCategories && category in this.settings.detectionCategories) {
        element.checked = this.settings.detectionCategories[category];
      }
    });

    // Update container state
    if (this.elements.container) {
      this.elements.container.classList.toggle('disabled', !this.settings.enabled);
    }

    // Update version info
    if (this.elements.versionText) {
      const manifest = chrome.runtime.getManifest();
      this.elements.versionText.textContent = `v${manifest.version}`;
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
    } else if (!this.settings?.enabled) {
      statusDot.classList.add('disabled');
      statusText.textContent = 'Disabled';
    } else {
      // Count enabled categories
      const enabledCategories = Object.values(this.settings.detectionCategories || {})
        .filter(enabled => enabled).length;
      
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
      const response = await this.sendMessage('UPDATE_SETTINGS', {
        settings,
        partial: false
      });

      if (response.success) {
        this.settings = response.data;
        this.updateUI();
      } else {
        throw new Error(response.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
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
    if (this.elements.masterToggle) {
      this.elements.masterToggle.disabled = loading;
    }
    
    Object.values(this.elements.categoryToggles).forEach(element => {
      element.disabled = loading;
    });
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
    // In a full implementation, this might open an options page
    chrome.runtime.openOptionsPage?.() || 
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  /**
   * Open help and support (placeholder)
   */
  openHelp() {
    console.log('Opening help...');
    // In a full implementation, this might open documentation
    chrome.tabs.create({ 
      url: 'https://github.com/your-repo/leakai-extension/wiki' 
    });
  }

  /**
   * Send message to background script
   */
  async sendMessage(type, data = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('LeakAI popup DOM loaded');
  
  try {
    const popup = new PopupController();
    await popup.initialize();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
});

console.log('LeakAI popup script loaded');