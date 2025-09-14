import { PageData } from "./types/types";
import { backgroundLog } from './utils/debug';

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    try {
      // Execute the content script
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      
      // Get page content from content script (now includes markdown conversion)
      const response = await chrome.tabs.sendMessage(tabId, { action: "getPageContent" });
      
      const pageData: PageData = {
        title: response.title,
        url: tab.url || '',
        author: response.author,
        published: response.published,
        content: response.content,
        markdown: response.markdown,
        description: response.description,
        domain: response.domain,
        favicon: response.favicon,
        image: response.image,
        site: response.site,
      };
      
      backgroundLog('log', '[mole] Extracted page data:', pageData, tabId);
    } catch (err) {
      backgroundLog('error', '[mole] Processing error:', err, tabId);
    }
  }
});