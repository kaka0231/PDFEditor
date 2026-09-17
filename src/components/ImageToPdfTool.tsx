import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Download, 
  RotateCw, 
  Trash2, 
  Plus, 
  Sparkles, 
  Sliders, 
  Layers, 
  RefreshCw, 
  ArrowUp, 
  ArrowDown, 
  Eye,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ImageToPdfItem, ImageToPdfSettings } from '../types';
import { convertImagesToPdf } from '../utils/imageToPdfUtils';
import { useLanguage } from '../context/LanguageContext';

interface ImageToPdfToolProps {
  initialFiles: File[];
  onSelectAnotherFiles: () => void;
  onOpenAiAssistant?: (imageBase64: string) => void;
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = ({
  initialFiles,
  onSelectAnotherFiles,
  onOpenAiAssistant,
}) => {
  const { language, t } = useLanguage();
  const [items, setItems] = useState<ImageToPdfItem[]>(() => {
    return initialFiles.map((file, idx) => ({
      id: `img_${Date.now()}_${idx}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      rotation: 0,
      filter: 'none',
      width: 800,
      height: 1000,
    }));
  });

  const [settings, setSettings] = useState<ImageToPdfSettings>({
    pageSize: 'a4',
    orientation: 'auto',
    margin: 'small',
    quality: 0.9,
    addPageNumbers: true,
    documentTitle: 'Scanned_Images_Document',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: File[] = Array.from(e.target.files);
      const newItems: ImageToPdfItem[] = newFiles.map((file, idx) => ({
        id: `img_${Date.now()}_${idx}`,
        file,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        rotation: 0,
        filter: 'none',
        width: 800,
        height: 1000,
      }));
      setItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleRotate = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, rotation: (it.rotation + 90) % 360 } : it))
    );
  };

  const handleFilterChange = (id: string, filter: 'none' | 'scan' | 'grayscale' | 'contrast') => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, filter } : it))
    );
  };

  const handleApplyFilterToAll = (filter: 'none' | 'scan' | 'grayscale' | 'contrast') => {
    setItems((prev) => prev.map((it) => ({ ...it, filter })));
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setItems(newItems);
  };

  const handleDownloadPdf = async () => {
    if (items.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 1, total: items.length });

    try {
      const pdfBlob = await convertImagesToPdf(items, settings, (curr, tot) => {
        setExportProgress({ current: curr, total: tot });
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.documentTitle || 'Photos_Scanned'}.pdf`;
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
      console.error('Failed to convert images to PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-4">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">
            {language === 'zh' ? '目前沒有選擇任何相片' : 'No images selected'}
          </h3>
          <button
            onClick={onSelectAnotherFiles}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-xs shadow-xs cursor-pointer"
          >
            {language === 'zh' ? '重新選擇相片' : 'Select Images'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {t('tools.imageToPdf.title')}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {language === 'zh' ? `共 ${items.length} 張圖片` : `${items.length} images total`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'zh'
                ? '可自由調整排列順序、旋轉、套用掃描儀黑白去底色濾鏡，一鍵匯出為高畫質 PDF'
                : 'Reorder, rotate, apply scanner filters and export to high-quality PDF in one click'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '加載更多相片' : 'Add More Photos'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddMoreFiles}
              className="hidden"
            />
          </label>

          <button
            onClick={onSelectAnotherFiles}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
          >
            {language === 'zh' ? '清空重選' : 'Reset'}
          </button>

          <button
            id="download-images-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isExporting
                ? `${language === 'zh' ? '轉換處理中' : 'Converting'} (${exportProgress.current}/${exportProgress.total})...`
                : language === 'zh' ? '一鍵合併導出 PDF' : 'Merge & Export PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Batch Quick Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-700">
            {language === 'zh' ? '全選批次增強濾鏡：' : 'Batch Filter Preset:'}
          </span>
          <button
            onClick={() => handleApplyFilterToAll('none')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium cursor-pointer"
          >
            {language === 'zh' ? '原色照片' : 'Original Color'}
          </button>
          <button
            onClick={() => handleApplyFilterToAll('scan')}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>📄 {language === 'zh' ? '文件掃描儀去底色' : 'Doc Scanner Whiteout'}</span>
          </button>
          <button
            onClick={() => handleApplyFilterToAll('grayscale')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium cursor-pointer"
          >
            {language === 'zh' ? '黑白灰階' : 'Grayscale'}
          </button>
          <button
            onClick={() => handleApplyFilterToAll('contrast')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium cursor-pointer"
          >
            {language === 'zh' ? '文字清晰增強' : 'High Contrast'}
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          {language === 'zh' ? '可拖曳或點擊上下鍵調整頁面順序' : 'Use arrows to reorder pages'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Images Grid / Gallery (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-3 group hover:border-emerald-300 transition-all"
              >
                {/* Header of image item */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[140px]" title={item.name}>
                      {item.name}
                    </span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title={language === 'zh' ? '上移一頁' : 'Move up'}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveItem(idx, 'down')}
                      disabled={idx === items.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title={language === 'zh' ? '下移一頁' : 'Move down'}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600 ml-1 cursor-pointer"
                      title={language === 'zh' ? '刪除此頁' : 'Delete page'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preview Image with Rotation & Filter Styling */}
                <div className="relative aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200/80 flex items-center justify-center p-2">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain rounded transition-all duration-200 shadow-2xs"
                    style={{
                      transform: `rotate(${item.rotation}deg)`,
                      filter:
                        item.filter === 'grayscale'
                          ? 'grayscale(100%)'
                          : item.filter === 'contrast'
                          ? 'contrast(160%) brightness(105%)'
                          : item.filter === 'scan'
                          ? 'grayscale(100%) contrast(220%) brightness(115%)'
                          : 'none',
                    }}
                  />

                  {/* Filter badge */}
                  {item.filter !== 'none' && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-semibold backdrop-blur-xs">
                      {item.filter === 'scan'
                        ? language === 'zh' ? '掃描儀去底色' : 'Scanner Doc'
                        : item.filter === 'grayscale'
                        ? language === 'zh' ? '黑白' : 'Grayscale'
                        : language === 'zh' ? '增強對比' : 'High Contrast'}
                    </span>
                  )}
                </div>

                {/* Bottom Item Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleRotate(item.id)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1 cursor-pointer"
                      title={language === 'zh' ? '旋轉 90 度' : 'Rotate 90 deg'}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{item.rotation}°</span>
                    </button>

                    <select
                      value={item.filter}
                      onChange={(e) => handleFilterChange(item.id, e.target.value as any)}
                      className="text-[11px] bg-white px-2 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="none">{language === 'zh' ? '原色照片' : 'Original'}</option>
                      <option value="scan">📄 {language === 'zh' ? '掃描儀濾鏡' : 'Scanner Filter'}</option>
                      <option value="grayscale">{language === 'zh' ? '黑白灰階' : 'Grayscale'}</option>
                      <option value="contrast">{language === 'zh' ? '高清晰對比' : 'High Contrast'}</option>
                    </select>
                  </div>

                  {onOpenAiAssistant && (
                    <button
                      onClick={() => onOpenAiAssistant(item.previewUrl)}
                      className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
                      title={language === 'zh' ? '使用 AI OCR 識別本張照片文字' : 'Use AI OCR on this photo'}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{language === 'zh' ? 'OCR 擷取' : 'OCR Extract'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: PDF Layout Settings (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'zh' ? 'PDF 頁面排版設定' : 'PDF Layout Settings'}
              </h3>
            </div>

            {/* Document Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '檔案名稱 (PDF Name)' : 'Document Title'}
              </label>
              <input
                type="text"
                value={settings.documentTitle}
                onChange={(e) => setSettings({ ...settings, documentTitle: e.target.value })}
                placeholder={language === 'zh' ? '例如：收據彙整_2026' : 'e.g. Scanned_Receipts_2026'}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '紙張規格 (Page Size)' : 'Page Size'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'a4', label: language === 'zh' ? 'A4 標準' : 'A4 Standard' },
                  { id: 'letter', label: 'US Letter' },
                  { id: 'fit', label: language === 'zh' ? '吻合圖片' : 'Fit Image' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSettings({ ...settings, pageSize: p.id as any })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      settings.pageSize === p.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '版面方向 (Orientation)' : 'Orientation'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'auto', label: language === 'zh' ? '自動判定' : 'Auto' },
                  { id: 'portrait', label: language === 'zh' ? '直向' : 'Portrait' },
                  { id: 'landscape', label: language === 'zh' ? '橫向' : 'Landscape' },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSettings({ ...settings, orientation: o.id as any })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      settings.orientation === o.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '留白邊距 (Margin)' : 'Margins'}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: language === 'zh' ? '無 (滿版)' : 'None (Full)' },
                  { id: 'small', label: language === 'zh' ? '小邊距 (10mm)' : 'Small (10mm)' },
                  { id: 'standard', label: language === 'zh' ? '標準 (20mm)' : 'Standard (20mm)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSettings({ ...settings, margin: m.id as any })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      settings.margin === m.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Page number toggle */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                {language === 'zh' ? '頁尾加入頁碼 (1/N)' : 'Add page numbers in footer'}
              </span>
              <input
                type="checkbox"
                checked={settings.addPageNumbers}
                onChange={(e) => setSettings({ ...settings, addPageNumbers: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* CTA Button */}
            <div className="pt-4 border-t border-slate-100">
              <button
                id="export-pdf-cta-btn"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {language === 'zh'
                    ? `立即導出 ${items.length} 頁 PDF 文件`
                    : `Export ${items.length} Page(s) to PDF`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
