import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SessionToggle } from '@/components/SessionToggle';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatKm } from '@/lib/format';
import { formatHours } from '@/hooks/useWorkSession';
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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Clock,
  Gauge,
  MapPin,
  Package,
  Route as RouteIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type Period = 'dia' | 'semana' | 'quinzena' | 'mes' | 'ano';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'quinzena', label: 'Quinzena' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

const startOf = (p: Period): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'dia') return d;
  if (p === 'semana') {
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  if (p === 'quinzena') {
    d.setDate(d.getDate() - 14);
    return d;
  }
  if (p === 'mes') {
    d.setDate(1);
    return d;
  }
  const y = new Date();
  y.setMonth(0, 1);
  y.setHours(0, 0, 0, 0);
  return y;
};

interface Route {
  amount: number;
  tip: number;
  distance_km: number;
  platform_id: string | null;
  product_type: string;
  origin: string | null;
  destination: string | null;
  occurred_at: string;
  package_count: number | null;
  package_unit_price: number | null;
}
interface DailyTotal {
  amount: number;
  distance_km: number | null;
  platform_id: string | null;
  product_type: string;
  occurred_at: string;
  subtract_routes: boolean;
}
interface Expense {
  amount: number;
  category: string;
  occurred_at: string;
}
interface Session {
  started_at: string;
  ended_at: string | null;
}
interface Platform {
  id: string;
  name: string;
}

const COLORS = [
  'hsl(19 100% 50%)',
  'hsl(41 100% 50%)',
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(280 80% 60%)',
  'hsl(0 84% 60%)',
];

