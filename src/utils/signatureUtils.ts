import { SavedSignature } from '../types';

const STORAGE_KEY = 'documaster_saved_signatures_v1';

/**
 * Trim transparent or white borders from canvas to get a tightly cropped signature image
 */
export function cropSignatureCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasDrawn = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      // If pixel is not fully transparent
      if (alpha > 20) {
        hasDrawn = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasDrawn) {
    return canvas.toDataURL('image/png');
  }

  const padding = 12;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, maxX - minX + padding * 2);
  const cropH = Math.min(height - cropY, maxY - minY + padding * 2);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return canvas.toDataURL('image/png');

  croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return croppedCanvas.toDataURL('image/png');
}

/**
 * Convert an uploaded signature image by making white/light background transparent
 */
export async function makeSignatureBackgroundTransparent(
  imageSrc: string,
  colorTone: 'original' | 'navy' | 'black' = 'navy',
  threshold: number = 210
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > threshold) {
          // Make background transparent
          data[i + 3] = 0;
        } else {
          // Darken ink / apply ink color
          if (colorTone === 'navy') {
            data[i] = 15;
            data[i + 1] = 40;
            data[i + 2] = 120;
          } else if (colorTone === 'black') {
            data[i] = 10;
            data[i + 1] = 15;
            data[i + 2] = 20;
          }
          // Smooth alpha based on luminance
          data[i + 3] = Math.min(255, (255 - brightness) * 1.5);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(cropSignatureCanvas(canvas));
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Render typed signature text to transparent PNG using handwriting/cursive font
 */
export function renderTypedSignatureToDataUrl(
  text: string,
  fontFamily: string = 'Caveat',
  color: string = '#0f2b60'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `68px "${fontFamily}", cursive, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return cropSignatureCanvas(canvas);
}

/**
 * Storage helpers for signature library
 */
export function getSavedSignatures(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load saved signatures:', err);
    return [];
  }
}

export function saveSignatureToLibrary(signature: Omit<SavedSignature, 'id' | 'createdAt'>): SavedSignature {
  const list = getSavedSignatures();
  const newItem: SavedSignature = {
    ...signature,
    id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
  };
  list.unshift(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return newItem;
}

export function deleteSavedSignature(id: string): void {
  const list = getSavedSignatures().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
