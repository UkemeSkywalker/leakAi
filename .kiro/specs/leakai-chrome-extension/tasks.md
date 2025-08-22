# Implementation Plan

- [x] 1. Set up Chrome extension project structure and manifest

  - Create manifest.json with Manifest V3 configuration
  - Set up directory structure for content scripts, background, popup, and patterns
  - Configure permissions for activeTab, storage, and scripting
  - **Test:** Load extension in Chrome developer mode and verify no manifest errors
  - **Verify:** Extension appears in chrome://extensions/ with correct name and permissions
  - **🌐 BROWSER TESTING MILESTONE:** Extension loads in Chrome without errors
  - _Requirements: All requirements depend on basic extension setup_

- [x] 2. Implement core detection engine foundation

  - [x] 2.1 Create detection engine class with basic orchestration

    - Write DetectionEngine class with main detectSensitiveData method
    - Implement confidence scoring and risk categorization logic
    - Add caching mechanism for detection results
    - **Test:** Create unit tests that call detectSensitiveData with sample text
    - **Verify:** Engine returns DetectionResult objects with correct confidence scores and risk levels
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 2.2 Create detection result data models and interfaces
    - Define DetectionResult interface with all required properties
    - Create DetectionType and RiskLevel enums
    - Implement Action enum for remediation options
    - **Test:** Create sample DetectionResult objects and validate all properties
    - **Verify:** TypeScript compilation passes and all enum values are accessible
    - _Requirements: 2.1, 2.2_

- [ ] 3. Implement deterministic pattern matchers

  - [ ] 3.1 Create email detection pattern matcher

    - Write EmailDetector class with regex-based detection
    - Implement email validation and context extraction
    - Add unit tests for various email formats
    - **Test:** Run tests with valid emails (user@domain.com), invalid formats, and edge cases
    - **Verify:** Detector correctly identifies emails and rejects non-email strings
    - _Requirements: 5.1_

  - [ ] 3.2 Create phone number detection pattern matcher

    - Write PhoneDetector class for E.164 and common formats
    - Implement phone number validation and normalization
    - Add unit tests for international and domestic formats
    - **Test:** Test with +1234567890, (555) 123-4567, and international formats
    - **Verify:** Detector identifies valid phone numbers and normalizes to consistent format
    - _Requirements: 5.1_

  - [ ] 3.3 Create credit card detection with Luhn validation

    - Write CreditCardDetector class with 13-19 digit pattern matching
    - Implement Luhn algorithm validation function
    - Add card type identification (Visa, MC, Amex, etc.)
    - Add unit tests with test credit card numbers
    - **Test:** Use test card numbers (4111111111111111 for Visa, 5555555555554444 for MC)
    - **Verify:** Luhn validation passes for valid test cards, fails for invalid numbers
    - _Requirements: 5.2_

  - [ ] 3.4 Create API key and credential detection
    - Write ApiKeyDetector class with known prefix patterns
    - Implement entropy analysis for high-entropy string detection
    - Add validation for common API key formats
    - Add unit tests for various API key types
    - **Test:** Test with sample keys like "AKIA...", "ghp\_...", "sk-live-...", and high-entropy strings
    - **Verify:** Detector flags known API key patterns and high-entropy strings above threshold
    - _Requirements: 5.3_

- [ ] 4. Implement cryptocurrency detection patterns

  - [ ] 4.1 Create seed phrase detection

    - Write seed phrase detector using BIP-39 word list
    - Implement 12+ word sequence validation
    - Add high-risk flagging for seed phrases
    - **Test:** Test with valid 12-word BIP-39 phrases and invalid word combinations
    - **Verify:** Detector flags valid seed phrases as HIGH risk, ignores random word sequences
    - _Requirements: 5.4_

  - [ ] 4.2 Create private key detection

    - Write private key detector for various formats (hex, WIF, PEM)
    - Implement pattern matching for 0x + 64 hex and -----BEGIN PRIVATE KEY-----
    - Add high-risk flagging for private keys
    - **Test:** Test with sample private keys in hex, WIF, and PEM formats
    - **Verify:** Detector flags all private key formats as HIGH risk
    - _Requirements: 5.4_

  - [ ] 4.3 Create cryptocurrency address detection
    - Write address detector for Bitcoin, Ethereum, and common formats
    - Implement context analysis for "send", "refund", personal context
    - Add appropriate risk scoring based on context
    - **Test:** Test with Bitcoin/Ethereum addresses in different contexts ("send to 1A1z...", "my address: 1A1z...")
    - **Verify:** Context affects risk scoring (higher risk with "send", lower for "my address")
    - _Requirements: 5.4_

