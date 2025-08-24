# LeakAI Chrome Extension - Distribution Guide

## 🎯 Distribution Strategy for Testing

### Option 1: Load Unpacked (Immediate Testing)

**Best for**: Internal team, developers, immediate testing

#### For You (Developer):
1. Share the `packages/leakai-extension-v1.0.0.zip` file
2. Include installation instructions (see below)
3. Provide support for technical issues

#### For Testers:
1. Download and extract `leakai-extension-v1.0.0.zip`
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode" (toggle top right)
4. Click "Load unpacked"
5. Select the extracted folder
6. Extension appears in toolbar

**Pros**: ✅ Works immediately, no approval needed, full control
**Cons**: ❌ Shows developer warnings, requires technical knowledge

---

### Option 2: Chrome Web Store (Recommended for Beta)

**Best for**: Wider testing, non-technical users, professional distribution

#### Setup Process:
1. **Create Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay $5 one-time registration fee
   - Verify your identity

2. **Upload Extension**
   - Upload `packages/leakai-extension-v1.0.0.zip`
   - Fill out store listing (description, screenshots, etc.)
   - Set visibility to "Private" or "Unlisted"

3. **Review Process**
   - Google reviews extension (1-3 days typically)
   - May request changes for policy compliance
   - Once approved, you get a store link

4. **Share with Testers**
   - Send Chrome Web Store link
   - Testers click "Add to Chrome"
   - Installs like any other extension

**Pros**: ✅ Professional, easy for users, automatic updates, no warnings
**Cons**: ❌ $5 fee, review process, Google's policies apply

---

## 📦 What to Share with Testers

### For Load Unpacked Method:

**Package Contents:**
```
leakai-extension-testing-package/
├── leakai-extension-v1.0.0.zip    # Main extension files
├── INSTALLATION_GUIDE.md          # Step-by-step instructions
├── TESTING_GUIDE.md               # What to test
├── install.bat                    # Windows helper script
├── install.sh                     # Mac/Linux helper script
└── FEEDBACK_TEMPLATE.md           # Bug report template
```

### Installation Instructions for Testers:

```markdown
# LeakAI Extension - Installation Instructions

## Quick Install (5 minutes)

1. **Download**: Extract the ZIP file to your desktop
2. **Open Chrome**: Type `chrome://extensions/` in address bar
3. **Developer Mode**: Turn ON the toggle in top right corner
4. **Load Extension**: Click "Load unpacked" button
5. **Select Folder**: Choose the extracted folder
6. **Done**: LeakAI icon should appear in your toolbar

## Verify Installation

1. Click the LeakAI icon in Chrome toolbar
2. Should show "Active" status
3. Go to any website
4. Type an email address in a text field
5. Should see colored underline appear

## Need Help?

- See TESTING_GUIDE.md for what to test
- Use FEEDBACK_TEMPLATE.md to report issues
- Contact: [your-email@domain.com]
```

---

## 🧪 Testing Instructions for Users

<function_calls>
<invoke name="fsWrite">
<parameter name="path">packages/TESTING_GUIDE.mdeakAI Extension - Testing Guide

## 🎯 What to Test

### Basic Functionality (5 minutes)
1. **Installation**: Extension installs without errors
2. **Icon**: LeakAI icon appears in Chrome toolbar
3. **Popup**: Click icon → popup opens showing settings
4. **Status**: Shows "Active" with enabled categories

### Detection Testing (10 minutes)
Test these on any website with text inputs (Gmail, forms, etc.):

#### Email Detection
- Type: `john.doe@example.com`
- **Expected**: Blue underline appears
- **Hover**: Tooltip shows "Email Address Detected"

#### Phone Detection  
- Type: `(555) 123-4567`
- **Expected**: Blue underline appears
- **Hover**: Tooltip shows "Phone Number Detected"

#### Credit Card Detection
- Type: `4111111111111111`
- **Expected**: Red underline appears (high risk)
- **Hover**: Tooltip shows "Credit Card Detected"

#### API Key Detection
- Type: `sk-1234567890abcdef1234567890abcdef`
- **Expected**: Red underline appears
- **Hover**: Tooltip shows "API Key Detected"

### Settings Testing (5 minutes)
1. **Open Popup**: Click LeakAI icon
2. **Master Toggle**: Turn extension OFF → underlines disappear
3. **Master Toggle**: Turn extension ON → underlines return
4. **Category Toggle**: Disable "Email" → email underlines disappear
5. **Category Toggle**: Re-enable "Email" → email underlines return

### Action Testing (5 minutes)
1. **Type Email**: `test@example.com`
2. **Click Underline**: Action menu appears
3. **Click "Mask"**: Email becomes `t***@example.com`
4. **Look for Undo**: Should see undo button
5. **Click Undo**: Original email restored

### Form Protection (5 minutes)
1. **Find a Form**: Any website with submit button
2. **Enter Sensitive Data**: Credit card number
3. **Try Submit**: Should show warning modal
4. **Check Warning**: Lists detected sensitive items

## 🐛 What to Report

### Bugs to Look For:
- Extension doesn't load/install
- No underlines appear when typing sensitive data
- Popup doesn't open or shows errors
- Settings don't save or sync
- Actions (mask, remove) don't work
- Form submission isn't blocked
- Performance issues (slow typing, browser lag)
- Visual issues (underlines in wrong place, ugly tooltips)

### Browser Compatibility:
Test on different websites:
- ✅ Gmail/Google Workspace
- ✅ GitHub
- ✅ Banking websites
- ✅ Social media (Twitter, LinkedIn)
- ✅ E-commerce sites
- ✅ Any forms you use regularly

## 📝 How to Report Issues

Use this template:

```
**Bug Description**: What went wrong?

**Steps to Reproduce**:
1. Go to [website]
2. Type [specific text]
3. Expected [what should happen]
4. Actual [what actually happened]

**Browser**: Chrome version X.X.X
**Website**: [URL where it happened]
**Screenshot**: [if helpful]
**Console Errors**: [open F12, check for red errors]
```

## ✅ Success Criteria

Extension is working well if:
- Installs easily without errors
- Detects sensitive data reliably
- Visual indicators are clear and helpful
- Settings work and persist
- Actions (mask, remove) function correctly
- Doesn't slow down browsing
- Works on your commonly used websites

## 🎉 Feedback

**What we want to know**:
- Does it feel useful and helpful?
- Are the visual indicators clear?
- Is the popup interface intuitive?
- Would you use this regularly?
- What features are missing?
- Any suggestions for improvement?

**Contact**: [your-email@domain.com]
**Expected Testing Time**: 30 minutes total
**Feedback Deadline**: [set a date]

Thank you for helping test LeakAI! 🙏