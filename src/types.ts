export type ToolMode = 
  | 'pdf-editor'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'image-to-pdf';

export interface PageItem {
  id: string; // unique page instance identifier
  originalPageNumber: number; // 1-based original page index
  rotation: number; // 0, 90, 180, 270
}

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  arrayBuffer?: ArrayBuffer;
  pageCount?: number;
  extractedText?: string;
  pages?: PdfPageInfo[];
  createdAt: number;
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  canvasDataUrl?: string;
  text?: string;
}

export type AnnotationType = 
  | 'text'
  | 'drawing'
  | 'highlight'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'signature'
  | 'stamp'
  | 'redaction';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  pageNumber: number;
  pageInstanceId?: string; // unique page instance ID
  type: AnnotationType;
  x: number; // percentage (0 - 100) or relative to page coordinates
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
  rotation?: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: 'drawing' | 'highlight';
  points: Point[];
  strokeWidth: number;
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'redaction';
  strokeWidth: number;
  fillColor?: string;
}

export interface StampAnnotation extends BaseAnnotation {
  type: 'stamp';
  stampText: string;
  subText?: string;
  variant: 'approved' | 'confidential' | 'urgent' | 'draft' | 'completed' | 'custom';
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  signatureDataUrl: string;
  signerName?: string;
  signedDate?: string;
}

export type Annotation = 
  | TextAnnotation
  | DrawingAnnotation
  | ShapeAnnotation
  | StampAnnotation
  | SignatureAnnotation;

export interface SavedSignature {
  id: string;
  name: string;
  dataUrl: string;
  type: 'drawn' | 'typed' | 'uploaded';
  createdAt: number;
}

export interface ImageToPdfItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  filter: 'none' | 'scan' | 'grayscale' | 'contrast';
  width: number;
  height: number;
}

export interface ImageToPdfSettings {
  pageSize: 'fit' | 'a4' | 'letter';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: 'none' | 'small' | 'standard';
  quality: number; // 0.1 - 1.0
  addPageNumbers: boolean;
  documentTitle?: string;
}

export type PdfToWordExportFormat = 'docx' | 'txt' | 'md' | 'rtf';

export type WordToPdfStandard = 'standard' | 'pdfa-1b' | 'pdfa-2b' | 'txt' | 'html';

export interface WordToPdfSettings {
  pageSize: 'a4' | 'letter';
  fontSize: 'small' | 'medium' | 'large';
  margins: 'normal' | 'narrow' | 'wide';
  headerText?: string;
  footerPageNumber: boolean;
  exportStandard?: WordToPdfStandard;
}

export interface AiProcessingState {
  isLoading: boolean;
  task?: 'ocr' | 'summarize' | 'translate' | 'qa' | 'extract';
  result?: string;
  error?: string;
}
