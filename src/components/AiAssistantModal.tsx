import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  FileText, 
  Languages, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  ShieldAlert,
  BrainCircuit,
  FileCheck
} from 'lucide-react';
import { AiProcessingState } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  textContent?: string;
  imageBase64?: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  textContent = '',
  imageBase64,
}) => {
  const [activeTask, setActiveTask] = useState<'summarize' | 'ocr' | 'translate' | 'qa'>('summarize');
  const [targetLanguage, setTargetLanguage] = useState('繁體中文 (Traditional Chinese)');
  const [userQuestion, setUserQuestion] = useState('');
  const [aiState, setAiState] = useState<AiProcessingState>({ isLoading: false });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunAiTask = async (task: 'summarize' | 'ocr' | 'translate' | 'qa', customPrompt?: string) => {
    setActiveTask(task);
    setAiState({ isLoading: true, task });

    let prompt = '';
    if (task === 'summarize') {
      prompt = '請針對這份文件進行專業結構化摘要，列出：1. 核心主旨、2. 關鍵事項與條款、3. 重要日期與金額數字、4. 行動建議。請以清晰的繁體中文呈現。';
    } else if (task === 'ocr') {
      prompt = '請對提供的文件或圖片進行高精確度 OCR 辨識，忠實擷取所有文字、數據與表格，並以乾淨的 Markdown 格式輸出。';
    } else if (task === 'translate') {
      prompt = `請將提供的文件內容完整且精確地翻譯成 ${targetLanguage}，保持原有的段落結構與專業語氣。`;
    } else if (task === 'qa') {
      prompt = customPrompt || userQuestion || '請分析本文件的主要重點。';
    }

    try {
      const response = await fetch('/api/ai/analyze-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          prompt,
          textContent,
          imageBase64,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI 處理請求失敗');
      }

      setAiState({
        isLoading: false,
        task,
        result: data.result,
      });
    } catch (err: any) {
      console.error('AI Processing error:', err);
      setAiState({
        isLoading: false,
        task,
        error: err.message || '無法連接 AI 服務，請檢查網路或 API 設定。',
      });
    }
  };

  const handleCopy = () => {
    if (aiState.result) {
      navigator.clipboard.writeText(aiState.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/70 to-indigo-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Gemini 智慧文件助手</h3>
              <p className="text-[11px] text-slate-500">
                深度文件解析 · 智慧重點摘要 · 多國語言翻譯 · 圖片 OCR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Badges */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleRunAiTask('summarize')}
            disabled={aiState.isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTask === 'summarize'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📋 智慧重點摘要</span>
          </button>

          <button
            onClick={() => handleRunAiTask('ocr')}
            disabled={aiState.isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTask === 'ocr'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>🔍 OCR 文字與表格擷取</span>
          </button>

          <button
            onClick={() => handleRunAiTask('translate')}
            disabled={aiState.isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTask === 'translate'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>🌐 多國語言翻譯</span>
          </button>
        </div>

        {/* Translate language picker if active */}
        {activeTask === 'translate' && (
          <div className="px-6 py-2 bg-violet-50/50 border-b border-violet-100 flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">目標語言：</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-medium"
            >
              <option value="繁體中文 (Traditional Chinese)">繁體中文 (Traditional Chinese)</option>
              <option value="English (英文)">English (英文)</option>
              <option value="日本語 (Japanese)">日本語 (Japanese)</option>
              <option value="한국어 (Korean)">한국어 (Korean)</option>
              <option value="Español (Spanish)">Español (西班牙文)</option>
              <option value="Français (French)">Français (法文)</option>
              <option value="Deutsch (German)">Deutsch (德文)</option>
            </select>
            <button
              onClick={() => handleRunAiTask('translate')}
              className="px-3 py-1 rounded-lg bg-violet-600 text-white font-semibold text-xs ml-auto"
            >
              開始翻譯
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {aiState.isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
              <p className="text-sm font-bold text-slate-800">Gemini 3.7 Flash 深度分析處理中...</p>
              <p className="text-xs text-slate-400">正在萃取重點與生成結構化結果</p>
            </div>
          ) : aiState.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">分析失敗</p>
                <p className="mt-0.5">{aiState.error}</p>
              </div>
            </div>
          ) : aiState.result ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  AI 生成分析報告
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已複製！' : '複製內容'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-sans text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text max-h-[380px] overflow-y-auto">
                {aiState.result}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-10 h-10 mx-auto text-violet-300" />
              <p className="text-sm font-semibold text-slate-600">
                點擊上方任一快捷功能按鈕，或於下方輸入問題進行問答
              </p>
              <p className="text-xs text-slate-400">
                已準備就緒讀取當前文件內容 ({textContent ? `${textContent.length} 字元` : '圖片/頁面'})
              </p>
            </div>
          )}
        </div>

        {/* Bottom Interactive Q&A Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (userQuestion.trim()) {
                handleRunAiTask('qa', userQuestion);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="詢問有關此文件的任何問題（例如：本協議的終止條件是什麼？）..."
              className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
            <button
              type="submit"
              disabled={aiState.isLoading || !userQuestion.trim()}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-xs disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
