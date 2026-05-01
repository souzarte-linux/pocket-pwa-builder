import { useEffect, useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Search, Filter, Fuel, Wrench, UtensilsCrossed, Package, FileText, TrendingUp, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatTime, todayBoundaries } from '@/lib/format';
import { EditTransactionDialog, EditTarget } from '@/components/EditTransactionDialog';

type Tab = 'todos' | 'ganhos' | 'despesas';

interface Tx {
  id: string;
  raw_id: string;
  table: 'routes' | 'daily_totals' | 'expenses';
  kind: 'route' | 'daily' | 'expense';
  title: string;
  subtitle: string;
  amount: number;
  positive: boolean;
  tag?: string;
  iconKey: 'fuel' | 'wrench' | 'food' | 'package' | 'doc';
  occurred_at: string;
}

const iconFor = (k: Tx['iconKey']) => {
  switch (k) {
    case 'fuel':
      return { Icon: Fuel, color: 'bg-warning/15 text-warning' };
    case 'wrench':
      return { Icon: Wrench, color: 'bg-info/15 text-info' };
    case 'food':
      return { Icon: UtensilsCrossed, color: 'bg-success/15 text-success' };
    case 'package':
      return { Icon: Package, color: 'bg-primary/15 text-primary' };
    case 'doc':
      return { Icon: FileText, color: 'bg-muted/30 text-foreground' };
  }
};

