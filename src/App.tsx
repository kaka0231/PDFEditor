import React, { useState } from 'react';
import { ToolMode, DocumentFile } from './types';
import { Header } from './components/Header';
import { Dropzone } from './components/Dropzone';
import { PdfToWordTool } from './components/PdfToWordTool';
import { WordToPdfTool } from './components/WordToPdfTool';
import { PdfEditorTool } from './components/PdfEditorTool';
import { ImageToPdfTool } from './components/ImageToPdfTool';
import { createSamplePdf, createSampleDocx, createSampleImages } from './utils/sampleData';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const { t, language } = useLanguage();
  const [currentMode, setCurrentMode] = useState<ToolMode>('pdf-editor');
  const [activeFile, setActiveFile] = useState<DocumentFile | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleFileSelect = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const docFile: DocumentFile = {
      id: `doc_${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      arrayBuffer,
      createdAt: Date.now(),
    };
    setActiveFile(docFile);
  };

  const handleMultipleFilesSelect = (files: File[]) => {
    setImageFiles(files);
  };

  const handleLoadSample = async (type: 'pdf' | 'docx' | 'image') => {
    if (type === 'pdf') {
      const { arrayBuffer, filename } = await createSamplePdf();
      setActiveFile({
        id: `sample_pdf_${Date.now()}`,
        name: filename,
        size: arrayBuffer.byteLength,
        type: 'application/pdf',
        arrayBuffer,
        createdAt: Date.now(),
      });
    } else if (type === 'docx') {
      const { file, arrayBuffer } = await createSampleDocx();
      setActiveFile({
        id: `sample_docx_${Date.now()}`,
        name: file.name,
        size: arrayBuffer.byteLength,
        type: file.type,
        arrayBuffer,
        createdAt: Date.now(),
      });
    } else if (type === 'image') {
      const files = await createSampleImages();
      setImageFiles(files);
      setCurrentMode('image-to-pdf');
    }
  };

  const handleClearActiveFile = () => {
    setActiveFile(null);
    setImageFiles([]);
  };

  const activeFileLabel = currentMode === 'image-to-pdf' && imageFiles.length > 0 
    ? (language === 'zh' ? `${imageFiles.length} 張相片` : `${imageFiles.length} images`) 
    : activeFile?.name;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation & Tool Selector */}
      <Header
        currentMode={currentMode}
        onSelectMode={(mode) => {
          setCurrentMode(mode);
        }}
        activeFileName={activeFileLabel}
        onClearActiveFile={handleClearActiveFile}
      />

      {/* Main Content Workspace */}
      <main className="flex-1">
        {currentMode === 'pdf-editor' && (
          activeFile ? (
            <PdfEditorTool
              file={activeFile}
              onSelectAnotherFile={handleClearActiveFile}
            />
          ) : (
            <Dropzone
              currentMode={currentMode}
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
            />
          )
        )}

        {currentMode === 'pdf-to-word' && (
          activeFile ? (
            <PdfToWordTool
              file={activeFile}
              onSelectAnotherFile={handleClearActiveFile}
            />
          ) : (
            <Dropzone
              currentMode={currentMode}
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
            />
          )
        )}

        {currentMode === 'word-to-pdf' && (
          activeFile ? (
            <WordToPdfTool
              file={activeFile}
              onSelectAnotherFile={handleClearActiveFile}
            />
          ) : (
            <Dropzone
              currentMode={currentMode}
              onFileSelect={handleFileSelect}
              onLoadSample={handleLoadSample}
            />
          )
        )}

        {currentMode === 'image-to-pdf' && (
          imageFiles.length > 0 ? (
            <ImageToPdfTool
              initialFiles={imageFiles}
              onSelectAnotherFiles={handleClearActiveFile}
            />
          ) : (
            <Dropzone
              currentMode={currentMode}
              multiple
              onFileSelect={(f) => setImageFiles([f])}
              onMultipleFilesSelect={handleMultipleFilesSelect}
              onLoadSample={handleLoadSample}
            />
          )
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t('footer.desc')}</span>
          <span className="text-slate-400">{t('footer.security')}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
