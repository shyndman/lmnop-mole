import { PageData } from "./types/types";
import { backgroundLog } from './utils/debug';
import { TabData, loadPersistedData, saveTabStatesToStorage, removeTabFromStorage } from './utils/persistence';
import { extractImageUrls } from './utils/string-utils';
import { initializeTransmission, sendPageData, getTransmissionState, setTransmissionStatus } from './utils/transmission';

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
    if (!isHttpUrl(tab.url)) {
      await setNotApplicableState(tabId);
      return;
    }

    try {
      await processTabExtraction(tabId, tab.url);
    } catch (err) {
      await handleProcessingError(tabId, err);
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
  } else if (request.action === "setTransmissionStatus" && request.status) {
    setTransmissionStatus(request.status).then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
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
  } else if (request.action === 'rerunExtraction') {
    const tabId = request.tabId;
    if (typeof tabId !== 'number') {
      sendResponse({ success: false, error: 'Invalid tab ID' });
      return true;
    }

    chrome.tabs.get(tabId).then(async (tabInfo) => {
      if (!tabInfo.url || !isHttpUrl(tabInfo.url)) {
        const tabData = await setNotApplicableState(tabId);
        sendResponse({ success: false, error: 'Content extraction not available for this page type', tabData });
        return;
      }

      tabNavigationTimestamps.set(tabId, Date.now());
      try {
        const tabData = await processTabExtraction(tabId, tabInfo.url);
        sendResponse({ success: true, tabData });
      } catch (error) {
        const tabData = await handleProcessingError(tabId, error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred', tabData });
      }
    }).catch((error) => {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unable to access tab' });
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

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function setNotApplicableState(tabId: number): Promise<TabData> {
  tabStates.set(tabId, {
    state: 'not-applicable',
    error: 'Content extraction not available for this page type'
  });
  await saveTabStatesToStorage(tabStates);
  const tabData = tabStates.get(tabId)!;
  await broadcastTabData(tabId, tabData);
  return tabData;
}

async function processTabExtraction(tabId: number, url: string): Promise<TabData> {
  tabStates.set(tabId, { state: 'loading' });
  await saveTabStatesToStorage(tabStates);

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });

  const response = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });

  if (response?.error) {
    throw new Error(response.error.message || 'Content extraction failed.');
  }

  const imageUrls = extractImageUrls(response.markdown || '', url, response.image);

  const pageData: PageData = {
    title: response.title,
    url,
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
    imageUrls
  };

  const contentSize = new TextEncoder().encode(pageData.markdown || '').length;
  const tabData: TabData = {
    state: 'ready',
    content: pageData.markdown,
    contentSize
  };
  tabStates.set(tabId, tabData);
  await saveTabStatesToStorage(tabStates);

  backgroundLog('log', '[mole] Extracted page data:', pageData, tabId);

  await broadcastTabData(tabId, tabData);

  await sendPageData(pageData, tabId);
  return tabData;
}

async function handleProcessingError(tabId: number, err: unknown): Promise<TabData> {
  const message = err instanceof Error ? err.message : 'Unknown error occurred';
  const tabData: TabData = {
    state: 'error',
    error: message
  };
  tabStates.set(tabId, tabData);
  await saveTabStatesToStorage(tabStates);

  backgroundLog('error', '[mole] Processing error:', err, tabId);

  await broadcastTabData(tabId, tabData);
  return tabData;
}

async function broadcastTabData(tabId: number, payload: TabData | undefined): Promise<void> {
  if (!payload) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      action: 'tabDataReady',
      tabId,
      payload
    });
  } catch (error) {
    // Popup might not be open; suppress connection errors but log for debugging
    console.debug('[mole] No listeners for tabDataReady', error);
  }
}
