# Design Document

## Overview

The Precise Text Underlining system will replace the current element-level styling approach with a sophisticated text overlay system that provides Grammarly-style individual text underlining. The system will create positioned overlay elements that precisely match the location of sensitive text within input fields, textareas, and contenteditable elements.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Script                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Detection      │  │  Text Overlay   │  │   Tooltip    │ │
│  │  Engine         │  │  Manager        │  │   Manager    │ │
│  │  (Existing)     │  │  (New)          │  │  (Enhanced)  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                    │      │
│           │                     │                    │      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  UIRenderer     │  │  Text           │  │   Event      │ │
│  │  (Modified)     │  │  Measurement    │  │   Handler    │ │
│  │                 │  │  Engine         │  │   (New)      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Text Overlay Manager
- **Purpose**: Creates and manages overlay elements that contain precise underlines
- **Responsibilities**:
  - Create overlay divs positioned over input elements
  - Generate underline spans for detected text portions
  - Handle overlay lifecycle (create, update, destroy)
  - Manage overlay positioning and synchronization

#### 2. Text Measurement Engine
- **Purpose**: Calculates exact pixel positions of text within input elements
- **Responsibilities**:
  - Measure text dimensions using canvas context or hidden elements
  - Calculate character positions and line breaks
  - Handle different fonts, sizes, and styling
  - Account for padding, margins, and scrolling

#### 3. Enhanced Event Handler
- **Purpose**: Manages click interactions with underlined text portions
- **Responsibilities**:
  - Detect clicks on specific underlined text spans
  - Show/hide tooltips based on click interactions
  - Handle action execution from tooltip interactions
  - Manage event delegation and cleanup

#### 4. Modified UIRenderer
- **Purpose**: Orchestrates the new precise underlining system
- **Responsibilities**:
  - Determine when to use precise vs. fallback styling
  - Coordinate between detection results and overlay creation
  - Handle performance optimization and caching

## Components and Interfaces

### TextOverlayManager Class

```javascript
class TextOverlayManager {
    constructor(textMeasurementEngine, eventHandler)
    
    // Core overlay management
    createOverlay(inputElement, detections): OverlayElement
    updateOverlay(overlayElement, detections): void
    destroyOverlay(overlayElement): void
    
    // Positioning and synchronization
    positionOverlay(overlayElement, inputElement): void
    synchronizeWithInput(overlayElement, inputElement): void
    
    // Underline generation
    generateUnderlineSpans(detections, textMetrics): HTMLElement[]
    applyDetectionStyling(span, detection): void
    
    // Event handling
    handleOverlayClick(event, detection): void
    handleInputScroll(inputElement, overlayElement): void
    handleInputResize(inputElement, overlayElement): void
}
```

### TextMeasurementEngine Class

```javascript
class TextMeasurementEngine {
    constructor()
    
    // Text measurement
    measureText(text, fontStyle): TextMetrics
    calculateCharacterPositions(text, fontStyle): Position[]
    calculateLineBreaks(text, containerWidth, fontStyle): LineBreak[]
    
    // Element analysis
    getElementFontStyle(element): FontStyle
    getElementDimensions(element): Dimensions
    getTextBounds(element, startIndex, endIndex): Rectangle
    
    // Utility methods
    createMeasurementCanvas(): HTMLCanvasElement
    createMeasurementElement(fontStyle): HTMLElement
    getScrollOffset(element): Offset
}
```

### Enhanced TooltipManager Class

```javascript
class TooltipManager {
    // Existing methods...
    
    // New click-based tooltip methods
    showTooltipOnClick(targetSpan, detection, position): void
    hideTooltipOnClickOutside(event): void
    isClickOnUnderlinedText(event): boolean
    getDetectionFromSpan(span): Detection
}
```

### Data Models

#### OverlayElement
```javascript
interface OverlayElement {
    element: HTMLDivElement;
    inputElement: HTMLElement;
    underlineSpans: HTMLSpanElement[];
    detections: Detection[];
    isActive: boolean;
}
```

