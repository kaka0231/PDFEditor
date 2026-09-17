import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Type, 
  Pen, 
  Highlighter, 
  Square, 
  Circle, 
  Eraser, 
  PenTool, 
  RotateCw, 
  Trash2, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Undo2, 
  Check, 
  RefreshCw, 
  ShieldAlert,
  Move,
  Bold,
  Copy,
  Edit3,
  Plus,
  Layers,
  GripVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Annotation, DocumentFile, Point, PageItem } from '../types';
import { 
  loadPdfWithPdfJs, 
  renderPdfPage, 
  exportModifiedPdf, 
  renderPageThumbnail
} from '../utils/pdfUtils';
import { SignatureModal } from './SignatureModal';
import { useLanguage } from '../context/LanguageContext';

interface PdfEditorToolProps {
  file: DocumentFile;
  onSelectAnotherFile: () => void;
  initialSignatureToPlace?: string;
}

type EditorTool = 
  | 'select'
  | 'text'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'redaction';

interface DraggingState {
  isMultiple: boolean;
  annotationIds: string[];
  startPoint: Point;
  initialPositions: Record<string, { x: number; y: number }>;
}

interface MarqueeBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const PdfEditorTool: React.FC<PdfEditorToolProps> = ({
  file,
  onSelectAnotherFile,
  initialSignatureToPlace,
}) => {
  const { t, language } = useLanguage();
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
  const [pageList, setPageList] = useState<PageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Editor modes & selections
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [scale, setScale] = useState(1.25);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Page drag & drop reorder state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);

  // Tool settings
  const [textColor, setTextColor] = useState('#0f172a');
  const [fontSize, setFontSize] = useState(16);
  const [isBold, setIsBold] = useState(false);
  const [penColor, setPenColor] = useState('#2563eb');
  const [penWidth, setPenWidth] = useState(4);
  const [highlighterColor, setHighlighterColor] = useState('#facc15');

  // Interactive drawing, range selection & dragging state
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const [draggingState, setDraggingState] = useState<DraggingState | null>(null);

  // Signature modal
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);

  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Active page object
  const activePage: PageItem = pageList[activePageIndex] || {
    id: 'p_1',
    originalPageNumber: 1,
    rotation: 0,
  };

  // Auto focus input when editing text
  useEffect(() => {
    if (editingTextId && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [editingTextId]);

  // Load PDF document
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!file.arrayBuffer) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const { pdfJsDoc: doc, pageCount: count } = await loadPdfWithPdfJs(file.arrayBuffer);
        if (isMounted) {
          setPdfJsDoc(doc);
          const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
            id: `p_${i + 1}_${Date.now()}`,
            originalPageNumber: i + 1,
            rotation: 0,
          }));
          setPageList(initialPages);
          setActivePageIndex(0);
          setIsLoading(false);

          // Generate thumbnails
          const thumbs: Record<string, string> = {};
          for (let i = 0; i < initialPages.length; i++) {
            const p = initialPages[i];
            const thumb = await renderPageThumbnail(doc, p.originalPageNumber, 0.25, p.rotation);
            thumbs[p.id] = thumb;
          }
          if (isMounted) setThumbnails(thumbs);
        }
      } catch (err: any) {
        console.error('Failed to load PDF in editor:', err);
        if (isMounted) {
          setIsLoading(false);
          setErrorMessage(err?.message || '無法解析此 PDF 檔案，可能檔案受密碼保護或格式已損毀。');
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [file]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfJsDoc || !canvasRef.current || !activePage) return;
    renderPdfPage(pdfJsDoc, activePage.originalPageNumber, canvasRef.current, scale, activePage.rotation).catch((err) => {
      console.error('Failed to render current page:', err);
    });
  }, [pdfJsDoc, activePage, scale]);

  // If initial signature passed
  useEffect(() => {
    if (initialSignatureToPlace && activePage) {
      addSignatureAnnotation(initialSignatureToPlace, '電子簽名');
    }
  }, [initialSignatureToPlace, activePage?.id]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) {
        if (e.key === 'Escape') {
          confirmTextEditing();
        }
        return;
      }

      if (selectedAnnotationIds.length > 0) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          handleDeleteSelected();
        } else if (e.key === 'Escape' || e.key === 'Enter') {
          setSelectedAnnotationIds([]);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationIds, editingTextId, annotations]);

  // Rotate page 90 degrees clockwise AND rotate all annotations accordingly!
  const handleRotatePage = () => {
    if (!activePage) return;
    const newRot = (activePage.rotation + 90) % 360;

    // 1. Update page rotation in pageList
    setPageList((prev) =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, rotation: newRot } : p))
    );

    // 2. Rotate annotations on this active page instance clockwise
    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.pageInstanceId !== activePage.id && (ann.pageInstanceId || ann.pageNumber !== activePage.originalPageNumber)) {
          return ann;
        }

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
      })
    );

    // 3. Update thumbnail
    if (pdfJsDoc) {
      renderPageThumbnail(pdfJsDoc, activePage.originalPageNumber, 0.25, newRot).then((thumb) => {
        setThumbnails((prev) => ({ ...prev, [activePage.id]: thumb }));
      });
    }
  };

  // Convert Pointer event coordinates to percentage (0 - 100)
  const getRelativeCoords = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): Point => {
    const container = overlayContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  // Confirm and finish editing text
  const confirmTextEditing = useCallback(() => {
    if (!editingTextId) return;
    const currentAnn = annotations.find((a) => a.id === editingTextId);
    if (currentAnn && currentAnn.type === 'text') {
      if (!currentAnn.text || !currentAnn.text.trim()) {
        setAnnotations((prev) => prev.filter((a) => a.id !== editingTextId));
        setSelectedAnnotationIds((prev) => prev.filter((id) => id !== editingTextId));
      }
    }
    setEditingTextId(null);
  }, [editingTextId, annotations]);

  // Erase annotations (text, pen strokes, highlighter, shapes, redaction, signatures) at point
  const eraseAtPoint = (pt: Point) => {
    const pageAnns = annotations.filter(
      (a) =>
        a.pageInstanceId === activePage.id ||
        (!a.pageInstanceId && a.pageNumber === activePage.originalPageNumber)
    );

    const toDeleteIds = new Set<string>();

    for (const ann of pageAnns) {
      if (ann.type === 'drawing' || ann.type === 'highlight') {
        // Generous stroke hit-test (within 3.5% radius)
        const isHit = (ann.points || []).some(
          (p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= 3.5
        );
        if (isHit) toDeleteIds.add(ann.id);
      } else {
        const w = ann.width || 8;
        const h = ann.height || 4;
        const minX = ann.x - 1.5;
        const maxX = ann.x + w + 1.5;
        const minY = ann.y - 1.5;
        const maxY = ann.y + h + 1.5;
        if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
          toDeleteIds.add(ann.id);
        }
      }
    }

    if (toDeleteIds.size > 0) {
      setAnnotations((prev) => prev.filter((a) => !toDeleteIds.has(a.id)));
      setSelectedAnnotationIds((prev) => prev.filter((id) => !toDeleteIds.has(id)));
      if (editingTextId && toDeleteIds.has(editingTextId)) {
        setEditingTextId(null);
      }
    }
  };

  // Pointer Down on canvas overlay
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.text-editor-box') || target.closest('.action-toolbar-btn') || target.closest('.resize-handle')) {
      return;
    }

    if (editingTextId) {
      confirmTextEditing();
    }

    const pt = getRelativeCoords(e);

    // 1. Eraser tool
    if (activeTool === 'eraser') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawingShape(true);
      eraseAtPoint(pt);
      return;
    }

    // 2. Text tool - Place directly at click location with zero displacement
    if (activeTool === 'text') {
      e.currentTarget.setPointerCapture(e.pointerId);
      const newAnn: Annotation = {
        id: `ann_text_${Date.now()}`,
        pageNumber: activePage.originalPageNumber,
        pageInstanceId: activePage.id,
        type: 'text',
        x: Number(Math.max(0, Math.min(95, pt.x)).toFixed(2)),
        y: Number(Math.max(0, Math.min(95, pt.y)).toFixed(2)),
        width: 25,
        height: 4,
        text: '',
        fontSize: fontSize,
        fontFamily: 'sans-serif',
        color: textColor,
        bold: isBold,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnotationIds([newAnn.id]);
      setEditingTextId(newAnn.id);
      return;
    }

    // 3. Pen / Highlighter tool
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawingShape(true);
      setCurrentPoints([pt]);
      return;
    }

    // 4. Shapes: Rectangle, Circle, Redaction
    if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'redaction') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawingShape(true);
      setShapeStart(pt);
      setShapeCurrent(pt);
      return;
    }

    // 5. Select tool
    if (activeTool === 'select') {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (!e.shiftKey) {
        setSelectedAnnotationIds([]);
      }
      setMarqueeBox({
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      });
    }
  };

  // Pointer Move on canvas overlay
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pt = getRelativeCoords(e);

    // Eraser dragging
    if (activeTool === 'eraser' && isDrawingShape) {
      eraseAtPoint(pt);
      return;
    }

    if (draggingState) {
      const dx = pt.x - draggingState.startPoint.x;
      const dy = pt.y - draggingState.startPoint.y;
      setAnnotations((prev) =>
        prev.map((ann) => {
          if (draggingState.annotationIds.includes(ann.id)) {
            const initPos = draggingState.initialPositions[ann.id];
            if (initPos) {
              return {
                ...ann,
                x: Math.max(0, Math.min(100 - (ann.width || 5), initPos.x + dx)),
                y: Math.max(0, Math.min(100 - (ann.height || 5), initPos.y + dy)),
              };
            }
          }
          return ann;
        })
      );
      return;
    }

    if (marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null));

      const minX = Math.min(marqueeBox.startX, pt.x);
      const maxX = Math.max(marqueeBox.startX, pt.x);
      const minY = Math.min(marqueeBox.startY, pt.y);
      const maxY = Math.max(marqueeBox.startY, pt.y);

      const hitIds = annotations
        .filter((ann) => ann.pageInstanceId === activePage.id || (!ann.pageInstanceId && ann.pageNumber === activePage.originalPageNumber))
        .filter((ann) => {
          const annRight = ann.x + (ann.width || 5);
          const annBottom = ann.y + (ann.height || 5);
          return ann.x < maxX && annRight > minX && ann.y < maxY && annBottom > minY;
        })
        .map((a) => a.id);

      setSelectedAnnotationIds(hitIds);
      return;
    }

    if (isDrawingShape) {
      if (activeTool === 'pen' || activeTool === 'highlighter') {
        const lastPt = currentPoints[currentPoints.length - 1];
        if (!lastPt || Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > 0.15) {
          setCurrentPoints((prev) => [...prev, pt]);
        }
      } else if (shapeStart) {
        setShapeCurrent(pt);
      }
    }
  };

  // Pointer Up on canvas overlay
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe ignore
    }

    if (activeTool === 'eraser') {
      setIsDrawingShape(false);
      return;
    }

    if (draggingState) {
      setDraggingState(null);
      return;
    }

    if (marqueeBox) {
      setMarqueeBox(null);
      return;
    }

    if (!isDrawingShape) return;
    const pt = getRelativeCoords(e);

    // Commit Pen / Highlighter stroke
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      if (currentPoints.length > 0) {
        const strokePoints = currentPoints.length === 1 
          ? [currentPoints[0], { x: currentPoints[0].x + 0.1, y: currentPoints[0].y + 0.1 }] 
          : currentPoints;

        const newAnn: Annotation = {
          id: `ann_draw_${Date.now()}`,
          pageNumber: activePage.originalPageNumber,
          pageInstanceId: activePage.id,
          type: activeTool === 'highlighter' ? 'highlight' : 'drawing',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: activeTool === 'highlighter' ? highlighterColor : penColor,
          opacity: activeTool === 'highlighter' ? 0.35 : 1,
          points: strokePoints,
          strokeWidth: activeTool === 'highlighter' ? 14 : penWidth,
        };
        setAnnotations((prev) => [...prev, newAnn]);
      }
      setIsDrawingShape(false);
      setCurrentPoints([]);
      return;
    }

    // Commit Shape: Rectangle, Circle, Redaction
    if (shapeStart && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'redaction')) {
      const minX = Math.min(shapeStart.x, pt.x);
      const minY = Math.min(shapeStart.y, pt.y);
      const w = Math.max(3, Math.abs(pt.x - shapeStart.x));
      const h = Math.max(2, Math.abs(pt.y - shapeStart.y));

      const isRedact = activeTool === 'redaction';
      const newAnn: Annotation = {
        id: `ann_shape_${Date.now()}`,
        pageNumber: activePage.originalPageNumber,
        pageInstanceId: activePage.id,
        type: activeTool,
        x: minX,
        y: minY,
        width: w,
        height: h,
        color: isRedact ? '#ffffff' : penColor,
        fillColor: isRedact ? '#ffffff' : undefined,
        strokeWidth: isRedact ? 0 : 2,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnotationIds([newAnn.id]);
      setActiveTool('select');
    }

    setIsDrawingShape(false);
    setCurrentPoints([]);
    setShapeStart(null);
    setShapeCurrent(null);
  };

  // Start dragging an annotation in Select mode
  const startDragAnnotation = (e: React.PointerEvent, ann: Annotation) => {
    if (activeTool !== 'select') return;
    if (editingTextId === ann.id) return;

    e.stopPropagation();
    const pt = getRelativeCoords(e);

    let idsToDrag = selectedAnnotationIds;
    if (!selectedAnnotationIds.includes(ann.id)) {
      if (e.shiftKey) {
        idsToDrag = [...selectedAnnotationIds, ann.id];
      } else {
        idsToDrag = [ann.id];
      }
      setSelectedAnnotationIds(idsToDrag);
    }

    const initPosMap: Record<string, { x: number; y: number }> = {};
    annotations.forEach((a) => {
      if (idsToDrag.includes(a.id)) {
        initPosMap[a.id] = { x: a.x, y: a.y };
      }
    });

    setDraggingState({
      isMultiple: idsToDrag.length > 1,
      annotationIds: idsToDrag,
      startPoint: pt,
      initialPositions: initPosMap,
    });
  };

  const addSignatureAnnotation = (sigDataUrl: string, name?: string) => {
    const newAnn: Annotation = {
      id: `ann_sig_${Date.now()}`,
      pageNumber: activePage.originalPageNumber,
      pageInstanceId: activePage.id,
      type: 'signature',
      x: 35,
      y: 60,
      width: 25,
      height: 10,
      color: '#000000',
      signatureDataUrl: sigDataUrl,
      signerName: name,
      signedDate: new Date().toLocaleDateString(),
    };
    setAnnotations((prev) => [...prev, newAnn]);
    setSelectedAnnotationIds([newAnn.id]);
    setActiveTool('select');
  };

  const handleDeleteSelected = () => {
    if (selectedAnnotationIds.length === 0) return;
    setAnnotations((prev) => prev.filter((a) => !selectedAnnotationIds.includes(a.id)));
    if (editingTextId && selectedAnnotationIds.includes(editingTextId)) {
      setEditingTextId(null);
    }
    setSelectedAnnotationIds([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedAnnotationIds.length === 0) return;
    const duplicatedItems: Annotation[] = [];
    const newIds: string[] = [];

    annotations.forEach((item) => {
      if (selectedAnnotationIds.includes(item.id)) {
        const newId = `ann_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        newIds.push(newId);
        duplicatedItems.push({
          ...item,
          id: newId,
          x: Math.min(85, item.x + 3),
          y: Math.min(85, item.y + 3),
        });
      }
    });

    setAnnotations((prev) => [...prev, ...duplicatedItems]);
    setSelectedAnnotationIds(newIds);
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, -1));
    setSelectedAnnotationIds([]);
    setEditingTextId(null);
  };

  // Page reordering: Move Page X to Page Y
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pageList.length || fromIndex === toIndex) return;
    const updated = [...pageList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPageList(updated);
    setActivePageIndex(toIndex);
  };

  const handleDeletePage = (indexToDelete: number) => {
    if (pageList.length <= 1) {
      alert('PDF 至少需要保留一頁！');
      return;
    }
    const targetPage = pageList[indexToDelete];
    const updated = pageList.filter((_, idx) => idx !== indexToDelete);
    // Remove annotations belonging to deleted page instance
    setAnnotations((prev) => prev.filter((a) => a.pageInstanceId !== targetPage.id));
    setPageList(updated);
    setActivePageIndex(Math.min(activePageIndex, updated.length - 1));
  };

  // Duplicate Page: Clones page layout independently without syncing/sharing state
  const handleDuplicatePage = (indexToDuplicate: number) => {
    const sourcePage = pageList[indexToDuplicate];
    const newPageId = `p_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPage: PageItem = {
      id: newPageId,
      originalPageNumber: sourcePage.originalPageNumber,
      rotation: sourcePage.rotation,
    };

    // Independent copy of annotations for this new page instance
    const sourceAnns = annotations.filter(
      (a) => a.pageInstanceId === sourcePage.id || (!a.pageInstanceId && a.pageNumber === sourcePage.originalPageNumber)
    );
    const clonedAnns = sourceAnns.map((a) => ({
      ...a,
      id: `ann_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageInstanceId: newPageId,
      pageNumber: sourcePage.originalPageNumber,
    }));

    setAnnotations((prev) => [...prev, ...clonedAnns]);

    // Copy thumbnail
    if (thumbnails[sourcePage.id]) {
      setThumbnails((prev) => ({ ...prev, [newPageId]: thumbnails[sourcePage.id] }));
    }

    const updated = [...pageList];
    updated.splice(indexToDuplicate + 1, 0, newPage);
    setPageList(updated);
    setActivePageIndex(indexToDuplicate + 1);
  };

  const handleExportPdf = async () => {
    if (!file.arrayBuffer) return;
    confirmTextEditing();

    setIsExporting(true);
    try {
      const exportedBytes = await exportModifiedPdf(
        file.arrayBuffer,
        annotations,
        pageList
      );

      const blob = new Blob([exportedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Edited_${file.name || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to export edited PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const currentAnnotations = annotations.filter(
    (a) => a.pageInstanceId === activePage?.id || (!a.pageInstanceId && a.pageNumber === activePage?.originalPageNumber)
  );

  return (
    <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 select-none">
      {/* Top Main Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 sm:p-3 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Tool buttons */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            id="tool-select-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('select');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '選取與框選工具 (點擊單選、拖曳畫框可多選多個項目)' : 'Select / Marquee tool'}
          >
            <Move className="w-4 h-4" />
            <span>{t('editor.tool.select')}</span>
          </button>

          <button
            id="tool-text-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('text');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '點擊 PDF 任意處增加文字框 (按 Enter 或確定後隱藏方框)' : 'Add Text Box'}
          >
            <Type className="w-4 h-4" />
            <span>{t('editor.tool.text')}</span>
          </button>

          <button
            id="tool-pen-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('pen');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '手繪筆刷工具' : 'Freehand pen brush'}
          >
            <Pen className="w-4 h-4" />
            <span>{t('editor.tool.pen')}</span>
          </button>

          <button
            id="tool-highlighter-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('highlighter');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '螢光筆塗色標註' : 'Highlighter marker'}
          >
            <Highlighter className="w-4 h-4" />
            <span>{t('editor.tool.highlighter')}</span>
          </button>

          <button
            id="tool-eraser-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('eraser');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '橡皮擦 (點擊或劃過筆跡、螢光標註、文字或形狀即可立即清除)' : 'Eraser (click or sweep over annotations)'}
          >
            <Eraser className="w-4 h-4" />
            <span>{t('editor.tool.eraser')}</span>
          </button>

          <button
            id="tool-rectangle-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('rectangle');
            }}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'rectangle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '方框形狀' : 'Rectangle shape'}
          >
            <Square className="w-4 h-4" />
            <span className="hidden lg:inline">{t('editor.tool.rect')}</span>
          </button>

          <button
            id="tool-circle-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('circle');
            }}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'circle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '圓形形狀' : 'Circle shape'}
          >
            <Circle className="w-4 h-4" />
            <span className="hidden lg:inline">{t('editor.tool.circle')}</span>
          </button>

          <button
            id="tool-redaction-btn"
            onClick={() => {
              confirmTextEditing();
              setActiveTool('redaction');
            }}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTool === 'redaction'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title={language === 'zh' ? '白板遮色 (覆蓋塗白 PDF 敏感背景內容)' : 'Whiteout redaction'}
          >
            <ShieldAlert className="w-4 h-4" />
            <span className="hidden lg:inline">{t('editor.tool.redaction')}</span>
          </button>

          <button
            id="open-sig-modal-btn"
            onClick={() => {
              confirmTextEditing();
              setIsSigModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all shadow-2xs cursor-pointer"
            title={language === 'zh' ? '插入電子簽名' : 'Insert E-Signature'}
          >
            <PenTool className="w-4 h-4" />
            <span>{t('editor.tool.signature')}</span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
            title={language === 'zh' ? '復原上一步 (Ctrl+Z)' : 'Undo (Ctrl+Z)'}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {selectedAnnotationIds.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-600 px-1">
                {language === 'zh' ? `已選 ${selectedAnnotationIds.length} 項` : `${selectedAnnotationIds.length} selected`}
              </span>
              <button
                onClick={handleDuplicateSelected}
                className="p-1 rounded text-slate-600 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                title={language === 'zh' ? '複製所選項' : 'Duplicate selection'}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title={language === 'zh' ? '刪除所選項 (Delete)' : 'Delete selection'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Center/Right: Zoom, Rotate & Export Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              title={t('editor.zoom.out')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-medium text-slate-700">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              title={t('editor.zoom.in')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRotatePage}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer"
            title={language === 'zh' ? '旋轉當前頁面 90 度 (文字與標註會一同旋轉)' : 'Rotate page 90 degrees'}
          >
            <RotateCw className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">{t('editor.pages.rotate')}</span>
          </button>

          <button
            id="export-edited-pdf-btn"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? t('editor.action.exporting') : t('editor.action.download')}</span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar for current active tool */}
      {activeTool === 'eraser' && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <Eraser className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-rose-900 mr-1.5">
                {language === 'zh' ? '橡皮擦模式：' : 'Eraser Mode:'}
              </span>
              <span className="text-rose-700">
                {language === 'zh'
                  ? '直接點擊或按住滑鼠劃過任何文字、手繪筆劃、螢光塗色、方框或白板遮色，即可直接擦除移除。'
                  : 'Click or drag over any text, drawing, highlight, shape or whiteout to delete it.'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm(language === 'zh' ? '確定要清除當前頁面上的所有手繪筆跡、標註與新增文字嗎？' : 'Are you sure you want to clear all annotations on this page?')) {
                setAnnotations((prev) =>
                  prev.filter(
                    (a) =>
                      a.pageInstanceId !== activePage.id &&
                      (a.pageInstanceId || a.pageNumber !== activePage.originalPageNumber)
                  )
                );
                setSelectedAnnotationIds([]);
                setEditingTextId(null);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '一鍵清空本頁所有手繪與標註' : 'Clear All Page Annotations'}</span>
          </button>
        </div>
      )}

      {(activeTool === 'text' || activeTool === 'pen' || activeTool === 'highlighter') && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3 flex flex-wrap items-center gap-4 text-xs">
          {activeTool === 'text' && (
            <>
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <span className="font-semibold text-blue-600">
                  {language === 'zh' ? '文字工具：' : 'Text Tool:'}
                </span>
                <span className="text-slate-500">
                  {language === 'zh'
                    ? '點擊 PDF 任意處輸入文字，按 Enter 或確定後即可完成'
                    : 'Click anywhere on the PDF to add text, press Enter or checkmark when done'}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">
                  {language === 'zh' ? '預設字級：' : 'Font Size:'}
                </span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={12}>12 px ({language === 'zh' ? '小' : 'Small'})</option>
                  <option value={14}>14 px ({language === 'zh' ? '標準' : 'Normal'})</option>
                  <option value={16}>16 px ({language === 'zh' ? '中' : 'Medium'})</option>
                  <option value={20}>20 px ({language === 'zh' ? '大' : 'Large'})</option>
                  <option value={24}>24 px ({language === 'zh' ? '特大' : 'XL'})</option>
                  <option value={32}>32 px ({language === 'zh' ? '標題' : 'Title'})</option>
                </select>
              </div>

              <button
                onClick={() => setIsBold(!isBold)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isBold ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                }`}
                title={language === 'zh' ? '粗體' : 'Bold'}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-medium">
                  {language === 'zh' ? '顏色：' : 'Color:'}
                </span>
                {[
                  { c: '#0f172a', name: language === 'zh' ? '黑色' : 'Black' },
                  { c: '#2563eb', name: language === 'zh' ? '藍色' : 'Blue' },
                  { c: '#dc2626', name: language === 'zh' ? '紅色' : 'Red' },
                  { c: '#16a34a', name: language === 'zh' ? '綠色' : 'Green' },
                  { c: '#d97706', name: language === 'zh' ? '橘黃' : 'Amber' },
                ].map((item) => (
                  <button
                    key={item.c}
                    onClick={() => setTextColor(item.c)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${textColor === item.c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: item.c }}
                    title={item.name}
                  />
                ))}
              </div>
            </>
          )}

          {activeTool === 'pen' && (
            <>
              <span className="font-semibold text-blue-600">
                {language === 'zh' ? '筆刷色彩：' : 'Pen Color:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { c: '#2563eb', name: language === 'zh' ? '藍色' : 'Blue' },
                  { c: '#0f172a', name: language === 'zh' ? '黑色' : 'Black' },
                  { c: '#dc2626', name: language === 'zh' ? '紅色' : 'Red' },
                  { c: '#16a34a', name: language === 'zh' ? '綠色' : 'Green' },
                  { c: '#9333ea', name: language === 'zh' ? '紫色' : 'Purple' },
                ].map((item) => (
                  <button
                    key={item.c}
                    onClick={() => setPenColor(item.c)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${penColor === item.c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: item.c }}
                    title={item.name}
                  />
                ))}
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">
                  {language === 'zh' ? `筆觸粗細 (${penWidth}px)：` : `Stroke (${penWidth}px):`}
                </span>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="w-24 accent-blue-600 cursor-pointer"
                />
              </div>
            </>
          )}

          {activeTool === 'highlighter' && (
            <>
              <span className="font-semibold text-blue-600">
                {language === 'zh' ? '螢光標註顏色：' : 'Highlighter Color:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { c: '#facc15', label: language === 'zh' ? '亮黃' : 'Yellow' },
                  { c: '#4ade80', label: language === 'zh' ? '翠綠' : 'Green' },
                  { c: '#38bdf8', label: language === 'zh' ? '天藍' : 'Sky Blue' },
                  { c: '#f472b6', label: language === 'zh' ? '粉紅' : 'Pink' },
                  { c: '#c084fc', label: language === 'zh' ? '淡紫' : 'Purple' },
                ].map((item) => (
                  <button
                    key={item.c}
                    onClick={() => setHighlighterColor(item.c)}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${highlighterColor === item.c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: item.c }}
                    title={item.label}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Thumbnails & Page Order Management Strip (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs max-h-[750px] overflow-y-auto space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              {language === 'zh' ? `版頁清單 (${pageList.length} 頁)` : `Pages (${pageList.length})`}
            </span>
            <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
              {t('editor.pages.reorderHint')}
            </span>
          </div>

          <div className="space-y-2.5">
            {pageList.map((pageItem, index) => {
              const isCurrent = activePageIndex === index;
              const isDragging = draggedPageIndex === index;
              const isDragOver = dragOverPageIndex === index && draggedPageIndex !== index;
              const rot = pageItem.rotation || 0;

              return (
                <div
                  key={pageItem.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedPageIndex(index);
                    e.dataTransfer.setData('text/plain', String(index));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverPageIndex !== index) {
                      setDragOverPageIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverPageIndex === index) {
                      setDragOverPageIndex(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedPageIndex !== null && draggedPageIndex !== index) {
                      handleMovePage(draggedPageIndex, index);
                    }
                    setDraggedPageIndex(null);
                    setDragOverPageIndex(null);
                  }}
                  onDragEnd={() => {
                    setDraggedPageIndex(null);
                    setDragOverPageIndex(null);
                  }}
                  onClick={() => {
                    confirmTextEditing();
                    setActivePageIndex(index);
                  }}
                  className={`relative group p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isDragging
                      ? 'opacity-40 border-dashed border-blue-400 bg-blue-50/30'
                      : isDragOver
                      ? 'border-2 border-blue-500 bg-blue-100/60 shadow-md scale-[1.02]'
                      : isCurrent
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs ring-1 ring-blue-400'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
                  }`}
                  title={t('editor.pages.dragTitle')}
                >
                  <div className="flex items-center gap-2">
                    {/* Drag Grip Handle */}
                    <div
                      className="text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 -ml-1 transition-colors shrink-0"
                      title={t('editor.pages.dragHandle')}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Thumbnail preview */}
                    <div
                      className="w-14 h-18 bg-white rounded border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 transition-transform shadow-2xs"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      {thumbnails[pageItem.id] ? (
                        <img
                          src={thumbnails[pageItem.id]}
                          alt={`Page ${index + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400">P.{pageItem.originalPageNumber}</span>
                      )}
                    </div>

                    {/* Meta & Actions */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {language === 'zh' ? `第 ${index + 1} 頁` : `Page ${index + 1}`}
                        </span>
                        {pageItem.originalPageNumber !== index + 1 && (
                          <span className="text-[9px] px-1 py-0.5 bg-slate-200/80 text-slate-600 rounded font-medium">
                            {language === 'zh' ? `原 P.${pageItem.originalPageNumber}` : `Orig P.${pageItem.originalPageNumber}`}
                          </span>
                        )}
                      </div>

                      {/* Clean Actions: Duplicate page, Delete page */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePage(index);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                          title={language === 'zh' ? '複製此版面 (獨立副本，修改不會相互影響)' : 'Duplicate page (independent copy)'}
                        >
                          <Plus className="w-3 h-3 text-emerald-600" />
                          <span>{t('editor.pages.duplicate')}</span>
                        </button>

                        {pageList.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(index);
                            }}
                            className="p-1 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
                            title={t('editor.pages.delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Interactive PDF Stage (9 cols) */}
        <div className="lg:col-span-9 bg-slate-200/70 rounded-2xl border border-slate-300/80 p-3 sm:p-6 flex items-center justify-center overflow-auto min-h-[620px] max-h-[780px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-semibold">
                {language === 'zh' ? '載入 PDF 渲染畫布中...' : 'Loading PDF preview canvas...'}
              </span>
            </div>
          ) : errorMessage ? (
            <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-sm max-w-md text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {language === 'zh' ? '無法預覽 PDF 文件' : 'Unable to preview PDF document'}
                </h3>
                <p className="text-xs text-slate-500">{errorMessage}</p>
              </div>
              <button
                onClick={onSelectAnotherFile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                {t('app.changeFile')}
              </button>
            </div>
          ) : (
            <div
              ref={overlayContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative bg-white shadow-xl rounded border border-slate-300 select-none overflow-hidden touch-none"
              style={{
                cursor:
                  activeTool === 'eraser'
                    ? 'crosshair'
                    : activeTool === 'select'
                    ? 'default'
                    : activeTool === 'pen' || activeTool === 'highlighter'
                    ? 'crosshair'
                    : activeTool === 'text'
                    ? 'text'
                    : 'crosshair',
              }}
            >
              {/* PDF Canvas Layer */}
              <canvas ref={canvasRef} className="block pointer-events-none" />

              {/* Marquee Range Selection Box */}
              {marqueeBox && (
                <div
                  className="absolute pointer-events-none z-30 bg-blue-500/15 border border-blue-500 rounded"
                  style={{
                    left: `${Math.min(marqueeBox.startX, marqueeBox.currentX)}%`,
                    top: `${Math.min(marqueeBox.startY, marqueeBox.currentY)}%`,
                    width: `${Math.abs(marqueeBox.currentX - marqueeBox.startX)}%`,
                    height: `${Math.abs(marqueeBox.currentY - marqueeBox.startY)}%`,
                  }}
                />
              )}

              {/* Live Drawing Stroke Preview (Pen / Highlighter) using numeric coordinates */}
              {isDrawingShape && (activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 0 && (
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-30">
                  <polyline
                    points={currentPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={activeTool === 'highlighter' ? highlighterColor : penColor}
                    strokeWidth={activeTool === 'highlighter' ? 14 : penWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={activeTool === 'highlighter' ? 0.4 : 1}
                  />
                </svg>
              )}

              {/* Live Shape Preview (Rectangle, Circle, Redaction) */}
              {isDrawingShape && shapeStart && shapeCurrent && (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'redaction') && (
                <div
                  className="absolute pointer-events-none z-30"
                  style={{
                    left: `${Math.min(shapeStart.x, shapeCurrent.x)}%`,
                    top: `${Math.min(shapeStart.y, shapeCurrent.y)}%`,
                    width: `${Math.abs(shapeCurrent.x - shapeStart.x)}%`,
                    height: `${Math.abs(shapeCurrent.y - shapeStart.y)}%`,
                    border: activeTool === 'redaction' ? '2px dashed #94a3b8' : `2px solid ${penColor}`,
                    backgroundColor: activeTool === 'redaction' ? 'rgba(255,255,255,0.95)' : 'transparent',
                    borderRadius: activeTool === 'circle' ? '9999px' : '2px',
                  }}
                />
              )}

              {/* Rendered Annotations Layer */}
              {currentAnnotations.map((ann) => {
                const isSelected = selectedAnnotationIds.includes(ann.id);
                const isEditingThisText = editingTextId === ann.id;

                // 1. Text Annotation (Canva Style Box)
                if (ann.type === 'text') {
                  if (isEditingThisText) {
                    return (
                      <div
                        key={ann.id}
                        className="absolute z-40 text-editor-box"
                        style={{
                          left: `${ann.x}%`,
                          top: `${ann.y}%`,
                          minWidth: `${Math.max(12, ann.width || 18)}%`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Floating Canva Tool Bar positioned absolutely above */}
                        <div
                          className={`absolute flex items-center gap-1.5 bg-slate-900/95 text-white px-2 py-1 rounded-xl shadow-lg text-xs whitespace-nowrap z-50 pointer-events-auto ${
                            ann.y < 9 ? 'top-full mt-2 left-0' : '-top-10 left-0'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const newSize = Math.max(10, ann.fontSize - 2);
                              setAnnotations((prev) =>
                                prev.map((a) => (a.id === ann.id ? { ...a, fontSize: newSize } : a))
                              );
                            }}
                            className="p-1 hover:bg-slate-800 rounded font-mono"
                            title={language === 'zh' ? '縮小字體' : 'Decrease font size'}
                          >
                            A-
                          </button>
                          <span className="font-semibold px-1 font-mono">{ann.fontSize}px</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newSize = Math.min(48, ann.fontSize + 2);
                              setAnnotations((prev) =>
                                prev.map((a) => (a.id === ann.id ? { ...a, fontSize: newSize } : a))
                              );
                            }}
                            className="p-1 hover:bg-slate-800 rounded font-mono"
                            title={language === 'zh' ? '放大字體' : 'Increase font size'}
                          >
                            A+
                          </button>
                          <div className="w-px h-3 bg-slate-700 mx-0.5" />
                          <button
                            type="button"
                            onClick={() => {
                              setAnnotations((prev) =>
                                prev.map((a) => (a.id === ann.id ? { ...a, bold: !a.bold } : a))
                              );
                            }}
                            className={`p-1 rounded font-bold ${ann.bold ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}
                            title={language === 'zh' ? '粗體' : 'Bold'}
                          >
                            B
                          </button>
                          <div className="w-px h-3 bg-slate-700 mx-0.5" />
                          <button
                            type="button"
                            onClick={() => {
                              confirmTextEditing();
                            }}
                            className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'zh' ? '確定' : 'Done'}</span>
                          </button>
                        </div>

                        {/* Canva editable text area with precise zero-offset alignment */}
                        <div className="relative border-2 border-blue-600 bg-white/95 rounded shadow-md px-1 py-0.5">
                          <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />

                          <textarea
                            ref={textInputRef}
                            value={ann.text}
                            rows={Math.max(1, (ann.text.match(/\n/g) || []).length + 1)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAnnotations((prev) =>
                                prev.map((a) => (a.id === ann.id ? { ...a, text: val } : a))
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                confirmTextEditing();
                              }
                            }}
                            placeholder={language === 'zh' ? '在此輸入文字...' : 'Type text here...'}
                            className="bg-transparent border-none outline-none resize-none p-0 font-medium w-full text-left leading-[1.3] block"
                            style={{
                              color: ann.color,
                              fontSize: `${ann.fontSize}px`,
                              fontWeight: ann.bold ? 'bold' : 'normal',
                              lineHeight: 1.3,
                              minHeight: `${ann.fontSize * 1.3}px`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Confirmed Text display
                  return (
                    <div
                      key={ann.id}
                      onPointerDown={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          eraseAtPoint(getRelativeCoords(e));
                          return;
                        }
                        startDragAnnotation(e, ann);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') {
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                          return;
                        }
                        if (e.shiftKey) {
                          setSelectedAnnotationIds((prev) =>
                            prev.includes(ann.id) ? prev.filter((id) => id !== ann.id) : [...prev, ann.id]
                          );
                        } else {
                          setSelectedAnnotationIds([ann.id]);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') return;
                        setSelectedAnnotationIds([ann.id]);
                        setEditingTextId(ann.id);
                      }}
                      className={`absolute z-20 group select-none whitespace-pre-wrap px-1 py-0.5 border-2 ${
                        activeTool === 'select' ? 'cursor-move' : ''
                      } ${
                        activeTool === 'eraser' ? 'hover:opacity-40 hover:border-rose-400 hover:bg-rose-50/40 cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/10 rounded'
                          : 'border-transparent'
                      }`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        color: ann.color,
                        fontSize: `${ann.fontSize}px`,
                        fontWeight: ann.bold ? 'bold' : 'normal',
                        lineHeight: 1.3,
                        pointerEvents: activeTool === 'select' || activeTool === 'text' || activeTool === 'eraser' ? 'auto' : 'none',
                      }}
                    >
                      {/* Canva Handles when selected */}
                      {isSelected && (
                        <>
                          <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-full" />
                          
                          {/* Canva Floating Action Bar */}
                          <div className="absolute -top-7 left-0 flex items-center gap-1 bg-slate-900/90 text-white px-1.5 py-0.5 rounded text-[10px] shadow-sm z-50 pointer-events-auto whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTextId(ann.id);
                              }}
                              className="p-1 hover:text-blue-300 action-toolbar-btn cursor-pointer"
                              title={language === 'zh' ? '編輯文字' : 'Edit text'}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateSelected();
                              }}
                              className="p-1 hover:text-blue-300 action-toolbar-btn cursor-pointer"
                              title={language === 'zh' ? '複製' : 'Duplicate'}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSelected();
                              }}
                              className="p-1 hover:text-red-300 action-toolbar-btn cursor-pointer"
                              title={language === 'zh' ? '刪除' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnnotationIds([]);
                              }}
                              className="p-1 hover:text-green-300 action-toolbar-btn cursor-pointer"
                              title={language === 'zh' ? '確定完成 (隱藏邊框)' : 'Done (hide border)'}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}

                      <span className="block bg-transparent leading-[1.3]">
                        {ann.text || ''}
                      </span>
                    </div>
                  );
                }

                // 2. Rectangle or Redaction (Whiteout)
                if (ann.type === 'rectangle' || ann.type === 'redaction') {
                  const isRedact = ann.type === 'redaction';
                  return (
                    <div
                      key={ann.id}
                      onPointerDown={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          eraseAtPoint(getRelativeCoords(e));
                          return;
                        }
                        startDragAnnotation(e, ann);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') {
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                          return;
                        }
                        if (e.shiftKey) {
                          setSelectedAnnotationIds((prev) =>
                            prev.includes(ann.id) ? prev.filter((id) => id !== ann.id) : [...prev, ann.id]
                          );
                        } else {
                          setSelectedAnnotationIds([ann.id]);
                        }
                      }}
                      className={`absolute z-15 ${
                        activeTool === 'select' ? 'cursor-move' : ''
                      } ${
                        activeTool === 'eraser' ? 'hover:opacity-40 hover:ring-2 hover:ring-rose-400 cursor-pointer' : ''
                      } ${isSelected ? 'ring-2 ring-blue-500 rounded' : ''}`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        backgroundColor: isRedact ? '#ffffff' : ann.fillColor || 'transparent',
                        border: isRedact ? '1px dashed #e2e8f0' : `${ann.strokeWidth || 2}px solid ${ann.color}`,
                        opacity: ann.opacity ?? 1,
                        pointerEvents: activeTool === 'select' || activeTool === 'eraser' ? 'auto' : 'none',
                      }}
                    />
                  );
                }

                // 3. Circle
                if (ann.type === 'circle') {
                  return (
                    <div
                      key={ann.id}
                      onPointerDown={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          eraseAtPoint(getRelativeCoords(e));
                          return;
                        }
                        startDragAnnotation(e, ann);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') {
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                          return;
                        }
                        if (e.shiftKey) {
                          setSelectedAnnotationIds((prev) =>
                            prev.includes(ann.id) ? prev.filter((id) => id !== ann.id) : [...prev, ann.id]
                          );
                        } else {
                          setSelectedAnnotationIds([ann.id]);
                        }
                      }}
                      className={`absolute z-15 rounded-full ${
                        activeTool === 'select' ? 'cursor-move' : ''
                      } ${
                        activeTool === 'eraser' ? 'hover:opacity-40 hover:ring-2 hover:ring-rose-400 cursor-pointer' : ''
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        backgroundColor: ann.fillColor || 'transparent',
                        border: `${ann.strokeWidth || 2}px solid ${ann.color}`,
                        opacity: ann.opacity ?? 1,
                        pointerEvents: activeTool === 'select' || activeTool === 'eraser' ? 'auto' : 'none',
                      }}
                    />
                  );
                }

                // 4. Freehand Pen / Drawing or Highlighter
                if (ann.type === 'drawing' || ann.type === 'highlight') {
                  return (
                    <svg
                      key={ann.id}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      onClick={(e) => {
                        if (activeTool === 'select') {
                          e.stopPropagation();
                          setSelectedAnnotationIds([ann.id]);
                        } else if (activeTool === 'eraser') {
                          e.stopPropagation();
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                        }
                      }}
                      className={`absolute inset-0 w-full h-full z-10 ${
                        activeTool === 'select' || activeTool === 'eraser' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                      }`}
                    >
                      <polyline
                        points={ann.points.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        opacity={ann.opacity ?? 1}
                        className={`${isSelected ? 'stroke-blue-500 filter drop-shadow' : ''} ${activeTool === 'eraser' ? 'hover:opacity-30' : ''}`}
                      />
                    </svg>
                  );
                }

                // 5. Signature Annotation
                if (ann.type === 'signature') {
                  return (
                    <div
                      key={ann.id}
                      onPointerDown={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          eraseAtPoint(getRelativeCoords(e));
                          return;
                        }
                        startDragAnnotation(e, ann);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') {
                          setAnnotations((prev) => prev.filter((a) => a.id !== ann.id));
                          return;
                        }
                        if (e.shiftKey) {
                          setSelectedAnnotationIds((prev) =>
                            prev.includes(ann.id) ? prev.filter((id) => id !== ann.id) : [...prev, ann.id]
                          );
                        } else {
                          setSelectedAnnotationIds([ann.id]);
                        }
                      }}
                      className={`absolute z-20 p-1 select-none flex flex-col items-center ${
                        activeTool === 'select' ? 'cursor-move' : ''
                      } ${
                        activeTool === 'eraser' ? 'hover:opacity-40 hover:ring-2 hover:ring-rose-400 cursor-pointer' : ''
                      } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20 rounded-lg' : ''}`}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        pointerEvents: activeTool === 'select' || activeTool === 'eraser' ? 'auto' : 'none',
                      }}
                    >
                      <img
                        src={ann.signatureDataUrl}
                        alt="Signature"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                      {(ann.signerName || ann.signedDate) && (
                        <span className="text-[9px] text-slate-500 font-mono tracking-tight bg-white/80 px-1 rounded -mt-1">
                          {ann.signerName} {ann.signedDate && `· ${ann.signedDate}`}
                        </span>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {isSigModalOpen && (
        <SignatureModal
          isOpen={isSigModalOpen}
          onClose={() => setIsSigModalOpen(false)}
          onConfirm={(sigDataUrl, name) => {
            setIsSigModalOpen(false);
            addSignatureAnnotation(sigDataUrl, name);
          }}
        />
      )}
    </div>
  );
};
