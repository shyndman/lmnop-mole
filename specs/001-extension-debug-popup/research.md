# Research: Extension Debug Popup Implementation

## Browser Extension Popup Architecture

### Decision: Manifest V3 Action Popup
**Rationale**: Extension already uses Manifest V3, need to add `action.default_popup` to manifest files
**Alternatives considered**:
- Page action (rejected - not appropriate for all pages)
- Programmatic popup (rejected - not possible with extension APIs)

### Decision: HTML/CSS/JS Popup File Structure
**Rationale**: Browser extension popups are HTML documents that can include embedded or linked CSS/JS
**Alternatives considered**:
- Pure JS creation (rejected - not the extension standard)
- External CSS/JS files (considered but inline preferred for simplicity)

### Decision: Direct Popup→Content Communication
**Rationale**: VALIDATED - Popup JavaScript can directly use `chrome.tabs.sendMessage()` to communicate with content scripts. Popup inherits all extension permissions including `activeTab` and `scripting`.
**Alternatives considered**:
- Message passing through background script (unnecessary complexity, adds latency)
- Runtime.sendMessage to background first (adds unnecessary layer)

## Implementation Requirements

### Manifest Changes Required
- Add `action` object with `default_popup: "popup.html"`
- Chrome: Update `src/manifest.chrome.json`
- Firefox: Update `src/manifest.firefox.json`

### File Structure
```
src/
├── popup.html      # Main popup HTML file
├── popup.css       # Popup styling (or embedded)
├── popup.js        # Popup logic (or embedded)
└── ...existing files
```

### Size and Behavior Constraints
- **Maximum size**: 800x600 pixels (Firefox limit)
- **Requested size**: 260x340 pixels (well within limits)
- **Auto-resize**: Browser automatically resizes popup to content
- **Lifecycle**: Popup reloads completely each time it opens
- **Trigger**: Only user-initiated (clicking toolbar button)

### Communication Pattern (VALIDATED)
1. User clicks toolbar button → popup.html loads
2. Popup JS calls `chrome.tabs.query({active: true, currentWindow: true})` to get active tab
3. Popup JS calls `chrome.tabs.sendMessage(tabId, {action: "getPageContent"})` directly
4. Content script responds with existing PageData object (markdown field already populated by Defuddle+Turndown)
5. Popup displays `response.markdown` in textarea, focuses and selects all content

**Key Validation**: No background script mediation required - direct popup→content communication works.

### Content Security Policy
- Inline scripts allowed in extension pages
- External resources must be declared in manifest
- No eval() or unsafe practices needed

## Technical Validation

### Testing Approach
- **Testing Omitted**: Debug feature only - no testing required per user request
- **Manual Validation**: Use quickstart.md validation steps for manual verification
- **Error Handling**: Built-in browser extension error reporting via console

### Performance Considerations
- Popup reloads each time: minimize initialization overhead
- Content extraction already cached in memory by background script
- Target <100ms display time for good UX

### Cross-Browser Compatibility
- Chrome: Uses `action.default_popup` in Manifest V3
- Firefox: Uses `action.default_popup` (compatible with V3)
- Existing build system handles both browsers via webpack

## Implementation Dependencies

### Existing Assets
- ✅ PageData interface with markdown field
- ✅ Content extraction pipeline (Defuddle + Turndown)
- ✅ Background-content communication established
- ✅ Build system configured for both browsers

### New Requirements
- HTML popup file with textarea
- CSS styling for 260x340 layout
- JavaScript for tab querying and content display
- Manifest updates for both browsers
- E2E tests for popup behavior

### Risk Mitigation
- **Content too large**: Textarea handles large content with scrolling
- **Extraction failures**: Display user-friendly error message
- **Non-HTTP pages**: Show appropriate message for unsupported pages
- **Popup sizing**: Browser auto-resize handles content fitting