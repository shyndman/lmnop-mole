/**
 * Extension Debug Popup Logic
 */

import { PopupState, PopupDisplay, TabDataResponse, TransmissionStatusResponse } from './types/popup-types';

interface PopupElements {
  loading: HTMLElement;
  error: HTMLElement;
  textarea: HTMLTextAreaElement;
  byteCountNumber: HTMLElement;
  byteCountUnit: HTMLElement;
  transmissionStatusText: HTMLElement;
  retryInfo: HTMLElement;
  retryQueueSize: HTMLElement;
  retryButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  rerunButton: HTMLButtonElement;
}

class DebugPopup {
  private state: PopupState;
  private display: PopupDisplay;
  private elements: PopupElements;
  private statusUpdateInterval?: number;
  private currentTabId: number = -1;
  private currentTitle: string = '';
  private currentUrl: string = '';

  constructor() {
    this.state = {
      isLoading: true,
      content: '',
      error: null,
      tabId: -1
    };

    this.display = {
      isVisible: true,
      textareaFocused: false,
      textSelected: false,
      dimensions: { width: 260, height: 340 }
    };

    this.elements = {
      loading: document.getElementById('loading')!,
      error: document.getElementById('error')!,
      textarea: document.getElementById('markdownContent') as HTMLTextAreaElement,
      byteCountNumber: document.querySelector('.byte-count-number')!,
      byteCountUnit: document.querySelector('.byte-count-unit')!,
      transmissionStatusText: document.getElementById('transmissionStatusText')!,
      retryInfo: document.getElementById('retryInfo')!,
      retryQueueSize: document.getElementById('retryQueueSize')!,
      retryButton: document.getElementById('retryButton') as HTMLButtonElement,
      copyButton: document.getElementById('copyButton') as HTMLButtonElement,
      rerunButton: document.getElementById('rerunButton') as HTMLButtonElement
    };

    // Set up event listeners
    this.elements.retryButton.addEventListener('click', () => {
      this.handleRetryClick();
    });

    this.elements.copyButton.addEventListener('click', () => {
      this.handleCopyClick();
    });

    this.elements.rerunButton.addEventListener('click', () => {
      this.handleRerunClick();
    });

    this.elements.textarea.addEventListener('click', () => {
      this.handleTextareaClick();
    });

    console.log('[mole] Popup loaded');
    this.initialize();
    this.startStatusUpdates();
    this.subscribeToBackgroundMessages();
  }

  private showLoading(): void {
    document.body.className = 'state-loading';
    this.state.isLoading = true;
  }

  private showError(message: string): void {
    document.body.className = 'state-error';
    this.elements.error.textContent = message;
    this.state.isLoading = false;

    this.state.isLoading = false;
    this.state.error = message;
  }

  private showContent(content: string, tabId: number, contentSize: number): void {
    document.body.className = 'state-content';
    this.elements.textarea.value = content;

    // Update byte count display
    const formatted = this.formatBytes(contentSize);
    this.elements.byteCountNumber.textContent = formatted.number;
    this.elements.byteCountUnit.textContent = formatted.unit;

    this.state.isLoading = false;
    this.state.content = content;
    this.state.error = null;
    this.state.tabId = tabId;

    chrome.runtime.sendMessage({
      action: 'setTransmissionStatus',
      status: 'success'
    }).catch((error) => {
      console.error('[mole] Failed to update icon status:', error);
    });

  }

  private formatBytes(bytes: number): {number: string, unit: string} {
    if (bytes === 0) return {number: '0', unit: 'B'};
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const number = parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toString();
    return {number, unit: sizes[i]};
  }

  private handleTabDataResponse(response: TabDataResponse, tabId: number): void {
    switch (response.state) {
      case 'ready':
        if (response.content && response.content.trim() !== '') {
          this.showContent(response.content, tabId, response.contentSize || 0);
        } else {
          this.showError('No content could be extracted from this page');
        }
        break;
      case 'not-applicable':
        this.showError(response.error || 'Content extraction not available for this page type');
        break;
      case 'error':
        this.showError(response.error || 'An error occurred while processing the page');
        break;
      case 'loading':
        // Continue waiting for push message
        break;
    }
  }

  private async initialize(): Promise<void> {
    this.showLoading();

    try {
      // Query active tab
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});

      if (!tabs || tabs.length === 0) {
        this.showError('No active tab found');
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab.id) {
        this.showError('Invalid tab ID');
        return;
      }

      this.currentTabId = activeTab.id;
      this.currentUrl = activeTab.url || '';
      this.currentTitle = activeTab.title || '';

      // Check if URL is supported before requesting data
      if (!activeTab.url || (!activeTab.url.startsWith('http://') && !activeTab.url.startsWith('https://'))) {
        this.showError('Content extraction not available for this page type');
        return;
      }

      // Request initial tab data
      const response = await chrome.runtime.sendMessage({
        action: "getTabData",
        tabId: activeTab.id
      }) as TabDataResponse;

