import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatBRL } from '@/lib/format';
import { Pencil, Trash2, Calendar, Clock, MapPin, CreditCard, Building2, Gauge, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeleteInstallmentDialog } from '@/components/forms/DeleteInstallmentDialog';

export interface TxDetail {
  id: string;
  raw_id: string;
  table: 'routes' | 'daily_totals' | 'expenses';
  kind: 'route' | 'daily' | 'expense';
  title: string;
  subtitle: string;
  meta1?: string;
  meta2?: string;
  amount: number;
  positive: boolean;
  tag?: string;
  iconKey: 'fuel' | 'wrench' | 'food' | 'package' | 'doc';
  occurred_at: string;
  raw?: any;
}

interface ViewTransactionDialogProps {
  tx: TxDetail | null;
  onClose: () => void;
  onEdit: (tx: TxDetail) => void;
  onDelete?: (tx: TxDetail) => void;
  onDeleted?: () => void;
}

export const ViewTransactionDialog: React.FC<ViewTransactionDialogProps> = ({
  tx,
  onClose,
  onEdit,
  onDelete,
  onDeleted,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [deleteInstallmentOpen, setDeleteInstallmentOpen] = useState(false);

  if (!tx) return null;

  const raw = tx.raw || {};
  const formattedDate = (() => {
    try {
      return format(new Date(tx.occurred_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return tx.occurred_at;
    }
  })();

  const isPaidTag = tx.tag === 'PAGO';
  const isPendingTag = tx.tag === 'A RECEBER';

  const handleDelete = async () => {
    if (onDelete) {
      onClose();
      onDelete(tx);
      return;
    }

    if (tx.table === 'expenses' && raw.installment_group_id) {
      setDeleteInstallmentOpen(true);
      return;
    }

    if (!confirm('Deseja realmente excluir este registro?')) return;

    setDeleting(true);
    const targetId = raw.id || tx.raw_id || tx.id.replace(/^[rde]/, '');
    const { error } = await supabase.from(tx.table).delete().eq('id', targetId);
    setDeleting(false);

    if (error) {
      console.error(error);
      toast.error('Erro ao excluir registro');
      return;
    }

    toast.success('Registro excluído com sucesso!');
    onClose();
    if (onDeleted) onDeleted();
  };

  return (
    <>
      <Dialog open={!!tx} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg bg-surface border border-border/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto z-50">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/20 pb-4">
            <DialogTitle className="display text-lg text-primary flex items-center gap-2 uppercase">
              <span className="truncate">{tx.title}</span>
            </DialogTitle>

            {/* Top header trash button for record deletion */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-bold transition active:scale-95 shrink-0"
              aria-label="Excluir lançamento"
            >
              <Trash2 className="size-4" />
              <span>{deleting ? 'EXCLUINDO...' : 'EXCLUIR'}</span>
            </button>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Main Amount Card */}
            <div className="bg-surface-high rounded-2xl p-4 border border-border/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Valor do Lançamento
                </span>
                <p className={`display text-3xl mt-0.5 ${tx.positive ? 'text-primary' : 'text-destructive'}`}>
                  {tx.positive ? '+' : '-'}{formatBRL(tx.amount)}
                </p>
              </div>
              {tx.tag && (
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    isPaidTag
                      ? 'bg-success/20 text-success border border-success/30'
                      : isPendingTag
                      ? 'bg-warning/20 text-warning border border-warning/30'
                      : tx.positive
                      ? 'bg-success/20 text-success border border-success/30'
                      : 'bg-destructive/20 text-destructive border border-destructive/30'
                  }`}
                >
                  {tx.tag}
                </span>
              )}
            </div>

            {/* Details List */}
            <div className="space-y-2.5 text-xs">
              {/* Data e Hora */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-high/50 border border-border/20">
                <Calendar className="size-4 text-primary shrink-0" />
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block">Data e Hora</span>
                  <span className="font-semibold text-foreground capitalize">{formattedDate}</span>
                </div>
              </div>

              {/* Kind specifics */}
              {tx.table === 'routes' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block flex items-center gap-1">
                        <MapPin className="size-3 text-primary" /> Origem
                      </span>
                      <span className="font-bold text-foreground uppercase">{raw.origin || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block flex items-center gap-1">
                        <MapPin className="size-3 text-primary" /> Destino
                      </span>
                      <span className="font-bold text-foreground uppercase">{raw.destination || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[9px] block">Pacotes</span>
                      <span className="font-bold text-foreground">
                        {raw.package_count || (Number(raw.small_packages_count || 0) + Number(raw.large_packages_count || 0)) || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[9px] block">Distância</span>
                      <span className="font-bold text-foreground">{Number(raw.distance_km || 0).toLocaleString('pt-BR')} KM</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[9px] block">Gorjeta</span>
                      <span className="font-bold text-primary">{formatBRL(Number(raw.tip || 0))}</span>
                    </div>
                  </div>

                  {tx.meta2 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <Clock className="size-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold text-muted-foreground uppercase text-[10px] block">Tempo Trabalhado</span>
                        <span className="font-semibold text-foreground">{tx.meta2}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tx.table === 'expenses' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block flex items-center gap-1">
                        <Building2 className="size-3 text-primary" /> Empresa / Local
                      </span>
                      <span className="font-bold text-foreground uppercase">{raw.vendor || tx.subtitle.split('•')[0] || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block flex items-center gap-1">
                        <CreditCard className="size-3 text-primary" /> Pagamento
                      </span>
                      <span className="font-bold text-foreground uppercase">{raw.payment_method || '—'}</span>
                    </div>
                  </div>

                  {(raw.part_brand || raw.part_model) && (
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block">Marca / Modelo da Peça</span>
                      <span className="font-bold text-foreground uppercase">
                        {[raw.part_brand, raw.part_model].filter(Boolean).join(' - ')}
                      </span>
                    </div>
                  )}

                  {raw.odometer_km != null && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <Gauge className="size-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold text-muted-foreground uppercase text-[10px] block">Odômetro</span>
                        <span className="font-semibold text-foreground">{Number(raw.odometer_km).toLocaleString('pt-BR')} KM</span>
                      </div>
                    </div>
                  )}

                  {raw.installment_number && raw.installment_total && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <Hash className="size-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold text-muted-foreground uppercase text-[10px] block">Parcelamento</span>
                        <span className="font-semibold text-foreground">
                          Parcela {raw.installment_number} de {raw.installment_total}
                        </span>
                      </div>
                    </div>
                  )}

                  {raw.description && (
                    <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                      <span className="font-bold text-muted-foreground uppercase text-[10px] block">Observações</span>
                      <p className="text-foreground leading-relaxed mt-0.5">{raw.description}</p>
                    </div>
                  )}
                </>
              )}

              {tx.table === 'daily_totals' && raw.notes && (
                <div className="p-3 rounded-xl bg-surface-high/50 border border-border/20">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block">Notas do Dia</span>
                  <p className="text-foreground leading-relaxed mt-0.5">{raw.notes}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-12 px-5 rounded-xl bg-surface-high font-bold text-xs text-muted-foreground hover:bg-surface-highest transition uppercase"
            >
              FECHAR
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(tx);
              }}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase flex items-center justify-center gap-2 shadow-fab hover:bg-primary/90 transition"
            >
              <Pencil className="size-4" />
              EDITAR LANÇAMENTO
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {raw.installment_group_id && (
        <DeleteInstallmentDialog
          open={deleteInstallmentOpen}
          onOpenChange={setDeleteInstallmentOpen}
          currentExpenseId={raw.id || tx.raw_id}
          installmentGroupId={raw.installment_group_id}
          onDeleted={() => {
            onClose();
            if (onDeleted) onDeleted();
          }}
        />
      )}
    </>
  );
};
