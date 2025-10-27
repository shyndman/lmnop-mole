# Tasks: Extension Debug Popup

**Input**: Design documents from `/specs/001-extension-debug-popup/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   ✓ Extract: TypeScript 5.5.4, Chrome Extension APIs, no testing required
2. Load optional design documents:
   ✓ data-model.md: PopupState, PopupDisplay entities
   ✓ contracts/: extension-messages.yaml, popup-api.yaml
   ✓ research.md: Direct popup→content communication
3. Generate tasks by category:
   ✓ Setup: manifest updates, webpack config
   ✓ Core: popup HTML, CSS, JavaScript, TypeScript interfaces
   ✓ Integration: browser extension loading, webpack builds
   ✓ Polish: manual validation via quickstart.md
4. Apply task rules:
   ✓ Different files = mark [P] for parallel
   ✓ Same file = sequential (no [P])
   ✓ No tests required (debug feature only)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   ✓ All contracts have implementation?
   ✓ All entities have TypeScript interfaces?
   ✓ All manifest files updated?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root (per plan.md)
- Browser extension structure with manifest files for Chrome and Firefox

## Phase 3.1: Setup & Configuration
- [ ] T001 [P] Add action.default_popup to src/manifest.chrome.json
- [ ] T002 [P] Add action.default_popup to src/manifest.firefox.json
- [ ] T003 Update webpack.config.js to copy popup.html via CopyPlugin

## Phase 3.2: TypeScript Interfaces (No Tests - Debug Feature)
**Note: Testing omitted per plan.md - debug feature only**
- [ ] T004 [P] Create PopupState interface in src/types/popup-types.ts
- [ ] T005 [P] Create PopupDisplay interface in src/types/popup-types.ts

## Phase 3.3: Core Implementation
- [ ] T006 Create popup HTML structure in src/popup.html with 260x340 styling
- [ ] T007 Create popup CSS in src/popup.css with textarea styling and focus states
- [ ] T008 Create popup JavaScript in src/popup.js with tab querying and message passing
- [ ] T009 Update src/popup.js to implement focus and content selection logic

## Phase 3.4: Integration & Build
- [ ] T010 Test webpack build generates popup files in both build/dist/chrome and build/dist/firefox
- [ ] T011 Verify extension loading with popup functionality in Chrome
- [ ] T012 Verify extension loading with popup functionality in Firefox

## Phase 3.5: Validation & Polish
- [ ] T013 Execute quickstart.md validation steps for manual testing
- [ ] T014 [P] Update package.json version (increment BUILD number)

## Dependencies
- T003 (webpack config) blocks T010 (build test)
- T006-T009 (popup files) block T010 (build test)
- T001-T002 (manifest updates) block T011-T012 (browser testing)
- T010 (build success) blocks T011-T012 (browser testing)
- T011-T012 (browser testing) block T013 (validation)

## Parallel Example
```
# Launch T001-T002 together (different manifest files):
Task: "Add action.default_popup to src/manifest.chrome.json"
Task: "Add action.default_popup to src/manifest.firefox.json"

# Launch T004-T005 together (different interfaces):
Task: "Create PopupState interface in src/types/popup-types.ts"
Task: "Create PopupDisplay interface in src/types/popup-types.ts"
```

## Task Details

### T001 [P] Add action.default_popup to src/manifest.chrome.json
Add `"action": {"default_popup": "popup.html"}` to the Chrome manifest. Ensure existing permissions (`activeTab`, `scripting`) are preserved.

### T002 [P] Add action.default_popup to src/manifest.firefox.json
Add `"action": {"default_popup": "popup.html"}` to the Firefox manifest. Ensure existing permissions (`activeTab`, `scripting`) are preserved.

### T003 Update webpack.config.js to copy popup.html via CopyPlugin
Add `{ from: "src/popup.html", to: "popup.html" }` to the CopyPlugin patterns array. Follow the Obsidian Clipper pattern referenced in research.md.

### T004 [P] Create PopupState interface in src/types/popup-types.ts
Define PopupState interface with: isLoading: boolean, content: string, error: string | null, tabId: number. Include validation rules as JSDoc comments.

### T005 [P] Create PopupDisplay interface in src/types/popup-types.ts
Define PopupDisplay interface with: isVisible: boolean, textareaFocused: boolean, textSelected: boolean, dimensions: {width: number, height: number}.

### T006 Create popup HTML structure in src/popup.html with 260x340 styling
Create HTML file with DOCTYPE, head (title, meta), body containing textarea element. Set body dimensions to 260x340px. Include CSS link or embedded styles.

### T007 Create popup CSS in src/popup.css with textarea styling and focus states
Style popup container (260x340px), textarea (full height minus padding), focus states, scrolling behavior. Ensure textarea is readable and properly sized.

### T008 Create popup JavaScript in src/popup.js with tab querying and message passing
Implement: chrome.tabs.query({active: true, currentWindow: true}), chrome.tabs.sendMessage(tabId, {action: "getPageContent"}), response handling, error handling.

### T009 Update src/popup.js to implement focus and content selection logic
Add textarea.focus() and textarea.select() after content is loaded. Handle both success and error cases. Ensure content is pre-selected for easy copying.

### T010 Test webpack build generates popup files in both build/dist/chrome and build/dist/firefox
Run `npm run build` and verify popup.html appears in both output directories. Verify manifest files contain action.default_popup field.

### T011 Verify extension loading with popup functionality in Chrome
Load extension in Chrome developer mode, verify toolbar button appears, test popup opening, verify content extraction and display.

### T012 Verify extension loading with popup functionality in Firefox
Load extension in Firefox developer mode, verify toolbar button appears, test popup opening, verify content extraction and display.

### T013 Execute quickstart.md validation steps for manual testing
Follow all validation test steps in quickstart.md: setup/build, basic functionality, content inspection, copy functionality, error handling, cross-browser testing.

### T014 [P] Update package.json version (increment BUILD number)
Increment the BUILD component of the version number (0.11.10 → 0.11.11) to reflect the new popup feature addition.

## Communication Contracts Referenced
- **extension-messages.yaml**: popup ↔ content script message format `{action: "getPageContent"}`
- **popup-api.yaml**: PopupContentResponse and PopupErrorResponse schemas

## Validation Checklist
*GATE: Checked before completion*

- [✓] All contracts have corresponding implementation (T008-T009)
- [✓] All entities have TypeScript interfaces (T004-T005)
- [✓] All manifest files updated (T001-T002)
- [✓] Parallel tasks truly independent ([P] marked correctly)
- [✓] Each task specifies exact file path
- [✓] No task modifies same file as another [P] task
- [✓] Build system updated (T003)
- [✓] Manual validation included (T013)
