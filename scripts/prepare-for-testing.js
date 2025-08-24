#!/usr/bin/env node

/**
 * Prepare LeakAI Extension for Testing Distribution
 * Creates testing-ready packages with clear instructions
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Preparing LeakAI Extension for Testing Distribution...\n');

const BUILD_DIR = 'dist';
const PACKAGE_DIR = 'packages';
const TESTING_DIR = 'testing-package';

// Create testing package directory
if (fs.existsSync(TESTING_DIR)) {
    fs.rmSync(TESTING_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TESTING_DIR, { recursive: true });

console.log('📦 Creating Testing Package...');

// Copy essential files for testers
const filesToCopy = [
    { src: path.join(PACKAGE_DIR, 'leakai-extension-v1.0.0.zip'), dest: 'leakai-extension.zip' },
    { src: path.join(PACKAGE_DIR, 'install.bat'), dest: 'install.bat' },
    { src: path.join(PACKAGE_DIR, 'install.sh'), dest: 'install.sh' },
    { src: 'DISTRIBUTION_GUIDE.md', dest: 'TESTING_GUIDE.md' }
];

filesToCopy.forEach(file => {
    if (fs.existsSync(file.src)) {
        fs.copyFileSync(file.src, path.join(TESTING_DIR, file.dest));
        console.log(`   ✅ Copied ${file.dest}`);
    } else {
        console.log(`   ⚠️  Missing ${file.src}`);
    }
});

// Create simple installation instructions
const simpleInstructions = `# LeakAI Extension - Quick Install Guide

## 🚀 Quick Installation (2 minutes)

### Option 1: Automatic (Recommended)
- **Windows**: Double-click \`install.bat\`
- **Mac/Linux**: Double-click \`install.sh\`

### Option 2: Manual
1. Extract \`leakai-extension.zip\`
2. Open Chrome → \`chrome://extensions/\`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the extracted folder

## ✅ Verify Installation
1. Look for LeakAI icon in Chrome toolbar
2. Click icon → popup should open
3. Should show "Active" status

## 🧪 Quick Test (30 seconds)
1. Go to any website (Gmail, Google, etc.)
2. Type in a text field: \`test@example.com\`
3. Should see blue underline appear
4. Hover over underline → tooltip appears

## 📋 Full Testing
See \`TESTING_GUIDE.md\` for complete testing instructions.

## 🐛 Problems?
- Check Chrome console (F12) for errors
- Make sure "Developer mode" is enabled
- Try refreshing the webpage
- Contact: [your-email]

## 🎯 What This Extension Does
- Detects sensitive data as you type (emails, credit cards, etc.)
- Shows colored underlines under sensitive text
- Provides tooltips with explanations
- Offers actions to mask/remove sensitive data
- Warns before submitting forms with sensitive data

**Privacy**: All processing happens locally in your browser. No data is sent anywhere.
`;

fs.writeFileSync(path.join(TESTING_DIR, 'README.md'), simpleInstructions);

// Create a feedback template
const feedbackTemplate = `# LeakAI Extension - Feedback Form

## Tester Information
- **Name**: [Your name]
- **Email**: [Your email]
- **Chrome Version**: [Check in chrome://version/]
- **Operating System**: [Windows/Mac/Linux]
- **Testing Date**: [Date]

## Installation Experience
- [ ] Installed successfully on first try
- [ ] Had installation issues (describe below)
- [ ] Installation instructions were clear
- [ ] Installation instructions were confusing

**Installation Issues** (if any):


## Functionality Testing

### Basic Detection (check all that work)
- [ ] Email addresses get underlined
- [ ] Phone numbers get underlined  
- [ ] Credit card numbers get underlined
- [ ] Tooltips appear when hovering
- [ ] Extension popup opens when clicking icon

### Settings Testing
- [ ] Master toggle turns extension on/off
- [ ] Individual category toggles work
- [ ] Settings persist after browser restart

### Action Testing
- [ ] Mask action works (hides sensitive data)
- [ ] Remove action works (deletes sensitive data)
- [ ] Undo action works (restores original text)

### Websites Tested
List websites where you tested the extension:
- [ ] Gmail
- [ ] GitHub
- [ ] Banking website: ________________
- [ ] Other: ________________
- [ ] Other: ________________

## User Experience

### Overall Rating (1-5 stars)
- **Usefulness**: ⭐⭐⭐⭐⭐
- **Ease of Use**: ⭐⭐⭐⭐⭐
- **Visual Design**: ⭐⭐⭐⭐⭐
- **Performance**: ⭐⭐⭐⭐⭐

### What You Liked:


### What You Didn't Like:


### Suggestions for Improvement:


## Bugs Found
**Bug 1**:
- Description:
- Steps to reproduce:
- Expected behavior:
- Actual behavior:

**Bug 2**:
- Description:
- Steps to reproduce:
- Expected behavior:
- Actual behavior:

## Would You Use This Extension?
- [ ] Yes, definitely
- [ ] Yes, probably
- [ ] Maybe
- [ ] Probably not
- [ ] Definitely not

**Why?**:


## Additional Comments:


---
**Thank you for testing LeakAI!** 🙏
Please email this completed form to: [your-email]
`;

fs.writeFileSync(path.join(TESTING_DIR, 'FEEDBACK_FORM.md'), feedbackTemplate);

// Create Chrome Web Store preparation files
const storeDescription = `LeakAI - Real-time Data Loss Prevention

Protect your sensitive information with LeakAI, a Chrome extension that detects and flags sensitive data as you type across web applications.

🔍 REAL-TIME DETECTION
• Email addresses
• Phone numbers  
• Credit card numbers
• API keys and credentials
• Cryptocurrency data
• Health information
• Company confidential terms

🎨 VISUAL INDICATORS
• Color-coded underlines by risk level
• Smart tooltips with explanations
• Non-intrusive visual feedback

⚡ QUICK ACTIONS
• Mask sensitive data (e.g., j***@example.com)
• Remove sensitive text
• Replace with alternative text
• Undo any changes

🛡️ FORM PROTECTION
• Warns before submitting sensitive data
• Prevents accidental data leaks
• Configurable risk thresholds

⚙️ FLEXIBLE CONFIGURATION
• Enable/disable detection categories
• Master on/off toggle
• Settings sync across browser tabs

🔒 PRIVACY FIRST
• 100% local processing
• No data sent to external servers
• No tracking or analytics
• Open source code available

Perfect for professionals, developers, and anyone who handles sensitive information online. Works seamlessly with Gmail, GitHub, banking sites, and all web applications.

PERMISSIONS EXPLAINED:
• activeTab: Access current tab content for detection
• storage: Save your preferences locally
• scripting: Inject detection scripts into web pages

Try LeakAI today and never accidentally leak sensitive data again!`;

fs.writeFileSync(path.join(TESTING_DIR, 'CHROME_STORE_DESCRIPTION.txt'), storeDescription);

// Create distribution checklist
const distributionChecklist = `# Distribution Checklist

## Before Testing Distribution

### Package Preparation
- [ ] Production build completed (\`npm run build\`)
- [ ] All tests passing (\`npm test\`)
- [ ] Package verification passed
- [ ] ZIP archive created
- [ ] Installation scripts tested

### Documentation
- [ ] README.md updated with clear instructions
- [ ] TESTING_GUIDE.md created
- [ ] FEEDBACK_FORM.md prepared
- [ ] Installation troubleshooting documented

### Testing Preparation
- [ ] Internal testing completed
- [ ] Known issues documented
- [ ] Expected testing timeline set
- [ ] Feedback collection method established

## Distribution Methods

### Method 1: Load Unpacked (Immediate)
**Best for**: Internal team, technical testers
- [ ] Share testing-package/ folder
- [ ] Include installation instructions
- [ ] Provide testing guide
- [ ] Set up feedback collection

**Pros**: No approval needed, immediate distribution
**Cons**: Requires technical knowledge, shows warnings

### Method 2: Chrome Web Store Private (Recommended)
**Best for**: Broader testing, non-technical users
- [ ] Create Chrome Web Store developer account ($5)
- [ ] Upload ZIP package
- [ ] Set visibility to "Private" or "Unlisted"
- [ ] Add testers by email address
- [ ] Share private store link

**Pros**: Easy installation, no warnings, automatic updates
**Cons**: Requires developer account, 1-3 day review

### Method 3: GitHub Releases
**Best for**: Open source distribution
- [ ] Create GitHub release
- [ ] Upload ZIP as release asset
- [ ] Tag version (v1.0.0)
- [ ] Write release notes
- [ ] Include installation instructions

## Chrome Web Store Submission

### Required Assets
- [ ] Extension ZIP file (< 2MB)
- [ ] 128x128 icon (PNG)
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Promotional images (optional)
- [ ] Privacy policy (if collecting data)

### Store Listing
- [ ] Title: "LeakAI - Data Loss Prevention"
- [ ] Short description (132 chars max)
- [ ] Detailed description (see CHROME_STORE_DESCRIPTION.txt)
- [ ] Category: Productivity
- [ ] Language: English

### Review Process
- [ ] Submit for review
- [ ] Wait 1-3 business days
- [ ] Address any review feedback
- [ ] Publish when approved

## Post-Distribution

### Monitoring
- [ ] Set up feedback collection
- [ ] Monitor for bug reports
- [ ] Track installation success rate
- [ ] Gather user experience feedback

### Support
- [ ] Respond to user questions
- [ ] Fix critical bugs quickly
- [ ] Plan feature improvements
- [ ] Prepare for public release

## Timeline Estimate

- **Load Unpacked Distribution**: Immediate
- **Chrome Web Store Private**: 3-5 days (including review)
- **Testing Phase**: 2-4 weeks
- **Bug Fixes**: 1-2 weeks
- **Public Release**: 1-2 weeks after testing

## Success Metrics

- [ ] >80% successful installations
- [ ] <5 critical bugs reported
- [ ] >4/5 average user rating
- [ ] Positive feedback on core functionality
- [ ] Performance acceptable on target websites

---

**Next Steps**: Choose distribution method and begin testing phase.
`;

fs.writeFileSync(path.join(TESTING_DIR, 'DISTRIBUTION_CHECKLIST.md'), distributionChecklist);

console.log('\n📊 Testing Package Created:');
console.log(`   📁 Location: ${TESTING_DIR}/`);
console.log('   📄 Files included:');
console.log('      • leakai-extension.zip (installable package)');
console.log('      • README.md (quick install guide)');
console.log('      • TESTING_GUIDE.md (comprehensive testing)');
console.log('      • FEEDBACK_FORM.md (feedback collection)');
console.log('      • install.sh / install.bat (auto-install scripts)');
console.log('      • CHROME_STORE_DESCRIPTION.txt (store listing)');
console.log('      • DISTRIBUTION_CHECKLIST.md (next steps)');

console.log('\n🚀 Ready for Distribution!');
console.log('\n📋 Next Steps:');
console.log('   1. Choose distribution method (see DISTRIBUTION_CHECKLIST.md)');
console.log('   2. Share testing-package/ folder with testers');
console.log('   3. Collect feedback using FEEDBACK_FORM.md');
console.log('   4. Consider Chrome Web Store private listing for easier testing');

console.log('\n✅ Testing package preparation completed!');