      // Handle initial response
      this.handleTabDataResponse(response, activeTab.id);

      // Otherwise wait for push notification
      if (response.state === 'loading') {
        console.log('[mole] Waiting for extraction to finish via push notification');
      }
    } catch (error) {
      console.error('[mole] Popup error:', error);
      this.showError('Unable to communicate with background script');
    }
  }

  private async updateTransmissionStatus(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getTransmissionState" }) as TransmissionStatusResponse;
      this.displayTransmissionStatus(response);
    } catch (error) {
      console.error('[mole] Failed to get transmission status:', error);
    }
  }

  private displayTransmissionStatus(status: TransmissionStatusResponse): void {
    // Update status text and color
    this.elements.transmissionStatusText.textContent = status.status;
    this.elements.transmissionStatusText.className = `status-${status.status}`;

    // Show/hide retry info based on queue size
    if (status.queueSize > 0) {
      this.elements.retryInfo.style.display = 'flex';
      this.elements.retryQueueSize.textContent = status.queueSize.toString();
    } else {
      this.elements.retryInfo.style.display = 'none';
    }
  }

  private async handleRetryClick(): Promise<void> {
    try {
      this.elements.retryButton.disabled = true;
      this.elements.retryButton.textContent = 'Retrying...';

      await chrome.runtime.sendMessage({ action: "manualRetry" });

      // Update status immediately after retry
      await this.updateTransmissionStatus();

    } catch (error) {
      console.error('[mole] Manual retry failed:', error);
    } finally {
      this.elements.retryButton.disabled = false;
      this.elements.retryButton.textContent = 'Retry Now';
    }
  }

  private startStatusUpdates(): void {
    // Update status immediately
    this.updateTransmissionStatus();

    // Update every 2 seconds
    this.statusUpdateInterval = window.setInterval(() => {
      this.updateTransmissionStatus();
    }, 2000);
  }

  private stopStatusUpdates(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = undefined;
    }
  }

  private subscribeToBackgroundMessages(): void {
    chrome.runtime.onMessage.addListener((request: any) => {
      if (request.action !== 'tabDataReady') {
        return;
      }

      const { tabId, payload } = request;
      if (tabId !== this.currentTabId) {
        return;
      }

      this.handleTabDataResponse(payload as TabDataResponse, tabId);
    });
  }

  private async handleCopyClick(): Promise<void> {
    try {
      const copied = await this.copyFormattedContent(this.elements.textarea.value, { showFeedback: true });
      if (!copied) {
        return;
      }
      this.showCopyFeedback('Copied!');

    } catch (error) {
      console.error('[mole] Copy failed:', error);
      this.showCopyFeedback('Failed');
    }
  }

  private async handleTextareaClick(): Promise<void> {
    try {
      const copied = await this.copyFormattedContent(this.elements.textarea.value, { showFeedback: false });
      if (copied) {
        window.close();
      }
    } catch (error) {
      console.error('[mole] Auto copy on textarea click failed:', error);
    }
  }

  private async handleRerunClick(): Promise<void> {
    if (this.currentTabId === -1) {
      return;
    }

    this.elements.rerunButton.disabled = true;
    const originalText = this.elements.rerunButton.textContent;
    this.elements.rerunButton.textContent = 'Running...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'rerunExtraction',
        tabId: this.currentTabId
      });

      this.refreshTabDataFromResponse(response?.tabData);

      if (!response?.success) {
        throw new Error(response?.error || 'Unknown rerun error');
      }
    } catch (error) {
      console.error('[mole] Rerun failed:', error);
      this.showError('Rerun failed. See console.');
    } finally {
      this.elements.rerunButton.disabled = false;
      this.elements.rerunButton.textContent = originalText;
    }
  }

  private refreshTabDataFromResponse(tabData?: TabDataResponse): void {
    if (!tabData) {
      this.showLoading();
      this.elements.error.textContent = '';
      return;
    }

    this.handleTabDataResponse(tabData, this.currentTabId);
  }

  private async copyFormattedContent(content: string, options: { showFeedback?: boolean } = {}): Promise<boolean> {
    if (!content) {
      return false;
    }

    const formattedContent = `---

title: ${this.currentTitle}
url: ${this.currentUrl}
content:
\`\`\`md
${content}
\`\`\``;

    await navigator.clipboard.writeText(formattedContent);
    if (options.showFeedback) {
      this.showCopyFeedback('Copied!');
    }
    return true;
  }

  private showCopyFeedback(label: string): void {
    const originalText = this.elements.copyButton.textContent;
    this.elements.copyButton.textContent = label;
    if (label === 'Copied!') {
      this.elements.copyButton.classList.add('copied');
    } else {
      this.elements.copyButton.classList.remove('copied');
    }

    setTimeout(() => {
      this.elements.copyButton.textContent = originalText;
      this.elements.copyButton.classList.remove('copied');
    }, 1500);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DebugPopup();
});

// Also initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded
  new DebugPopup();
}
