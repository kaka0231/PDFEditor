import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileType, 
  Image as ImageIcon, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { ToolMode } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DropzoneProps {
  currentMode: ToolMode;
  onFileSelect: (file: File) => void;
  onMultipleFilesSelect?: (files: File[]) => void;
  onLoadSample: (type: 'pdf' | 'docx' | 'image') => void;
  accept?: string;
  multiple?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  currentMode,
  onFileSelect,
  onMultipleFilesSelect,
  onLoadSample,
  accept,
  multiple = false,
}) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptExtensions = () => {
    if (accept) return accept;
    switch (currentMode) {
      case 'pdf-to-word':
      case 'pdf-editor':
        return '.pdf,application/pdf';
      case 'word-to-pdf':
        return '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';
      case 'image-to-pdf':
        return 'image/png,image/jpeg,image/webp,image/jpg,.png,.jpg,.jpeg,.webp';
      default:
        return '.pdf,.docx,.doc,image/png,image/jpeg,image/webp,text/plain';
    }
  };

  const getTitleAndSubtitle = () => {
    switch (currentMode) {
      case 'pdf-to-word':
        return {
          title: t('dropzone.pdfToWord.title'),
          subtitle: t('dropzone.pdfToWord.subtitle'),
          icon: FileText,
          iconColor: 'text-sky-600 bg-sky-50',
          sampleType: 'pdf' as const,
          sampleLabel: t('dropzone.pdfToWord.sample'),
        };
      case 'word-to-pdf':
        return {
          title: t('dropzone.wordToPdf.title'),
          subtitle: t('dropzone.wordToPdf.subtitle'),
          icon: FileType,
          iconColor: 'text-teal-600 bg-teal-50',
          sampleType: 'docx' as const,
          sampleLabel: t('dropzone.wordToPdf.sample'),
        };
      case 'pdf-editor':
        return {
          title: t('dropzone.pdfEditor.title'),
          subtitle: t('dropzone.pdfEditor.subtitle'),
          icon: FileText,
          iconColor: 'text-blue-600 bg-blue-50',
          sampleType: 'pdf' as const,
          sampleLabel: t('dropzone.pdfEditor.sample'),
        };
      case 'image-to-pdf':
      default:
        return {
          title: t('dropzone.imageToPdf.title'),
          subtitle: t('dropzone.imageToPdf.subtitle'),
          icon: ImageIcon,
          iconColor: 'text-emerald-600 bg-emerald-50',
          sampleType: 'image' as const,
          sampleLabel: t('dropzone.imageToPdf.sample'),
        };
    }
  };

  const { title, subtitle, icon: Icon, iconColor, sampleType, sampleLabel } = getTitleAndSubtitle();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (multiple && onMultipleFilesSelect) {
        onMultipleFilesSelect(Array.from(e.dataTransfer.files));
      } else {
        onFileSelect(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (multiple && onMultipleFilesSelect) {
        onMultipleFilesSelect(Array.from(e.target.files));
      } else {
        onFileSelect(e.target.files[0]);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Drop Zone Box */}
      <div
        id="dropzone-box"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptExtensions()}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload-input"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`w-16 h-16 rounded-2xl ${iconColor} flex items-center justify-center shadow-xs`}>
            <Icon className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-lg">
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              id="choose-file-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t('dropzone.dragPrompt')}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-3">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {t('dropzone.security')}
            </span>
            <span>•</span>
            <span>{t('dropzone.largeFiles')}</span>
          </div>
        </div>
      </div>

      {/* Quick Demo Sample Loader */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-100/80 border border-slate-200/80 text-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <span className="font-semibold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            {t('dropzone.quickDemo')}
          </span>
          <span className="text-xs text-slate-600">
            {t('dropzone.noFilePrompt')}
          </span>
        </div>

        <button
          type="button"
          id="load-sample-btn"
          onClick={(e) => {
            e.stopPropagation();
            onLoadSample(sampleType);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold border border-slate-300 shadow-2xs shrink-0 transition-all cursor-pointer"
        >
          <span>{sampleLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
