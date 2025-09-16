export interface PageData {
  title: string;
  url: string;
  author: string;
  published: string;
  content: string;
  markdown: string;
  description: string;
  domain: string;
  favicon: string;
  image: string;
  site: string;
  timestamp: number;
  imageUrls: string[];
}

export interface RetryQueueItem {
  id: string;
  pageData: PageData;
  retryCount: number;
  lastAttemptTimestamp: number;
  error: string;
}

export type TransmissionStatus =
  | 'idle'
  | 'extracting'
  | 'sending'
  | 'success'
  | 'queued'
  | 'failed';

export interface TransmissionState {
  status: TransmissionStatus;
  queueSize: number;
  totalQueuedBytes: number;
  lastError?: string;
}
