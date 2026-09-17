import jsPDF from 'jspdf';
import { ImageToPdfItem, ImageToPdfSettings } from '../types';

/**
 * Apply filters (Scan, Grayscale, Contrast) to an image element and return canvas data URL
 */
export async function processImageWithFilter(
  imageSrc: string,
  filter: 'none' | 'scan' | 'grayscale' | 'contrast',
  rotation: number = 0
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const isRotated90 = rotation % 180 !== 0;
      const canvas = document.createElement('canvas');
      const width = isRotated90 ? img.height : img.width;
      const height = isRotated90 ? img.width : img.height;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      if (filter !== 'none') {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Luminance calculation
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (filter === 'grayscale') {
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          } else if (filter === 'contrast') {
            // High contrast enhancement
            const factor = (259 * (128 + 50)) / (255 * (259 - 50));
            const newGray = factor * (gray - 128) + 128;
            const clamped = Math.max(0, Math.min(255, newGray));
            data[i] = clamped;
            data[i + 1] = clamped;
            data[i + 2] = clamped;
          } else if (filter === 'scan') {
            // Scanner document effect: push whites to 255 and text to dark
            let val = gray;
            if (val > 175) {
              val = 255;
            } else if (val < 110) {
              val = Math.max(0, val * 0.6);
            } else {
              val = ((val - 110) / 65) * 255;
            }
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width,
        height,
      });
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Generate PDF from a list of images with layout settings
 */
export async function convertImagesToPdf(
  items: ImageToPdfItem[],
  settings: ImageToPdfSettings,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error('No images to convert');
  }

  // Determine initial format
  const initialSetting = settings.pageSize === 'letter' ? 'letter' : 'a4';
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: initialSetting,
  });

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (onProgress) {
      onProgress(idx + 1, items.length);
    }

    // Process image with its rotation and filter
    const { dataUrl, width: imgW, height: imgH } = await processImageWithFilter(
      item.previewUrl,
      item.filter,
      item.rotation
    );

    // If not first page, add a new page
    if (idx > 0) {
      pdf.addPage();
    }

    let orientation: 'portrait' | 'landscape' = 'portrait';
    if (settings.orientation === 'auto') {
      orientation = imgW > imgH ? 'landscape' : 'portrait';
    } else {
      orientation = settings.orientation;
    }

    let marginMm = 0;
    if (settings.margin === 'small') marginMm = 10;
    else if (settings.margin === 'standard') marginMm = 20;

    let targetPageW = 210; // A4 standard mm
    let targetPageH = 297;

    if (settings.pageSize === 'fit') {
      // Custom page size matching exact image aspect ratio
      const pxToMm = 0.264583;
      targetPageW = imgW * pxToMm + marginMm * 2;
      targetPageH = imgH * pxToMm + marginMm * 2;
      pdf.setPage(idx + 1);
      // Change page dimension for fit mode
      (pdf.internal.pageSize as any).width = targetPageW;
      (pdf.internal.pageSize as any).height = targetPageH;
    } else {
      if (settings.pageSize === 'letter') {
        targetPageW = 215.9;
        targetPageH = 279.4;
      } else {
        targetPageW = 210;
        targetPageH = 297;
      }

      if (orientation === 'landscape') {
        const tmp = targetPageW;
        targetPageW = targetPageH;
        targetPageH = tmp;
      }

      (pdf.internal.pageSize as any).width = targetPageW;
      (pdf.internal.pageSize as any).height = targetPageH;
    }

    const usableW = targetPageW - marginMm * 2;
    const usableH = targetPageH - marginMm * 2;

    // Calculate fitted dimensions preserving aspect ratio
    const imgAspect = imgW / imgH;
    const pageAspect = usableW / usableH;

    let drawW = usableW;
    let drawH = usableH;

    if (settings.pageSize === 'fit') {
      drawW = usableW;
      drawH = usableH;
    } else {
      if (imgAspect > pageAspect) {
        drawW = usableW;
        drawH = usableW / imgAspect;
      } else {
        drawH = usableH;
        drawW = usableH * imgAspect;
      }
    }

    // Center image on page
    const posX = marginMm + (usableW - drawW) / 2;
    const posY = marginMm + (usableH - drawH) / 2;

    pdf.addImage(dataUrl, 'JPEG', posX, posY, drawW, drawH, undefined, 'FAST');

    // Page Number
    if (settings.addPageNumbers) {
      pdf.setFontSize(8);
      pdf.setTextColor(140, 150, 165);
      pdf.text(
        `${idx + 1} / ${items.length}`,
        targetPageW / 2,
        targetPageH - 5,
        { align: 'center' }
      );
    }
  }

  return pdf.output('blob');
}
