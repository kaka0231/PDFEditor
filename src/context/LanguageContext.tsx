import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'zh' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

export const translations = {
  zh: {
    // Header & Brand
    'app.title': 'PDFEditor',
    'app.badge': '萬能文件中心',
    'app.subtitle': 'PDF / Word 互轉 · 線上標註編輯 · 電子簽名 · 頁面排序複製 · 相片轉 PDF',
    'app.activeFile': '當前文件',
    'app.changeFile': '更換文件',
    'app.langZh': '繁體中文',
    'app.langEn': 'English',
    'app.toggleLangTitle': '切換語言 (中/EN)',

    // Tools Nav
    'tool.pdfEditor': 'PDF 編輯標註',
    'tool.pdfEditor.desc': '增添文字、線條、電子簽名、白板遮色、頁面排序與複製',
    'tool.pdfEditor.badge': '全能編輯',

    'tool.pdfToWord': 'PDF 轉 Word',
    'tool.pdfToWord.desc': '精確解析文本與結構轉為 DOCX',
    'tool.pdfToWord.badge': '高精度',

    'tool.wordToPdf': 'Word 轉 PDF',
    'tool.wordToPdf.desc': 'DOCX 排版預覽並導出標準 PDF / PDF/A',
    'tool.wordToPdf.badge': '排版保真',

    'tool.imageToPdf': '相片轉 PDF',
    'tool.imageToPdf.desc': '相片批量掃描增強、合併導出',
    'tool.imageToPdf.badge': '相片掃描',

    // Dropzone
    'dropzone.dragPrompt': '選擇檔案或拖曳至此',
    'dropzone.security': '用戶端安全處理 · 隱私保護',
    'dropzone.largeFiles': '支援大文件快速解析',
    'dropzone.quickDemo': '快速體驗',
    'dropzone.noFilePrompt': '沒有準備文件？點擊右側按鈕立即載入內建模擬示範檔案測試：',

    'dropzone.pdfEditor.title': '上傳 PDF 開始線上編輯與標註',
    'dropzone.pdfEditor.subtitle': '支援文字框、手繪筆刷、螢光標註、電子簽名、白板遮色、拖曳換頁與複製',
    'dropzone.pdfEditor.sample': '載入示範申請表格 (PDF)',

    'dropzone.pdfToWord.title': '上傳 PDF 文件以轉換為 Word (.docx)',
    'dropzone.pdfToWord.subtitle': '支援精確保留文字結構、段落排版、表格與清單格式',
    'dropzone.pdfToWord.sample': '載入示範商務合約 (PDF)',

    'dropzone.wordToPdf.title': '上傳 Word (.docx) 文件以轉換為 PDF',
    'dropzone.wordToPdf.subtitle': '支援預覽 DOCX 排版樣式，自訂邊距與 ISO 19005 PDF/A 封存規範導出',
    'dropzone.wordToPdf.sample': '載入示範報告文檔 (DOCX)',

    'dropzone.imageToPdf.title': '上傳一張或多張相片/掃描件轉為 PDF',
    'dropzone.imageToPdf.subtitle': '支援多張圖片智慧文件掃描儀濾鏡、黑白增強與自訂 A4/Letter 邊距導出',
    'dropzone.imageToPdf.sample': '載入示範收據與照片 (Images)',

    // PDF Editor Toolbar & Canvas
    'editor.tool.select': '選取 / 移動',
    'editor.tool.text': '文字框',
    'editor.tool.pen': '手繪筆刷',
    'editor.tool.highlighter': '螢光筆',
    'editor.tool.eraser': '擦布',
    'editor.tool.rect': '矩形框',
    'editor.tool.circle': '圓形框',
    'editor.tool.redaction': '白板遮色',
    'editor.tool.signature': '電子簽名',
    'editor.tool.watermark': '浮水印',

    'editor.pages.title': '版頁清單',
    'editor.pages.reorderHint': '可拖曳換頁',
    'editor.pages.duplicate': '複製此頁',
    'editor.pages.delete': '刪除此頁',
    'editor.pages.rotate': '旋轉 90°',
    'editor.pages.dragTitle': '可按住並上下拖曳直接調整頁面排列順序',
    'editor.pages.dragHandle': '按住拖曳換頁',
    'editor.pages.page': '第 {n} 頁',

    'editor.zoom.in': '放大',
    'editor.zoom.out': '縮小',
    'editor.zoom.fit': '適應寬度',
    'editor.zoom.actual': '100%',
    'editor.action.undo': '還原',
    'editor.action.redo': '重做',
    'editor.action.clearAnnotations': '清除所有標註',
    'editor.action.download': '導出並下載 PDF',
    'editor.action.exporting': '正在導出 PDF...',
    'editor.action.changeFile': '更換檔案',

    'editor.style.color': '顏色',
    'editor.style.size': '字級大小',
    'editor.style.strokeWidth': '筆刷粗細',
    'editor.style.opacity': '不透明度',
    'editor.style.bold': '粗體',
    'editor.style.deleteSelected': '刪除選取物件',
    'editor.style.duplicateSelected': '複製選取物件',

    // PDF to Word Tool
    'pdfToWord.title': 'PDF 轉換中心',
    'pdfToWord.readyBadge': '就緒可轉',
    'pdfToWord.totalInfo': '共 {pages} 頁 · 可自由切換導出為 .docx、.txt、.md、.rtf 等多種格式',
    'pdfToWord.formatLabel': '格式',
    'pdfToWord.selectFormat': '選擇文件導出格式',
    'pdfToWord.downloadBtn': '導出為 {ext} 檔',
    'pdfToWord.downloadDocx': '下載 Word (.docx) 檔',
    'pdfToWord.exporting': '正在轉換導出...',
    'pdfToWord.tabPreview': '單頁排版視圖 (第 {page} 頁)',
    'pdfToWord.tabFullText': '全文提取純文字',
    'pdfToWord.copyAll': '複製全部文字',
    'pdfToWord.copied': '已複製！',
    'pdfToWord.quickSwitch': '導出格式切換：',
    'pdfToWord.docxFeature': '已自動對齊 DOCX 段落樣式、標題階層與換行',
    'pdfToWord.txtFeature': '已清理格式雜訊，輸出標準 UTF-8 純文字檔 (含 BOM)',
    'pdfToWord.mdFeature': '已轉為 Markdown 標題 (#/##) 與列表標記語法',
    'pdfToWord.rtfFeature': '已封裝標準 Rich Text Format，相容各類文字軟體',
    'pdfToWord.downloadNow': '立即下載 {ext}',

    // Word to PDF Tool
    'wordToPdf.title': 'Word 轉 PDF 排版中心',
    'wordToPdf.readyBadge': '解析完成',
    'wordToPdf.totalInfo': '可自訂 PDF/A 封存標準、標準 PDF、純文字或 HTML，靈活滿足歸檔與分享需求',
    'wordToPdf.standardLabel': '標準',
    'wordToPdf.selectStandard': '選擇導出標準與格式',
    'wordToPdf.layoutSettings': '導出格式與版面設定',
    'wordToPdf.formatAndStd': '導出格式 / 國際標準規範',
    'wordToPdf.pdfaSupport': '支援 PDF/A 封存',
    'wordToPdf.pageSize': '紙張規格 (Page Size)',
    'wordToPdf.margins': '頁面邊距 (Margins)',
    'wordToPdf.marginNormal': '標準 (20mm)',
    'wordToPdf.marginNarrow': '窄邊 (10mm)',
    'wordToPdf.marginWide': '寬邊 (30mm)',
    'wordToPdf.headerText': '自訂頁眉標題 (Header Text)',
    'wordToPdf.pageNumbers': '頁腳顯示頁碼 (Page Numbers)',
    'wordToPdf.downloadPdf': '導出轉換為 PDF 檔',
    'wordToPdf.downloadPdfa1': '導出為 PDF/A-1b 封存檔',
    'wordToPdf.downloadPdfa2': '導出為 PDF/A-2b 封存檔',
    'wordToPdf.downloadTxt': '導出為純文字檔 (.txt)',
    'wordToPdf.downloadHtml': '導出為獨立網頁 (.html)',
    'wordToPdf.downloadNow': '立即轉換並下載 {ext}',
    'wordToPdf.previewTitle': '排版預覽視圖',
    'wordToPdf.pdfaBannerTitle': '已啟用 ISO 19005 長期數位保存規範 (Archival Standard)',
    'wordToPdf.pdfaBannerDesc': '系統將自動寫入 Device-Independent sRGB 色彩輸出意圖字典 (GTS_PDFA1) 與 XMP 歸檔元數據標記，確保未來 20 年在任意系統中無損重現。',

    // Image to PDF Tool
    'imageToPdf.title': '相片轉 PDF 合併中心',
    'imageToPdf.readyBadge': '就緒',
    'imageToPdf.subtitle': '共 {count} 張相片 · 支援多張旋轉、掃描增強濾鏡與版面排版',
    'imageToPdf.addMore': '新增相片',
    'imageToPdf.downloadBtn': '合併導出為 PDF',
    'imageToPdf.exporting': '正在生成 PDF...',
    'imageToPdf.filterNone': '原圖',
    'imageToPdf.filterScan': '智慧掃描',
    'imageToPdf.filterGrayscale': '黑白文件',
    'imageToPdf.filterContrast': '高對比',
    'imageToPdf.applyAll': '套用至全部',
    'imageToPdf.paperSize': '紙張規格',
    'imageToPdf.orientation': '紙張方向',
    'imageToPdf.orientAuto': '自動最適',
    'imageToPdf.orientPortrait': '直式 (Portrait)',
    'imageToPdf.orientLandscape': '橫式 (Landscape)',

    // Signature Modal
    'sig.title': '新增手寫電子簽名',
    'sig.subtitle': '直接在下方手寫板簽名，將自動去背並轉換為透明向量印記',
    'sig.penColor': '筆跡顏色',
    'sig.strokeWidth': '筆跡粗細',
    'sig.clear': '清除重寫',
    'sig.cancel': '取消',
    'sig.confirm': '確認套用簽名',
    'sig.hint': '支援滑鼠、觸控筆與觸控螢幕手寫',

    // Footer
    'footer.desc': 'DocuMaster 萬能文件整合中心 · 支援 PDF/Word 互轉、標註編輯、電子簽名與相片掃描轉 PDF',
    'footer.security': '用戶端安全解析 · 無數據留存',
  },
  en: {
    // Header & Brand
    'app.title': 'PDFEditor',
    'app.badge': 'Universal Document Suite',
    'app.subtitle': 'PDF / Word Conversion · Online Annotation & Editor · E-Signature · Page Reorder · Images to PDF',
    'app.activeFile': 'Active File',
    'app.changeFile': 'Change File',
    'app.langZh': '繁體中文',
    'app.langEn': 'English',
    'app.toggleLangTitle': 'Toggle Language (ZH/EN)',

    // Tools Nav
    'tool.pdfEditor': 'PDF Editor',
    'tool.pdfEditor.desc': 'Add text, freehand brush, e-signature, redaction, page reordering & duplication',
    'tool.pdfEditor.badge': 'All-in-One',

    'tool.pdfToWord': 'PDF to Word',
    'tool.pdfToWord.desc': 'Accurate text extraction & structural formatting into DOCX',
    'tool.pdfToWord.badge': 'High Precision',

    'tool.wordToPdf': 'Word to PDF',
    'tool.wordToPdf.desc': 'Preview DOCX layout & export to Standard PDF / ISO PDF/A',
    'tool.wordToPdf.badge': 'Layout Fidelity',

    'tool.imageToPdf': 'Images to PDF',
    'tool.imageToPdf.desc': 'Batch image scanner enhancement & merge export',
    'tool.imageToPdf.badge': 'Scanner',

    // Dropzone
    'dropzone.dragPrompt': 'Choose files or drag & drop here',
    'dropzone.security': 'Client-Side Safe Processing · Privacy Guaranteed',
    'dropzone.largeFiles': 'Fast Large File Parsing',
    'dropzone.quickDemo': 'Quick Demo',
    'dropzone.noFilePrompt': 'No files on hand? Click the demo button to test with built-in sample document:',

    'dropzone.pdfEditor.title': 'Upload PDF to Edit & Annotate Online',
    'dropzone.pdfEditor.subtitle': 'Supports text boxes, freehand pen, highlighter, e-signatures, whiteout redaction, drag reorder & clone',
    'dropzone.pdfEditor.sample': 'Load Sample Form (PDF)',

    'dropzone.pdfToWord.title': 'Upload PDF to Convert to Word (.docx)',
    'dropzone.pdfToWord.subtitle': 'Preserves text hierarchy, paragraph margins, tables and bullet lists',
    'dropzone.pdfToWord.sample': 'Load Sample Contract (PDF)',

    'dropzone.wordToPdf.title': 'Upload Word (.docx) to Convert to PDF',
    'dropzone.wordToPdf.subtitle': 'Preview document layout, customize margins and export to ISO 19005 PDF/A',
    'dropzone.wordToPdf.sample': 'Load Sample Report (DOCX)',

    'dropzone.imageToPdf.title': 'Upload Image(s) / Scans to Convert to PDF',
    'dropzone.imageToPdf.subtitle': 'Smart document scanner filters, B&W enhancement and custom A4/Letter margins',
    'dropzone.imageToPdf.sample': 'Load Sample Receipt & Photos (Images)',

    // PDF Editor Toolbar & Canvas
    'editor.tool.select': 'Select / Move',
    'editor.tool.text': 'Text Box',
    'editor.tool.pen': 'Pen Brush',
    'editor.tool.highlighter': 'Highlighter',
    'editor.tool.eraser': 'Eraser',
    'editor.tool.rect': 'Rectangle',
    'editor.tool.circle': 'Circle',
    'editor.tool.redaction': 'Whiteout',
    'editor.tool.signature': 'E-Signature',
    'editor.tool.watermark': 'Watermark',

    'editor.pages.title': 'Pages',
    'editor.pages.reorderHint': 'Drag to reorder',
    'editor.pages.duplicate': 'Duplicate Page',
    'editor.pages.delete': 'Delete Page',
    'editor.pages.rotate': 'Rotate 90°',
    'editor.pages.dragTitle': 'Click and drag up/down to rearrange page order',
    'editor.pages.dragHandle': 'Drag to reorder',
    'editor.pages.page': 'Page {n}',

    'editor.zoom.in': 'Zoom In',
    'editor.zoom.out': 'Zoom Out',
    'editor.zoom.fit': 'Fit Width',
    'editor.zoom.actual': '100%',
    'editor.action.undo': 'Undo',
    'editor.action.redo': 'Redo',
    'editor.action.clearAnnotations': 'Clear Annotations',
    'editor.action.download': 'Export & Download PDF',
    'editor.action.exporting': 'Exporting PDF...',
    'editor.action.changeFile': 'Change File',

    'editor.style.color': 'Color',
    'editor.style.size': 'Font Size',
    'editor.style.strokeWidth': 'Stroke Width',
    'editor.style.opacity': 'Opacity',
    'editor.style.bold': 'Bold',
    'editor.style.deleteSelected': 'Delete Selected',
    'editor.style.duplicateSelected': 'Duplicate Selected',

    // PDF to Word Tool
    'pdfToWord.title': 'PDF Conversion Suite',
    'pdfToWord.readyBadge': 'Ready',
    'pdfToWord.totalInfo': '{pages} pages total · Choose export format: .docx, .txt, .md, .rtf',
    'pdfToWord.formatLabel': 'Format',
    'pdfToWord.selectFormat': 'Select Export Format',
    'pdfToWord.downloadBtn': 'Export as {ext}',
    'pdfToWord.downloadDocx': 'Download Word (.docx)',
    'pdfToWord.exporting': 'Converting & Exporting...',
    'pdfToWord.tabPreview': 'Page Layout View (Page {page})',
    'pdfToWord.tabFullText': 'Full Extracted Text',
    'pdfToWord.copyAll': 'Copy All Text',
    'pdfToWord.copied': 'Copied!',
    'pdfToWord.quickSwitch': 'Quick Format Switch:',
    'pdfToWord.docxFeature': 'Automatically aligned DOCX headings, margins and paragraphs',
    'pdfToWord.txtFeature': 'Noise-free UTF-8 text with BOM for broad compatibility',
    'pdfToWord.mdFeature': 'Formatted Markdown headings (#/##) and bullet lists',
    'pdfToWord.rtfFeature': 'Rich Text Format (.rtf) compatible with cross-platform editors',
    'pdfToWord.downloadNow': 'Download {ext} Now',

    // Word to PDF Tool
    'wordToPdf.title': 'Word to PDF Conversion',
    'wordToPdf.readyBadge': 'Parsed',
    'wordToPdf.totalInfo': 'Customizable PDF/A archival standards, standard PDF, plain text or HTML',
    'wordToPdf.standardLabel': 'Standard',
    'wordToPdf.selectStandard': 'Select Export Standard & Format',
    'wordToPdf.layoutSettings': 'Format & Layout Settings',
    'wordToPdf.formatAndStd': 'Export Format / ISO Standard',
    'wordToPdf.pdfaSupport': 'PDF/A Archival Supported',
    'wordToPdf.pageSize': 'Page Size',
    'wordToPdf.margins': 'Margins',
    'wordToPdf.marginNormal': 'Normal (20mm)',
    'wordToPdf.marginNarrow': 'Narrow (10mm)',
    'wordToPdf.marginWide': 'Wide (30mm)',
    'wordToPdf.headerText': 'Header Text',
    'wordToPdf.pageNumbers': 'Footer Page Numbers',
    'wordToPdf.downloadPdf': 'Export to Standard PDF',
    'wordToPdf.downloadPdfa1': 'Export to PDF/A-1b Archival',
    'wordToPdf.downloadPdfa2': 'Export to PDF/A-2b Archival',
    'wordToPdf.downloadTxt': 'Export as Plain Text (.txt)',
    'wordToPdf.downloadHtml': 'Export as Webpage (.html)',
    'wordToPdf.downloadNow': 'Convert & Download {ext}',
    'wordToPdf.previewTitle': 'Layout Preview',
    'wordToPdf.pdfaBannerTitle': 'ISO 19005 Long-Term Archival Standard Enabled',
    'wordToPdf.pdfaBannerDesc': 'Device-independent sRGB OutputIntent dictionary (GTS_PDFA1) & XMP metadata embedded for 20+ year preservation.',

    // Image to PDF Tool
    'imageToPdf.title': 'Images to PDF Suite',
    'imageToPdf.readyBadge': 'Ready',
    'imageToPdf.subtitle': '{count} images total · Supports rotation, scanner filters and custom layout',
    'imageToPdf.addMore': 'Add More Images',
    'imageToPdf.downloadBtn': 'Merge & Export PDF',
    'imageToPdf.exporting': 'Generating PDF...',
    'imageToPdf.filterNone': 'Original',
    'imageToPdf.filterScan': 'Smart Scan',
    'imageToPdf.filterGrayscale': 'Grayscale',
    'imageToPdf.filterContrast': 'High Contrast',
    'imageToPdf.applyAll': 'Apply to All',
    'imageToPdf.paperSize': 'Paper Size',
    'imageToPdf.orientation': 'Orientation',
    'imageToPdf.orientAuto': 'Auto Fit',
    'imageToPdf.orientPortrait': 'Portrait',
    'imageToPdf.orientLandscape': 'Landscape',

    // Signature Modal
    'sig.title': 'Add E-Signature',
    'sig.subtitle': 'Draw your signature on the pad below; transparent vector stamp created automatically',
    'sig.penColor': 'Ink Color',
    'sig.strokeWidth': 'Stroke Width',
    'sig.clear': 'Clear & Redraw',
    'sig.cancel': 'Cancel',
    'sig.confirm': 'Apply Signature',
    'sig.hint': 'Supports mouse, stylus and touch screens',

    // Footer
    'footer.desc': 'DocuMaster Universal Document Suite · PDF/Word Conversion, Annotation, E-Sign & Scanner',
    'footer.security': 'Client-Side Safe Processing · No Data Retained',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'zh',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to 'zh' (Traditional Chinese) as requested: "增加一個中英文切換的按鈕 預設中文"
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('documaster_lang');
      if (saved === 'zh' || saved === 'en') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('documaster_lang', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations.zh;
    return (dict as any)[key] || (translations.zh as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  return useContext(LanguageContext);
};
