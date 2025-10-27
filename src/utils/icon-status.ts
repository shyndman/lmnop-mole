import { TransmissionStatus } from '../types/types';

// Icon colors for different statuses
const STATUS_COLORS: Record<TransmissionStatus, string> = {
  idle: '#888888',        // Gray
  extracting: '#2196f3',  // Blue
  sending: '#ff9800',     // Orange
  success: '#1d4ed8',     // Placeholder for success (actual icon custom-rendered)
  queued: '#ff5722',      // Red-orange
  failed: '#f44336'       // Red
};

const ZIGZAG_COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];

function createStatusImageData(status: TransmissionStatus, size: number): ImageData {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not supported in this environment');
  }

  if (status === 'success') {
    return createZigzagIcon(size);
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

function createZigzagIcon(size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Cannot create canvas context');
  }

  // Base gradient inspired by early 90s neon palettes
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#00f5d4');  // aqua
  gradient.addColorStop(1, '#f72585');  // magenta
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const zigzagCount = 4;
  const segmentWidth = size / 4;
  const amplitude = size / (zigzagCount * 1.5);
  const lineWidth = Math.max(2, size / 13);

  for (let i = 0; i < zigzagCount; i++) {
    const color = ZIGZAG_COLORS[i % ZIGZAG_COLORS.length];
    const startY = (size / zigzagCount) * i + amplitude / 1.5;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square';

    ctx.beginPath();
    ctx.moveTo(0, startY);

    let direction = 1;
    for (let x = 0; x <= size; x += segmentWidth) {
      const clampedX = Math.min(size, x + segmentWidth);
      ctx.lineTo(clampedX, startY);
      ctx.lineTo(clampedX, startY + direction * amplitude);
      direction *= -1;
    }

    ctx.stroke();
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, size, size);

  return ctx.getImageData(0, 0, size, size);
}
