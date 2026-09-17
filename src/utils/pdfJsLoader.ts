import * as pdfjsLib from 'pdfjs-dist';
// Vite URL import for local bundled worker
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  try {
    if (pdfjsWorker) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  } catch (err) {
    console.warn('PDF.js worker initialization:', err);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export { pdfjsLib };

