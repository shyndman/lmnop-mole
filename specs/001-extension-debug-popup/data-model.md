# Data Model: Extension Debug Popup

## Entities

### PopupState
**Purpose**: Manages the state and behavior of the debug popup interface
**Attributes**:
- `isLoading: boolean` - Whether content is being fetched
- `content: string` - The extracted markdown content to display
- `error: string | null` - Error message if extraction fails
- `tabId: number` - ID of the tab from which content was extracted

**Validation Rules**:
- `content` must be a string (empty string if no content extracted)
- `error` must be null when content is successfully extracted
- `tabId` must be a positive integer representing a valid browser tab

**State Transitions**:
1. **Initial** → `isLoading: true, content: "", error: null, tabId: -1`
2. **Loading** → `isLoading: true` while fetching content
3. **Success** → `isLoading: false, content: <extracted>, error: null, tabId: <id>`
4. **Error** → `isLoading: false, content: "", error: <message>, tabId: <id>`

### PopupDisplay
**Purpose**: Represents the visual presentation and interaction state of the popup
**Attributes**:
- `isVisible: boolean` - Whether popup is currently displayed
- `textareaFocused: boolean` - Whether textarea has focus
- `textSelected: boolean` - Whether textarea content is selected
- `dimensions: {width: number, height: number}` - Popup size in pixels

**Validation Rules**:
- `dimensions.width` must equal 260
- `dimensions.height` must equal 340
- `textareaFocused` and `textSelected` should be true on initial display

**State Transitions**:
1. **Hidden** → `isVisible: false, textareaFocused: false, textSelected: false`
2. **Opening** → `isVisible: true, textareaFocused: false, textSelected: false`
3. **Ready** → `isVisible: true, textareaFocused: true, textSelected: true`

## Existing Entities (Reused)

### PageData
**Purpose**: Contains extracted content and metadata from web pages (already exists)
**Attributes**:
- `title: string`
- `url: string`
- `author: string`
- `published: string`
- `content: string`
- `markdown: string` ← **Primary field used by popup**
- `description: string`
- `domain: string`
- `favicon: string`
- `image: string`
- `site: string`

**Usage in Popup**: The `markdown` field contains the processed content that will be displayed in the popup textarea.

## Data Flow

```
1. User clicks toolbar button
   ↓
2. Browser loads popup.html
   ↓
3. PopupState initialized (loading=true)
   ↓
4. popup.js queries active tab ID
   ↓
5. popup.js sends message to content script
   ↓
6. Content script returns PageData
   ↓
7. PopupState updated with markdown content
   ↓
8. PopupDisplay shows content, focuses textarea
   ↓
9. User can copy content via Ctrl+A, Ctrl+C
```

## Error Handling

### Content Extraction Failure
- **Trigger**: Content script returns empty or null content
- **State**: `PopupState.error = "No content could be extracted from this page"`
- **Display**: Show error message instead of textarea

### Non-HTTP Page
- **Trigger**: Tab URL is not HTTP/HTTPS (e.g., chrome://extensions)
- **State**: `PopupState.error = "Content extraction not available for this page type"`
- **Display**: Show informational message

### Tab Communication Failure
- **Trigger**: Cannot send message to tab or no response
- **State**: `PopupState.error = "Unable to communicate with page content"`
- **Display**: Show technical error message with retry suggestion

### Content Too Large
- **Trigger**: Markdown content exceeds reasonable display limits
- **State**: Content truncated with note
- **Display**: Show truncated content with "Content truncated..." message