#### TextMetrics
```javascript
interface TextMetrics {
    width: number;
    height: number;
    characterWidths: number[];
    lineHeight: number;
    baseline: number;
}
```

#### Position
```javascript
interface Position {
    x: number;
    y: number;
    line: number;
    character: number;
}
```

#### FontStyle
```javascript
interface FontStyle {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    fontStyle: string;
    lineHeight: string;
}
```

## Error Handling

### Fallback Strategy
When precise text positioning fails or is not feasible:

1. **Measurement Failures**: Fall back to current element-level styling
2. **Performance Issues**: Disable overlays for elements with excessive text length
3. **Browser Compatibility**: Detect unsupported features and use fallback
4. **Complex Styling**: Use element-level approach for heavily styled inputs

### Error Recovery
- **Overlay Corruption**: Automatically recreate overlays when inconsistencies detected
- **Memory Leaks**: Implement proper cleanup and garbage collection
- **Event Handler Issues**: Graceful degradation with error logging

### Performance Safeguards
- **Text Length Limits**: Maximum 10,000 characters for overlay creation
- **Update Throttling**: Limit overlay updates to 60fps
- **Memory Monitoring**: Clean up unused overlays after 5 minutes of inactivity

## Testing Strategy

### Unit Testing
- **TextMeasurementEngine**: Test text measurement accuracy across different fonts and sizes
- **TextOverlayManager**: Test overlay creation, positioning, and lifecycle management
- **Event Handling**: Test click detection and tooltip interactions

### Integration Testing
- **Cross-browser Compatibility**: Test on Chrome, Firefox, Safari, Edge
- **Web Application Testing**: Test on Gmail, Outlook, various form implementations
- **Performance Testing**: Measure overlay creation time and memory usage

### Visual Testing
- **Pixel-perfect Positioning**: Automated visual regression testing for underline accuracy
- **Multi-line Text**: Test line break handling and continuation
- **Responsive Design**: Test overlay positioning across different screen sizes

### User Acceptance Testing
- **Usability Testing**: Verify improved user experience over current implementation
- **Accessibility Testing**: Ensure screen reader compatibility and keyboard navigation
- **Performance Testing**: Verify no noticeable impact on typing experience

## Implementation Phases

### Phase 1: Core Text Measurement
- Implement TextMeasurementEngine with canvas-based measurement
- Create basic text positioning algorithms
- Add font style detection and analysis

### Phase 2: Overlay Management
- Implement TextOverlayManager with basic overlay creation
- Add positioning and synchronization logic
- Implement underline span generation

### Phase 3: Event Handling and Tooltips
- Enhance TooltipManager for click-based interactions
- Implement click detection on underlined text spans
- Add tooltip positioning for overlay elements

### Phase 4: Integration and Optimization
- Integrate with existing UIRenderer and detection system
- Add performance optimizations and caching
- Implement fallback mechanisms

### Phase 5: Testing and Refinement
- Comprehensive testing across browsers and applications
- Performance optimization and memory management
- Bug fixes and edge case handling

## Browser Compatibility

### Supported Features
- **Canvas Text Measurement**: All modern browsers
- **CSS Positioning**: Full support in target browsers
- **Event Delegation**: Universal support

### Fallback Mechanisms
- **IE/Legacy Browsers**: Automatic fallback to current element-level styling
- **Mobile Browsers**: Optimized touch event handling
- **High DPI Displays**: Proper scaling and measurement adjustment

## Security Considerations

### Content Security Policy
- Ensure overlay creation complies with CSP restrictions
- Use inline styles only when necessary, prefer CSS classes

### DOM Manipulation Safety
- Sanitize any dynamic content in overlays
- Prevent XSS through proper element creation and content handling

### Performance Security
- Prevent DoS through text length limits and processing throttling
- Implement proper cleanup to prevent memory exhaustion attacks