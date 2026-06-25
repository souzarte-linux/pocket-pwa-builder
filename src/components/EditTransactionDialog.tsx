import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Field, Input, SubmitButton } from '@/components/forms/Form';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { toLocalInput } from '@/lib/format';

export type EditTarget = {
  table: 'routes' | 'daily_totals' | 'expenses';
  id: string;
  positive: boolean;
} | null;

interface Props {
  target: EditTarget;
  onClose: () => void;
  onSaved: () => void;
}

export const EditTransactionDialog = ({ target, onClose, onSaved }: Props) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!target) {
      setData(null);
      return;
    }
    (async () => {
      const { data: row, error } = await supabase
        .from(target.table)
        .select('*')
        .eq('id', target.id)
        .maybeSingle();
      if (error) {
        toast.error('Erro ao carregar');
        onClose();
        return;
      }
      setData(row);
    })();
  }, [target]);

  if (!target) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setLoading(true);
    const payload: any = {
      amount: Number(data.amount),
      occurred_at: data.occurred_at,
    };
    if (target.table === 'routes') {
      payload.tip = Number(data.tip ?? 0);
      payload.distance_km = Number(data.distance_km ?? 0);
      payload.origin = data.origin ?? null;
      payload.destination = data.destination ?? null;
    }
    if (target.table === 'daily_totals') {
      payload.distance_km = Number(data.distance_km ?? 0);
      payload.notes = data.notes ?? null;
    }
    if (target.table === 'expenses') {
      payload.title = data.title;
      payload.vendor = data.vendor ?? null;
      payload.description = data.description ?? null;
    }
    const { error } = await supabase.from(target.table).update(payload).eq('id', target.id);
    setLoading(false);
    if (error) {
      toast.error('Erro ao salvar');
      return;
    }
    toast.success('Atualizado');
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este registro?')) return;
    setDeleting(true);
    const { error } = await supabase.from(target.table).delete().eq('id', target.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    toast.success('Excluído');
    onSaved();
    onClose();
  };

  const titleLabel =
    target.table === 'expenses'
      ? 'Editar despesa'
      : target.table === 'daily_totals'
      ? 'Editar total do dia'
      : 'Editar rota';

  const dateValue = data?.occurred_at
    ? toLocalInput(data.occurred_at)
    : '';

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-surface border-border/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="display text-xl">{titleLabel}</DialogTitle>
        </DialogHeader>

        {!data ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                value={data.amount ?? ''}
                onChange={(e) => setData({ ...data, amount: e.target.value })}
                required
              />
            </Field>

            <Field label="Data e hora">
              <Input
                type="datetime-local"
                value={dateValue}
                onChange={(e) =>
                  setData({ ...data, occurred_at: new Date(e.target.value).toISOString() })
                }
                required
              />
            </Field>

            {target.table === 'routes' && (
              <>
                <Field label="Gorjeta (R$)">
                  <Input
                    type="number"
                    step="0.01"
                    value={data.tip || ''}
                    onChange={(e) => setData({ ...data, tip: e.target.value })}
                    placeholder="Ex: 5,00"
                  />
                </Field>
                <Field label="Distância (km)">
                  <Input
                    type="number"
                    step="0.1"
                    value={data.distance_km || ''}
                    onChange={(e) => setData({ ...data, distance_km: e.target.value })}
                    placeholder="Ex: 10,5"
                  />
                </Field>
                <Field label="Origem">
                  <Input
                    value={data.origin ?? ''}
                    onChange={(e) => setData({ ...data, origin: e.target.value })}
                    placeholder="Origem da rota"
                  />
                </Field>
                <Field label="Destino">
                  <Input
                    value={data.destination ?? ''}
                    onChange={(e) => setData({ ...data, destination: e.target.value })}
                    placeholder="Destino da rota"
                  />
                </Field>
              </>
            )}

            {target.table === 'daily_totals' && (
              <>
                <Field label="Distância (km)">
                  <Input
                    type="number"
                    step="0.1"
                    value={data.distance_km ?? 0}
                    onChange={(e) => setData({ ...data, distance_km: e.target.value })}
                  />
                </Field>
                <Field label="Notas">
                  <Input
                    value={data.notes ?? ''}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                  />
                </Field>
              </>
            )}

            {target.table === 'expenses' && (
              <>
                <Field label="Título">
                  <Input
                    value={data.title ?? ''}
                    onChange={(e) => setData({ ...data, title: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Fornecedor">
                  <Input
                    value={data.vendor ?? ''}
                    onChange={(e) => setData({ ...data, vendor: e.target.value })}
                  />
                </Field>
                <Field label="Descrição">
                  <Input
                    value={data.description ?? ''}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                  />
                </Field>
              </>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <SubmitButton loading={loading}>SALVAR ALTERAÇÕES</SubmitButton>
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
              >
                <Trash2 className="size-4" />
                {deleting ? 'EXCLUINDO…' : 'EXCLUIR'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
