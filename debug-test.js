// LeakAI Debug Test Script
// Run this in the browser console to test the extension

console.log('=== LeakAI Debug Test ===');

// Check if LeakAI namespace exists
console.log('1. Checking LeakAI namespace:', window.LeakAI);

// Check if data models are loaded
if (window.LeakAI) {
    console.log('2. DetectionType:', window.LeakAI.DetectionType);
    console.log('3. RiskLevel:', window.LeakAI.RiskLevel);
    console.log('4. Action:', window.LeakAI.Action);
    console.log('5. DetectionEngine:', window.LeakAI.DetectionEngine);
    console.log('6. CryptoDetector:', window.LeakAI.CryptoDetector);
    console.log('7. ContentScript:', window.LeakAI.contentScript);
    
    // Check if all required components are present
    const required = ['DetectionType', 'RiskLevel', 'Action', 'createDetectionResult', 'DetectionEngine'];
    const missing = required.filter(key => !window.LeakAI[key]);
    if (missing.length > 0) {
        console.error('8. Missing required components:', missing);
    } else {
        console.log('8. All required components present ✓');
    }
} else {
    console.log('2. LeakAI namespace not found!');
}

// Test detection engine directly
if (window.LeakAI && window.LeakAI.DetectionEngine) {
    console.log('9. Testing DetectionEngine...');
    try {
        const engine = new window.LeakAI.DetectionEngine();
        engine.initialize().then(() => {
            console.log('10. DetectionEngine initialized');
            
            // Test various types of sensitive data
            const testCases = [
                'My email is test@example.com and phone is (555) 123-4567',
                'Credit card: 4111111111111111',
                'API key: sk-1234567890abcdef1234567890abcdef',
                'Bitcoin address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                'Seed phrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
            ];
            
            for (const testCase of testCases) {
                engine.detectSensitiveData(testCase).then(detections => {
                    console.log(`11. Test "${testCase.substring(0, 30)}...": ${detections.length} detections`, detections);
                });
            }
        }).catch(error => {
            console.error('12. DetectionEngine test failed:', error);
        });
    } catch (error) {
        console.error('9. DetectionEngine creation failed:', error);
    }
} else {
    console.log('9. DetectionEngine not available');
}

// Check content script status
if (window.LeakAI && window.LeakAI.contentScript) {
    console.log('13. ContentScript stats:', window.LeakAI.contentScript.getStats());
} else {
    console.log('13. ContentScript not available');
}

// Test manual input monitoring
console.log('14. To test manually: Type "test@example.com" in any input field above');

console.log('=== Debug Test Complete ===');