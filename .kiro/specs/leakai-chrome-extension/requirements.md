# Requirements Document

## Introduction

LeakAI is a Chrome extension MVP that provides real-time data loss prevention by detecting and flagging sensitive information as users type across web applications. Acting as "Grammarly for Data Loss Prevention," this initial version focuses on core detection capabilities for PII, financial information, and basic credentials using deterministic patterns and local processing only.

## Requirements

### Requirement 1

**User Story:** As a user typing in web forms, I want sensitive data to be automatically detected and visually highlighted, so that I can identify potential data leaks before submitting information.

#### Acceptance Criteria

1. WHEN a user types in any text input field THEN the system SHALL scan the content in real-time for sensitive data patterns
2. WHEN sensitive data is detected THEN the system SHALL underline the text with category-specific colors (Red for credentials/seeds, Amber for financial, Blue for PII, Purple for org-confidential, Gray for low risk)
3. WHEN multiple categories of sensitive data are present THEN the system SHALL apply the highest risk level color
4. WHEN the user hovers over underlined text THEN the system SHALL display a tooltip showing the detection reason, risk level, and available actions

### Requirement 2

**User Story:** As a user who has accidentally entered sensitive information, I want quick remediation options, so that I can fix the issue without manually retyping everything.

#### Acceptance Criteria

1. WHEN a user clicks on underlined sensitive text THEN the system SHALL provide one-click actions: mask, remove, replace, encrypt, or ignore once
2. WHEN the user selects "mask" THEN the system SHALL replace the sensitive data with a masked version (e.g., john.doe@example.com → j***@example.com)
3. WHEN the user selects "remove" THEN the system SHALL delete the flagged text from the input field
4. WHEN the user selects "replace" THEN the system SHALL allow the user to enter alternative text
5. WHEN the user selects "encrypt" (org mode) THEN the system SHALL replace the text with a vault token
6. WHEN the user selects "ignore once" THEN the system SHALL temporarily disable detection for that specific instance

### Requirement 3

**User Story:** As a security administrator, I want to configure policies that automatically block high-risk data submissions, so that I can enforce organizational data protection standards.

#### Acceptance Criteria

1. WHEN high-risk sensitive data is detected before form submission THEN the system SHALL display a blocking modal with detected items and required actions
2. WHEN the blocking modal is displayed THEN the system SHALL prevent form submission until all high-risk items are addressed
3. WHEN medium-risk data is detected THEN the system SHALL show a warning but allow submission after user acknowledgment
4. WHEN low-risk data is detected THEN the system SHALL only provide visual indicators without blocking submission
5. IF organizational policies are configured THEN the system SHALL apply domain-specific rules and overrides

### Requirement 4

**User Story:** As a privacy-conscious user, I want sensitive data detection to happen locally on my device, so that my private information never leaves my browser.

#### Acceptance Criteria

1. WHEN performing detection checks THEN the system SHALL process all data locally using deterministic regex patterns
2. WHEN the extension is active THEN the system SHALL never send user data to external servers
3. WHEN detection occurs THEN the system SHALL rely entirely on client-side JavaScript processing

### Requirement 5

**User Story:** As a user working with various types of sensitive data, I want the system to accurately detect different categories of sensitive information, so that I can trust the detection results.

#### Acceptance Criteria

1. WHEN PII is entered (names, emails, phone numbers, addresses) THEN the system SHALL detect and flag it with appropriate confidence scoring
2. WHEN financial data is entered (credit cards, bank accounts, IBANs) THEN the system SHALL validate using appropriate algorithms (Luhn check, IBAN checksum)
3. WHEN credentials are entered (API keys, passwords, tokens) THEN the system SHALL detect based on entropy analysis and known prefixes
4. WHEN cryptocurrency data is entered (seed phrases, private keys, wallet addresses) THEN the system SHALL flag with high risk level
5. WHEN health-related terms are entered THEN the system SHALL detect and flag appropriately
6. WHEN company-confidential terms are entered THEN the system SHALL apply organizational detection rules

### Requirement 6

**User Story:** As a user, I want basic customization options, so that the extension works well for my needs.

#### Acceptance Criteria

1. WHEN the user opens extension settings THEN the system SHALL allow enabling/disabling detection categories
2. WHEN the user toggles the extension on/off THEN the system SHALL respect the setting across all websites
3. WHEN the user wants to temporarily disable detection THEN the system SHALL provide a quick toggle option

### Requirement 7

**User Story:** As a user submitting forms with sensitive data, I want a warning before submission, so that I can make informed decisions about data sharing.

#### Acceptance Criteria

1. WHEN a user attempts to submit a form containing high-risk sensitive data THEN the system SHALL show a warning modal
2. WHEN the warning modal is displayed THEN the system SHALL list all detected sensitive data items
3. WHEN the user acknowledges the warning THEN the system SHALL allow form submission to proceed
4. WHEN the user cancels the warning THEN the system SHALL prevent form submission and return focus to the form