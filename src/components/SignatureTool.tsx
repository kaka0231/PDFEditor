import React, { useState, useEffect } from 'react';
import { 
  PenTool, 
  Plus, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  User, 
  ShieldCheck, 
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DocumentFile, SavedSignature } from '../types';
import { getSavedSignatures, deleteSavedSignature } from '../utils/signatureUtils';
import { SignatureModal } from './SignatureModal';
import { PdfEditorTool } from './PdfEditorTool';

interface SignatureToolProps {
  file: DocumentFile;
  onSelectAnotherFile: () => void;
  onOpenAiAssistant?: (text?: string) => void;
}

export const SignatureTool: React.FC<SignatureToolProps> = ({
  file,
  onSelectAnotherFile,
  onOpenAiAssistant,
}) => {
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSignatureForPlacement, setSelectedSignatureForPlacement] = useState<string | null>(null);

  useEffect(() => {
    setSavedSignatures(getSavedSignatures());
  }, []);

  const handleCreatedSignature = (dataUrl: string, name?: string) => {
    setSelectedSignatureForPlacement(dataUrl);
    setSavedSignatures(getSavedSignatures());
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedSignature(id);
    setSavedSignatures(getSavedSignatures());
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6">
      {/* Top Banner with Quick Sign Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-800">
                電子簽名工作台：{file.name}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                合法合規簽名
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              選擇或建立簽名後，可直接拖曳置入合約簽約處，支援添加簽署日期與姓名
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新增或繪製簽名</span>
          </button>
        </div>
      </div>

      {/* Embedded High-Performance PDF Editor with active Signature preset */}
      <PdfEditorTool
        file={file}
        onSelectAnotherFile={onSelectAnotherFile}
        onOpenAiAssistant={onOpenAiAssistant}
        initialSignatureToPlace={selectedSignatureForPlacement || undefined}
      />

      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectSignature={handleCreatedSignature}
      />
    </div>
  );
};
