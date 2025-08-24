# LeakAI Popup Interface

This directory contains the popup interface for the LeakAI Chrome extension.

## Files

- `popup.html` - Main popup interface HTML
- `popup.css` - Styling for the popup interface
- `popup.js` - JavaScript functionality for the popup
- `debug-popup.html` - Debug version for troubleshooting
- `README.md` - This file

## Features

### Master Toggle
- Enable/disable the entire extension
- Visual feedback with status indicator
- Disables all detection when turned off

### Detection Categories
Organized into logical groups:

**Personal Information:**
- Email Addresses (Low risk)
- Phone Numbers (Low risk)
- Names (Low risk) - Requires NER model
- Locations (Low risk) - Requires NER model

**Financial Information:**
- Credit Cards (Medium risk)

**Security & Credentials:**
- API Keys (High risk)
- Crypto Seeds (High risk)
- Private Keys (High risk)
- Crypto Addresses (Medium risk)

**Sensitive Information:**
- Health Information (Medium risk)
- Company Confidential (Medium risk)
- Organizations (Low risk) - Requires NER model

### Statistics
- Detections Today counter
- Blocked Submissions counter

### Footer Actions
- Advanced Settings button
- Help & Support button
- Version information

## Testing

### Manual Testing
1. Load the extension in Chrome (chrome://extensions/)
2. Click the extension icon to open the popup
3. Test all toggles and buttons
4. Verify settings persist after closing/reopening

### Debug Mode
Use `debug-popup.html` to troubleshoot issues:
1. Temporarily change manifest.json to use debug-popup.html
2. Reload extension
3. Open popup to see detailed debug information

### Test Files
- `../tests/popup-test.html` - Standalone popup preview
- `../tests/popup-manual-test.html` - Comprehensive manual testing guide
- `../tests/extension-test.js` - Automated test suite

## Troubleshooting

### Common Issues

**Popup doesn't open:**
- Check if popup.html exists and is valid HTML
- Verify manifest.json has correct popup path
- Check browser console for errors

**Styles not loading:**
- Verify popup.css exists and is valid CSS
- Check if CSS file is referenced correctly in HTML
- Look for CSS syntax errors

**JavaScript not working:**
- Check popup.js for syntax errors: `node -c popup.js`
- Open DevTools on popup (right-click → Inspect)
- Check console for JavaScript errors

**Settings not saving:**
- Verify background script is running
- Check Chrome extension permissions
- Test background script communication

**Chrome API errors:**
- Ensure extension has required permissions
- Check if running in proper extension context
- Verify manifest version and API usage

### Debug Steps

1. **Check file structure:**
   ```bash
   ls -la popup/
   # Should show: popup.html, popup.css, popup.js
   ```

2. **Validate JavaScript syntax:**
   ```bash
   node -c popup/popup.js
   ```

3. **Test in standalone mode:**
   Open `../tests/popup-test.html` in browser

4. **Use debug popup:**
   Temporarily use `debug-popup.html` in manifest

5. **Check extension console:**
   - Go to chrome://extensions/
   - Click "Inspect views: background page" for background script
   - Right-click popup → Inspect for popup script

## Implementation Details

### Communication with Background Script
The popup communicates with the background script using Chrome's messaging API:

```javascript
// Send message to background
chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
  // Handle response
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // Handle settings update
  }
});
```

### Settings Management
Settings are managed through the background script and synchronized across all tabs:

1. Popup loads current settings on initialization
2. User changes trigger updates to background script
3. Background script saves to Chrome storage
4. Background script notifies all tabs of changes

### Error Handling
The popup includes comprehensive error handling:

- Graceful degradation when Chrome APIs unavailable
- Fallback to default settings when background script unresponsive
- User-friendly error messages
- Automatic retry mechanisms

### Accessibility
The popup includes accessibility features:

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators
- Reduced motion support

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)
- Requires Chrome extension APIs

## Performance

- Lightweight CSS (< 10KB)
- Minimal JavaScript footprint
- Efficient DOM manipulation
- Lazy loading of statistics
- Debounced settings updates