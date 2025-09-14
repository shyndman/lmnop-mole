// Cases to handle:
// Full URLs: https://example.com/x.png
// URLs without protocol: //example.com/x.png
// Relative URLs:
// - x.png
// - /x.png
// - img/x.png
// - ../x.png

export function makeUrlAbsolute(element: Element, attributeName: string, baseUrl: URL) {
	const attributeValue = element.getAttribute(attributeName);
	if (attributeValue) {
		try {
			// Create a new URL object from the base URL
			const resolvedBaseUrl = new URL(baseUrl.href);
			
			// If the base URL points to a file, remove the filename to get the directory
			if (!resolvedBaseUrl.pathname.endsWith('/')) {
				resolvedBaseUrl.pathname = resolvedBaseUrl.pathname.substring(0, resolvedBaseUrl.pathname.lastIndexOf('/') + 1);
			}
			
			const url = new URL(attributeValue, resolvedBaseUrl);
			
			if (!['http:', 'https:'].includes(url.protocol)) {
				// Handle non-standard protocols (chrome-extension://, moz-extension://, brave://, etc.)
				const parts = attributeValue.split('/');
				const firstSegment = parts[2]; // The segment after the protocol

				if (firstSegment && firstSegment.includes('.')) {
					// If it looks like a domain, replace the non-standard protocol with the current page's protocol
					const newUrl = `${baseUrl.protocol}//` + attributeValue.split('://')[1];
					element.setAttribute(attributeName, newUrl);
				} else {
					// If it doesn't look like a domain it's probably the extension URL, remove the non-standard protocol part and use baseUrl
					const path = parts.slice(3).join('/');
					const newUrl = new URL(path, resolvedBaseUrl.origin + resolvedBaseUrl.pathname).href;
					element.setAttribute(attributeName, newUrl);
				}
			} else {
				// Handle other cases (relative URLs, protocol-relative URLs)
				const newUrl = url.href;
				element.setAttribute(attributeName, newUrl);
			}
		} catch (error) {
			console.warn(`Failed to process URL: ${attributeValue}`, error);
			element.setAttribute(attributeName, attributeValue);
		}
	}
}

export function processUrls(htmlContent: string, baseUrl: URL): string {
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = htmlContent;
	
	// Handle relative URLs for both images and links
	tempDiv.querySelectorAll('img').forEach(img => makeUrlAbsolute(img, 'srcset', baseUrl));
	tempDiv.querySelectorAll('img').forEach(img => makeUrlAbsolute(img, 'src', baseUrl));
	tempDiv.querySelectorAll('a').forEach(link => makeUrlAbsolute(link, 'href', baseUrl));
	
	return tempDiv.innerHTML;
}

export function getDomain(url: string): string {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;

		// Handle local development URLs
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
			return hostname;
		}

		const hostParts = hostname.split('.');
		
		// Handle special cases like co.uk, com.au, etc.
		if (hostParts.length > 2) {
			const lastTwo = hostParts.slice(-2).join('.');
			if (lastTwo.match(/^(co|com|org|net|edu|gov|mil)\.[a-z]{2}$/)) {
				return hostParts.slice(-3).join('.');
			}
		}
		
		return hostParts.slice(-2).join('.');
	} catch (error) {
		console.warn('Invalid URL:', url);
		return '';
	}
}