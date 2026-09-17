import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { pdfjsLib } from './pdfJsLoader';
import { Annotation, PdfPageInfo, Point, PageItem } from '../types';

export interface LoadedPdf {
  pdfJsDoc: any;
  pageCount: number;
  pagesInfo: PdfPageInfo[];
}

/**
 * Load PDF with PDF.js for rendering and text extraction
 */
export async function loadPdfWithPdfJs(arrayBuffer: ArrayBuffer): Promise<LoadedPdf> {
  // Always clone ArrayBuffer so that PDF.js / web workers do not neuter the original buffer
  const bufferClone = arrayBuffer.slice(0);
  const data = new Uint8Array(bufferClone);

  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
  });

  const pdfJsDoc = await loadingTask.promise;
  const pageCount = pdfJsDoc.numPages;
  const pagesInfo: PdfPageInfo[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    pagesInfo.push({
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation || 0,
    });
  }

  return { pdfJsDoc, pageCount, pagesInfo };
}

/**
 * Render a single PDF page onto a canvas
 */
export async function renderPdfPage(
  pdfJsDoc: any,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5,
  rotationOffset: number = 0
): Promise<{ width: number; height: number }> {
  if (!pdfJsDoc || !canvas) return { width: 0, height: 0 };
  
  const page = await pdfJsDoc.getPage(pageNumber);
  const pageRotate = page.rotate || 0;
  const totalRotation = (pageRotate + (rotationOffset || 0)) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  // Handle high resolution screens (Retina / 4K)
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * pixelRatio);
  canvas.height = Math.floor(viewport.height * pixelRatio);

  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.save();
  ctx.scale(pixelRatio, pixelRatio);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  // Fill pure white background behind PDF page
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  await renderTask.promise;
  ctx.restore();

  return { width: viewport.width, height: viewport.height };
}

/**
 * Render page thumbnail to data URL
 */
export async function renderPageThumbnail(
  pdfJsDoc: any,
  pageNumber: number,
  thumbScale: number = 0.25,
  rotationOffset: number = 0
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderPdfPage(pdfJsDoc, pageNumber, canvas, thumbScale, rotationOffset);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Extract structured text page by page from PDF
 */
export async function extractTextFromPdf(pdfJsDoc: any): Promise<{ fullText: string; pageTexts: string[] }> {
  const pageTexts: string[] = [];
  let fullText = '';

  for (let i = 1; i <= pdfJsDoc.numPages; i++) {
    const page = await pdfJsDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort text items roughly by Y then X to preserve reading order
    const items = textContent.items as any[];
    let lastY: number | null = null;
    let pageString = '';

    for (const item of items) {
      if (!item.str) continue;
      const currentY = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(currentY - lastY) > 6) {
        pageString += '\n';
      } else if (pageString.length > 0 && !pageString.endsWith(' ') && !pageString.endsWith('\n')) {
        pageString += ' ';
      }
      pageString += item.str;
      lastY = currentY;
    }

    pageTexts.push(pageString.trim());
    fullText += `--- 第 ${i} 頁 ---\n` + pageString.trim() + '\n\n';
  }

  return { fullText: fullText.trim(), pageTexts };
}

export interface ExtractedTextItem {
  id: string;
  text: string;
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  width: number; // 0 - 100%
  height: number; // 0 - 100%
  fontSize: number;
}

/**
 * Extract native text items with their coordinates on a given PDF page
 */
