#!/usr/bin/env node

/**
 * Production Build Script for LeakAI Chrome Extension
 * Creates a production-ready build with minified code and optimizations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building LeakAI Extension for Production...\n');

// Configuration
const BUILD_DIR = 'dist';
const SOURCE_FILES = [
    'manifest.json',
    'background/',
    'content/',
    'popup/',
    'patterns/',
    'icons/',
    'README.md'
];

const EXCLUDE_PATTERNS = [
    '*.test.js',
    '*.spec.js',
    'test-*',
    '*.map',
    '.DS_Store',
    'Thumbs.db'
];

// Clean build directory
console.log('🧹 Cleaning build directory...');
if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Copy files to build directory
console.log('📁 Copying source files...');

function shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => {
        if (pattern.startsWith('*')) {
            return filePath.endsWith(pattern.slice(1));
        }
        return filePath.includes(pattern);
    });
}

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);

    for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);

        if (shouldExclude(srcPath)) {
            console.log(`   ⏭️  Skipping ${srcPath}`);
            continue;
        }

        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`   ✅ Copied ${srcPath} → ${destPath}`);
        }
    }
}

function copyFile(src, dest) {
    if (shouldExclude(src)) {
        console.log(`   ⏭️  Skipping ${src}`);
        return;
    }

    fs.copyFileSync(src, dest);
    console.log(`   ✅ Copied ${src} → ${dest}`);
}

// Copy source files
SOURCE_FILES.forEach(source => {
    const srcPath = source;
    const destPath = path.join(BUILD_DIR, source);

    if (fs.existsSync(srcPath)) {
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    } else {
        console.log(`   ⚠️  Source not found: ${srcPath}`);
    }
});

// Update manifest for production
console.log('\n📋 Updating manifest for production...');
const manifestPath = path.join(BUILD_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Remove development-specific fields
    delete manifest.key;
    delete manifest.update_url;

    // Ensure production settings
    manifest.name = 'LeakAI - Data Loss Prevention';
    manifest.description = 'Real-time data loss prevention extension that detects and flags sensitive information as you type';

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('   ✅ Manifest updated for production');
} else {
    console.log('   ❌ Manifest not found in build directory');
}

// Minify JavaScript files (basic minification)
console.log('\n🗜️  Minifying JavaScript files...');

function minifyJS(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Basic minification - remove comments and extra whitespace
        content = content
            // Remove single-line comments (but preserve URLs and regex)
            .replace(/\/\/(?![^\r\n]*['"`]).*$/gm, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around operators and punctuation
            .replace(/\s*([{}();,:])\s*/g, '$1')
            // Remove leading/trailing whitespace
            .trim();

        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Minified ${filePath}`);
    } catch (error) {
        console.log(`   ⚠️  Could not minify ${filePath}: ${error.message}`);
    }
}

function minifyDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            minifyDirectory(itemPath);
        } else if (item.endsWith('.js') && !item.includes('.min.')) {
            minifyJS(itemPath);
        }
    }
}

// Minify JS files in build directory
const jsDirectories = ['background', 'content', 'popup', 'patterns'];
jsDirectories.forEach(dir => {
    const dirPath = path.join(BUILD_DIR, dir);
    if (fs.existsSync(dirPath)) {
        minifyDirectory(dirPath);
    }
});

// Minify CSS files
console.log('\n🎨 Minifying CSS files...');

function minifyCSS(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Basic CSS minification
        content = content
            // Remove comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around CSS syntax
            .replace(/\s*([{}:;,>+~])\s*/g, '$1')
            // Remove trailing semicolons before closing braces
            .replace(/;}/g, '}')
            // Remove leading/trailing whitespace
            .trim();

        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Minified ${filePath}`);
    } catch (error) {
        console.log(`   ⚠️  Could not minify ${filePath}: ${error.message}`);
    }
}