const Historico = () => {
  const [tab, setTab] = useState<Tab>('todos');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Tx[]>([]);
  const [todayBalance, setTodayBalance] = useState(0);
  const [todayExp, setTodayExp] = useState(0);
  const [goal, setGoal] = useState(300);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const load = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [routesRes, expRes, dailyRes, plats, prof] = await Promise.all([
      supabase
        .from('routes')
        .select('id, amount, tip, distance_km, product_type, occurred_at, platform_id, origin, destination')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('id, category, title, vendor, amount, occurred_at, payment_method')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false }),
      supabase
        .from('daily_totals')
        .select('id, amount, occurred_at, platform_id, product_type')
        .gte('occurred_at', since.toISOString())
        .order('occurred_at', { ascending: false }),
      supabase.from('platforms').select('id, name'),
      supabase.from('profiles').select('daily_goal').maybeSingle(),
    ]);

    if (prof.data?.daily_goal) setGoal(Number(prof.data.daily_goal));

    const platMap = new Map((plats.data ?? []).map((p: any) => [p.id, p.name]));

    const txs: Tx[] = [];
    (routesRes.data ?? []).forEach((r: any) => {
      txs.push({
        id: 'r' + r.id,
        raw_id: r.id,
        table: 'routes',
        kind: 'route',
        title: r.product_type === 'pacote' ? 'Entrega Expressa' : r.product_type === 'documento' ? 'Entrega de Docs' : 'Delivery Comida',
        subtitle: `${platMap.get(r.platform_id) ?? 'AVULSO'} • ${formatTime(r.occurred_at)}`,
        amount: Number(r.amount) + Number(r.tip),
        positive: true,
        tag: 'PAGO',
        iconKey: r.product_type === 'pacote' ? 'package' : r.product_type === 'documento' ? 'doc' : 'food',
        occurred_at: r.occurred_at,
      });
    });
    (dailyRes.data ?? []).forEach((d: any) => {
      txs.push({
        id: 'd' + d.id,
        raw_id: d.id,
        table: 'daily_totals',
        kind: 'daily',
        title: 'Total do dia',
        subtitle: `${platMap.get(d.platform_id) ?? 'AVULSO'} • ${formatTime(d.occurred_at)}`,
        amount: Number(d.amount),
        positive: true,
        tag: 'TOTAL',
        iconKey: 'package',
        occurred_at: d.occurred_at,
      });
    });
    (expRes.data ?? []).forEach((e: any) => {
      const ic =
        e.category === 'combustivel' ? 'fuel' : e.category === 'manutencao' ? 'wrench' : 'food';
      txs.push({
        id: 'e' + e.id,
        raw_id: e.id,
        table: 'expenses',
        kind: 'expense',
        title: e.title.toUpperCase(),
        subtitle: `${e.vendor ?? '—'} • ${formatTime(e.occurred_at)}`,
        amount: Number(e.amount),
        positive: false,
        tag: e.category.toUpperCase(),
        iconKey: ic,
        occurred_at: e.occurred_at,
      });
    });
    txs.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    setItems(txs);

    const t = todayBoundaries();
    const todayTx = txs.filter(
      (x) => x.occurred_at >= t.start && x.occurred_at <= t.end
    );
    setTodayBalance(
      todayTx.reduce((s, x) => s + (x.positive ? x.amount : -x.amount), 0)
    );
    setTodayExp(todayTx.filter((x) => !x.positive).reduce((s, x) => s + x.amount, 0));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items
      .filter((x) =>
        tab === 'todos'
          ? true
          : tab === 'ganhos'
          ? x.positive
          : !x.positive
      )
      .filter((x) =>
        search.trim()
          ? (x.title + ' ' + x.subtitle).toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [items, tab, search]);

  // group by date label
  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    filtered.forEach((x) => {
      const d = new Date(x.occurred_at);
      const today = new Date();
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      let label: string;
      if (d.toDateString() === today.toDateString()) label = `HOJE, ${d.getDate()} DE ${d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}`;
      else if (d.toDateString() === yest.toDateString()) label = `ONTEM, ${d.getDate()} DE ${d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}`;
      else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' }).toUpperCase();
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(x);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const pct = goal > 0 ? Math.min(100, (Math.max(0, todayBalance) / goal) * 100) : 0;

  return (
    <AppShell>
      {/* Search */}
      <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 border border-border/40">
        <Search className="size-5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="BUSCAR TRANSAÇÕES"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        <Filter className="size-5 text-primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-3">
        {(['todos', 'ganhos', 'despesas'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              tab === t
                ? 'bg-primary text-primary-foreground shadow-fab'
                : 'bg-surface text-muted-foreground border border-border/40'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Today balance */}
      <div className="mt-4 rounded-2xl bg-surface border border-border/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <span className="label-up text-xs text-muted-foreground">Saldo de hoje</span>
          {todayExp > 0 && (
            <span className="text-xs text-destructive font-bold">
              -{formatBRL(todayExp)} HOJE
            </span>
          )}
        </div>
        <p className="display text-3xl text-primary mt-1">{formatBRL(todayBalance)}</p>
        <div className="mt-3 h-2 rounded-full bg-surface-bright overflow-hidden">
          <div
            className="h-full bg-gradient-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground font-bold">
          <span>META: {formatBRL(goal)}</span>
          <span>{Math.round(pct)}% ATINGIDO</span>
        </div>
      </div>

      {/* Groups */}
      <div className="mt-6 space-y-6">
        {groups.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8 rounded-2xl bg-surface border border-dashed border-border/40">
            Nenhuma transação encontrada.
          </p>
        )}
        {groups.map(([label, list]) => (
          <section key={label}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-5 bg-primary rounded-full" />
              <h3 className="display text-base">{label}</h3>
            </div>
            <ul className="space-y-2.5">
              {list.map((x) => {
                const { Icon, color } = iconFor(x.iconKey);
                return (
                  <li
                    key={x.id}
                    className="rounded-xl bg-surface border border-border/40 p-3 flex items-center gap-3"
                  >
                    <span className={`size-11 rounded-lg grid place-items-center ${color}`}>
                      <Icon className="size-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase truncate">{x.title}</p>
                      <p className="text-[11px] text-muted-foreground uppercase truncate">
                        {x.subtitle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${x.positive ? 'text-primary' : 'text-destructive'}`}>
                        {x.positive ? '+' : '-'}
                        {formatBRL(x.amount)}
                      </p>
                      {x.tag && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            x.positive
                              ? 'bg-success/15 text-success'
                              : 'bg-destructive/15 text-destructive'
                          }`}
                        >
                          {x.tag}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditTarget({ table: x.table, id: x.raw_id, positive: x.positive })
                      }
                      aria-label="Editar"
                      className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-primary hover:bg-primary/10 transition active:scale-95"
                    >
                      <Settings className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <EditTransactionDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
    </AppShell>
  );
};

export default Historico;
