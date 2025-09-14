# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mole** is a TypeScript-based browser extension that automatically extracts content and metadata from web pages using the Defuddle library. It supports both Chrome (Manifest V3) and Firefox with a simple two-component architecture.

## Architecture

The extension uses a minimal two-script architecture:
- **Background Script** (`src/background.ts`): Service worker that orchestrates content extraction by injecting and communicating with the content script
- **Content Script** (`src/content.ts`): Injected into web pages to perform actual content extraction using the Defuddle library

Key data flow:
1. Background script detects tab updates (page loads)
2. Injects content script into active tabs
3. Content script uses Defuddle to extract page data
4. Extracted data is logged to console as `PageData` objects

## Core Types

- `PageData` (`src/types/types.ts`): Primary data structure containing extracted content (title, author, content, description, domain, favicon, image, site, published date, URL)

## Build System

Uses Webpack with TypeScript compilation. Browser-specific builds:
- **Chrome**: Uses `src/manifest.chrome.json` → outputs to `dist/` (prod) or `dev/` (dev)  
- **Firefox**: Uses `src/manifest.firefox.json` → outputs to `dist_firefox/` (prod) or `dev_firefox/` (dev)

## Development Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev              # Chrome (default)
npm run dev:chrome       # Chrome specifically  
npm run dev:firefox      # Firefox specifically

# Production builds
npm run build            # Both browsers
npm run build:chrome     # Chrome only
npm run build:firefox    # Firefox only

# Testing
npm test                 # Playwright tests
npm run test:ui          # Playwright with UI
npm run test:headed      # Playwright in headed mode
```

## Testing Setup

- **Playwright**: End-to-end extension testing (requires headed mode for extensions)
- **Jest**: Unit testing for utilities (currently minimal)
- Tests located in `tests/` directory

## Key Dependencies

- **defuddle**: Core content extraction library
- **turndown**: HTML to Markdown conversion (dependency of defuddle)
- **@types/chrome**: Chrome extension API types

## Loading the Extension

- **Chrome:**
  1. Open `chrome://extensions`
  2. Enable "Developer mode"
  3. Click "Load unpacked" and select the `dist` directory

- **Firefox:**
  1. Open `about:debugging#/runtime/this-firefox`
  2. Click "Load Temporary Add-on"
  3. Select the `manifest.json` file in the `dist_firefox` directory

## Development Notes

- Extension requires headed mode for testing (extensions can't run headlessly)
- Both browsers use Manifest V3 but have different background script configurations (service_worker vs scripts array)
- Content extraction happens automatically on page load for HTTP/HTTPS URLs
- All extracted data is currently logged to console only