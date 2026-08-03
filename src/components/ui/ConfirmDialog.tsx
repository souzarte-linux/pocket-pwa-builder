import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Sair sem Salvar',
  cancelLabel = 'Continuar Editando',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
      <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0">
            <AlertTriangle className="size-7" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">{title}</h3>
            <p className="text-xs text-[#ab8a7d] mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#201f1f] text-[#e5e2e1] border border-stone-700 font-bold text-sm hover:bg-[#2a2a2a] transition active:scale-95 text-center"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-2xl bg-red-600 text-white font-extrabold text-sm hover:bg-red-700 shadow-lg active:scale-95 transition text-center"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
