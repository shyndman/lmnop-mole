import { PageData } from "./types/types";
import { backgroundLog } from './utils/debug';
import { TabData, loadPersistedData, saveTabStatesToStorage, removeTabFromStorage } from './utils/persistence';
import { extractImageUrls } from './utils/string-utils';
import { initializeTransmission, sendPageData, getTransmissionState } from './utils/transmission';

let tabStates = new Map<number, TabData>();
let tabNavigationTimestamps = new Map<number, number>();


chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Clear data immediately when URL changes (navigation start)
  if (changeInfo.url) {
    tabNavigationTimestamps.set(tabId, Date.now());
    tabStates.set(tabId, { state: 'loading' });
    await saveTabStatesToStorage(tabStates);
  }

  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL is supported
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      tabStates.set(tabId, {
        state: 'not-applicable',
        error: 'Content extraction not available for this page type'
      });
      await saveTabStatesToStorage(tabStates);
      return;
    }

    try {
      // Set loading state
      tabStates.set(tabId, { state: 'loading' });

      // Execute the content script
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      // Get page content from content script (now includes markdown conversion)
      const response = await chrome.tabs.sendMessage(tabId, { action: "getPageContent" });

      // Extract image URLs from markdown content
      const imageUrls = extractImageUrls(response.markdown || '', tab.url, response.image);

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
        timestamp: tabNavigationTimestamps.get(tabId) || Date.now(),
        imageUrls: imageUrls,
      };

      // Store content and calculate size
      const contentSize = new TextEncoder().encode(pageData.markdown || '').length;
      tabStates.set(tabId, {
        state: 'ready',
        content: pageData.markdown,
        contentSize: contentSize
      });
      await saveTabStatesToStorage(tabStates);

      const logMessage = '[mole] Extracted page data:';
      backgroundLog('log', logMessage, pageData, tabId);

      // Send page data to deaddrop server
      await sendPageData(pageData, tabId);
    } catch (err) {
      tabStates.set(tabId, {
        state: 'error',
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      });
      await saveTabStatesToStorage(tabStates);

      const errorMessage = '[mole] Processing error:';
      backgroundLog('error', errorMessage, err, tabId);
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  tabStates.delete(tabId);
  tabNavigationTimestamps.delete(tabId);
  await removeTabFromStorage(tabId);
});

// Message handler for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getTabData") {
    const tabId = request.tabId;
    const tabData = tabStates.get(tabId) || { state: 'loading' };

    sendResponse({
      state: tabData.state,
      content: tabData.content,
      contentSize: tabData.contentSize,
      error: tabData.error
    });
    return true;
  } else if (request.action === "getTransmissionState") {
    sendResponse(getTransmissionState());
    return true;
  } else if (request.action === "manualRetry") {
    // Import and call manualRetryQueue (async function)
    import('./utils/transmission').then(({ manualRetryQueue }) => {
      manualRetryQueue().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    });
    return true;
  }
});

// Initialize background script - load persisted data
async function initialize() {
  tabStates = await loadPersistedData();
  await initializeTransmission();
}

initialize();