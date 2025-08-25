# Implementation Plan

- [x] 1. Create TextMeasurementEngine for accurate text positioning

  - Implement canvas-based text measurement system
  - Create character position calculation algorithms
  - Add font style detection and analysis methods
  - Handle line breaks and multi-line text scenarios
  - _Requirements: 1.4, 1.5, 6.1, 6.2_

- [x] 2. Build core TextOverlayManager class

  - Create overlay element creation and management system
  - Implement overlay positioning and synchronization logic
  - Add underline span generation for detected text portions
  - Create detection-specific styling application methods
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 3. Implement precise underline span generation

  - Create methods to generate HTML spans for detected text ranges
  - Apply risk-level styling (red, amber, blue colors) to underline spans
  - Implement category-specific styling (dotted patterns for PII/health)
  - Handle overlapping and adjacent detections properly
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Enhance TooltipManager for click-based interactions

  - Modify tooltip system to show tooltips only on click, not hover
  - Implement click detection specifically for underlined text spans
  - Add click-outside handling to hide tooltips appropriately
  - Position tooltips relative to clicked underlined text portions
  - _Requirements: 5.1, 5.2, 5.6_

- [x] 5. Create event handling system for overlay interactions

  - Implement click event delegation for underlined text spans
  - Add event handlers for input field scrolling and resizing
  - Create cleanup mechanisms for event listeners
  - Handle multiple overlapping detections in click events
  - _Requirements: 5.3, 5.5, 1.5_

- [x] 6. Integrate overlay system with existing UIRenderer

  - Modify UIRenderer to use TextOverlayManager instead of element-level styling
  - Implement decision logic for when to use precise vs fallback styling
  - Add overlay lifecycle management (create, update, destroy)
  - Ensure compatibility with existing detection and action systems
  - _Requirements: 2.4, 4.4, 6.6_

- [ ] 7. Add performance optimizations and caching

  - Implement text measurement caching to avoid redundant calculations
  - Add throttling for overlay updates during rapid text changes
  - Create memory management and cleanup for unused overlays
  - Optimize for multiple input fields with detections
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 8. Implement fallback mechanisms for edge cases

  - Add detection for when precise positioning fails
  - Create automatic fallback to current element-level styling
  - Handle browser compatibility issues gracefully
  - Add error logging and diagnostic information for debugging
  - _Requirements: 6.6, 7.3, 7.4_

- [ ] 9. Handle complex text scenarios and edge cases

  - Add support for special characters, emojis, and Unicode text
  - Implement handling for mixed font sizes and custom CSS styling
  - Add browser zoom level detection and recalculation
  - Create robust handling for contenteditable elements and complex web apps
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 2.3, 2.4_

- [ ] 10. Add comprehensive testing and validation

  - Create unit tests for TextMeasurementEngine accuracy
  - Add integration tests for overlay positioning across different browsers
  - Implement visual regression tests for underline positioning
  - Test performance with various text lengths and multiple input fields
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 11. Integrate action system with precise underlining

  - Update action execution (mask, remove, replace) to work with overlay spans
  - Implement overlay updates after text modifications
  - Add undo functionality that restores original underline positioning
  - Ensure action tooltips work correctly with clicked underlined text
  - _Requirements: 5.3, 5.4_

- [ ] 12. Final integration and cleanup
  - Remove or deprecate old element-level styling code
  - Add configuration options for enabling/disabling precise underlining
  - Implement proper error handling and graceful degradation
  - Add documentation and code comments for maintainability
  - _Requirements: 7.1, 7.2, 7.5_

## Testing Milestones

**Browser Testing Available After Task 6**: Once the overlay system is integrated with UIRenderer, you can test basic precise underlining functionality in the browser using the existing test files.

**Full Feature Testing After Task 8**: After fallback mechanisms are implemented, the system will be robust enough for comprehensive browser testing across different scenarios.

**Production Ready After Task 12**: Complete implementation with all optimizations and cleanup.

## Evaluation Criteria

### Task 1-2 Success Criteria:

- TextMeasurementEngine accurately calculates character positions within 2px accuracy
- Overlays are created and positioned correctly over input elements
- Basic underline spans appear in correct locations

### Task 3-5 Success Criteria:

- Underlines appear only on detected sensitive text, not entire input fields
- Risk-level colors (red, amber, blue) display correctly
- Tooltips appear only when clicking on underlined text
- Multiple detections in same input show individual underlines

### Task 6-8 Success Criteria:

- System works with existing LeakAI detection engine
- Performance remains smooth during typing (no noticeable lag)
- Fallback to old system works when precise positioning fails
- Works across different input types (input, textarea, contenteditable)

### Task 9-12 Success Criteria:

- Works in Gmail, Outlook, and other complex web applications
- Handles special characters, emojis, and Unicode correctly
- Actions (mask, remove, replace) work with precise underlines
- No memory leaks or performance degradation over time

### Browser Testing Checklist:

- [ ] Standard HTML forms show precise underlines instead of element borders
- [ ] Gmail compose window shows underlines on specific sensitive text
- [ ] Tooltips appear only on click, not hover
- [ ] Multiple detections show separate underlines with correct colors
- [ ] Scrolling and resizing maintain underline positions
- [ ] Actions work correctly with underlined text portions
