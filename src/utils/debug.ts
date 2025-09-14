declare const DEBUG_MODE: boolean;

const debugMode: boolean = DEBUG_MODE;

export const debugLog = (filterName: string, ...args: any[]) => {
	if (debugMode) {
		console.log(`[${filterName}]`, ...args);
	}
};

// Background-to-content logging for testing
interface LogMessage {
  level: 'log' | 'error' | 'warn' | 'debug';
  message: string;
  data?: any;
  timestamp: number;
}

// Background script logger that forwards to content script in test mode
export function backgroundLog(level: 'log' | 'error' | 'warn' | 'debug', message: string, data?: any, tabId?: number) {
  // Always log to background console
  console[level](message, data);
  
  // In debug mode, also forward to content script for test capture
  if (debugMode && chrome.tabs && tabId) {
    const logMessage: LogMessage = {
      level,
      message,
      data,
      timestamp: Date.now()
    };
    
    console.log('[DEBUG] Attempting to forward background log to content script, tabId:', tabId);
    chrome.tabs.sendMessage(tabId, {
      action: "forwardBackgroundLog",
      logMessage
    }).then(() => {
      console.log('[DEBUG] Background log forwarded successfully');
    }).catch((err) => {
      console.log('[DEBUG] Failed to forward background log:', err);
    });
  }
}

// Content script logger that receives and logs background messages
export function handleBackgroundLog(logMessage: LogMessage) {
  const prefix = `[background:${logMessage.level}]`;
  
  if (logMessage.data) {
    console[logMessage.level](`${prefix} ${logMessage.message}`, logMessage.data);
  } else {
    console[logMessage.level](`${prefix} ${logMessage.message}`);
  }
}
