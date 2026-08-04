import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { Trash2, AlertTriangle, Loader2, Calendar, CreditCard, ArrowLeft, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface InstallmentItem {
  id: string;
  title: string;
  amount: number;
  installment_number: number | null;
  installment_total: number | null;
  occurred_at: string;
}

interface DeleteInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExpenseId: string;
  installmentGroupId: string;
  onDeleted: () => void;
}

export const DeleteInstallmentDialog = ({
  open,
  onOpenChange,
  currentExpenseId,
  installmentGroupId,
  onDeleted,
}: DeleteInstallmentDialogProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [deletingMode, setDeletingMode] = useState<'single' | 'future' | 'all' | null>(null);
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  useEffect(() => {
    if (!open || !installmentGroupId) {
      setStep(1);
      setDeletingMode(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setStep(1);
    setDeletingMode(null);

    supabase
      .from('expenses')
      .select('id, title, amount, installment_number, installment_total, occurred_at')
      .eq('installment_group_id', installmentGroupId)
      .order('installment_number', { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        setLoading(false);
        if (error) {
          console.error(error);
          toast.error('Erro ao carregar parcelas');
          return;
        }
        setInstallments(data ?? []);
      });

    return () => {
      isMounted = false;
    };
  }, [open, installmentGroupId]);

  const currentInst = installments.find((i) => i.id === currentExpenseId);
  const currentNum = currentInst?.installment_number ?? 1;
  const hasPast = installments.some((i) => (i.installment_number ?? 1) < currentNum);

  const handleDeleteSingle = async () => {
    setDeletingMode('single');
    const { error } = await supabase.from('expenses').delete().eq('id', currentExpenseId);
    setDeletingMode(null);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir parcela');
      return;
    }

    toast.success('Parcela excluída!');
    onOpenChange(false);
    onDeleted();
  };

  const handleDeleteFuture = async () => {
    setDeletingMode('future');
    let query = supabase.from('expenses').delete().eq('installment_group_id', installmentGroupId);

    if (currentInst?.installment_number) {
      query = query.gte('installment_number', currentInst.installment_number);
    } else {
      query = query.gte('occurred_at', currentInst?.occurred_at ?? new Date().toISOString());
    }

    const { error } = await query;
    setDeletingMode(null);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir parcelas atuais e futuras');
      return;
    }

    toast.success('Parcela atual e futuras foram excluídas!');
    onOpenChange(false);
    onDeleted();
  };

  const handleDeleteAll = async () => {
    setDeletingMode('all');
    const { error } = await supabase.from('expenses').delete().eq('installment_group_id', installmentGroupId);
    setDeletingMode(null);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir todas as parcelas');
      return;
    }

    toast.success('Todas as parcelas foram excluídas!');
    onOpenChange(false);
    onDeleted();
  };

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border border-border/40 rounded-2xl p-5 z-50">
        <DialogHeader>
          <DialogTitle className="display text-lg text-destructive flex items-center gap-2 uppercase">
            <AlertTriangle className="size-5 text-destructive" />
            {step === 1 ? 'Excluir Despesa Parcelada' : 'Escolha as Parcelas a Excluir'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {step === 1 ? (
              <>
                Esta despesa pertence a uma compra parcelada. Deseja remover apenas a parcela atual ou apagar mais parcelas?
              </>
            ) : (
              <>
                Selecione o alcance da exclusão para as parcelas do cartão:
              </>
            )}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Carregando parcelas do grupo…
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Parcelas ({installments.length})</span>
                <span>Valor / Vencimento</span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {installments.map((inst) => {
                  const isCurrent = inst.id === currentExpenseId;
                  const instNum = inst.installment_number ?? 1;
                  const isPast = instNum < currentNum;
                  const isFuture = instNum > currentNum;

                  const numStr =
                    inst.installment_number && inst.installment_total
                      ? `${inst.installment_number}/${inst.installment_total}`
                      : '—';
                  const dateStr = fmtDate(inst.occurred_at);

                  return (
                    <div
                      key={inst.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-destructive/10 border-destructive/40 text-foreground font-bold'
                          : isPast
                          ? 'bg-surface-high/50 border-border/20 text-muted-foreground/80'
                          : 'bg-surface-high border-border/20 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className={`size-4 shrink-0 ${isCurrent ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div className="truncate">
                          <span className="font-bold uppercase">Parcela {numStr}</span>
                          {isCurrent ? (
                            <span className="ml-2 text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.2 rounded font-black">
                              ATUAL
                            </span>
                          ) : isPast ? (
                            <span className="ml-2 text-[10px] bg-surface-highest text-muted-foreground px-1.5 py-0.2 rounded font-bold">
                              PASSADA
                            </span>
                          ) : isFuture ? (
                            <span className="ml-2 text-[10px] bg-warning/20 text-warning px-1.5 py-0.2 rounded font-bold">
                              FUTURA
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold block text-foreground">{formatBRL(inst.amount)}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <Calendar className="size-3" /> {dateStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
          {step === 1 ? (
            <>
              {/* Etapa 1 Buttons */}
              <button
                type="button"
                disabled={deletingMode !== null}
                onClick={handleDeleteSingle}
                className="w-full h-12 rounded-xl border border-destructive/40 text-destructive font-bold text-xs uppercase flex items-center justify-center gap-2 bg-surface hover:bg-destructive/10 transition active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
                {deletingMode === 'single' ? 'EXCLUINDO PARCELA...' : 'APAGAR SOMENTE ESTA PARCELA'}
              </button>

              <button
                type="button"
                disabled={deletingMode !== null}
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-black text-xs uppercase flex items-center justify-center gap-2 shadow-fab hover:bg-destructive/90 transition active:scale-[0.98]"
              >
                <Layers className="size-4" />
                APAGAR MAIS PARCELAS…
              </button>

              <button
                type="button"
                disabled={deletingMode !== null}
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-xl bg-surface-high font-bold text-xs text-muted-foreground hover:bg-surface-highest transition uppercase"
              >
                CANCELAR
              </button>
            </>
          ) : (
            <>
              {/* Etapa 2 Buttons */}
              <button
                type="button"
                disabled={deletingMode !== null}
                onClick={handleDeleteFuture}
                className="w-full h-12 rounded-xl border border-destructive/40 text-destructive font-bold text-xs uppercase flex items-center justify-center gap-2 bg-surface hover:bg-destructive/10 transition active:scale-[0.98]"
              >
                <Trash2 className="size-4" />
                {deletingMode === 'future'
                  ? 'EXCLUINDO PARCELAS...'
                  : 'APAGAR A PARCELA ATUAL E AS FUTURAS'}
              </button>

              {hasPast && (
                <button
                  type="button"
                  disabled={deletingMode !== null}
                  onClick={handleDeleteAll}
                  className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-black text-xs uppercase flex items-center justify-center gap-2 shadow-fab hover:bg-destructive/90 transition active:scale-[0.98]"
                >
                  <Trash2 className="size-4" />
                  {deletingMode === 'all'
                    ? 'EXCLUINDO TUDO...'
                    : 'APAGAR A PARCELA ATUAL, AS JÁ PAGAS E AS FUTURAS'}
                </button>
              )}

              <button
                type="button"
                disabled={deletingMode !== null}
                onClick={() => setStep(1)}
                className="w-full h-11 rounded-xl bg-surface-high font-bold text-xs text-muted-foreground hover:bg-surface-highest transition uppercase flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="size-4" />
                VOLTAR
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
