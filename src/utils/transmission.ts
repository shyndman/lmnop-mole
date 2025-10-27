import { PageData, RetryQueueItem, TransmissionState, TransmissionStatus } from '../types/types';
import { backgroundLog } from './debug';
import { updateBrowserActionIcon } from './icon-status';

declare const DEADDROP_SERVER_URL: string;

const STORAGE_KEY_RETRY_QUEUE = 'retryQueue';
const RETRY_INTERVAL_MINUTES = 1;
const RETRY_ALARM_NAME = 'moleRetryQueue';

let retryQueue: RetryQueueItem[] = [];
let currentStatus: TransmissionStatus = 'idle';

export async function initializeTransmission(): Promise<void> {
  await loadRetryQueue();
  startRetryAlarm();

  // Set initial icon status
  const initialStatus = retryQueue.length > 0 ? 'queued' : 'idle';
  await updateBrowserActionIcon(initialStatus);
  currentStatus = initialStatus;

  backgroundLog('log', '[mole] Transmission system initialized', { queueSize: retryQueue.length });
}

export async function sendPageData(pageData: PageData, tabId?: number): Promise<boolean> {
  if (!DEADDROP_SERVER_URL) {
    backgroundLog('log', '[mole] No server URL configured, skipping transmission', undefined, tabId);
    return true;
  }

  currentStatus = 'sending';
  await updateBrowserActionIcon(currentStatus);

  try {
    const response = await fetch(DEADDROP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }

    currentStatus = 'success';
    await updateBrowserActionIcon(currentStatus);
    backgroundLog('log', '[mole] Page data transmitted successfully', { url: pageData.url }, tabId);
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown transmission error';
    backgroundLog('error', '[mole] Transmission failed', { error: errorMessage, url: pageData.url }, tabId);

    await addToRetryQueue(pageData, errorMessage);
    currentStatus = 'failed';
    await updateBrowserActionIcon(currentStatus);
    return false;
  }
}

export async function addToRetryQueue(pageData: PageData, error: string): Promise<void> {
  const queueItem: RetryQueueItem = {
    id: generateQueueItemId(pageData),
    pageData,
    retryCount: 0,
    lastAttemptTimestamp: Date.now(),
    error,
  };

  retryQueue.push(queueItem);
  await saveRetryQueue();

  // Update icon to show queued status
  currentStatus = 'queued';
  await updateBrowserActionIcon(currentStatus);

  backgroundLog('log', '[mole] Added to retry queue', {
    queueSize: retryQueue.length,
    url: pageData.url
  });
}

export async function processRetryQueue(): Promise<void> {
  if (retryQueue.length === 0) {
    return;
  }

  backgroundLog('log', '[mole] Processing retry queue', { queueSize: retryQueue.length });

  const itemsToRetry = [...retryQueue];
  const successfulItems: string[] = [];

  for (const item of itemsToRetry) {
    try {
      const response = await fetch(DEADDROP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.pageData),
      });

      if (response.ok) {
        successfulItems.push(item.id);
        backgroundLog('log', '[mole] Retry successful', { url: item.pageData.url });
      } else {
        item.retryCount++;
        item.lastAttemptTimestamp = Date.now();
        item.error = `Server responded with ${response.status}: ${response.statusText}`;
      }

    } catch (error) {
      item.retryCount++;
      item.lastAttemptTimestamp = Date.now();
      item.error = error instanceof Error ? error.message : 'Unknown retry error';
    }
  }

  // Remove successful items from queue
  retryQueue = retryQueue.filter(item => !successfulItems.includes(item.id));
  await saveRetryQueue();

  // Update icon status based on queue state
  if (retryQueue.length === 0) {
    currentStatus = 'idle';
  } else {
    currentStatus = 'queued';
  }
  await updateBrowserActionIcon(currentStatus);

  if (successfulItems.length > 0) {
    backgroundLog('log', '[mole] Retry queue processed', {
      successful: successfulItems.length,
      remaining: retryQueue.length
    });
  }
}

export async function manualRetryQueue(): Promise<void> {
  backgroundLog('log', '[mole] Manual retry triggered');
  await processRetryQueue();
}

export function getTransmissionState(): TransmissionState {
  const totalBytes = retryQueue.reduce((total, item) => {
    return total + new TextEncoder().encode(item.pageData.markdown || '').length;
  }, 0);

  return {
    status: retryQueue.length > 0 ? 'queued' : currentStatus,
    queueSize: retryQueue.length,
    totalQueuedBytes: totalBytes,
    lastError: retryQueue.length > 0 ? retryQueue[retryQueue.length - 1].error : undefined,
  };
}

async function loadRetryQueue(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY_RETRY_QUEUE]);
    if (result[STORAGE_KEY_RETRY_QUEUE]) {
      const stored = result[STORAGE_KEY_RETRY_QUEUE] as RetryQueueItem[];
      retryQueue = stored.filter(isValidRetryQueueItem);
      backgroundLog('log', '[mole] Loaded retry queue from storage', { queueSize: retryQueue.length });
    }
  } catch (error) {
    backgroundLog('error', '[mole] Failed to load retry queue', error);
    retryQueue = [];
  }
}

async function saveRetryQueue(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY_RETRY_QUEUE]: retryQueue
    });
  } catch (error) {
    backgroundLog('error', '[mole] Failed to save retry queue', error);
  }
}

function startRetryAlarm(): void {
  if (!chrome.alarms) {
    console.warn('[mole] chrome.alarms API unavailable; retry queue will not auto-process');
    return;
  }

  chrome.alarms.clear(RETRY_ALARM_NAME, () => {
    chrome.alarms.create(RETRY_ALARM_NAME, {
      periodInMinutes: RETRY_INTERVAL_MINUTES,
      delayInMinutes: RETRY_INTERVAL_MINUTES
    });
  });
}

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== RETRY_ALARM_NAME) {
      return;
    }

    if (retryQueue.length > 0) {
      processRetryQueue().catch((error) => {
        backgroundLog('error', '[mole] Retry alarm processing failed', error);
      });
    }
  });
}

function generateQueueItemId(pageData: PageData): string {
  return `${pageData.url}_${pageData.timestamp}`;
}

function isValidRetryQueueItem(item: any): item is RetryQueueItem {
  return (
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.pageData === 'object' &&
    typeof item.retryCount === 'number' &&
    typeof item.lastAttemptTimestamp === 'number' &&
    typeof item.error === 'string'
  );
}
