/**
 * Extension Data Persistence Utilities
 */

// Tab state and data storage interface
export interface TabData {
  state: 'loading' | 'ready' | 'not-applicable' | 'error';
  content?: string;
  contentSize?: number;
  error?: string;
}

// Storage keys for persistence
const STORAGE_KEYS = {
  TAB_STATES: 'tabStates'
} as const;

/**
 * Validates tab data structure
 */
function isValidTabData(data: any): data is TabData {
  return data &&
         typeof data === 'object' &&
         typeof data.state === 'string' &&
         ['loading', 'ready', 'not-applicable', 'error'].includes(data.state) &&
         (data.content === undefined || typeof data.content === 'string') &&
         (data.contentSize === undefined || typeof data.contentSize === 'number') &&
         (data.error === undefined || typeof data.error === 'string');
}

/**
 * Save tab states to storage
 */
async function saveTabStates(tabStates: Map<number, TabData>): Promise<void> {
  try {
    const statesObject = Object.fromEntries(tabStates.entries());
    await chrome.storage.local.set({ [STORAGE_KEYS.TAB_STATES]: statesObject });
  } catch (error) {
    console.error('[mole] Failed to save tab states:', error);
  }
}


/**
 * Load persisted data from storage
 */
export async function loadPersistedData(): Promise<Map<number, TabData>> {
  const tabStates = new Map<number, TabData>();

  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.TAB_STATES]);

    // Load tab states
    if (result[STORAGE_KEYS.TAB_STATES]) {
      const statesObject = result[STORAGE_KEYS.TAB_STATES] as Record<string, TabData>;
      for (const [tabIdStr, tabData] of Object.entries(statesObject)) {
        const tabId = parseInt(tabIdStr, 10);
        if (!isNaN(tabId) && isValidTabData(tabData)) {
          tabStates.set(tabId, tabData);
        }
      }
    }

    console.log(`[mole] Loaded ${tabStates.size} tab states from storage`);
  } catch (error) {
    console.error('[mole] Failed to load persisted data:', error);
  }

  return tabStates;
}

/**
 * Save tab states immediately
 */
export async function saveTabStatesToStorage(tabStates: Map<number, TabData>): Promise<void> {
  await saveTabStates(tabStates);
}

/**
 * Remove tab data from storage
 */
export async function removeTabFromStorage(tabId: number): Promise<void> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.TAB_STATES]);

    // Remove from tab states
    if (result[STORAGE_KEYS.TAB_STATES]) {
      const statesObject = result[STORAGE_KEYS.TAB_STATES] as Record<string, TabData>;
      delete statesObject[tabId.toString()];
      await chrome.storage.local.set({ [STORAGE_KEYS.TAB_STATES]: statesObject });
    }
  } catch (error) {
    console.error('[mole] Failed to remove tab from storage:', error);
  }
}