// Simple LeakAI Debug Script
// Run this in the browser console to test basic functionality

console.log('=== LeakAI Simple Debug Test ===');

// Check if content script is loaded
if (window.LeakAI && window.LeakAI.contentScript) {
    console.log('✓ ContentScript found');
    console.log('ContentScript stats:', window.LeakAI.contentScript.getStats());
    
    // Test detection on a simple string
    const testInput = document.querySelector('input, textarea');
    if (testInput) {
        console.log('✓ Found test input element:', testInput);
        
        // Simulate typing an email
        testInput.value = 'test@example.com';
        testInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✓ Simulated typing email address');
        console.log('Check for red underline and hover for tooltip');
    } else {
        console.log('✗ No input element found on page');
    }
    
    // Check action menu
    if (window.LeakAI.actionMenu) {
        console.log('✓ ActionMenu found');
    } else {
        console.log('✗ ActionMenu not found');
    }
    
} else {
    console.log('✗ ContentScript not found');
    console.log('Available window.LeakAI:', window.LeakAI);
}

// Check if detection engine is available
if (window.LeakAI && window.LeakAI.DetectionEngine) {
    console.log('✓ DetectionEngine class found');
    
    // Test direct detection
    try {
        const engine = new window.LeakAI.DetectionEngine();
        engine.initialize().then(() => {
            console.log('✓ DetectionEngine initialized');
            
            engine.detectSensitiveData('Contact me at john@example.com').then(results => {
                console.log('✓ Direct detection test results:', results);
            });
        });
    } catch (error) {
        console.log('✗ DetectionEngine test failed:', error);
    }
} else {
    console.log('✗ DetectionEngine class not found');
}

console.log('=== Debug Test Complete ===');
console.log('Try typing: test@example.com, (555) 123-4567, or 4111111111111111');