export async function extractPageTextItems(
  pdfJsDoc: any,
  pageNumber: number,
  rotationOffset: number = 0
): Promise<ExtractedTextItem[]> {
  try {
    if (!pdfJsDoc) return [];
    const page = await pdfJsDoc.getPage(pageNumber);
    const pageRotate = page.rotate || 0;
    const totalRotation = (pageRotate + (rotationOffset || 0)) % 360;
    const viewport = page.getViewport({ scale: 1, rotation: totalRotation });
    const textContent = await page.getTextContent();
    
    const items: ExtractedTextItem[] = [];
    textContent.items.forEach((item: any, idx: number) => {
      if (!item.str || !item.str.trim()) return;
      
      const tx = item.transform[4];
      const ty = item.transform[5];
      const fontHeight = Math.hypot(item.transform[2], item.transform[3]) || item.height || 12;
      
      // Convert to viewport coordinates
      const [vx, vy] = viewport.convertToViewportPoint(tx, ty);
      
      // Calculate bounding box in percentage
      const wPct = Math.max(1.5, Math.min(95, (item.width / viewport.width) * 100));
      const hPct = Math.max(1.5, Math.min(30, (fontHeight / viewport.height) * 100));
      const xPct = Math.max(0, Math.min(100 - wPct, (vx / viewport.width) * 100));
      // vy is at text baseline, so top is vy - fontHeight
      const yPct = Math.max(0, Math.min(100 - hPct, ((vy - fontHeight) / viewport.height) * 100));

      items.push({
        id: `native_text_${pageNumber}_${idx}`,
        text: item.str,
        x: Number(xPct.toFixed(2)),
        y: Number(yPct.toFixed(2)),
        width: Number(wPct.toFixed(2)),
        height: Number(hPct.toFixed(2)),
        fontSize: Math.max(12, Math.round(fontHeight)),
      });
    });
    return items;
  } catch (err) {
    console.warn('Failed to extract native text items:', err);
    return [];
  }
}

/**
 * Rotate annotations on a page by 90 degrees clockwise
 */
export function rotateAnnotationsForPage(
  annotations: Annotation[],
  pageNumber: number
): Annotation[] {
  return annotations.map((ann) => {
    if (ann.pageNumber !== pageNumber) return ann;

    // Clockwise 90 degree coordinate transformation on relative 100x100 space:
    // old (x, y, w, h) -> new (100 - (y + h), x, h, w)
    const oldX = ann.x;
    const oldY = ann.y;
    const oldW = ann.width || 5;
    const oldH = ann.height || 5;

    const newX = Math.max(0, Math.min(100, 100 - (oldY + oldH)));
    const newY = Math.max(0, Math.min(100, oldX));
    const newW = oldH;
    const newH = oldW;

    if (ann.type === 'drawing' || ann.type === 'highlight') {
      const newPoints = (ann.points || []).map((p) => ({
        x: Math.max(0, Math.min(100, 100 - p.y)),
        y: Math.max(0, Math.min(100, p.x)),
      }));
      return {
        ...ann,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        points: newPoints,
      };
    }

    return {
      ...ann,
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
      width: Number(newW.toFixed(2)),
      height: Number(newH.toFixed(2)),
    };
  });
}

/**
 * Hex color to RGB object for pdf-lib
 */
function hexToPdfRgb(hex: string) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * Render unicode/CJK or custom styled text to a PNG buffer for seamless embedding in PDF
 */
async function renderTextToPngBytes(
  text: string,
  fontSize: number,
  color: string,
  bold: boolean = false
): Promise<{ pngBytes: Uint8Array; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const renderScale = 3; // 3x for ultra-sharp Retina printing
  const actualFontSize = Math.max(12, fontSize) * renderScale;
  const fontWeight = bold ? 'bold' : 'normal';
  
  // Set system fonts with CJK support
  const fontFam = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Apple LiGothic Medium", sans-serif';
  ctx.font = `${fontWeight} ${actualFontSize}px ${fontFam}`;

  const lines = (text || '').split('\n');
  let maxWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line || ' ');
    if (metrics.width > maxWidth) maxWidth = metrics.width;
  }
  
  const lineHeight = actualFontSize * 1.35;
  const totalHeight = lineHeight * lines.length + 12 * renderScale;
  const totalWidth = maxWidth + 16 * renderScale;

  canvas.width = Math.ceil(totalWidth);
  canvas.height = Math.ceil(totalHeight);

  // Clear and fill transparent
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontWeight} ${actualFontSize}px ${fontFam}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';

  lines.forEach((line, idx) => {
    ctx.fillText(line, 8 * renderScale, idx * lineHeight + 4 * renderScale);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) throw new Error('Failed to generate text image');
  const arrayBuf = await blob.arrayBuffer();
  
  return {
    pngBytes: new Uint8Array(arrayBuf),
    width: canvas.width / renderScale,
    height: canvas.height / renderScale,
  };
}

