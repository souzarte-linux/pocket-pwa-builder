import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Clock,
  Pencil,
  Trash2,
  Download,
  TrendingUp,
  CalendarDays,
  Trophy,
  Layers,
  Plus,
  X,
  UtensilsCrossed,
  Package,
  FileText,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatHours } from '@/hooks/useWorkSession';
import {
  Field,
  Input,
  TextArea,
  Select,
  SegButton,
  SubmitButton,
  FormShell,
} from '@/components/forms/Form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Period = 'dia' | 'semana' | 'mes' | 'custom';
type SortKey = 'recent' | 'mostHours' | 'leastHours';

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

interface Platform {
  id: string;
  name: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))', '#a78bfa', '#f472b6'];

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeek = () => {
  const d = startOfToday();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
};
const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toDateInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const sessionHours = (s: Session) => {
  if (!s.ended_at) return 0;
  const ms = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime() - (s.break_minutes ?? 0) * 60000;
  return Math.max(0, ms) / 3600000;
};

const productLabel = (p: string | null) =>
  p === 'pacote' ? 'Pacotes' : p === 'documento' ? 'Documentos' : 'Alimento';

const GestaoHoras = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<Period>('mes');
  const [customStart, setCustomStart] = useState(toDateInput(startOfMonth()));
  const [customEnd, setCustomEnd] = useState(toDateInput(new Date()));
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  const [editing, setEditing] = useState<Session | null>(null);

  const load = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      supabase.from('platforms').select('id, name').eq('active', true).order('name'),
      supabase
        .from('work_sessions')
        .select('id, started_at, ended_at, break_minutes, start_km, end_km, product_type, platform_id, notes')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(1000),
    ]);
    setPlatforms(pRes.data ?? []);
    setSessions((sRes.data as Session[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const platformName = (id: string | null) =>
    platforms.find((p) => p.id === id)?.name ?? 'Avulso';

  const { rangeStart, rangeEnd } = useMemo(() => {
    let s = startOfMonth();
    const e = new Date();
    e.setHours(23, 59, 59, 999);
    if (period === 'dia') s = startOfToday();
    else if (period === 'semana') s = startOfWeek();
    else if (period === 'mes') s = startOfMonth();
    else if (period === 'custom') {
      s = new Date(customStart + 'T00:00:00');
      const ce = new Date(customEnd + 'T23:59:59');
      return { rangeStart: s, rangeEnd: ce };
    }
    return { rangeStart: s, rangeEnd: e };
  }, [period, customStart, customEnd]);

  const filtered = useMemo(() => {
    const min = minHours === '' ? -Infinity : Number(minHours);
    const max = maxHours === '' ? Infinity : Number(maxHours);
    return sessions
      .filter((s) => {
        const t = new Date(s.started_at).getTime();
        if (t < rangeStart.getTime() || t > rangeEnd.getTime()) return false;
        if (filterPlatform !== 'all' && (s.platform_id ?? '') !== filterPlatform) return false;
        if (filterCategory !== 'all' && (s.product_type ?? 'alimento') !== filterCategory) return false;
        const h = sessionHours(s);
        if (h < min || h > max) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'mostHours') return sessionHours(b) - sessionHours(a);
        if (sortKey === 'leastHours') return sessionHours(a) - sessionHours(b);
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });
  }, [sessions, rangeStart, rangeEnd, filterPlatform, filterCategory, minHours, maxHours, sortKey]);

  // Aggregations
  const totalHours = filtered.reduce((s, x) => s + sessionHours(x), 0);
  const daysWithWork = new Set(filtered.map((s) => new Date(s.started_at).toDateString())).size;
  const avgPerDay = daysWithWork ? totalHours / daysWithWork : 0;

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const k = new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map.set(k, (map.get(k) ?? 0) + sessionHours(s));
    });
    return Array.from(map.entries())
      .map(([day, hours]) => ({ day, hours: Number(hours.toFixed(2)) }))
      .reverse();
  }, [filtered]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const k = platformName(s.platform_id);
      map.set(k, (map.get(k) ?? 0) + sessionHours(s));
    });
    return Array.from(map.entries()).map(([name, hours]) => ({ name, hours: Number(hours.toFixed(2)) }));
  }, [filtered, platforms]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((s) => {
      const k = productLabel(s.product_type);
      map.set(k, (map.get(k) ?? 0) + sessionHours(s));
    });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(map.entries()).map(([name, hours]) => ({
      name,
      hours: Number(hours.toFixed(2)),
      pct: Math.round((hours / total) * 100),
    }));
  }, [filtered]);

  const topPlatform = byPlatform.slice().sort((a, b) => b.hours - a.hours)[0];
  const topDay = byDay.slice().sort((a, b) => b.hours - a.hours)[0];

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este registro de horas?')) return;
    const { error } = await supabase.from('work_sessions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Registro excluído');
    load();
  };

  const exportCSV = () => {
    if (!filtered.length) return toast.info('Nada para exportar');
    const header = ['Data', 'Início', 'Fim', 'Horas', 'Pausa (min)', 'KM', 'Plataforma', 'Categoria', 'Observações'];
    const rows = filtered.map((s) => {
      const d = new Date(s.started_at);
      const e = s.ended_at ? new Date(s.ended_at) : null;
      const km = Math.max(0, Number(s.end_km ?? 0) - Number(s.start_km ?? 0));
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR'),
        e ? e.toLocaleTimeString('pt-BR') : '',
        sessionHours(s).toFixed(2),
        String(s.break_minutes ?? 0),
        km.toFixed(1),
        platformName(s.platform_id),
        productLabel(s.product_type),
        (s.notes ?? '').replace(/"/g, '""'),
      ];
    });
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horas-trabalhadas-${toDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell back title="GESTÃO DE HORAS">
      {/* Quick add */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/horas-trabalhadas')}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition"
        >
          <Plus className="size-4" /> NOVO REGISTRO
        </button>
        <button
          onClick={exportCSV}
          className="h-12 px-4 rounded-xl bg-surface-high text-foreground font-bold text-sm inline-flex items-center gap-2 active:scale-95 transition"
        >
          <Download className="size-4" /> CSV
        </button>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<Clock className="size-5" />}
          label="Total de horas"
          value={`${totalHours.toFixed(1)}h`}
        />
        <SummaryCard
          icon={<TrendingUp className="size-5" />}
          label="Média / dia"
          value={`${avgPerDay.toFixed(1)}h`}
        />
        <SummaryCard
          icon={<Trophy className="size-5" />}
          label="Plataforma top"
          value={topPlatform ? topPlatform.name : '—'}
          sub={topPlatform ? `${topPlatform.hours.toFixed(1)}h` : ''}
        />
        <SummaryCard
          icon={<CalendarDays className="size-5" />}
          label="Dia mais pesado"
          value={topDay ? topDay.day : '—'}
          sub={topDay ? `${topDay.hours.toFixed(1)}h` : ''}
        />
      </section>

      {/* Filters */}
      <section className="mt-5 rounded-2xl bg-surface border border-border/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h3 className="display text-sm">FILTROS</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(['dia', 'semana', 'mes', 'custom'] as Period[]).map((p) => (
            <SegButton key={p} active={period === p} onClick={() => setPeriod(p)}>
              <span className="text-xs">{p === 'dia' ? 'Dia' : p === 'semana' ? 'Sem' : p === 'mes' ? 'Mês' : 'Custom'}</span>
            </SegButton>
          ))}
        </div>
        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="De">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </Field>
            <Field label="Até">
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Plataforma">
            <Select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="all">Todas</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="">Avulso</option>
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">Todas</option>
              <option value="alimento">Alimento</option>
              <option value="pacote">Pacotes</option>
              <option value="documento">Documentos</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Horas mín.">
            <Input type="number" min="0" step="0.5" value={minHours} onChange={(e) => setMinHours(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Horas máx.">
            <Input type="number" min="0" step="0.5" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} placeholder="—" />
          </Field>
          <Field label="Ordenar">
            <Select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="recent">Mais recente</option>
              <option value="mostHours">+ horas</option>
              <option value="leastHours">- horas</option>
            </Select>
          </Field>
        </div>
      </section>

      {/* Charts */}
      <section className="mt-5 space-y-4">
        <ChartCard title="Horas por dia">
          {byDay.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={byDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RTooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={700}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty msg="Sem dados no período" />
          )}
        </ChartCard>

        <ChartCard title="Horas por plataforma">
          {byPlatform.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPlatform} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <RTooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]} animationDuration={700}>
                  {byPlatform.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty msg="Sem dados no período" />
          )}
        </ChartCard>

        <ChartCard title="Horas por categoria">
          {byCategory.length ? (
            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="hours"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    animationDuration={700}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-1.5 pr-2">
                {byCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-bold">{c.name}</span>
                    <span className="text-muted-foreground">{c.hours.toFixed(1)}h • {c.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty msg="Sem dados no período" />
          )}
        </ChartCard>
      </section>

      {/* List */}
      <section className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="display text-lg">REGISTROS ({filtered.length})</h3>
        </div>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-6">Carregando…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-surface border border-dashed border-border/40">
            <Clock className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum registro encontrado.
              <br />
              <button onClick={() => navigate('/horas-trabalhadas')} className="text-primary font-bold underline mt-2">
                Lançar primeira jornada
              </button>
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((s) => {
              const h = sessionHours(s);
              const dt = new Date(s.started_at);
              const km = Math.max(0, Number(s.end_km ?? 0) - Number(s.start_km ?? 0));
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-surface border border-border/40 p-3 flex items-center gap-3"
                >
                  <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                    {s.product_type === 'pacote' ? <Package className="size-4" /> : s.product_type === 'documento' ? <FileText className="size-4" /> : <UtensilsCrossed className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm uppercase truncate">
                      {platformName(s.platform_id)} • {h.toFixed(1)}h
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase truncate">
                      {dt.toLocaleDateString('pt-BR')} • {productLabel(s.product_type)} • {km.toFixed(1)}km
                    </p>
                    {s.notes && (
                      <p className="text-[11px] text-muted-foreground truncate italic">"{s.notes}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditing(s)}
                    aria-label="Editar"
                    className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-primary hover:bg-primary/10 transition active:scale-95"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    aria-label="Excluir"
                    className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition active:scale-95"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>

      <EditDialog
        session={editing}
        platforms={platforms}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </AppShell>
  );
};

const SummaryCard = ({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl bg-surface border border-border/40 p-3 shadow-card"
  >
    <div className="flex items-center gap-2 text-primary">
      {icon}
      <span className="text-[10px] label-up text-muted-foreground">{label}</span>
    </div>
    <p className="display text-xl mt-1 truncate">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
  </motion.div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card">
    <h4 className="display text-sm mb-3">{title.toUpperCase()}</h4>
    {children}
  </div>
);

const Empty = ({ msg }: { msg: string }) => (
  <p className="text-center text-xs text-muted-foreground py-8">{msg}</p>
);

// Edit dialog
const EditDialog = ({
  session,
  platforms,
  onClose,
  onSaved,
}: {
  session: Session | null;
  platforms: Platform[];
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [platformId, setPlatformId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [breakMin, setBreakMin] = useState('0');
  const [startKm, setStartKm] = useState('0');
  const [endKm, setEndKm] = useState('0');
  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setPlatformId(session.platform_id ?? '');
    setStartAt(toLocalInput(session.started_at));
    setEndAt(session.ended_at ? toLocalInput(session.ended_at) : '');
    setBreakMin(String(session.break_minutes ?? 0));
    setStartKm(String(session.start_km ?? 0));
    setEndKm(String(session.end_km ?? 0));
    setType(((session.product_type as any) ?? 'alimento'));
    setNotes(session.notes ?? '');
  }, [session]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!startAt || !endAt) return toast.error('Informe início e fim.');
    const startedISO = new Date(startAt).toISOString();
    const endedISO = new Date(endAt).toISOString();
    if (new Date(endedISO) <= new Date(startedISO)) {
      return toast.error('A hora final deve ser maior que a inicial.');
    }
    const sKm = Number(startKm) || 0;
    const eKm = Number(endKm) || 0;
    if (eKm < sKm) return toast.error('KM final deve ser ≥ KM inicial.');

    setSaving(true);
    const { error } = await supabase
      .from('work_sessions')
      .update({
        platform_id: platformId || null,
        product_type: type,
        notes: notes || null,
        started_at: startedISO,
        ended_at: endedISO,
        break_minutes: Number(breakMin) || 0,
        start_km: sKm,
        end_km: eKm,
      })
      .eq('id', session.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Registro atualizado!');
    onSaved();
  };

  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar registro de horas</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit}>
          <FormShell footer={<SubmitButton loading={saving}>SALVAR</SubmitButton>}>
            <Field label="Plataforma">
              <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                <option value="">Avulso</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Início">
                <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
              </Field>
              <Field label="Fim">
                <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
              </Field>
            </div>
            <Field label="Pausa (min)">
              <Input type="number" min="0" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="KM inicial">
                <Input type="number" min="0" step="0.1" value={startKm} onChange={(e) => setStartKm(e.target.value)} />
              </Field>
              <Field label="KM final">
                <Input type="number" min="0" step="0.1" value={endKm} onChange={(e) => setEndKm(e.target.value)} />
              </Field>
            </div>
            <Field label="Categoria">
              <div className="grid grid-cols-3 gap-2">
                <SegButton active={type === 'alimento'} onClick={() => setType('alimento')}>Alimento</SegButton>
                <SegButton active={type === 'pacote'} onClick={() => setType('pacote')}>Pacotes</SegButton>
                <SegButton active={type === 'documento'} onClick={() => setType('documento')}>Documentos</SegButton>
              </div>
            </Field>
            <Field label="Observações">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </FormShell>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GestaoHoras;
