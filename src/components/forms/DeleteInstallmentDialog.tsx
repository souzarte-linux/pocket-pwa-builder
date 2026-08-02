import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { Trash2, AlertTriangle, Loader2, Calendar, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface InstallmentItem {
  id: string;
  title: string;
  amount: number;
  installment_number: number | null;
  installment_total: number | null;
  occurred_at: string;
  card_due_date: string | null;
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
  const [loading, setLoading] = useState(false);
  const [deletingSingle, setDeletingSingle] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  useEffect(() => {
    if (!open || !installmentGroupId) return;

    let isMounted = true;
    setLoading(true);

    supabase
      .from('expenses')
      .select('id, title, amount, installment_number, installment_total, occurred_at, card_due_date')
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

  const handleDeleteSingle = async () => {
    setDeletingSingle(true);
    const { error } = await supabase.from('expenses').delete().eq('id', currentExpenseId);
    setDeletingSingle(false);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir parcela');
      return;
    }

    toast.success('Parcela excluída!');
    onOpenChange(false);
    onDeleted();
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const { error } = await supabase.from('expenses').delete().eq('installment_group_id', installmentGroupId);
    setDeletingAll(false);

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
            Excluir Despesa Parcelada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta despesa faz parte de um <strong className="text-foreground">grupo de parcelamento</strong>.
            Escolha se deseja remover apenas esta parcela ou todas as parcelas vinculadas.
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

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {installments.map((inst) => {
                  const isCurrent = inst.id === currentExpenseId;
                  const numStr =
                    inst.installment_number && inst.installment_total
                      ? `${inst.installment_number}/${inst.installment_total}`
                      : '—';
                  const dateStr = inst.card_due_date
                    ? fmtDate(inst.card_due_date)
                    : fmtDate(inst.occurred_at);

                  return (
                    <div
                      key={inst.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-destructive/10 border-destructive/40 text-foreground font-bold'
                          : 'bg-surface-high border-border/20 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CreditCard className={`size-4 shrink-0 ${isCurrent ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div className="truncate">
                          <span className="font-bold uppercase">Parcela {numStr}</span>
                          {isCurrent && (
                            <span className="ml-2 text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.2 rounded font-black">
                              ATUAL
                            </span>
                          )}
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
          <button
            type="button"
            disabled={deletingSingle || deletingAll}
            onClick={handleDeleteSingle}
            className="w-full h-12 rounded-xl border border-destructive/40 text-destructive font-bold text-xs uppercase flex items-center justify-center gap-2 bg-surface hover:bg-destructive/10 transition active:scale-[0.98]"
          >
            <Trash2 className="size-4" />
            {deletingSingle ? 'EXCLUINDO PARCELA...' : 'EXCLUIR SOMENTE ESTA PARCELA'}
          </button>

          <button
            type="button"
            disabled={deletingSingle || deletingAll}
            onClick={handleDeleteAll}
            className="w-full h-12 rounded-xl bg-destructive text-destructive-foreground font-black text-xs uppercase flex items-center justify-center gap-2 shadow-fab hover:bg-destructive/90 transition active:scale-[0.98]"
          >
            <Trash2 className="size-4" />
            {deletingAll ? 'EXCLUINDO TODAS...' : 'EXCLUIR TODAS AS PARCELAS (PASSADAS E FUTURAS)'}
          </button>

          <button
            type="button"
            disabled={deletingSingle || deletingAll}
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-xl bg-surface-high font-bold text-xs text-muted-foreground hover:bg-surface-highest transition uppercase"
          >
            CANCELAR
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
