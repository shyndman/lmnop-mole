import { PageData } from "./types/types";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        const pageData: PageData = {
          title: response.title,
          url: tab.url || '',
          author: response.author,
          published: response.published,
          content: response.content,
          description: response.description,
          domain: response.domain,
          favicon: response.favicon,
          image: response.image,
          site: response.site,
        };
        console.log('[mole] Extracted page data:', pageData);
      });
    }).catch(err => console.error(err));
  }
});