const Relatorios = () => {
  const [period, setPeriod] = useState<Period>('semana');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [dailies, setDailies] = useState<DailyTotal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = startOf(period).toISOString();
      const [r, d, e, s, p] = await Promise.all([
        supabase
          .from('routes')
          .select('amount, tip, distance_km, platform_id, product_type, origin, destination, occurred_at, package_count, package_unit_price')
          .gte('occurred_at', since),
        supabase
          .from('daily_totals')
          .select('amount, distance_km, platform_id, product_type, occurred_at, subtract_routes')
          .gte('occurred_at', since),
        supabase.from('expenses').select('amount, category, occurred_at').gte('occurred_at', since),
        supabase.from('work_sessions').select('started_at, ended_at').gte('started_at', since),
        supabase.from('platforms').select('id, name'),
      ]);
      setRoutes((r.data ?? []) as Route[]);
      setDailies((d.data ?? []) as DailyTotal[]);
      setExpenses((e.data ?? []) as Expense[]);
      setSessions((s.data ?? []) as Session[]);
      setPlatforms((p.data ?? []) as Platform[]);
      setLoading(false);
    };
    load();
  }, [period]);

  const platformName = (id: string | null) =>
    (id && platforms.find((p) => p.id === id)?.name) || 'Sem plataforma';

  const stats = useMemo(() => {
    const totalRevenue =
      routes.reduce((s, r) => s + Number(r.amount) + Number(r.tip ?? 0), 0) +
      dailies.reduce((s, d) => s + Number(d.amount), 0);
    const totalKm =
      routes.reduce((s, r) => s + Number(r.distance_km ?? 0), 0) +
      dailies.reduce((s, d) => s + Number(d.distance_km ?? 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const profit = totalRevenue - totalExpense;
    const totalMs = sessions.reduce((s, ses) => {
      const end = ses.ended_at ? new Date(ses.ended_at).getTime() : Date.now();
      return s + Math.max(0, end - new Date(ses.started_at).getTime());
    }, 0);
    const hours = totalMs / 3600000;
    const totalPackages = routes.reduce((s, r) => s + Number(r.package_count ?? 0), 0);
    return {
      totalRevenue,
      totalKm,
      totalExpense,
      profit,
      hours,
      totalPackages,
      revPerKm: totalKm > 0 ? totalRevenue / totalKm : 0,
      costPerKm: totalKm > 0 ? totalExpense / totalKm : 0,
      profitPerKm: totalKm > 0 ? profit / totalKm : 0,
      revPerHour: hours > 0 ? totalRevenue / hours : 0,
      profitPerHour: hours > 0 ? profit / hours : 0,
      routeCount: routes.length,
      avgTicket: routes.length > 0 ? totalRevenue / routes.length : 0,
      avgPackagePrice: totalPackages > 0
        ? routes.reduce((s, r) => s + Number(r.amount), 0) / totalPackages
        : 0,
    };
  }, [routes, dailies, expenses, sessions]);

  // Per platform aggregates
  const byPlatform = useMemo(() => {
    const map = new Map<
      string,
      { name: string; revenue: number; km: number; ms: number }
    >();
    routes.forEach((r) => {
      const k = r.platform_id ?? '__none__';
      const cur = map.get(k) ?? { name: platformName(r.platform_id), revenue: 0, km: 0, ms: 0 };
      cur.revenue += Number(r.amount) + Number(r.tip ?? 0);
      cur.km += Number(r.distance_km ?? 0);
      map.set(k, cur);
    });
    dailies.forEach((d) => {
      const k = d.platform_id ?? '__none__';
      const cur = map.get(k) ?? { name: platformName(d.platform_id), revenue: 0, km: 0, ms: 0 };
      cur.revenue += Number(d.amount);
      cur.km += Number(d.distance_km ?? 0);
      map.set(k, cur);
    });
    // Distribute hours proportionally to revenue (sessions aren't tagged by platform)
    const totalRev = Array.from(map.values()).reduce((s, v) => s + v.revenue, 0);
    const totalMs = sessions.reduce((s, ses) => {
      const end = ses.ended_at ? new Date(ses.ended_at).getTime() : Date.now();
      return s + Math.max(0, end - new Date(ses.started_at).getTime());
    }, 0);
    map.forEach((v) => {
      v.ms = totalRev > 0 ? totalMs * (v.revenue / totalRev) : 0;
    });
    return Array.from(map.values())
      .map((v) => ({
        name: v.name,
        revenue: Number(v.revenue.toFixed(2)),
        revPerKm: v.km > 0 ? Number((v.revenue / v.km).toFixed(2)) : 0,
        revPerHour: v.ms > 0 ? Number((v.revenue / (v.ms / 3600000)).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [routes, dailies, sessions, platforms]);

  // Categories (product type)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    [...routes, ...dailies].forEach((x: any) => {
      const k = x.product_type || 'alimento';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    const labels: Record<string, string> = {
      alimento: 'Alimento',
      pacote: 'Pacotes',
      documento: 'Documentos',
    };
    return Array.from(map.entries()).map(([k, v]) => ({
      name: labels[k] ?? k,
      value: v,
    }));
  }, [routes, dailies]);

  // Top origins / destinations
  const topPlaces = (key: 'origin' | 'destination') => {
    const map = new Map<string, number>();
    routes.forEach((r) => {
      const v = (r[key] ?? '').trim();
      if (!v) return;
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  };
  const topOrigins = useMemo(() => topPlaces('origin'), [routes]);
  const topDestinations = useMemo(() => topPlaces('destination'), [routes]);

  // Daily series (revenue, expense, profit)
  const series = useMemo(() => {
    const since = startOf(period);
    const days =
      period === 'dia'
        ? 1
        : Math.max(
            1,
            Math.ceil((Date.now() - since.getTime()) / 86400000) + 1
          );
    const granularity: 'day' | 'month' = period === 'ano' ? 'month' : 'day';
    const buckets = new Map<string, { label: string; receita: number; despesa: number }>();

    const keyFor = (iso: string) => {
      const d = new Date(iso);
      if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const label = (key: string) => {
      if (granularity === 'month') {
        const [, m] = key.split('-');
        return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(m) - 1];
      }
      const [, m, d] = key.split('-');
      return `${d}/${m}`;
    };

    // Pre-fill buckets so chart shows continuity
    if (granularity === 'day') {
      for (let i = 0; i < Math.min(days, 60); i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const k = keyFor(d.toISOString());
        buckets.set(k, { label: label(k), receita: 0, despesa: 0 });
      }
    } else {
      const cur = new Date(since);
      while (cur <= new Date()) {
        const k = keyFor(cur.toISOString());
        buckets.set(k, { label: label(k), receita: 0, despesa: 0 });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    routes.forEach((r) => {
      const k = keyFor(r.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.receita += Number(r.amount) + Number(r.tip ?? 0);
      buckets.set(k, b);
    });
    dailies.forEach((d) => {
      const k = keyFor(d.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.receita += Number(d.amount);
      buckets.set(k, b);
    });
    expenses.forEach((e) => {
      const k = keyFor(e.occurred_at);
      const b = buckets.get(k) ?? { label: label(k), receita: 0, despesa: 0 };
      b.despesa += Number(e.amount);
      buckets.set(k, b);
    });

    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => ({ ...v, lucro: Number((v.receita - v.despesa).toFixed(2)) }));
  }, [routes, dailies, expenses, period]);

  return (
    <AppShell title={'RELATÓRIOS\nINSIGHTS'}>
      <div className="space-y-4">
        <SessionToggle />

        {/* Period selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                period === p.id
                  ? 'bg-primary text-primary-foreground shadow-fab'
                  : 'bg-surface-high text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi
            Icon={Banknote}
            label="Receita"
            value={formatBRL(stats.totalRevenue)}
            tone="primary"
          />
          <Kpi
            Icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
            label="Lucro"
            value={formatBRL(stats.profit)}
            tone={stats.profit >= 0 ? 'success' : 'destructive'}
          />
          <Kpi Icon={Gauge} label="R$ / KM" value={formatBRL(stats.revPerKm)} tone="accent" />
          <Kpi Icon={Clock} label="R$ / Hora" value={formatBRL(stats.revPerHour)} tone="info" />
          <Kpi Icon={RouteIcon} label="KM rodados" value={formatKm(stats.totalKm)} />
          <Kpi Icon={Clock} label="Horas trab." value={formatHours(stats.hours * 3600000)} />
          <Kpi
            Icon={TrendingDown}
            label="Custo / KM"
            value={formatBRL(stats.costPerKm)}
            tone="destructive"
          />
          <Kpi Icon={Package} label="Rotas" value={String(stats.routeCount)} />
        </div>

        {/* Revenue x Expense x Profit timeline */}
        <Section title="DESEMPENHO NO PERÍODO">
          {series.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatBRL(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="receita" stroke="hsl(19 100% 50%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="despesa" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lucro" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        {/* Per platform */}
        <Section title="POR PLATAFORMA">
          {byPlatform.length === 0 ? (
            <Empty hint="Cadastre plataformas e lance rotas." />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPlatform} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--surface))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatBRL(v)}
                    />
                    <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                      {byPlatform.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 divide-y divide-border/40">
                {byPlatform.map((p, i) => (
                  <li key={p.name} className="py-2 flex items-center gap-3">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBRL(p.revPerKm)}/km · {formatBRL(p.revPerHour)}/h
                      </p>
                    </div>
                    <span className="text-primary font-bold text-sm">{formatBRL(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        {/* Categories */}
        <Section title="CATEGORIAS ENTREGUES">
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={36}
                      outerRadius={64}
                      strokeWidth={0}
                    >
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--surface))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {byCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm font-semibold flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Origins / Destinations */}
        <div className="grid grid-cols-1 gap-3">
          <PlacesCard title="TOP ORIGENS" items={topOrigins} icon={<MapPin className="size-4" />} />
          <PlacesCard title="TOP DESTINOS" items={topDestinations} icon={<MapPin className="size-4" />} />
        </div>

        {loading && (
          <p className="text-center text-xs text-muted-foreground py-4">Carregando insights…</p>
        )}
      </div>
    </AppShell>
  );
};

const Kpi = ({
  Icon,
  label,
  value,
  tone = 'foreground',
}: {
  Icon: any;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'destructive' | 'accent' | 'info' | 'foreground';
}) => {
  const toneCls: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    destructive: 'text-destructive',
    accent: 'text-accent',
    info: 'text-info',
    foreground: 'text-foreground',
  };
  return (
    <div className="rounded-2xl bg-surface border border-border/40 p-3 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`size-4 ${toneCls[tone]}`} />
        <span className="label-up text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`display text-xl ${toneCls[tone]}`}>{value}</p>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card">
    <h3 className="display text-base mb-3">{title}</h3>
    {children}
  </section>
);

const Empty = ({ hint = 'Sem dados no período.' }: { hint?: string }) => (
  <p className="text-sm text-muted-foreground text-center py-6">{hint}</p>
);

const PlacesCard = ({
  title,
  items,
  icon,
}: {
  title: string;
  items: { name: string; value: number }[];
  icon: React.ReactNode;
}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <Empty hint="Lance rotas com origem/destino." />
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.name}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary">{icon}</span>
                <span className="text-sm font-semibold flex-1 truncate">{it.name}</span>
                <span className="text-xs text-muted-foreground">{it.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-bright overflow-hidden">
                <div
                  className="h-full bg-gradient-primary"
                  style={{ width: `${(it.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

export default Relatorios;
