import React, { useState, useRef, useEffect } from 'react';
import { 
  Pen, 
  Type, 
  Upload, 
  Eraser, 
  Check, 
  Trash2, 
  BookmarkCheck, 
  Sparkles,
  X
} from 'lucide-react';
import { SavedSignature } from '../types';
import { 
  cropSignatureCanvas, 
  getSavedSignatures, 
  makeSignatureBackgroundTransparent, 
  renderTypedSignatureToDataUrl, 
  saveSignatureToLibrary,
  deleteSavedSignature
} from '../utils/signatureUtils';
import { useLanguage } from '../context/LanguageContext';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignature: (signatureDataUrl: string, signerName?: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onSelectSignature,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'library'>('draw');

  // Draw tab state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#0f2b60'); // Dark navy default
  const [penSize, setPenSize] = useState(3);
  const [hasDrawnContent, setHasDrawnContent] = useState(false);

  // Type tab state
  const [typedName, setTypedName] = useState('Joe Law');
  const [selectedFont, setSelectedFont] = useState('Caveat');
  const [typeColor, setTypeColor] = useState('#0f2b60');

  // Upload tab state
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [removeBgTone, setRemoveBgTone] = useState<'navy' | 'black' | 'original'>('navy');

  // Saved library state
  const [savedList, setSavedList] = useState<SavedSignature[]>([]);
  const [saveToLibraryChecked, setSaveToLibraryChecked] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSavedList(getSavedSignatures());
    }
  }, [isOpen]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = penSize * scaleX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawnContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnContent(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingUpload(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawUrl = event.target?.result as string;
        try {
          const transparentUrl = await makeSignatureBackgroundTransparent(rawUrl, removeBgTone);
          setUploadedPreview(transparentUrl);
        } catch (err) {
          setUploadedPreview(rawUrl);
        } finally {
          setIsProcessingUpload(false);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleApply = () => {
    let finalDataUrl = '';
    let signerName = '';

    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawnContent) return;
      finalDataUrl = cropSignatureCanvas(canvas);
      signerName = 'Handwritten Signature';
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return;
      finalDataUrl = renderTypedSignatureToDataUrl(typedName, selectedFont, typeColor);
      signerName = typedName;
    } else if (activeTab === 'upload') {
      if (!uploadedPreview) return;
      finalDataUrl = uploadedPreview;
      signerName = 'Uploaded Stamp';
    }

    if (!finalDataUrl) return;

    if (saveToLibraryChecked && activeTab !== 'library') {
      saveSignatureToLibrary({
        name: signerName || 'My Signature',
        dataUrl: finalDataUrl,
        type: activeTab === 'draw' ? 'drawn' : activeTab === 'type' ? 'typed' : 'uploaded',
      });
    }

    onSelectSignature(finalDataUrl, signerName);
    onClose();
  };

  const handleDeleteLibraryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedSignature(id);
    setSavedList(getSavedSignatures());
  };

  if (!isOpen) return null;

  const fontOptions = [
    { id: 'Caveat', label: language === 'zh' ? 'Caveat (親筆手寫感)' : 'Caveat (Handwritten)', family: 'Caveat' },
    { id: 'Dancing Script', label: language === 'zh' ? 'Dancing Script (流暢行書)' : 'Dancing Script (Cursive)', family: 'Dancing Script' },
    { id: 'Great Vibes', label: language === 'zh' ? 'Great Vibes (優雅花體草寫)' : 'Great Vibes (Calligraphy)', family: 'Great Vibes' },
    { id: 'sans-serif', label: language === 'zh' ? 'Standard Sans (標準正楷)' : 'Standard Sans (Print)', family: 'Noto Sans TC' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Pen className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">
              {language === 'zh' ? '建立與套用電子簽名' : 'Create & Apply Digital Signature'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('draw')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'draw'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '手繪簽名 (Draw)' : 'Draw'}</span>
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'type'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '打字字體 (Type)' : 'Type'}</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === 'zh' ? '上傳照片/印章 (Upload)' : 'Upload'}</span>
          </button>
          {savedList.length > 0 && (
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>{language === 'zh' ? `簽名庫 (${savedList.length})` : `Library (${savedList.length})`}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: DRAW */}
          {activeTab === 'draw' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {language === 'zh' ? '墨水顏色：' : 'Ink Color:'}
                  </span>
                  {[
                    { color: '#0f2b60', label: language === 'zh' ? '深藍色' : 'Navy' },
                    { color: '#09090b', label: language === 'zh' ? '純黑色' : 'Black' },
                    { color: '#b91c1c', label: language === 'zh' ? '簽約紅' : 'Red' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setDrawColor(c.color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        drawColor === c.color ? 'border-indigo-500 scale-110 shadow-xs' : 'border-white'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">
                      {language === 'zh' ? '筆觸：' : 'Thickness:'}
                    </span>
                    <input
                      type="range"
                      min="1.5"
                      max="6"
                      step="0.5"
                      value={penSize}
                      onChange={(e) => setPenSize(parseFloat(e.target.value))}
                      className="w-16 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={clearCanvas}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>{language === 'zh' ? '清除' : 'Clear'}</span>
                  </button>
                </div>
              </div>

              {/* Drawing Board */}
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/70 overflow-hidden touch-none h-52 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={260}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
                {!hasDrawnContent && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 space-y-1">
                    <Pen className="w-6 h-6 opacity-40" />
                    <span className="text-xs">
                      {language === 'zh' ? '請使用滑鼠、觸控筆或手指於此處簽名' : 'Draw your signature here with mouse, stylus or finger'}
                    </span>
                  </div>
                )}
                {/* Baseline Guide */}
                <div className="absolute bottom-8 left-12 right-12 border-b border-slate-300/60 pointer-events-none" />
              </div>
            </div>
          )}

          {/* TAB 2: TYPE */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '輸入您的姓名或簽名文字：' : 'Enter your name or signature text:'}
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={language === 'zh' ? '例如：陳大文 / Joe Law' : 'e.g., John Doe / Joe Law'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  {language === 'zh' ? '選擇簽名書法字體：' : 'Select signature style:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {fontOptions.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFont(f.family)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        selectedFont === f.family
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] text-slate-400 mb-1">{f.label}</span>
                      <span
                        className="text-2xl text-slate-800 truncate"
                        style={{ fontFamily: f.family, color: typeColor }}
                      >
                        {typedName || 'Signature'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  id="signature-image-upload"
                  className="hidden"
                />
                <label
                  htmlFor="signature-image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">
                    {language === 'zh' ? '上傳紙本簽名照或透明印章' : 'Upload photo of paper signature or transparent stamp'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'zh' ? '系統將自動進行白底去背與墨水增強' : 'White background will be automatically removed'}
                  </span>
                </label>
              </div>

              {uploadedPreview && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center">
                  <span className="text-[11px] font-semibold text-slate-600 mb-2">
                    {language === 'zh' ? '去背預覽：' : 'Preview:'}
                  </span>
                  <div className="bg-white/80 p-4 rounded-lg border border-slate-200 flex items-center justify-center max-h-32">
                    <img
                      src={uploadedPreview}
                      alt="Uploaded signature"
                      className="max-h-24 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-3">
              <span className="text-xs text-slate-500">
                {language === 'zh' ? '點擊以下任一已保存的常用簽名即可置入：' : 'Click any saved signature to insert:'}
              </span>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {savedList.map((sig) => (
                  <div
                    key={sig.id}
                    onClick={() => {
                      onSelectSignature(sig.dataUrl, sig.name);
                      onClose();
                    }}
                    className="relative group p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-between"
                  >
                    <button
                      onClick={(e) => handleDeleteLibraryItem(sig.id, e)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-16 flex items-center justify-center">
                      <img src={sig.dataUrl} alt={sig.name} className="max-h-14 object-contain" />
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium truncate w-full text-center">
                      {sig.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {activeTab !== 'library' ? (
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToLibraryChecked}
                onChange={(e) => setSaveToLibraryChecked(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <span>
                {language === 'zh' ? '儲存至我的簽名庫方便日後使用' : 'Save to my signature library for future use'}
              </span>
            </label>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            {activeTab !== 'library' && (
              <button
                onClick={handleApply}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'zh' ? '套用簽名' : 'Apply Signature'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
