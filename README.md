# mole (Content Extraction Browser Extension)

A browser extension that automatically extracts and logs content and metadata from web pages.

## Project Overview

mole is a web extension built with TypeScript and Webpack. It supports Chrome and Firefox.

- **Core Functionality:** The extension extracts the main content and metadata from web pages, converts the content to Markdown, and logs the resulting data object to the console.
- **Architecture:** The extension consists of a background script (`background.ts`) and a content script (`content.ts`).
  - The **background script** orchestrates the content extraction process.
  - The **content script** is injected into web pages and is responsible for content extraction.

## Building and Running

### Prerequisites

- [Node.js and npm](https://nodejs.org/)

### Build Commands

- **Install dependencies:**
  ```bash
  npm install
  ```

- **Build for production:**
  ```bash
  npm run build
  ```
  Bundles land in `build/dist/chrome` and `build/dist/firefox` with their respective `manifest.json`.

- **Build a signed-ready Firefox XPI:**
  ```bash
  npm run build:xpi
  ```
  This packages `build/dist/firefox` into `build/mole-firefox.xpi`, ready to upload for Mozilla self-distribution signing.

### Loading the extension

- **Chrome:**
  1. Open `chrome://extensions`
  2. Enable "Developer mode"
  3. Click "Load unpacked" and select the `build/dist/chrome` directory

- **Firefox:**
  1. Open `about:debugging#/runtime/this-firefox`
  2. Click "Load Temporary Add-on"
  3. Select the `manifest.json` file in `build/dist/firefox`

## Development

- **Development mode (Chrome):**
  ```bash
  npm run dev:chrome
  ```
  Watch builds emit to `build/dev/chrome` (Chrome) and `build/dev/firefox` (Firefox). `npm test` auto-builds the Chrome dev bundle before launching Playwright.

- **Run tests:**
  ```bash
  npm test
  ```

## Features

- Automatic content extraction from web pages
- Markdown conversion of extracted content
- Console logging of extracted data
- Support for multiple browsers (Chrome, Firefox)

## How it Works

When you visit a webpage, the extension automatically:

1. Analyzes the page content using the Defuddle library
2. Extracts the main article content, excluding headers, footers, and other non-essential elements
3. Converts the content to Markdown format
4. Logs the extracted data to the browser console

You can view the extracted data by opening the browser's developer console (F12) and looking for log entries from the extension.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is open source.
