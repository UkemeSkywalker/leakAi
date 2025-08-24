# LeakAI Chrome Extension - User Guide

## Overview

LeakAI is a Chrome extension that provides real-time data loss prevention by detecting and flagging sensitive information as you type across web applications. Think of it as "Grammarly for Data Loss Prevention" - it helps you identify potential data leaks before they happen.

## Features

### 🔍 Real-Time Detection
- Automatically scans text as you type
- Works on all websites and web applications
- No page refresh required

### 📊 Sensitive Data Categories
- **Email Addresses**: Personal and business emails
- **Phone Numbers**: Various formats (US, international)
- **Credit Cards**: All major card types with Luhn validation
- **API Keys**: GitHub, AWS, Stripe, and other service keys
- **Cryptocurrency**: Seed phrases, private keys, wallet addresses
- **Health Information**: Medical terms and health data
- **Company Confidential**: Configurable organizational terms

### 🎨 Visual Indicators
- **Colored Underlines**: Different colors for different risk levels
  - 🔴 Red: High risk (credentials, financial data)
  - 🟡 Amber: Medium risk (some PII)
  - 🔵 Blue: Low risk (general PII)
  - 🟣 Purple: Organizational data
  - ⚫ Gray: Very low risk

### 💡 Smart Tooltips
- Hover over detected text to see explanations
- Shows detection reason and risk level
- Provides confidence score
- Offers quick remediation actions

### ⚡ Quick Actions
- **Mask**: Replace with masked version (e.g., j***@example.com)
- **Remove**: Delete the sensitive text
- **Replace**: Enter alternative text
- **Ignore Once**: Temporarily disable detection for this instance
- **Undo**: Restore original text after actions

### 🛡️ Form Protection
- Warns before submitting forms with sensitive data
- Blocks high-risk submissions until addressed
- Shows list of detected items in warning modal

## Installation

