import Defuddle from 'defuddle';
import TurndownService from 'turndown';
import { getDomain } from './utils/string-utils';
import { handleBackgroundLog } from './utils/debug';

(function() {
	if (window.hasOwnProperty('moleContentScriptLoaded')) {
		return;
	}
	window.moleContentScriptLoaded = true;

	console.log('[mole] Content script loaded and running');

	// Initialize Turndown service with configuration
	const turndownService = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		linkStyle: 'inlined',
		bulletListMarker: '*'
	});

	chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
		if (request.action === "getPageContent") {
			const defuddled = new Defuddle(document, { url: document.URL }).parse();

			// Convert HTML content to Markdown
			const markdownContent = defuddled.content ? turndownService.turndown(defuddled.content) : '';

			const response = {
				author: defuddled.author,
				content: defuddled.content,
				markdown: markdownContent,
				description: defuddled.description,
				domain: getDomain(document.URL),
				favicon: defuddled.favicon,
				image: defuddled.image,
				published: defuddled.published,
				site: defuddled.site,
				title: defuddled.title,
			};
			console.log('[mole] Content extracted for page:', response.title);
			sendResponse(response);
		} else if (request.action === "forwardBackgroundLog") {
			// Handle background log forwarding in test environment
			console.log('[mole] Received background log message:', request.logMessage);
			handleBackgroundLog(request.logMessage);
		}
		return true;
	});
})();