# Requirements Document

## Introduction

This feature will transform the LeakAI extension's visual detection system from the current approach of underlining entire textarea/input elements to a precise, Grammarly-style system that underlines only the specific sensitive text portions within the input fields. This will provide users with more accurate visual feedback about exactly which parts of their text contain sensitive data.

## Requirements

### Requirement 1

**User Story:** As a user typing in a text field, I want to see underlines only on the specific sensitive text I've entered, so that I can easily identify and address the exact problematic content without confusion about what triggered the detection.

#### Acceptance Criteria

1. WHEN sensitive data is detected in a text input THEN the system SHALL underline only the specific detected text portions, not the entire input field
2. WHEN multiple sensitive data items exist in the same input THEN the system SHALL underline each detected portion independently with appropriate styling
3. WHEN I hover over an underlined text portion THEN the system SHALL show a tooltip specific to that detection
4. WHEN the underlined text spans multiple lines THEN the system SHALL properly handle line breaks and continue the underline on subsequent lines
5. WHEN I scroll within a textarea THEN the underlines SHALL remain properly positioned relative to the text

### Requirement 2

**User Story:** As a user, I want the precise underlining to work consistently across different types of input fields and web applications, so that I have a uniform experience regardless of where I'm typing.

#### Acceptance Criteria

1. WHEN using standard HTML input fields THEN the system SHALL apply precise text underlining
2. WHEN using textarea elements THEN the system SHALL apply precise text underlining with proper multi-line support
3. WHEN using contenteditable elements (like Gmail compose) THEN the system SHALL apply precise text underlining
4. WHEN using complex web applications (Gmail, Outlook, etc.) THEN the system SHALL maintain underlining accuracy despite complex DOM structures
5. WHEN the input field is resized or the font changes THEN the system SHALL recalculate and reposition underlines accurately

### Requirement 3

**User Story:** As a user, I want the precise underlining to maintain visual consistency with the current risk-level and category-based styling system, so that I can still quickly identify the severity and type of detected sensitive data.

#### Acceptance Criteria

1. WHEN high-risk sensitive data is detected THEN the underline SHALL use red color (#dc3545)
2. WHEN medium-risk sensitive data is detected THEN the underline SHALL use amber color (#ffc107)
3. WHEN low-risk sensitive data is detected THEN the underline SHALL use blue color (#007bff)
4. WHEN PII category data is detected THEN the underline SHALL use a dotted style pattern
5. WHEN health category data is detected THEN the underline SHALL use a specific dotted pattern with orange color
6. WHEN financial/crypto data is detected THEN the underline SHALL use solid underline styling

### Requirement 4

**User Story:** As a user, I want the precise underlining system to perform well and not impact my typing experience, so that I can continue working normally while receiving visual feedback about sensitive data.

#### Acceptance Criteria

1. WHEN I type in an input field THEN the underline positioning SHALL update smoothly without noticeable lag
2. WHEN the system calculates text positions THEN it SHALL complete within 50ms for typical input lengths
3. WHEN multiple input fields have detections THEN the system SHALL handle all overlays efficiently without performance degradation
4. WHEN I interact with the input field (select, copy, paste) THEN the normal input functionality SHALL remain unaffected
5. WHEN the page has many input fields THEN the system SHALL only create overlays for fields with actual detections

### Requirement 5

**User Story:** As a user, I want to be able to interact with the precisely underlined text through tooltips and actions, so that I can take appropriate remediation actions on specific detected content.

#### Acceptance Criteria

1. WHEN I click on an underlined text portion THEN the system SHALL show a tooltip positioned near that specific text with detection details and action options
2. WHEN I click outside of an underlined text portion THEN the system SHALL hide any visible tooltips
3. WHEN I perform an action (mask, remove, replace) on underlined text THEN the system SHALL update the overlay to reflect the changes and hide the tooltip
4. WHEN I undo an action THEN the system SHALL restore the original underline and text positioning
5. WHEN multiple detections overlap or are adjacent THEN the system SHALL handle tooltip interactions by showing the tooltip for the specific detection that was clicked
6. WHEN no underlined text is clicked THEN the system SHALL NOT show any tooltips (tooltips only appear on click, not hover)

### Requirement 6

**User Story:** As a user, I want the precise underlining to gracefully handle edge cases and complex text scenarios, so that the system remains reliable across different content types and input situations.

#### Acceptance Criteria

1. WHEN text contains special characters, emojis, or Unicode THEN the system SHALL accurately position underlines
2. WHEN text contains mixed font sizes or styles THEN the system SHALL adapt underline positioning accordingly
3. WHEN the input field has custom CSS styling THEN the system SHALL work correctly without interfering with existing styles
4. WHEN the browser zoom level changes THEN the system SHALL recalculate and maintain accurate underline positioning
5. WHEN the system cannot accurately position underlines THEN it SHALL fall back to the current element-level styling approach

### Requirement 7

**User Story:** As a developer, I want the precise underlining system to be maintainable and extensible, so that future enhancements and bug fixes can be implemented efficiently.

#### Acceptance Criteria

1. WHEN new detection types are added THEN the system SHALL automatically support them with appropriate styling
2. WHEN the text measurement logic needs updates THEN it SHALL be isolated in dedicated modules for easy maintenance
3. WHEN debugging positioning issues THEN the system SHALL provide clear logging and diagnostic information
4. WHEN the overlay system needs performance optimizations THEN the architecture SHALL support incremental improvements
5. WHEN browser compatibility issues arise THEN the system SHALL have clear fallback mechanisms