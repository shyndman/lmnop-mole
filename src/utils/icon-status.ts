import { TransmissionStatus } from '../types/types';

// Icon colors for different statuses
const STATUS_COLORS = {
  idle: '#888888',        // Gray
  extracting: '#2196f3',  // Blue
  sending: '#ff9800',     // Orange
  success: '#1976d2',     // Blue (instead of green for colorblind accessibility)
  queued: '#ff5722',      // Red-orange
  failed: '#f44336'       // Red
};

export function createStatusIcon(status: TransmissionStatus, size: number = 16): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

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

  return canvas.toDataURL();
}

export async function updateBrowserActionIcon(status: TransmissionStatus): Promise<void> {
  try {
    const icon16 = createStatusIcon(status, 16);
    const icon32 = createStatusIcon(status, 32);
    const icon48 = createStatusIcon(status, 48);
    const icon128 = createStatusIcon(status, 128);

    await chrome.action.setIcon({
      imageData: {
        '16': await createImageData(icon16),
        '32': await createImageData(icon32),
        '48': await createImageData(icon48),
        '128': await createImageData(icon128)
      }
    });
  } catch (error) {
    console.error('[mole] Failed to update browser action icon:', error);
  }
}

async function createImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}