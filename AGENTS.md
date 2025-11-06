# Repository Guidelines

## Project Structure & Module Organization
The extension lives in `src/`, split into `background.ts`, `content.ts`, popup UI, `utils/*` helpers, and browser-specific manifests. Build artifacts land under `build/`: dev bundles go to `build/dev/{chrome,firefox}` while production bundles go to `build/dist/{chrome,firefox}`. Runtime assets (icons, manifest templates) sit in `assets/`. End-to-end specs and fixtures reside in `tests/` (e.g., `tests/content-extraction.spec.ts`) with exploratory flows under `specs/001-extension-debug-popup`. Shared provider metadata such as API endpoints stays in `providers.json`; treat it as the single source of truth for remote configs.

## Build, Test, and Development Commands
- `npm run dev:chrome` / `npm run dev:firefox` – webpack watch mode emitting to `build/dev/{chrome,firefox}` for live reload in each browser.
- `npm run build:chrome`, `npm run build:firefox`, or `npm run build` – optimized bundles plus manifests in `build/dist/{chrome,firefox}`.
- `npm run build:xpi` – rebuilds the Firefox bundle and zips `build/dist/firefox` into `build/mole-firefox.xpi` for signing/self-distribution.
- `npm test` – kicks off a fresh chrome dev build (via `pretest`) and then runs the Playwright suite; use `npm run test:ui` for visual debugging or `npm run test:headed` for interactive browser runs.

## Coding Style & Naming Conventions
Write TypeScript with the strict settings enforced by `tsconfig.json`; keep modules ES6 and favor named exports (e.g., `utils/transmission.ts`). Use two-space indentation, trailing commas, and descriptive camelCase identifiers for variables/functions, while keeping PascalCase for types (`PageData`, `TabData`). When touching manifests or JSON configs, maintain sorted keys and 2-space indentation to match existing files.

## Testing Guidelines
Functional tests live in `tests/` and rely on fixtures from `tests/extension-fixtures.ts`; name files `*.spec.ts` to ensure inclusion. Each new behavior should cover both success and failure paths (e.g., telemetry send + retry). Capture manual steps in `specs/` if automation is impractical, and update Playwright snapshots in `playwright-report/` only when reviewing diffs. Run `npm test` before opening a PR and attach `test-results/` artifacts when diagnosing flakes.

## Commit & Pull Request Guidelines
Follow the existing imperative, concise commit style (`Ready for debug popup`, `Convert to Markdown using Turndown`). Keep subjects under ~72 chars and describe scope in the body when logic is non-trivial. Pull requests should include: overview, linked issue or ticket, screenshots/GIFs for popup changes, and confirmation that Chrome + Firefox bundles were built. Rebase before merging to keep the history linear.

## Security & Configuration Tips
Never commit API keys; load them via environment variables consumed by webpack. When modifying `providers.json`, verify version metadata and URLs, and avoid logging provider secrets from `utils/transmission.ts`. Clear any sensitive test data from `playwright-report/` before publishing artifacts.
