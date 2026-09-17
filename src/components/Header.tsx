import React from 'react';
import { 
  FileText, 
  FileType, 
  Edit3, 
  Image as ImageIcon, 
  Layers,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { ToolMode } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  currentMode: ToolMode;
  onSelectMode: (mode: ToolMode) => void;
  activeFileName?: string;
  onClearActiveFile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  activeFileName,
  onClearActiveFile,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const tools = [
    {
      id: 'pdf-editor' as ToolMode,
      label: t('tool.pdfEditor'),
      shortDesc: t('tool.pdfEditor.desc'),
      icon: Edit3,
      badge: t('tool.pdfEditor.badge'),
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'pdf-to-word' as ToolMode,
      label: t('tool.pdfToWord'),
      shortDesc: t('tool.pdfToWord.desc'),
      icon: FileText,
      badge: t('tool.pdfToWord.badge'),
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      id: 'word-to-pdf' as ToolMode,
      label: t('tool.wordToPdf'),
      shortDesc: t('tool.wordToPdf.desc'),
      icon: FileType,
      badge: t('tool.wordToPdf.badge'),
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
      id: 'image-to-pdf' as ToolMode,
      label: t('tool.imageToPdf'),
      shortDesc: t('tool.imageToPdf.desc'),
      icon: ImageIcon,
      badge: t('tool.imageToPdf.badge'),
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top brand row */}
        <div className="flex items-center justify-between h-16 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">PDFEditor</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {t('app.badge')}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t('app.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeFileName && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 max-w-xs sm:max-w-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-slate-700 font-medium truncate" title={activeFileName}>
                  {activeFileName}
                </span>
                {onClearActiveFile && (
                  <button
                    onClick={onClearActiveFile}
                    className="text-xs text-slate-400 hover:text-slate-600 ml-1 p-0.5 cursor-pointer"
                    title={t('app.changeFile')}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Language switch button (Default: Chinese) */}
            <div 
              id="language-switcher"
              className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs"
              title={t('app.toggleLangTitle')}
            >
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 shrink-0" />
              <button
                type="button"
                id="lang-toggle-zh"
                onClick={() => setLanguage('zh')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'zh'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="切換為繁體中文"
              >
                中文
              </button>
              <button
                type="button"
                id="lang-toggle-en"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Tool Selector Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5 scrollbar-none">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = currentMode === tool.id;

            return (
              <button
                key={tool.id}
                id={`tab-${tool.id}`}
                onClick={() => onSelectMode(tool.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tool.label}</span>
                {tool.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
