import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  Field,
  Input,
  TextArea,
  Select,
  SegButton,
  SubmitButton,
  FormShell,
} from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, UtensilsCrossed, Package, FileText, Pencil, Trash2, X } from 'lucide-react';

const nowLocal = (offsetMin = 0) => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + offsetMin * 60000);
  return d.toISOString().slice(0, 16);
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fmtDur = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h${String(mm).padStart(2, '0')}`;
};

interface Session {
  id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  start_km: number;
  end_km: number;
  product_type: string | null;
  platform_id: string | null;
  notes: string | null;
}

const HorasTrabalhadas = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [startAt, setStartAt] = useState(nowLocal(-60));
  const [endAt, setEndAt] = useState(nowLocal());
  const [breakMin, setBreakMin] = useState<string>('0');
  const [startKm, setStartKm] = useState<string>('0');
  const [endKm, setEndKm] = useState<string>('0');
  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // New platform inline
  const [showNewPlat, setShowNewPlat] = useState(false);
  const [newPlatName, setNewPlatName] = useState('');
  const [creatingPlat, setCreatingPlat] = useState(false);

  const loadPlatforms = async () => {
    const { data } = await supabase
      .from('platforms')
      .select('id, name')
      .eq('active', true)
      .order('name');
    setPlatforms(data ?? []);
    if (!platformId && data?.[0]) setPlatformId(data[0].id);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('work_sessions')
      .select('id, started_at, ended_at, break_minutes, start_km, end_km, product_type, platform_id, notes')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(20);
    setSessions((data as Session[]) ?? []);
  };

  useEffect(() => {
    loadPlatforms();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setStartAt(nowLocal(-60));
    setEndAt(nowLocal());
    setBreakMin('0');
    setStartKm('0');
    setEndKm('0');
    setType('alimento');
    setNotes('');
    if (platforms[0]) setPlatformId(platforms[0].id);
  };

  const startEdit = (s: Session) => {
    setEditingId(s.id);
    setPlatformId(s.platform_id ?? '');
    setStartAt(toLocalInput(s.started_at));
    setEndAt(s.ended_at ? toLocalInput(s.ended_at) : nowLocal());
    setBreakMin(String(s.break_minutes ?? 0));
    setStartKm(String(s.start_km ?? 0));
    setEndKm(String(s.end_km ?? 0));
    setType((s.product_type as any) ?? 'alimento');
    setNotes(s.notes ?? '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createPlatformInline = async () => {
    if (!newPlatName.trim()) return;
    setCreatingPlat(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from('platforms')
      .insert({
        user_id: u.user.id,
        name: newPlatName.trim(),
        cycle: 'semanal',
        active: true,
      })
      .select('id, name')
      .single();
    setCreatingPlat(false);
    if (error) return toast.error(error.message);
    if (data) {
      setPlatforms((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setPlatformId(data.id);
      setNewPlatName('');
      setShowNewPlat(false);
      toast.success('Plataforma adicionada!');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt) return toast.error('Informe início e fim.');
    const startedISO = new Date(startAt).toISOString();
    const endedISO = new Date(endAt).toISOString();
    if (new Date(endedISO) <= new Date(startedISO)) {
      return toast.error('A hora final deve ser maior que a inicial.');
    }
    const brk = Number(breakMin) || 0;
    const sKm = Number(startKm) || 0;
    const eKm = Number(endKm) || 0;
    if (eKm < sKm) return toast.error('KM final deve ser ≥ KM inicial.');

    setLoading(true);
    const payload = {
      platform_id: platformId || null,
      product_type: type,
      notes: notes || null,
      started_at: startedISO,
      ended_at: endedISO,
      break_minutes: brk,
      start_km: sKm,
      end_km: eKm,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('work_sessions').update(payload).eq('id', editingId));
    } else {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      ({ error } = await supabase.from('work_sessions').insert({ ...payload, user_id: u.user.id }));
    }
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? 'Registro atualizado!' : 'Horas registradas!');
    resetForm();
    loadSessions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('work_sessions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Excluído');
    if (editingId === id) resetForm();
    loadSessions();
  };

  return (
    <AppShell back title="HORAS TRABALHADAS">
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>{editingId ? 'SALVAR ALTERAÇÕES ✓' : 'SALVAR REGISTRO ✓'}</SubmitButton>}>
          {editingId && (
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/30 px-3 py-2">
              <span className="text-xs font-bold text-primary uppercase">Editando registro</span>
              <button
                type="button"
                onClick={resetForm}
                className="text-primary inline-flex items-center gap-1 text-xs font-bold"
              >
                <X className="size-3" /> Cancelar
              </button>
            </div>
          )}

          <Field label="Plataforma">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
              >
                <option value="">Selecione a Plataforma</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setShowNewPlat((v) => !v)}
                className="h-12 w-12 grid place-items-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition"
                aria-label="Adicionar plataforma"
              >
                <Plus className="size-5" />
              </button>
            </div>
            {showNewPlat && (
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <Input
                  value={newPlatName}
                  onChange={(e) => setNewPlatName(e.target.value)}
                  placeholder="Nome da nova plataforma"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={createPlatformInline}
                  disabled={creatingPlat}
                  className="h-12 px-4 rounded-xl bg-success text-success-foreground font-bold text-sm disabled:opacity-60"
                >
                  {creatingPlat ? '...' : 'OK'}
                </button>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3">
            <Field label="Início (data e hora)">
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </Field>
            <Field label="Fim (data e hora)">
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Intervalo / descanso (minutos)">
            <Input
              type="number"
              min="0"
              step="1"
              value={breakMin}
              onChange={(e) => setBreakMin(e.target.value)}
              placeholder="0"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="KM inicial">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="KM final">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Tipo de entrega">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={type === 'alimento'} onClick={() => setType('alimento')}>
                <span className="flex flex-col items-center gap-1">
                  <UtensilsCrossed className="size-5" />
                  Alimento
                </span>
              </SegButton>
              <SegButton active={type === 'pacote'} onClick={() => setType('pacote')}>
                <span className="flex flex-col items-center gap-1">
                  <Package className="size-5" />
                  Pacotes
                </span>
              </SegButton>
              <SegButton active={type === 'documento'} onClick={() => setType('documento')}>
                <span className="flex flex-col items-center gap-1">
                  <FileText className="size-5" />
                  Documentos
                </span>
              </SegButton>
            </div>
          </Field>

          <Field label="Observações">
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes da jornada…"
            />
          </Field>
        </FormShell>
      </form>

      {/* Recent sessions list */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="display text-lg">REGISTROS RECENTES</h3>
        </div>
        {sessions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6 rounded-2xl bg-surface border border-dashed border-border/40">
            Nenhum registro ainda.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {sessions.map((s) => {
              const dur = s.ended_at
                ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime() - (s.break_minutes ?? 0) * 60000
                : 0;
              const km = Math.max(0, Number(s.end_km ?? 0) - Number(s.start_km ?? 0));
              const platName = platforms.find((p) => p.id === s.platform_id)?.name ?? 'AVULSO';
              const dt = new Date(s.started_at);
              return (
                <li
                  key={s.id}
                  className="rounded-xl bg-surface border border-border/40 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm uppercase truncate">
                      {platName} • {fmtDur(dur)}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase truncate">
                      {dt.toLocaleDateString('pt-BR')} • {km.toFixed(1)} km
                      {s.break_minutes ? ` • ${s.break_minutes}min pausa` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    aria-label="Editar"
                    className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-primary hover:bg-primary/10 transition active:scale-95"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    aria-label="Excluir"
                    className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition active:scale-95"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
};

export default HorasTrabalhadas;