- [ ] 5. Create content script for web page integration

  - [ ] 5.1 Implement text input monitoring

    - Write ContentScript class with event listeners for text inputs
    - Implement real-time text scanning on input events
    - Add support for various input types (input, textarea, contenteditable)
    - **Test:** Type in various input fields on test pages and verify events are captured
    - **Verify:** Console logs show detection events firing for all input types
    - **🌐 BROWSER TESTING MILESTONE:** Content script runs on web pages and monitors typing
    - _Requirements: 1.1, 1.2_

  - [ ] 5.2 Create UI rendering system

    - Write UIRenderer class for applying visual indicators
    - Implement category-specific underline colors (Red, Amber, Blue, Purple, Gray)
    - Add CSS injection for underline styles
    - **Test:** Type sensitive data in input fields and verify colored underlines appear
    - **Verify:** Different data types show correct colors (red for credentials, blue for PII, etc.)
    - **🌐 BROWSER TESTING MILESTONE:** Visual detection works - you can see underlines on web pages!
    - _Requirements: 1.2, 1.3_

  - [ ] 5.3 Implement tooltip system
    - Create tooltip component with detection explanations
    - Implement hover event handling and positioning
    - Add tooltip content generation with risk level and actions
    - **Test:** Hover over underlined text and verify tooltips appear with correct content
    - **Verify:** Tooltips show detection reason, risk level, and available actions
    - **🌐 BROWSER TESTING MILESTONE:** Full detection UI works - underlines + tooltips on any website
    - _Requirements: 1.4, 2.1_

- [ ] 6. Implement user interaction and remediation actions

  - [ ] 6.1 Create action menu system

    - Write action menu component with mask, remove, replace, encrypt, ignore options
    - Implement click handlers for each action type
    - Add visual feedback for action execution
    - **Test:** Click on underlined text and verify action menu appears with all options
    - **Verify:** Each action button is clickable and shows appropriate visual feedback
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 6.2 Implement masking functionality

    - Write text masking function (e.g., john.doe@example.com → j\*\*\*@example.com)
    - Implement different masking strategies for different data types
    - Add DOM manipulation to replace text in input fields
    - **Test:** Click "mask" action on various data types and verify correct masking
    - **Verify:** Email becomes j**_@example.com, phone becomes +1\_**7890, etc.
    - _Requirements: 2.2_

  - [ ] 6.3 Implement remove and replace actions
    - Write text removal function with DOM manipulation
    - Implement text replacement with user input dialog
    - Add undo functionality for accidental actions
    - **Test:** Use "remove" to delete text, "replace" to substitute with new text
    - **Verify:** Text is properly removed/replaced in input field, undo works correctly
    - **🌐 BROWSER TESTING MILESTONE:** Core functionality complete - detect, show, and fix sensitive data
    - _Requirements: 2.3, 2.4_

- [ ] 7. Create form submission interception system

  - [ ] 7.1 Implement form submission detection

    - Write form submission event listeners
    - Implement detection scanning before form submission
    - Add form submission prevention for high-risk content
    - **Test:** Try to submit forms with high-risk data and verify submission is blocked
    - **Verify:** Form submission is prevented, console shows interception working
    - _Requirements: 7.1, 7.2_

  - [ ] 7.2 Create warning modal system
    - Write warning modal component with detected items list
    - Implement modal styling and user interaction
    - Add proceed/cancel functionality with appropriate actions
    - **Test:** Submit form with sensitive data and verify warning modal appears
    - **Verify:** Modal shows all detected items, proceed/cancel buttons work correctly
    - **🌐 BROWSER TESTING MILESTONE:** Form protection works - prevents accidental data submission
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 8. Implement background script and settings management

  - [ ] 8.1 Create background service worker

    - Write BackgroundScript class with message handling
    - Implement cross-tab communication and coordination
    - Add settings synchronization across tabs
    - **Test:** Send messages between content script and background, verify responses
    - **Verify:** Background script logs show message handling, cross-tab sync works
    - _Requirements: 6.2, 6.3_

  - [ ] 8.2 Implement settings storage system
    - Write settings management with Chrome storage API
    - Implement ExtensionSettings interface with all configuration options
    - Add default settings initialization and validation
    - **Test:** Save and load settings, verify persistence across browser restarts
    - **Verify:** Chrome storage contains expected settings, defaults load correctly
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 9. Create extension popup interface

  - [ ] 9.1 Build popup HTML and CSS

    - Create popup.html with extension controls layout
    - Write popup.css with styling for toggles and settings
    - Implement responsive design for various popup sizes
    - **Test:** Click extension icon and verify popup opens with proper layout
    - **Verify:** All controls are visible and properly styled, responsive design works
    - _Requirements: 6.1, 6.2_

  - [ ] 9.2 Implement popup functionality
    - Write popup.js with event handlers for controls
    - Implement master enable/disable toggle
    - Add per-category detection toggles
    - Add communication with background script
    - **Test:** Toggle extension on/off, toggle individual categories, verify settings persist
    - **Verify:** Settings changes affect detection behavior on web pages immediately
    - **🌐 BROWSER TESTING MILESTONE:** Full MVP ready - complete extension with user controls
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 10. Add optional Transformers.js NER model integration

  - [ ] 10.1 Implement NER model loading system

    - Write NERDetector class with Transformers.js integration
    - Implement async model loading with progress indication
    - Add fallback to heuristics when model unavailable
    - **Test:** Enable NER model and verify it loads without errors, test fallback behavior
    - **Verify:** Console shows model loading progress, fallback works when model fails
    - _Requirements: 5.1, 5.6_

  - [ ] 10.2 Create name and location detection
    - Implement person name detection using NER pipeline
    - Add location and address detection
    - Implement organization name detection
    - Add confidence scoring for NER results
    - **Test:** Type names like "John Smith", locations like "New York", orgs like "Google"
    - **Verify:** NER model correctly identifies and flags these entities with appropriate confidence
    - _Requirements: 5.1, 5.6_

