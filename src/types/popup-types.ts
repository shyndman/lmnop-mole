/**
 * Extension Debug Popup TypeScript Interfaces
 */

/**
 * Manages the state and behavior of the debug popup interface
 */
export interface PopupState {
  /** Whether content is being fetched */
  isLoading: boolean;
  /** The extracted markdown content to display */
  content: string;
  /** Error message if extraction fails */
  error: string | null;
  /** ID of the tab from which content was extracted */
  tabId: number;
}

/**
 * Validation Rules for PopupState:
 * - content must be a string (empty string if no content extracted)
 * - error must be null when content is successfully extracted
 * - tabId must be a positive integer representing a valid browser tab
 */

/**
 * Represents the visual presentation and interaction state of the popup
 */
export interface PopupDisplay {
  /** Whether popup is currently displayed */
  isVisible: boolean;
  /** Whether textarea has focus */
  textareaFocused: boolean;
  /** Whether textarea content is selected */
  textSelected: boolean;
  /** Popup size in pixels */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Validation Rules for PopupDisplay:
 * - dimensions.width must equal 260
 * - dimensions.height must equal 340
 * - textareaFocused and textSelected should be true on initial display
 */

/**
 * Response from background script containing tab data and state
 */
export interface TabDataResponse {
  /** Current state of the tab data */
  state: 'loading' | 'ready' | 'not-applicable' | 'error';
  /** Extracted markdown content (if ready) */
  content?: string;
  /** Size of the extracted content in bytes (if ready) */
  contentSize?: number;
  /** Error message (if error state) */
  error?: string;
}

export interface TransmissionStatusResponse {
  status: 'idle' | 'extracting' | 'sending' | 'success' | 'queued' | 'failed';
  queueSize: number;
  totalQueuedBytes: number;
  lastError?: string;
}