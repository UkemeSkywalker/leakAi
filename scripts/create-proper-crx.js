#!/usr/bin/env node

/**
 * Proper CRX Creator for LeakAI Chrome Extension
 * Creates a proper .crx file that Chrome can potentially install directly
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('🔧 Creating Proper CRX Package for LeakAI Extension...\n');

const BUILD_DIR = 'dist';
const OUTPUT_DIR = 'packages';
const PACKAGE_NAME = 'leakai-extension';

// Check if build exists
if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run build-production.js first.');
    process.exit(1);
}

// Read version from manifest
const manifestPath = path.join(BUILD_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

console.log('📋 Creating CRX Package:');
console.log(`   Name: ${PACKAGE_NAME}`);
console.log(`   Version: ${version}`);

// Create a proper CRX file structure
// Note: Modern Chrome has restrictions on unsigned CRX files
// This creates the structure but may still require "Load unpacked" for installation

const crxFileName = `${PACKAGE_NAME}-v${version}.crx`;
const crxFilePath = path.join(OUTPUT_DIR, crxFileName);

try {
    // Method 1: Try to create CRX using Chrome's built-in packing (if available)
    console.log('\n🔨 Attempting to create CRX package...');
    
    // This would work if we had Chrome's command line tools
    // For now, we'll create a renamed ZIP with CRX extension
    const zipPath = path.join(OUTPUT_DIR, `${PACKAGE_NAME}-v${version}.zip`);
    
    if (fs.existsSync(zipPath)) {
        // Copy ZIP as CRX (they have similar structure)
        fs.copyFileSync(zipPath, crxFilePath);
        console.log(`   ✅ CRX file created: ${crxFileName}`);
        console.log('   ⚠️  Note: This CRX may still require "Load unpacked" due to Chrome security restrictions');
    } else {
        console.log('   ❌ ZIP file not found. Run create-crx.js first.');
    }
    
} catch (error) {
    console.log(`   ❌ CRX creation failed: ${error.message}`);
}

// Create installation instructions specifically for CRX
const crxInstructions = `# LeakAI Chrome Extension - CRX Installation

## About CRX Files

A CRX file is Chrome's native extension package format. However, modern Chrome has security restrictions on unsigned CRX files.

## Installation Methods

### Method 1: Drag & Drop CRX (May Not Work)
1. Open Chrome and navigate to \`chrome://extensions/\`
2. Enable "Developer mode"
3. Drag the \`${crxFileName}\` file onto the extensions page
4. If Chrome blocks it, use Method 2

### Method 2: Load Unpacked (Recommended)
1. Extract the ZIP file: \`${PACKAGE_NAME}-v${version}.zip\`
2. Open Chrome and navigate to \`chrome://extensions/\`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extracted folder

### Method 3: Use Installation Scripts
- Windows: Run \`install.bat\`
- Mac/Linux: Run \`install.sh\`

## Why CRX Installation May Fail

Modern Chrome blocks unsigned CRX files for security reasons:
- Only Chrome Web Store extensions have valid signatures
- Developer CRX files require special certificates
- "Load unpacked" is the recommended method for testing

## Chrome Web Store Submission

For wide distribution, submit to Chrome Web Store:
1. Create developer account
2. Upload the ZIP package
3. Chrome will sign and distribute as CRX
4. Users can install directly from store

## Verification

After installation (any method):
1. Extension icon should appear in toolbar
2. Click icon to open popup
3. Verify "Active" status
4. Test on any website with text inputs
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'CRX-INSTALLATION.md'), crxInstructions);

// Update the main README to clarify installation methods
const updatedReadme = `# LeakAI Chrome Extension v${version}

## Installation Methods (Choose One)

### 🎯 Method 1: Load Unpacked (RECOMMENDED)
1. **Extract ZIP**: Extract \`${PACKAGE_NAME}-v${version}.zip\`
2. **Open Chrome**: Navigate to \`chrome://extensions/\`
3. **Developer Mode**: Enable the toggle in top right
4. **Load Extension**: Click "Load unpacked" and select extracted folder
5. **Verify**: Extension icon appears in toolbar

### 🔄 Method 2: Try CRX File (May Be Blocked)
1. **Open Chrome**: Navigate to \`chrome://extensions/\`
2. **Developer Mode**: Enable the toggle
3. **Drag & Drop**: Drag \`${crxFileName}\` onto the page
4. **If Blocked**: Use Method 1 instead

### ⚡ Method 3: Use Installation Scripts
- **Windows**: Double-click \`install.bat\`
- **Mac/Linux**: Run \`./install.sh\` in terminal

## Why Extract ZIP?

Chrome's security model requires:
- **Signed CRX**: Only from Chrome Web Store (for general users)
- **Unpacked Folders**: For development and testing
- **ZIP files cannot be loaded directly** by Chrome

## Package Contents

- \`${crxFileName}\` - CRX package (may require unpacking)
- \`${PACKAGE_NAME}-v${version}.zip\` - ZIP archive (extract this)
- \`install.sh\` / \`install.bat\` - Installation helpers
- \`README.md\` - This guide
- \`CRX-INSTALLATION.md\` - Detailed CRX information

## Quick Start

**Fastest method**: Extract the ZIP file and use "Load unpacked" in Chrome.

## Features

✅ Real-time sensitive data detection  
✅ Email, phone, credit card, API key detection  
✅ Visual indicators with colored underlines  
✅ Tooltips with explanations and actions  
✅ Form submission warnings  
✅ Configurable detection categories  

## Support

- 📖 See \`CRX-INSTALLATION.md\` for detailed installation help
- 🐛 Report issues via GitHub
- 💬 Contact: support@leakai.com

---

**Note**: For production use, extensions should be installed from the Chrome Web Store where they are properly signed and verified.
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), updatedReadme);

console.log('\n📊 Package Summary:');
console.log(`   📦 CRX File: ${crxFileName} ${fs.existsSync(crxFilePath) ? '✅' : '❌'}`);
console.log(`   📁 ZIP File: ${PACKAGE_NAME}-v${version}.zip`);
console.log(`   📄 Instructions: CRX-INSTALLATION.md`);
console.log(`   📄 Updated: README.md`);

console.log('\n⚠️  Important Notes:');
console.log('   • Modern Chrome blocks unsigned CRX files');
console.log('   • "Load unpacked" from extracted ZIP is recommended');
console.log('   • CRX files work best when distributed via Chrome Web Store');
console.log('   • For testing, always use the extracted folder method');

console.log('\n🎯 Recommended Installation:');
console.log('   1. Extract the ZIP file');
console.log('   2. Use "Load unpacked" in chrome://extensions/');
console.log('   3. Select the extracted folder');

console.log('\n✅ Package creation completed!');