import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Field, FormShell, Input, SubmitButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Pencil, Trash2, Wrench, X, Check } from 'lucide-react';

interface OilChange {
  id: string;
  changed_at: string;
  km_at_change: number;
  notes: string | null;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TrocasOleo = () => {
  const [items, setItems] = useState<OilChange[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(toLocalInput(new Date().toISOString()));
  const [km, setKm] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDate, setEDate] = useState('');
  const [eKm, setEKm] = useState('');
  const [eNotes, setENotes] = useState('');

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUserId(u.user.id);
    const { data } = await supabase
      .from('oil_changes' as any)
      .select('*')
      .eq('user_id', u.user.id)
      .order('changed_at', { ascending: false });
    setItems((data as any) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      toast.error('Data e hora inválidas');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('oil_changes' as any).insert({
      user_id: userId,
      changed_at: parsedDate.toISOString(),
      km_at_change: Number(km) || 0,
      notes: notes || null,
    } as any);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Atualiza marcador no perfil apenas se insert for bem-sucedido
    await supabase
      .from('profiles')
      .update({ last_oil_change_at: parsedDate.toISOString() } as any)
      .eq('id', userId);
    toast.success('Troca registrada');
    setKm('');
    setNotes('');
    setDate(toLocalInput(new Date().toISOString()));
    load();
  };

  const startEdit = (it: OilChange) => {
    setEditingId(it.id);
    setEDate(toLocalInput(it.changed_at));
    setEKm(String(it.km_at_change));
    setENotes(it.notes ?? '');
  };

  const saveEdit = async (id: string) => {
    const parsedDate = new Date(eDate);
    if (isNaN(parsedDate.getTime())) {
      toast.error('Data e hora inválidas');
      return;
    }
    const { error } = await supabase
      .from('oil_changes' as any)
      .update({
        changed_at: parsedDate.toISOString(),
        km_at_change: Number(eKm) || 0,
        notes: eNotes || null,
      } as any)
      .eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Sincroniza last_oil_change_at com a troca mais recente
    if (userId) {
      const { data: latest } = await supabase
        .from('oil_changes' as any)
        .select('changed_at')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      await supabase
        .from('profiles')
        .update({ last_oil_change_at: (latest as any)?.changed_at ?? null } as any)
        .eq('id', userId);
    }
    setEditingId(null);
    toast.success('Troca atualizada');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta troca de óleo?')) return;
    const { error } = await supabase.from('oil_changes' as any).delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (userId) {
      const { data: latest } = await supabase
        .from('oil_changes' as any)
        .select('changed_at')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      await supabase
        .from('profiles')
        .update({ last_oil_change_at: (latest as any)?.changed_at ?? null } as any)
        .eq('id', userId);
    }
    toast.success('Removida');
    load();
  };

  const undoLast = async () => {
    if (items.length === 0) return;
    await remove(items[0].id);
  };

  return (
    <AppShell title="TROCAS DE ÓLEO" back>
      <form onSubmit={submit} noValidate>
        <FormShell footer={<SubmitButton loading={loading}>REGISTRAR TROCA</SubmitButton>}>
          <h3 className="display text-primary text-lg flex items-center gap-2">
            <Wrench className="size-5" /> NOVA TROCA
          </h3>
          <Field label="Data e hora">
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="KM rodados (no momento da troca)">
            <Input type="number" step="0.1" value={km} onChange={(e) => setKm(e.target.value)} placeholder="Ex.: 45230" required />
          </Field>
          <Field label="Observações">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: troca + filtro" />
          </Field>
        </FormShell>
      </form>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="display text-lg">HISTÓRICO</h3>
          {items.length > 0 && (
            <button
              onClick={undoLast}
              className="text-xs font-bold uppercase text-destructive underline underline-offset-2"
            >
              Desfazer última
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 rounded-2xl bg-surface border border-dashed border-border/40">
            Nenhuma troca registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((it) => {
              const editing = editingId === it.id;
              return (
                <li
                  key={it.id}
                  className="rounded-xl bg-surface border border-border/40 p-3"
                >
                  {editing ? (
                    <div className="space-y-2">
                      <Input type="datetime-local" value={eDate} onChange={(e) => setEDate(e.target.value)} />
                      <Input type="number" step="0.1" value={eKm} onChange={(e) => setEKm(e.target.value)} placeholder="KM" />
                      <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} placeholder="Observações" />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg bg-surface-high text-xs font-bold uppercase inline-flex items-center gap-1"
                        >
                          <X className="size-3.5" /> Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(it.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase inline-flex items-center gap-1"
                        >
                          <Check className="size-3.5" /> Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="size-11 rounded-lg bg-surface-high grid place-items-center text-primary">
                        <Wrench className="size-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">
                          {new Date(it.changed_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(it.km_at_change).toLocaleString('pt-BR')} KM
                          {it.notes ? ` • ${it.notes}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => startEdit(it)}
                        className="size-9 grid place-items-center rounded-lg bg-surface-high hover:bg-surface-highest"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => remove(it.id)}
                        className="size-9 grid place-items-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
};

export default TrocasOleo;