function findCSSFiles(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            findCSSFiles(itemPath);
        } else if (item.endsWith('.css') && !item.includes('.min.')) {
            minifyCSS(itemPath);
        }
    }
}

findCSSFiles(BUILD_DIR);

// Create package info
console.log('\n📦 Creating package information...');

const packageInfo = {
    name: 'leakai-chrome-extension',
    version: '1.0.0',
    description: 'LeakAI - Data Loss Prevention Chrome Extension',
    buildDate: new Date().toISOString(),
    buildType: 'production',
    files: []
};

// Collect file list
function collectFiles(dir, basePath = '') {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            collectFiles(itemPath, relativePath);
        } else {
            packageInfo.files.push({
                path: relativePath.replace(/\\/g, '/'),
                size: stat.size,
                modified: stat.mtime.toISOString()
            });
        }
    }
}

collectFiles(BUILD_DIR);

fs.writeFileSync(
    path.join(BUILD_DIR, 'package-info.json'),
    JSON.stringify(packageInfo, null, 2)
);

// Calculate build statistics
console.log('\n📊 Build Statistics:');
const totalFiles = packageInfo.files.length;
const totalSize = packageInfo.files.reduce((sum, file) => sum + file.size, 0);

console.log(`   📁 Total files: ${totalFiles}`);
console.log(`   📏 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`   🗂️  Build directory: ${BUILD_DIR}/`);

// Create installation instructions
console.log('\n📝 Creating installation instructions...');

const installInstructions = `# LeakAI Chrome Extension - Installation Guide

## Production Build v${packageInfo.version}
Built on: ${new Date().toLocaleDateString()}

## Installation Instructions

### Method 1: Load Unpacked Extension (Recommended for Testing)

1. Open Chrome and navigate to \`chrome://extensions/\`
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select the \`dist/\` folder from this package
5. The extension should now appear in your extensions list

### Method 2: Install from CRX File (If Available)

1. Download the \`.crx\` file
2. Open Chrome and navigate to \`chrome://extensions/\`
3. Enable "Developer mode"
4. Drag and drop the \`.crx\` file onto the extensions page
5. Click "Add extension" when prompted

## Verification

After installation, verify the extension is working:

1. Click the LeakAI icon in the Chrome toolbar
2. Ensure the popup opens and shows "Active" status
3. Navigate to any website with text inputs
4. Type sensitive data (like an email address)
5. Verify colored underlines appear under sensitive data

## Features

- Real-time detection of sensitive data as you type
- Visual indicators with colored underlines
- Tooltips with explanations and remediation actions
- Form submission warnings for high-risk data
- Configurable detection categories
- Cross-tab settings synchronization

## Support

For issues or questions:
- Check the browser console for error messages
- Verify all detection categories are enabled in settings
- Try refreshing the page if detection isn't working
- Restart Chrome if settings aren't syncing

## File Structure

\`\`\`
dist/
├── manifest.json          # Extension manifest
├── background/            # Background service worker
├── content/              # Content scripts and styles
├── popup/                # Extension popup interface
├── patterns/             # Detection engine and patterns
├── icons/                # Extension icons
└── package-info.json     # Build information
\`\`\`

## Security

This extension:
- Processes all data locally in your browser
- Never sends data to external servers
- Uses Chrome's secure storage APIs
- Follows Chrome extension security best practices

Built with ❤️ for data privacy and security.
`;

fs.writeFileSync(path.join(BUILD_DIR, 'INSTALL.md'), installInstructions);

console.log('\n✅ Production build completed successfully!');
console.log(`\n📦 Package ready in: ${BUILD_DIR}/`);
console.log('\n🚀 Next steps:');
console.log('   1. Test the extension by loading the dist/ folder in Chrome');
console.log('   2. Run browser integration tests');
console.log('   3. Create .crx package if needed');
console.log('   4. Prepare for Chrome Web Store submission');

console.log('\n🎉 Build process complete!');