/**
 * Export modified PDF with all annotations, signatures, text, drawings, and rotations
 */
export async function exportModifiedPdf(
  originalArrayBuffer: ArrayBuffer,
  annotations: Annotation[],
  pageList: PageItem[]
): Promise<Uint8Array> {
  const sourcePdfDoc = await PDFDocument.load(originalArrayBuffer);
  const newPdfDoc = await PDFDocument.create();
  
  const helveticaFont = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaRegular = await newPdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageList.length; i++) {
    const pageItem = pageList[i];
    const originalIndex = Math.max(0, Math.min(sourcePdfDoc.getPageCount() - 1, pageItem.originalPageNumber - 1));
    const [copiedPage] = await newPdfDoc.copyPages(sourcePdfDoc, [originalIndex]);
    newPdfDoc.addPage(copiedPage);

    // Apply rotation
    const baseRot = copiedPage.getRotation().angle;
    const finalRot = (baseRot + (pageItem.rotation || 0)) % 360;
    copiedPage.setRotation(degrees(finalRot));

    // Get annotations specific to this page instance
    const pageAnns = annotations.filter((a) => {
      if (a.pageInstanceId) {
        return a.pageInstanceId === pageItem.id;
      }
      return a.pageNumber === pageItem.originalPageNumber;
    });

    const { width, height } = copiedPage.getSize();
    const userRot = (pageItem.rotation || 0) % 360;

    for (const ann of pageAnns) {
      // Map visual percentages (ann.x, ann.y, ann.width, ann.height) to unrotated PDF page coordinates
      let pdfX: number;
      let pdfY: number;
      let pdfW: number;
      let pdfH: number;

      if (userRot === 0) {
        pdfW = (ann.width / 100) * width;
        pdfH = (ann.height / 100) * height;
        pdfX = (ann.x / 100) * width;
        pdfY = height - ((ann.y / 100) * height) - pdfH;
      } else if (userRot === 90) {
        pdfW = (ann.height / 100) * width;
        pdfH = (ann.width / 100) * height;
        pdfX = (ann.y / 100) * width;
        pdfY = (ann.x / 100) * height;
      } else if (userRot === 180) {
        pdfW = (ann.width / 100) * width;
        pdfH = (ann.height / 100) * height;
        pdfX = width - ((ann.x / 100) * width) - pdfW;
        pdfY = (ann.y / 100) * height;
      } else { // 270
        pdfW = (ann.height / 100) * width;
        pdfH = (ann.width / 100) * height;
        pdfX = width - ((ann.y / 100) * width) - pdfW;
        pdfY = height - ((ann.x / 100) * height) - pdfH;
      }

      if (ann.type === 'text') {
        if (ann.text && ann.text.trim()) {
          try {
            const calculatedFontSize = Math.max(12, (ann.fontSize || 16) * (width / 700));
            const { pngBytes, width: textW, height: textH } = await renderTextToPngBytes(
              ann.text,
              calculatedFontSize,
              ann.color || '#0f172a',
              Boolean(ann.bold)
            );
            const embeddedText = await newPdfDoc.embedPng(pngBytes);
            
            if (userRot === 0) {
              copiedPage.drawImage(embeddedText, {
                x: pdfX,
                y: height - ((ann.y / 100) * height) - textH,
                width: textW,
                height: textH,
              });
            } else {
              copiedPage.drawImage(embeddedText, {
                x: pdfX,
                y: pdfY,
                width: textW,
                height: textH,
              });
            }
          } catch (tErr) {
            console.warn('Failed to embed text image, falling back to drawText:', tErr);
            const font = ann.bold ? helveticaFont : helveticaRegular;
            const calculatedFontSize = Math.max(10, (ann.fontSize || 16) * (width / 800));
            try {
              copiedPage.drawText(ann.text || '', {
                x: pdfX,
                y: pdfY + Math.max(0, pdfH - calculatedFontSize),
                size: calculatedFontSize,
                font: font,
                color: hexToPdfRgb(ann.color || '#0f172a'),
              });
            } catch (fallbackErr) {
              console.warn('drawText fallback error:', fallbackErr);
            }
          }
        }
      } else if (ann.type === 'rectangle' || ann.type === 'redaction') {
        const isRedaction = ann.type === 'redaction';
        copiedPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderColor: isRedaction ? undefined : hexToPdfRgb(ann.color || '#3b82f6'),
          borderWidth: isRedaction ? 0 : (ann.strokeWidth || 2),
          color: isRedaction ? hexToPdfRgb(ann.color || '#ffffff') : (ann.fillColor ? hexToPdfRgb(ann.fillColor) : undefined),
          opacity: ann.opacity ?? 1,
        });
      } else if (ann.type === 'circle') {
        copiedPage.drawEllipse({
          x: pdfX + pdfW / 2,
          y: pdfY + pdfH / 2,
          xScale: pdfW / 2,
          yScale: pdfH / 2,
          borderColor: hexToPdfRgb(ann.color || '#3b82f6'),
          borderWidth: ann.strokeWidth || 2,
          color: ann.fillColor ? hexToPdfRgb(ann.fillColor) : undefined,
          opacity: ann.opacity ?? 1,
        });
      } else if (ann.type === 'signature' && ann.signatureDataUrl) {
        try {
          const imageBytes = await fetch(ann.signatureDataUrl).then((res) => res.arrayBuffer());
          const embeddedImage = await newPdfDoc.embedPng(imageBytes);
          copiedPage.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
          });

          if (ann.signerName || ann.signedDate) {
            const metaStr = [
              ann.signerName ? `Signed by: ${ann.signerName}` : '',
              ann.signedDate ? `Date: ${ann.signedDate}` : '',
            ]
              .filter(Boolean)
              .join(' | ');
            copiedPage.drawText(metaStr, {
              x: pdfX,
              y: Math.max(5, pdfY - 10),
              size: 8,
              font: helveticaRegular,
              color: rgb(0.3, 0.3, 0.3),
            });
          }
        } catch (imgErr) {
          console.warn('Failed to embed signature image:', imgErr);
        }
      } else if (ann.type === 'stamp') {
        copiedPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderColor: hexToPdfRgb(ann.color || '#dc2626'),
          borderWidth: 2,
          color: hexToPdfRgb(ann.color || '#dc2626'),
          opacity: 0.08,
        });
        copiedPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderColor: hexToPdfRgb(ann.color || '#dc2626'),
          borderWidth: 2,
        });
        copiedPage.drawText(ann.stampText.toUpperCase(), {
          x: pdfX + 8,
          y: pdfY + pdfH / 2 - 4,
          size: Math.max(12, Math.min(22, pdfW / (ann.stampText.length * 0.7))),
          font: helveticaFont,
          color: hexToPdfRgb(ann.color || '#dc2626'),
        });
        if (ann.subText) {
          copiedPage.drawText(ann.subText, {
            x: pdfX + 8,
            y: pdfY + 4,
            size: 8,
            font: helveticaRegular,
            color: hexToPdfRgb(ann.color || '#dc2626'),
          });
        }
      } else if ((ann.type === 'drawing' || ann.type === 'highlight') && ann.points && ann.points.length > 1) {
        const strokeColor = hexToPdfRgb(ann.color || '#3b82f6');
        const strokeWidth = ann.strokeWidth || 2;
        const opacity = ann.type === 'highlight' ? 0.35 : (ann.opacity ?? 1);

        const mapPoint = (p: Point) => {
          if (userRot === 0) return { x: (p.x / 100) * width, y: height - (p.y / 100) * height };
          if (userRot === 90) return { x: (p.y / 100) * width, y: (p.x / 100) * height };
          if (userRot === 180) return { x: width - (p.x / 100) * width, y: (p.y / 100) * height };
          return { x: width - (p.y / 100) * width, y: height - (p.x / 100) * height };
        };

        for (let p = 0; p < ann.points.length - 1; p++) {
          const pt1 = mapPoint(ann.points[p]);
          const pt2 = mapPoint(ann.points[p + 1]);
          copiedPage.drawLine({
            start: pt1,
            end: pt2,
            thickness: strokeWidth,
            color: strokeColor,
            opacity: opacity,
          });
        }
      }
    }
  }

  return await newPdfDoc.save();
}

/**
 * Merge multiple PDF files into one
 */
export async function mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}
