import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  FileCheck2,
  FileCode,
  Layers,
  ArrowRight,
  ChevronDown,
  AlignLeft,
  FileType,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocumentFile, PdfToWordExportFormat } from '../types';
import { extractTextFromPdf, loadPdfWithPdfJs, renderPageThumbnail } from '../utils/pdfUtils';
import { 
  generateDocxFromText, 
  generateTxtBlob, 
  generateMarkdownBlob, 
  generateRtfBlob 
} from '../utils/docxUtils';
import { useLanguage } from '../context/LanguageContext';

interface PdfToWordToolProps {
  file: DocumentFile;
  onSelectAnotherFile: () => void;
  onOpenAiAssistant?: (text: string) => void;
}

interface FormatOption {
  id: PdfToWordExportFormat;
  name: string;
  ext: string;
  badge: string;
  badgeColor: string;
  desc: string;
  icon: React.ElementType;
}

export const PdfToWordTool: React.FC<PdfToWordToolProps> = ({
  file,
  onSelectAnotherFile,
  onOpenAiAssistant,
}) => {
  const { t, language } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(true);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [fullText, setFullText] = useState('');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'preview' | 'text'>('preview');

  const FORMAT_OPTIONS: FormatOption[] = [
    {
      id: 'docx',
      name: language === 'zh' ? 'Word 文檔 (.docx)' : 'Word Document (.docx)',
      ext: '.docx',
      badge: language === 'zh' ? '推薦首選' : 'Recommended',
      badgeColor: 'bg-blue-100 text-blue-700',
      desc: language === 'zh'
        ? '保留標題階層、段落邊距、換行與分頁結構，可在 Office 與 Google Docs 編輯'
        : 'Preserves headings, margins, line breaks and pagination; editable in Office & Google Docs',
      icon: FileText,
    },
    {
      id: 'txt',
      name: language === 'zh' ? '純文字檔 (.txt)' : 'Plain Text (.txt)',
      ext: '.txt',
      badge: language === 'zh' ? '無格式 UTF-8' : 'Plain UTF-8',
      badgeColor: 'bg-slate-100 text-slate-700',
      desc: language === 'zh'
        ? 'UTF-8 編碼純文字內容，附帶 BOM 防止亂碼，適合程式處理、筆記與備忘錄'
        : 'Clean UTF-8 text with BOM to prevent garbled text; ideal for notes and text processing',
      icon: AlignLeft,
    },
    {
      id: 'md',
      name: language === 'zh' ? 'Markdown 檔 (.md)' : 'Markdown File (.md)',
      ext: '.md',
      badge: language === 'zh' ? '結構化標記' : 'Structured',
      badgeColor: 'bg-purple-100 text-purple-700',
      desc: language === 'zh'
        ? '自動轉譯為 Markdown 標題 (#/##)、清單與分隔線，適合 Notion、Obsidian'
        : 'Converts to Markdown headings (#/##), bullet lists and rules for Notion & Obsidian',
      icon: FileCode,
    },
    {
      id: 'rtf',
      name: language === 'zh' ? '富文本格式 (.rtf)' : 'Rich Text Format (.rtf)',
      ext: '.rtf',
      badge: language === 'zh' ? '廣泛相容' : 'Compatible',
      badgeColor: 'bg-amber-100 text-amber-700',
      desc: language === 'zh'
        ? 'Rich Text Format 通用文字格式，相容於各類跨平台文字處理器與閱讀軟體'
        : 'Universal Rich Text Format compatible across multiple word processors and platforms',
      icon: FileCheck,
    },
  ];

  // Format selection state
  const [exportFormat, setExportFormat] = useState<PdfToWordExportFormat>('docx');
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFormatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function processPdf() {
      if (!file.arrayBuffer) return;
      setIsProcessing(true);
      try {
        const { pdfJsDoc, pageCount } = await loadPdfWithPdfJs(file.arrayBuffer);
        const { fullText: extractedFull, pageTexts: extractedPages } = await extractTextFromPdf(pdfJsDoc);

        // Generate thumbnails
        const thumbs: string[] = [];
        for (let i = 1; i <= Math.min(pageCount, 12); i++) {
          const thumb = await renderPageThumbnail(pdfJsDoc, i, 0.4);
          thumbs.push(thumb);
        }

        if (isMounted) {
          setPageTexts(extractedPages);
          setFullText(extractedFull);
          setThumbnails(thumbs);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Failed to parse PDF for Word conversion:', err);
        if (isMounted) setIsProcessing(false);
      }
    }

    processPdf();
    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const baseFilename = file.name.replace(/\.pdf$/i, '');
      let blob: Blob;
      let downloadName = '';

      if (exportFormat === 'docx') {
        blob = await generateDocxFromText(
          pageTexts.length > 0 ? pageTexts : [fullText || 'No text extracted'],
          file.name
        );
        downloadName = `${baseFilename}.docx`;
      } else if (exportFormat === 'txt') {
        blob = generateTxtBlob(fullText || '（無純文字內容）');
        downloadName = `${baseFilename}.txt`;
      } else if (exportFormat === 'md') {
        blob = generateMarkdownBlob(
          pageTexts.length > 0 ? pageTexts : [fullText || 'No text extracted'],
          file.name
        );
        downloadName = `${baseFilename}.md`;
      } else {
        // rtf
        blob = generateRtfBlob(fullText || 'No text extracted', file.name);
        downloadName = `${baseFilename}.rtf`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error(`Failed to export document in ${exportFormat} format:`, err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFormatObj = FORMAT_OPTIONS.find(f => f.id === exportFormat) || FORMAT_OPTIONS[0];
  const FormatIcon = activeFormatObj.icon;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'zh'
                ? `共 ${pageTexts.length || file.pageCount || 1} 頁 · 可自由切換導出為 .docx、.txt、.md、.rtf 等多種格式`
                : `${pageTexts.length || file.pageCount || 1} pages · Multiple export formats supported`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onSelectAnotherFile}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {t('editor.action.changeFile')}
          </button>

          {onOpenAiAssistant && (
            <button
              onClick={() => onOpenAiAssistant(fullText)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? 'AI 智慧分析' : 'AI Analysis'}</span>
            </button>
          )}

          {/* Format Selection Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="export-format-dropdown-btn"
              onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title={language === 'zh' ? '點擊切換導出格式' : 'Switch export format'}
            >
              <FormatIcon className="w-4 h-4 text-blue-600" />
              <span>{language === 'zh' ? '格式：' : 'Format: '}{activeFormatObj.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isFormatDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFormatDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  {t('pdfToWord.selectFormat')}
                </div>
                <div className="p-1 space-y-1">
                  {FORMAT_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected = exportFormat === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setExportFormat(opt.id);
                          setIsFormatDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-blue-50/80 border border-blue-200 text-blue-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <OptIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{opt.name}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${opt.badgeColor}`}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-normal">
                            {opt.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Download CTA Button */}
          <button
            id="download-converted-btn"
            onClick={handleDownload}
            disabled={isProcessing || isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{language === 'zh' ? `導出為 ${activeFormatObj.ext} 檔` : `Export as ${activeFormatObj.ext}`}</span>
          </button>
        </div>
      </div>

      {isProcessing ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">
            {language === 'zh' ? '正在解析 PDF 頁面結構與文字流...' : 'Analyzing PDF structure and text flow...'}
          </p>
          <p className="text-xs text-slate-400">
            {language === 'zh' ? '提取標題、段落、清單與頁面佈局中' : 'Extracting headings, paragraphs, lists and layout'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Page thumbnails & preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  {language === 'zh' ? 'PDF 原文頁面預覽' : 'Original PDF Preview'}
                </span>
                <span className="text-xs text-slate-400">
                  {language === 'zh' ? `第 ${currentPage} / ${thumbnails.length} 頁` : `Page ${currentPage} of ${thumbnails.length}`}
                </span>
              </div>

              {/* Main thumbnail preview */}
              {thumbnails[currentPage - 1] && (
                <div className="relative aspect-[1/1.414] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-2xs flex items-center justify-center p-2">
                  <img
                    src={thumbnails[currentPage - 1]}
                    alt={`Page ${currentPage}`}
                    className="max-h-full max-w-full object-contain shadow-xs rounded"
                  />
                </div>
              )}

              {/* Page navigator */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  title={language === 'zh' ? '上一頁' : 'Previous page'}
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="flex gap-1 overflow-x-auto max-w-[220px] py-1 scrollbar-none">
                  {thumbnails.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-6 h-6 rounded text-xs font-medium transition-all cursor-pointer ${
                        currentPage === idx + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(thumbnails.length, p + 1))}
                  disabled={currentPage >= thumbnails.length}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                  title={language === 'zh' ? '下一頁' : 'Next page'}
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Word DOCX / Text structured view & actions (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col h-[580px]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveViewTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeViewTab === 'preview'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'zh' ? `當前頁提取文字 (第 ${currentPage} 頁)` : `Current Page Text (P.${currentPage})`}
                  </button>
                  <button
                    onClick={() => setActiveViewTab('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeViewTab === 'text'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'zh' ? '全部頁面文字' : 'All Pages Text'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copied ? t('pdfToWord.copied') : t('pdfToWord.copyAll')}</span>
                  </button>
                </div>
              </div>

              {/* Quick Format Selection Bar */}
              <div className="py-2.5 px-3 my-2 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <FormatIcon className="w-3.5 h-3.5 text-blue-600" />
                  {t('pdfToWord.quickSwitch')}
                </span>
                <div className="flex items-center gap-1.5">
                  {FORMAT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setExportFormat(opt.id)}
                      className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                        exportFormat === opt.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                      }`}
                    >
                      {opt.ext}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text content area */}
              <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                {activeViewTab === 'preview'
                  ? pageTexts[currentPage - 1] || (language === 'zh' ? '（本頁無純文字或為純圖片/掃描檔）' : '(No pure text on this page or scanned file)')
                  : fullText || (language === 'zh' ? '（未提取到文字）' : '(No text extracted)')}
              </div>

              {/* Bottom Quick Feature Callout */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {exportFormat === 'docx' && t('pdfToWord.docxFeature')}
                  {exportFormat === 'txt' && t('pdfToWord.txtFeature')}
                  {exportFormat === 'md' && t('pdfToWord.mdFeature')}
                  {exportFormat === 'rtf' && t('pdfToWord.rtfFeature')}
                </span>
                <button
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>{language === 'zh' ? '立即下載' : 'Download Now'} {activeFormatObj.ext}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