### Method 1: Load Unpacked (Recommended for Testing)
1. Download and extract the extension package
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/` folder from the package
6. Extension icon should appear in toolbar

### Method 2: Install from Package
1. Download the `.crx` file (if available)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Drag the `.crx` file onto the page
5. Click "Add extension" when prompted

## Getting Started

### First Use
1. **Install Extension**: Follow installation steps above
2. **Check Status**: Click the LeakAI icon in toolbar
3. **Verify Settings**: Ensure extension is enabled and categories are configured
4. **Test Detection**: Type an email address in any text field
5. **See Results**: Colored underline should appear under the email

### Basic Usage
1. **Type Normally**: Extension works automatically as you type
2. **Notice Underlines**: Sensitive data gets colored underlines
3. **Hover for Info**: Hover over underlines to see tooltips
4. **Take Action**: Click underlined text for remediation options
5. **Submit Safely**: Extension warns before risky form submissions

## Configuration

### Extension Popup
Click the LeakAI icon in the Chrome toolbar to access:

#### Master Toggle
- **Enable/Disable**: Turn entire extension on or off
- **Status Indicator**: Shows current state (Active/Disabled)
- **Quick Control**: Instantly enable/disable all detection

#### Detection Categories
Toggle individual detection types:
- ✅ **Email**: Email address detection
- ✅ **Phone**: Phone number detection  
- ✅ **Credit Card**: Credit card number detection
- ✅ **API Key**: API key and credential detection
- ✅ **Crypto Seed**: Cryptocurrency seed phrase detection
- ✅ **Crypto Private Key**: Private key detection
- ✅ **Crypto Address**: Wallet address detection
- ✅ **Health Info**: Health-related term detection
- ⬜ **Company Confidential**: Organizational term detection (disabled by default)
- ⬜ **Person Name**: Name detection (requires NER model)
- ⬜ **Location**: Location detection (requires NER model)
- ⬜ **Organization**: Organization detection (requires NER model)

#### Statistics
- **Detections Today**: Number of items detected
- **Blocked Submissions**: Forms blocked due to sensitive data

### Settings Sync
- Settings automatically sync across all browser tabs
- Changes take effect immediately without page refresh
- Settings persist across browser restarts

## Understanding Risk Levels

### 🔴 High Risk
- Credit card numbers
- API keys and credentials
- Cryptocurrency private keys and seed phrases
- **Action**: Form submission blocked until addressed

### 🟡 Medium Risk
- Email addresses in certain contexts
- Phone numbers
- Some health information
- **Action**: Warning shown before form submission

### 🔵 Low Risk
- Email addresses in safe contexts
- General personal information
- **Action**: Visual indicator only, no blocking

## Privacy & Security

### Local Processing
- **100% Local**: All detection happens in your browser
- **No External Servers**: No data sent to remote servers
- **No Tracking**: Extension doesn't track your activity
- **No Storage**: Sensitive data is never stored

### Permissions
- **activeTab**: Access current tab content for detection
- **storage**: Save your preferences and settings
- **scripting**: Inject detection scripts into web pages

### Data Handling
- Text is analyzed in real-time as you type
- Detection results are temporary and not stored
- Only settings/preferences are saved locally
- No personal data leaves your device

## Troubleshooting

### Extension Not Working
1. **Check Status**: Click extension icon, verify it's enabled
2. **Refresh Page**: Reload the webpage you're testing on
3. **Check Categories**: Ensure relevant detection categories are enabled
4. **Console Errors**: Open browser console (F12) and look for errors

### Detection Not Appearing
1. **Type Sensitive Data**: Try typing "test@example.com"
2. **Check Categories**: Verify email detection is enabled
3. **Wait Briefly**: Detection may take a moment to appear
4. **Try Different Field**: Test in different input fields

### Settings Not Syncing
1. **Check Connection**: Ensure extension is properly loaded
2. **Restart Browser**: Close and reopen Chrome
3. **Reload Extension**: Disable and re-enable in chrome://extensions/
4. **Clear Storage**: Reset extension settings if needed

### Performance Issues
1. **Reduce Categories**: Disable unused detection categories
2. **Check Memory**: Monitor Chrome task manager
3. **Restart Browser**: Close and reopen Chrome
4. **Update Chrome**: Ensure you're using latest version

## Advanced Features

### NER Model (Optional)
- **Enhanced Detection**: Uses machine learning for name/location detection
- **Disabled by Default**: Requires manual activation
- **Performance Impact**: May slow down detection slightly
- **Privacy**: Model runs locally, no data sent externally

### Custom Patterns
- **Company Confidential**: Configure organization-specific terms
- **Custom Rules**: Add patterns for your specific needs
- **Context Awareness**: Detection considers surrounding text

### Developer Features
- **Console Logging**: Detailed logs for debugging (when enabled)
- **Performance Monitoring**: Built-in performance tracking
- **Error Handling**: Graceful degradation on errors

## Best Practices

### For Users
1. **Keep Enabled**: Leave extension enabled for continuous protection
2. **Review Warnings**: Pay attention to form submission warnings
3. **Use Actions**: Take advantage of mask/remove/replace actions
4. **Check Settings**: Periodically review enabled categories
5. **Stay Updated**: Update extension when new versions available

### For Organizations
1. **Configure Categories**: Enable relevant detection types for your needs
2. **Train Users**: Educate team on extension features and warnings
3. **Monitor Usage**: Check statistics to understand detection patterns
4. **Custom Terms**: Configure company-specific confidential terms
5. **Policy Integration**: Incorporate into data loss prevention policies

## Keyboard Shortcuts

Currently, LeakAI doesn't use keyboard shortcuts, but you can:
- **Click Extension Icon**: Access settings quickly
- **Right-click Underlines**: Future feature for context menus
- **Hover for Tooltips**: No clicking required for information

## Browser Compatibility

### Supported
- ✅ **Chrome 88+**: Full support with Manifest V3
- ✅ **Microsoft Edge**: Chromium-based versions
- ✅ **Brave Browser**: Full compatibility
- ✅ **Other Chromium**: Most Chromium-based browsers

### Not Supported
- ❌ **Firefox**: Different extension architecture
- ❌ **Safari**: Different extension system
- ❌ **Internet Explorer**: Not supported

## Support & Feedback

### Getting Help
- **Documentation**: Check this guide and INSTALL.md
- **Console Logs**: Use browser developer tools for debugging
- **GitHub Issues**: Report bugs and request features
- **Email Support**: Contact support team for assistance

### Reporting Issues
When reporting problems, please include:
1. Chrome version
2. Extension version
3. Steps to reproduce
4. Expected vs actual behavior
5. Console error messages (if any)
6. Screenshots (if helpful)

### Feature Requests
We welcome suggestions for:
- New detection patterns
- UI improvements
- Performance enhancements
- Integration features
- Additional security measures

## Frequently Asked Questions

### Q: Does LeakAI slow down my browser?
A: LeakAI is designed to be lightweight and efficient. It only processes text as you type and uses optimized detection algorithms. Most users won't notice any performance impact.

### Q: Can I use LeakAI on sensitive websites?
A: Yes! LeakAI processes everything locally in your browser and never sends data to external servers. It's safe to use on banking, healthcare, and other sensitive sites.

### Q: What happens to detected data?
A: Nothing! LeakAI only analyzes text temporarily for detection. It doesn't store, log, or transmit any of your sensitive data.

### Q: Can I customize what gets detected?
A: Yes, you can enable/disable entire categories of detection. For organization-specific terms, you can configure the "Company Confidential" category.

### Q: Does LeakAI work in incognito mode?
A: LeakAI can work in incognito mode if you enable "Allow in incognito" in the Chrome extensions settings.

### Q: How accurate is the detection?
A: LeakAI uses multiple validation methods (regex patterns, checksums, entropy analysis) to minimize false positives while maintaining high detection rates.

---

**Version**: 1.0.0  
**Last Updated**: August 2024  
**Support**: support@leakai.com