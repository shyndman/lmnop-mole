import { TransmissionStatus } from '../types/types';

// Icon colors for different statuses
const STATUS_COLORS: Record<TransmissionStatus, string> = {
  idle: '#888888',        // Gray
  extracting: '#2196f3',  // Blue
  sending: '#ff9800',     // Orange
  success: '#1976d2',     // Blue (instead of green for colorblind accessibility)
  queued: '#ff5722',      // Red-orange
  failed: '#f44336'       // Red
};

function createStatusImageData(status: TransmissionStatus, size: number): ImageData {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not supported in this environment');
  }

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Cannot create canvas context');
  }

  // Fill with status color
  ctx.fillStyle = STATUS_COLORS[status];
  ctx.fillRect(0, 0, size, size);

  // Add a small border for visibility
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);

  return ctx.getImageData(0, 0, size, size);
}

export async function updateBrowserActionIcon(status: TransmissionStatus): Promise<void> {
  try {
    await chrome.action.setIcon({
      imageData: {
        '16': createStatusImageData(status, 16),
        '32': createStatusImageData(status, 32),
        '48': createStatusImageData(status, 48),
        '128': createStatusImageData(status, 128)
      }
    });
  } catch (error) {
    console.error('[mole] Failed to update browser action icon:', error);
  }
}
