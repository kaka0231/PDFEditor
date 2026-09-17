import React, { useState, useEffect, useRef } from 'react';
import { 
  FileType, 
  Download, 
  RefreshCw, 
  FileCheck2, 
  Sparkles,
  Layout,
  Sliders,
  ChevronDown,
  Check,
  ShieldCheck,
  Award,
  AlignLeft,
  FileCode,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocumentFile, WordToPdfSettings, WordToPdfStandard } from '../types';
import { parseDocxToHtml, convertWordToPdfBlob } from '../utils/docxUtils';
import { useLanguage } from '../context/LanguageContext';

interface WordToPdfToolProps {
  file: DocumentFile;
  onSelectAnotherFile: () => void;
  onOpenAiAssistant?: (text: string) => void;
}

interface StandardOption {
  id: WordToPdfStandard;
  name: string;
  shortName: string;
  ext: string;
  badge: string;
  badgeColor: string;
  desc: string;
  icon: React.ElementType;
}

export const WordToPdfTool: React.FC<WordToPdfToolProps> = ({
  file,
  onSelectAnotherFile,
  onOpenAiAssistant,
}) => {
  const { t, language } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [rawText, setRawText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const STANDARD_OPTIONS: StandardOption[] = [
    {
      id: 'standard',
      name: language === 'zh' ? '標準 PDF (PDF 1.7)' : 'Standard PDF (PDF 1.7)',
      shortName: language === 'zh' ? '標準 PDF' : 'Standard PDF',
      ext: '.pdf',
      badge: language === 'zh' ? '通用推薦' : 'Universal',
      badgeColor: 'bg-teal-100 text-teal-800',
      desc: language === 'zh'
        ? '標準跨平臺向量文件，相容於所有主流瀏覽器、手機與 Adobe Reader 閱讀器'
        : 'Standard cross-platform vector PDF, compatible with all browsers and PDF readers',
      icon: FileType,
    },
    {
      id: 'pdfa-1b',
      name: language === 'zh' ? 'PDF/A-1b 封存標準 (ISO 19005-1)' : 'PDF/A-1b Archival (ISO 19005-1)',
      shortName: 'PDF/A-1b',
      ext: '.pdf',
      badge: language === 'zh' ? '數位長期保存' : 'Long-term Archival',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      desc: language === 'zh'
        ? '符合 ISO 19005-1 標準，內嵌 sRGB 色彩輸出意圖與 XMP 歸檔元數據，專為公文與長期留存打造'
        : 'ISO 19005-1 compliant with embedded sRGB output intent & XMP archival metadata for long-term preservation',
      icon: ShieldCheck,
    },
    {
      id: 'pdfa-2b',
      name: language === 'zh' ? 'PDF/A-2b 封存標準 (ISO 19005-2)' : 'PDF/A-2b Archival (ISO 19005-2)',
      shortName: 'PDF/A-2b',
      ext: '.pdf',
      badge: language === 'zh' ? '次世代封存' : 'Next-Gen Archival',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      desc: language === 'zh'
        ? '次世代 PDF/A 標準，基於 ISO 32000-1 核心，支援現代向量圖形與自包含長期數位典藏'
        : 'Next-gen PDF/A standard based on ISO 32000-1 for modern self-contained digital archiving',
      icon: Award,
    },
    {
      id: 'txt',
      name: language === 'zh' ? '純文字檔 (.txt)' : 'Plain Text (.txt)',
      shortName: language === 'zh' ? '純文字 .txt' : 'Text .txt',
      ext: '.txt',
      badge: language === 'zh' ? '無格式 UTF-8' : 'Plain UTF-8',
      badgeColor: 'bg-slate-100 text-slate-700',
      desc: language === 'zh'
        ? '提取 Word 內文字內容並以 UTF-8 編碼導出，附帶 BOM 解決相容性，適合快速備忘或程式分析'
        : 'Extracts Word document text encoded in clean UTF-8 with BOM, ideal for notes or data processing',
      icon: AlignLeft,
    },
    {
      id: 'html',
      name: language === 'zh' ? '獨立網頁檔 (.html)' : 'Standalone HTML (.html)',
      shortName: language === 'zh' ? '網頁 .html' : 'Webpage .html',
      ext: '.html',
      badge: language === 'zh' ? 'HTML5 排版' : 'HTML5 Layout',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: language === 'zh'
        ? '完整封裝 CSS 樣式與排版結構的單一 HTML 檔案，點擊即可在任一瀏覽器直接閱覽與列印'
        : 'Fully styled standalone HTML document that opens in any browser for reading and printing',
      icon: FileCode,
    },
  ];

  // Settings
  const [settings, setSettings] = useState<WordToPdfSettings>({
    pageSize: 'a4',
    fontSize: 'medium',
    margins: 'normal',
    headerText: 'DocuMaster Exported Document',
    footerPageNumber: true,
    exportStandard: 'standard',
  });

  // Close dropdown when clicked outside
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
    async function parseWord() {
      if (!file.arrayBuffer) return;
      setIsProcessing(true);
      try {
        const { html, rawText: text } = await parseDocxToHtml(file.arrayBuffer);
        if (isMounted) {
          setHtmlContent(html);
          setRawText(text);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Failed to parse DOCX:', err);
        if (isMounted) setIsProcessing(false);
      }
    }

    parseWord();
    return () => {
      isMounted = false;
    };
  }, [file]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const pdfBlob = await convertWordToPdfBlob(
        htmlContent,
        rawText,
        file.name,
        settings
      );

      const baseName = file.name.replace(/\.(docx|doc)$/i, '');
      let downloadExt = '.pdf';
      if (settings.exportStandard === 'txt') {
        downloadExt = '.txt';
      } else if (settings.exportStandard === 'html') {
        downloadExt = '.html';
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}${downloadExt}`;
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
      console.error('Failed to export PDF/Document:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activeStandard = settings.exportStandard || 'standard';
  const activeOpt = STANDARD_OPTIONS.find(s => s.id === activeStandard) || STANDARD_OPTIONS[0];
  const ActiveIcon = activeOpt.icon;
  const isPdfAActive = activeStandard === 'pdfa-1b' || activeStandard === 'pdfa-2b';

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
            <FileType className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
                {file.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold">
                {language === 'zh' ? 'Word 文檔' : 'Word Document'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'zh'
                ? '可自訂 PDF/A 封存標準、標準 PDF、純文字或 HTML，靈活滿足歸檔與分享需求'
                : 'Customizable PDF/A archival, standard PDF, plain text or HTML for archival & sharing'}
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
              onClick={() => onOpenAiAssistant(rawText)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? 'AI 摘要 / 翻譯' : 'AI Summary / Translate'}</span>
            </button>
          )}

          {/* Format / Standard Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              id="word-format-dropdown-btn"
              onClick={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 shadow-2xs transition-all cursor-pointer"
              title={language === 'zh' ? '點擊選擇導出格式或 PDF/A 標準' : 'Switch export format or standard'}
            >
              <ActiveIcon className="w-4 h-4 text-teal-600" />
              <span>{language === 'zh' ? '標準：' : 'Standard: '}{activeOpt.shortName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isFormatDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFormatDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-84 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  {t('wordToPdf.selectFormat')}
                </div>
                <div className="p-1 space-y-1">
                  {STANDARD_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected = activeStandard === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSettings({ ...settings, exportStandard: opt.id });
                          setIsFormatDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/80 border border-teal-200 text-teal-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
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
                          <Check className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            id="download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isProcessing || isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {activeStandard === 'pdfa-1b' && (language === 'zh' ? '導出為 PDF/A-1b 封存檔' : 'Export PDF/A-1b')}
              {activeStandard === 'pdfa-2b' && (language === 'zh' ? '導出為 PDF/A-2b 封存檔' : 'Export PDF/A-2b')}
              {activeStandard === 'standard' && (language === 'zh' ? '導出為標準 PDF 檔' : 'Export Standard PDF')}
              {activeStandard === 'txt' && (language === 'zh' ? '導出為純文字檔 (.txt)' : 'Export Text (.txt)')}
              {activeStandard === 'html' && (language === 'zh' ? '導出為獨立網頁 (.html)' : 'Export HTML (.html)')}
            </span>
          </button>
        </div>
      </div>

      {isProcessing ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">
            {language === 'zh' ? '正在解析 Word 排版樣式...' : 'Parsing Word layout and styles...'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Document Live Preview (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col min-h-[580px]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layout className="w-3.5 h-3.5 text-teal-600" />
                  {language === 'zh' ? '排版預覽視圖' : 'Layout Live Preview'}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${activeOpt.badgeColor}`}>
                    {activeOpt.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {language === 'zh' ? `規格：${settings.pageSize.toUpperCase()}` : `Size: ${settings.pageSize.toUpperCase()}`}
                  </span>
                </div>
              </div>

              {/* PDF/A Archival Verification Banner */}
              {isPdfAActive && (
                <div className="mb-4 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>{t('wordToPdf.pdfaTitle')}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded font-mono">
                        {activeStandard === 'pdfa-1b' ? 'PDF/A-1b' : 'PDF/A-2b'}
                      </span>
                    </div>
                    <p className="text-emerald-700 leading-relaxed">
                      {t('wordToPdf.pdfaDesc')}
                    </p>
                  </div>
                </div>
              )}

              {/* Simulated Paper Container */}
              <div className="flex-1 bg-slate-100/70 p-4 sm:p-6 rounded-xl overflow-y-auto max-h-[620px] flex justify-center">
                <div className="bg-white w-full max-w-2xl min-h-[500px] shadow-sm rounded-lg border border-slate-200/80 p-8 sm:p-12 text-slate-800 space-y-4 font-sans">
                  {settings.headerText && (
                    <div className="text-[11px] text-slate-400 border-b border-slate-100 pb-2 mb-4 flex justify-between">
                      <span>{settings.headerText}</span>
                      <span>{file.name}</span>
                    </div>
                  )}

                  {/* Render parsed HTML cleanly */}
                  <div
                    className="prose prose-slate max-w-none text-sm leading-relaxed prose-headings:text-slate-900 prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-p:my-2 prose-ul:my-2"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />

                  {settings.footerPageNumber && (
                    <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4 mt-8">
                      {isPdfAActive ? `第 1 頁 · ${activeStandard.toUpperCase()}` : '第 1 頁'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: PDF Export Settings Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sliders className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  {language === 'zh' ? '導出格式與版面設定' : 'Export Format & Layout Settings'}
                </h3>
              </div>

              {/* Export Standard & Format Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>{language === 'zh' ? '導出格式 / 國際標準規範' : 'Export Format / International Standard'}</span>
                  <span className="text-[10px] text-teal-600 font-medium">
                    {language === 'zh' ? '支援 PDF/A 封存' : 'PDF/A Supported'}
                  </span>
                </label>
                <div className="space-y-1.5">
                  {STANDARD_OPTIONS.map((opt) => {
                    const isSelected = activeStandard === opt.id;
                    const OptIcon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, exportStandard: opt.id })}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/70 text-teal-900 shadow-2xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <OptIcon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">{opt.name}</span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 ${opt.badgeColor}`}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page Size */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '紙張規格 (Page Size)' : 'Page Size'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings({ ...settings, pageSize: 'a4' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      settings.pageSize === 'a4'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    A4 (210 × 297mm)
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, pageSize: 'letter' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      settings.pageSize === 'letter'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    US Letter
                  </button>
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '頁面邊距 (Margins)' : 'Margins'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['narrow', 'normal', 'wide'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSettings({ ...settings, margins: m })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border capitalize transition-all cursor-pointer ${
                        settings.margins === m
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {m === 'narrow' ? (language === 'zh' ? '窄邊距' : 'Narrow') : m === 'normal' ? (language === 'zh' ? '標準' : 'Normal') : (language === 'zh' ? '寬邊距' : 'Wide')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '字體大小 (Font Scale)' : 'Font Size'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSettings({ ...settings, fontSize: sz })}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border capitalize transition-all cursor-pointer ${
                        settings.fontSize === sz
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {sz === 'small' ? (language === 'zh' ? '緊湊 (9pt)' : 'Compact (9pt)') : sz === 'medium' ? (language === 'zh' ? '適中 (11pt)' : 'Standard (11pt)') : (language === 'zh' ? '較大 (13pt)' : 'Large (13pt)')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Header text watermark */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '頁眉標記 (Header Text)' : 'Header Text'}
                </label>
                <input
                  type="text"
                  value={settings.headerText || ''}
                  onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
                  placeholder={language === 'zh' ? '例如：公司機密 / 機構報告' : 'e.g., Confidential / Official Report'}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Footer page number toggle */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '顯示底部頁碼' : 'Show Footer Page Number'}
                </span>
                <input
                  type="checkbox"
                  checked={settings.footerPageNumber}
                  onChange={(e) => setSettings({ ...settings, footerPageNumber: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              {/* Download CTA */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'zh' ? `立即轉換並下載 ${activeOpt.ext}` : `Convert & Download ${activeOpt.ext}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
