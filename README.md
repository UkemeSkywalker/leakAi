# LeakAI Chrome Extension

A Chrome extension MVP that provides real-time data loss prevention by detecting and flagging sensitive information as users type across web applications.

## Project Structure

```
├── manifest.json              # Extension manifest (Manifest V3)
├── content/                   # Content scripts injected into web pages
│   ├── content.js            # Main content script
│   ├── content.css           # Content script styles
│   └── tooltip.html          # Tooltip template
├── background/               # Background service worker
│   └── background.js         # Background script
├── popup/                    # Extension popup interface
│   ├── popup.html           # Popup HTML
│   └── popup.js             # Popup script
├── patterns/                 # Detection engine and pattern matchers
│   └── detection-engine.js   # Core detection orchestrator
└── icons/                    # Extension icons (optional for MVP)
    └── README.md            # Icon documentation
```

## Installation for Development

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this directory
4. The extension should appear in your extensions list

## Features (Planned)

- Real-time detection of sensitive data (PII, financial, credentials, crypto)
- Visual indicators with colored underlines
- Interactive tooltips with remediation actions
- Form submission warnings and blocking
- Configurable detection categories
- Local processing only (no data leaves browser)

## Development Status

This is the initial project setup. Core functionality will be implemented in subsequent development phases.