- [ ] 11. Implement health and company-confidential detection

  - [ ] 11.1 Create health information detection

    - Write health terms detector with medical terminology patterns
    - Implement context-aware health information flagging
    - Add appropriate risk scoring for health data
    - **Test:** Type medical terms like "diabetes", "prescription", "SSN", "medical record"
    - **Verify:** Health-related terms are flagged with appropriate risk levels
    - _Requirements: 5.5_

  - [ ] 11.2 Create company-confidential detection
    - Write configurable company terms detector
    - Implement project codename and client list detection
    - Add organizational rule application system
    - **Test:** Configure custom terms like "Project Alpha", "Client XYZ" and verify detection
    - **Verify:** Custom organizational terms are flagged according to configured rules
    - _Requirements: 5.6_

- [ ] 12. Add comprehensive error handling and performance optimization

  - [ ] 12.1 Implement error handling system

    - Write ErrorHandler class with graceful degradation
    - Add error recovery for detection engine failures
    - Implement UI error handling with fallback behaviors
    - **Test:** Simulate errors (corrupt patterns, DOM manipulation failures) and verify recovery
    - **Verify:** Extension continues working with reduced functionality, no crashes occur
    - _Requirements: All requirements benefit from error handling_

  - [ ] 12.2 Optimize performance and memory usage
    - Implement detection result caching with TTL
    - Add performance monitoring and timeout handling
    - Optimize DOM manipulation and event handling
    - Add memory cleanup for large text processing
    - **Test:** Type rapidly in large text areas, monitor memory usage and response times
    - **Verify:** No memory leaks, detection remains responsive under heavy usage
    - _Requirements: 1.1, 1.2 (performance impacts user experience)_

- [ ] 13. Create comprehensive test suite

  - [ ] 13.1 Write unit tests for all detection patterns

    - Create test cases for each pattern matcher with positive/negative examples
    - Test Luhn algorithm with known test credit card numbers
    - Test entropy analysis with various string types
    - Test NER model integration with mock data
    - **Test:** Run complete test suite with npm test or similar command
    - **Verify:** All tests pass, coverage reports show adequate test coverage (>80%)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ] 13.2 Write integration tests for content script
    - Test detection across different website layouts
    - Test form submission interception
    - Test UI rendering with various text selections
    - Test cross-component communication
    - **Test:** Run integration tests on multiple test websites (Gmail, GitHub, forms)
    - **Verify:** Extension works correctly across different sites and frameworks
    - _Requirements: 1.1, 1.2, 1.4, 7.1, 7.2_

- [ ] 14. Final integration and packaging

  - [ ] 14.1 Integrate all components and test end-to-end functionality

    - Wire together all detection engines with content script
    - Test complete user workflow from detection to remediation
    - Verify settings persistence and cross-tab synchronization
    - Test extension popup integration with all features
    - **Test:** Complete full user journey: install → configure → detect → remediate → submit
    - **Verify:** All features work together seamlessly, no integration issues
    - **🌐 BROWSER TESTING MILESTONE:** Production-ready extension with all features
    - _Requirements: All requirements_

  - [ ] 14.2 Package extension for distribution
    - Create production build with minified code
    - Generate extension package for Chrome Web Store
    - Create installation and usage documentation
    - Verify all permissions and security requirements
    - **Test:** Install packaged extension from .crx file and verify all functionality
    - **Verify:** Extension works identically to development version, ready for distribution
    - _Requirements: All requirements (final deliverable)_
