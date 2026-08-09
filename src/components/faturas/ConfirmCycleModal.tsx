import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { CheckCircle2, FileCheck, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useBillingCycleMutations } from '@/hooks/mutations/useBillingCycleMutations';

export interface ConfirmCycleModalProps {
  cycle: {
    id: string;
    platform_name?: string;
    period_start: string;
    period_end: string;
    expected_payment_date: string;
    total_amount?: number;
    status: string;
  };
  notificationId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConfirmCycleModal: React.FC<ConfirmCycleModalProps> = ({
  cycle,
  notificationId,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const { updateBillingCycle } = useBillingCycleMutations();

  const fmtDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const markNotificationRead = async () => {
    if (notificationId) {
      await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    }
    await supabase.from('notifications').update({ read: true }).eq('billing_cycle_id', cycle.id);
  };

  const handleConfirm = async () => {
    setLoading(true);

    try {
      // 1. Atualiza status de pendente_confirmacao para open (A receber)
      await updateBillingCycle({ id: cycle.id, payload: { status: 'open' } });

      // 2. Marca notificação como lida
      await markNotificationRead();

      setLoading(false);
      toast.success('Fatura confirmada e movida para A Receber!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      return toast.error('Erro ao confirmar fatura: ' + (err?.message || ''));
    }
  };

  const handleDismissOnly = async () => {
    setLoading(true);
    await markNotificationRead();
    setLoading(false);
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 font-lexend"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h2 className="font-extrabold text-xl text-white flex items-center gap-2">
              <FileCheck className="size-6 text-amber-400" />
              CONFIRMAR FATURA GERADA
            </h2>
            <p className="text-sm text-[#ffb599] font-bold mt-0.5">
              {cycle.platform_name || 'Plataforma'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f] transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="bg-[#201f1f] border border-amber-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm uppercase tracking-wide">
            <AlertTriangle className="size-5 shrink-0" />
            <span>Pendente de Confirmação</span>
          </div>
          <p className="text-xs text-[#e5e2e1] leading-relaxed">
            Esta fatura foi gerada automaticamente pelo sistema com base no seu ciclo cadastrado. Por favor, revise se os valores e o período estão corretos.
          </p>

          <div className="pt-2 border-t border-stone-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-[#ab8a7d]">
              <span>Período da Fatura:</span>
              <strong className="text-white font-extrabold">
                {fmtDate(cycle.period_start)} → {fmtDate(cycle.period_end)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-[#ab8a7d]">
              <span>Data Prevista Pagamento:</span>
              <strong className="text-white font-extrabold">
                {fmtDate(cycle.expected_payment_date)}
              </strong>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-stone-800 text-sm">
              <span className="font-extrabold text-white">Valor Total Calculado:</span>
              <span className="font-black text-xl text-[#ffb599]">
                {formatBRL(cycle.total_amount || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-13 py-3 bg-[#ff5f00] text-black font-extrabold text-sm uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-[#ffb599] transition disabled:opacity-60 shadow-lg"
          >
            <CheckCircle2 className="size-5 stroke-[3]" />
            {loading ? 'CONFIRMANDO...' : 'CONFIRMAR VALORES (A RECEBER)'}
          </button>

          <button
            onClick={handleDismissOnly}
            disabled={loading}
            className="w-full h-11 py-2 bg-[#201f1f] border border-stone-800 text-[#ab8a7d] font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 hover:text-white hover:border-stone-700 transition"
          >
            FECHAR SEM CONFIRMAR
          </button>
        </div>
      </div>
    </div>
  );
};
