# Implementation Plan: Extension Debug Popup


**Branch**: `001-extension-debug-popup` | **Date**: 2025-09-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-extension-debug-popup/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add a debug popup to the mole browser extension that displays extracted markdown content when the toolbar button is clicked. The popup will be an HTML file (260x340 pixels preferred size) with a focused, pre-selected text area for easy copying. This extends the existing content extraction functionality (Defuddle + Turndown) with a user interface for debugging and inspection. Requires manifest updates to add action.default_popup and new popup HTML/CSS/JS files.

## Technical Context
**Language/Version**: TypeScript 5.5.4
**Primary Dependencies**: defuddle 0.6.6, turndown 7.2.1, @types/chrome 0.0.270
**Storage**: N/A (in-memory content extraction)
**Testing**: N/A (debug feature only, testing omitted)
**Target Platform**: Chrome Manifest V3, Firefox WebExtensions
**Project Type**: single (browser extension)
**Performance Goals**: <100ms popup display response time
**Constraints**: 260x340px popup size (within 800x600 browser limit), read-only text area, HTTP/HTTPS pages only, popup reloads on each open, direct popup→content message passing
**Scale/Scope**: Single-user debugging tool, handles content up to 50KB, popup HTML file with embedded CSS/JS, no testing required (debug feature only)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (browser extension only)
- Using framework directly? (yes, using Chrome Extension APIs directly)
- Single data model? (yes, PageData interface already exists)
- Avoiding patterns? (yes, no unnecessary abstraction layers)

**Architecture**:
- EVERY feature as library? (N/A - extending existing extension, not creating new libraries)
- Libraries listed: N/A (UI components will be inline)
- CLI per library: N/A (browser extension, no CLI needed)
- Library docs: N/A

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (N/A - debug feature only, testing omitted)
- Git commits show tests before implementation? (N/A - testing omitted)
- Order: Contract→Integration→E2E→Unit strictly followed? (N/A - testing omitted)
- Real dependencies used? (N/A - testing omitted)
- Integration tests for: new libraries, contract changes, shared schemas? (N/A - testing omitted)
- FORBIDDEN: Implementation before test, skipping RED phase (waived for debug feature)

**Observability**:
- Structured logging included? (yes, existing console.log patterns)
- Frontend logs → backend? (N/A - single browser extension)
- Error context sufficient? (yes, error handling for extraction failures)

**Versioning**:
- Version number assigned? (0.11.10, will increment BUILD)
- BUILD increments on every change? (yes, following existing pattern)
- Breaking changes handled? (N/A, additive feature only)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project) - Browser extension with existing src/ structure

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Contract tests for popup-content message communication [P]
- Entity creation tasks for PopupState and PopupDisplay interfaces [P]
- User story validation via E2E tests (popup opening, content display, copying)
- Implementation tasks following TDD: tests first, then implementation

**Ordering Strategy**:
- TDD order: Tests before implementation strictly enforced
- Dependency order:
  1. Manifest updates (enable popup functionality)
  2. Interface/contract tests (message communication)
  3. Popup HTML/CSS structure
  4. Popup JavaScript logic
  5. E2E integration tests
- Mark [P] for parallel execution (independent files like manifest updates)

**Specific Task Categories**:
1. **Manifest Updates** (2 tasks): Add action.default_popup to Chrome and Firefox manifests [P]
2. **Popup Implementation** (4-5 tasks): HTML structure, CSS styling, JavaScript logic
3. **Webpack Integration** (2 tasks): Add popup.html to build system, update entry points [P]
4. **Manual Validation** (1 task): Execute quickstart.md validation steps

**Estimated Output**: 9-10 numbered, ordered tasks in tasks.md (simplified due to no testing requirement)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (N/A - no deviations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*