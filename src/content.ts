import Defuddle from 'defuddle';
import { getDomain } from './utils/string-utils';

(function() {
	if (window.hasOwnProperty('moleContentScriptLoaded')) {
		return;
	}
	window.moleContentScriptLoaded = true;

	console.log('[mole] Content script loaded and running');

	chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
		if (request.action === "getPageContent") {
			const defuddled = new Defuddle(document, { url: document.URL }).parse();

			const response = {
				author: defuddled.author,
				content: defuddled.content,
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
		}
		return true;
	});
})();