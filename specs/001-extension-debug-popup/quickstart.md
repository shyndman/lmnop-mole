# Quickstart: Extension Debug Popup

## User Story Validation Steps

### Primary User Story
> A developer working with the mole extension wants to quickly inspect the extracted markdown content from any web page. They click the extension's toolbar button and immediately see the cleaned, formatted markdown content in a convenient popup window.

### Validation Test Steps

#### 1. Setup and Build
```bash
# Navigate to project root
cd /home/shyndman/dev/projects/lmnop/mole

# Build the extension
npm run build

# Load extension in Chrome
# 1. Open chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` directory
```

#### 2. Basic Functionality Test
```bash
# Test on a content-rich page
# 1. Navigate to any article page (e.g., https://example.com/article)
# 2. Verify page loads completely
# 3. Click the mole extension toolbar button
# 4. EXPECTED: Popup appears (260x340 pixels)
# 5. EXPECTED: Popup contains textarea with extracted markdown content
# 6. EXPECTED: Textarea is focused and content is pre-selected
```

#### 3. Content Inspection Test
```bash
# Verify content quality
# 1. Review the markdown content in the popup textarea
# 2. EXPECTED: Content should be clean, formatted markdown
# 3. EXPECTED: Article title, body text, and structure preserved
# 4. EXPECTED: No HTML tags visible (converted to markdown)
```

#### 4. Copy Functionality Test
```bash
# Test copying capability
# 1. With popup open and content selected
# 2. Press Ctrl+A (select all)
# 3. Press Ctrl+C (copy)
# 4. Open a text editor
# 5. Press Ctrl+V (paste)
# 6. EXPECTED: Full markdown content pasted correctly
```

#### 5. Error Handling Test
```bash
# Test non-HTTP page
# 1. Navigate to chrome://extensions
# 2. Click the mole extension toolbar button
# 3. EXPECTED: Popup shows error message "Content extraction not available for this page type"

# Test empty page
# 1. Navigate to a page with no extractable content
# 2. Click the toolbar button
# 3. EXPECTED: Popup shows "No content could be extracted from this page"
```

#### 6. Cross-Browser Test (Firefox)
```bash
# Build for Firefox
npm run build:firefox

# Load in Firefox
# 1. Open about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select `dist_firefox/manifest.json`
# 4. Repeat steps 2-5 above
```

## Expected Results

### Successful Test Outcomes
- ✅ Extension toolbar button appears and is clickable
- ✅ Popup opens when button is clicked
- ✅ Popup displays extracted markdown content in textarea
- ✅ Textarea is focused and content is pre-selected
- ✅ Content can be copied using standard keyboard shortcuts
- ✅ Error messages appear for unsupported pages
- ✅ Extension works in both Chrome and Firefox

### Performance Validation
- ✅ Popup appears within 100ms of button click
- ✅ Content displays immediately (no loading spinner needed)
- ✅ Popup handles large content (>50KB) with scrolling

### User Experience Validation
- ✅ Popup size is appropriate for content inspection
- ✅ Text area is readable with proper formatting
- ✅ Popup closes when clicking outside
- ✅ No additional clicks required to select content

## Troubleshooting Common Issues

### Extension Not Appearing
- Check manifest.json has `action.default_popup` field
- Verify extension permissions include `activeTab` and `scripting`
- Ensure extension is loaded in developer mode

### Popup Not Opening
- Check browser console for JavaScript errors
- Verify popup.html file exists and is accessible
- Test on HTTP/HTTPS pages only

### No Content Displayed
- Verify content script is injecting properly
- Check that page has extractable content
- Test message passing between popup and content script

### Content Not Pre-selected
- Check textarea focus and selection logic in popup.js
- Verify content is loaded before attempting selection

## Manual Validation Only

### No Automated Testing
This is a debug feature only - no automated tests are required or implemented.

### Manual Testing Areas
- Popup opening and closing behavior
- Content extraction and display
- Error handling scenarios
- Cross-browser compatibility (Chrome & Firefox)
- Keyboard interaction (Ctrl+A, Ctrl+C)
- Various content types and page structures