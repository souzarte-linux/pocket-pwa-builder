import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Search, Filter, Fuel, Wrench, UtensilsCrossed, Package, FileText, Settings, Calendar, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatTime, todayBoundaries } from '@/lib/format';
import { EditTransactionDialog, EditTarget } from '@/components/EditTransactionDialog';
import { startOfWeek, endOfWeek, isSameWeek, isSameMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface DayGroup { label: string; date: string; txs: Tx[]; balance: number; }
interface WeekGroup { label: string; start: Date; end: Date; days: DayGroup[]; balance: number; isCurrentWeek: boolean; }
interface MonthGroup { label: string; month: Date; weeks: WeekGroup[]; balance: number; isCurrentMonth: boolean; }

const TxRow = ({ x, onEdit }: { x: Tx, onEdit: (x: Tx) => void }) => {
  const { Icon, color } = iconFor(x.iconKey);
  return (
    <li className="rounded-xl bg-surface border border-border/40 p-3 flex items-center gap-3">
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
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${x.positive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
            {x.tag}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => onEdit(x)}
        aria-label="Editar"
        className="size-9 shrink-0 rounded-lg grid place-items-center bg-surface-high text-muted-foreground hover:text-primary hover:bg-primary/10 transition active:scale-95"
      >
        <Settings className="size-4" />
      </button>
    </li>
  );
};

const WeekSection = ({ week, onEdit }: { week: WeekGroup, onEdit: (x: Tx) => void }) => {
  const [open, setOpen] = useState(week.isCurrentWeek);
  
  return (
    <div className="mb-4">
      <button 
        onClick={() => setOpen(!open)} 
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${open ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border/40'}`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-primary" />
          <span className="font-bold text-sm uppercase">{week.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {!open && (
             <span className={`font-black text-sm ${week.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
               {formatBRL(week.balance)}
             </span>
          )}
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>
      
      {open && (
        <div className="mt-3 space-y-5 pl-2 border-l-2 border-border/20 ml-2 pb-2">
          {week.days.map(day => (
             <div key={day.date}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1 h-3 bg-muted-foreground rounded-full" />
                  <h4 className="text-xs font-bold text-muted-foreground tracking-widest">{day.label}</h4>
                </div>
                <ul className="space-y-2">
                   {day.txs.map(x => <TxRow key={x.id} x={x} onEdit={onEdit} />)}
                </ul>
                <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-surface-high/50 rounded-lg border border-border/10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo do Dia</span>
                  <span className={`text-xs font-black ${day.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {formatBRL(day.balance)}
                  </span>
                </div>
             </div>
          ))}
          
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20 mt-4">
             <span className="text-xs font-black text-primary uppercase">FECHAMENTO DA SEMANA</span>
             <span className={`font-black ${week.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
               {formatBRL(week.balance)}
             </span>
          </div>
        </div>
      )}
    </div>
  )
};

const MonthSection = ({ month, onEdit }: { month: MonthGroup, onEdit: (x: Tx) => void }) => {
  const [open, setOpen] = useState(month.isCurrentMonth);
  return (
    <div className="mb-6">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between p-4 bg-surface-high rounded-xl border border-primary/20 shadow-sm mb-3"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <span className="display text-lg uppercase text-primary">{month.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {!open && (
             <span className={`font-black text-lg ${month.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
               {formatBRL(month.balance)}
             </span>
          )}
          {open ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-primary" />}
        </div>
      </button>
      
      {open && (
        <div className="space-y-2">
           {month.weeks.map(w => <WeekSection key={w.label} week={w} onEdit={onEdit} />)}
           
           <div className="mt-4 flex items-center justify-between p-4 bg-primary text-primary-foreground rounded-xl shadow-card">
             <span className="text-sm font-black uppercase">SALDO DO MÊS ({month.label})</span>
             <span className="text-xl font-black">
               {formatBRL(month.balance)}
             </span>
          </div>
        </div>
      )}
    </div>
  )
};

const OIL_RX = /\b(oleo|óleo|filtro)\b/i;

const Historico = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = (searchParams.get('cat') || '') as '' | 'combustivel' | 'oleo' | 'pecas';
  const sinceParam = searchParams.get('since');
  const untilParam = searchParams.get('until');
  const [tab, setTab] = useState<Tab>(catParam ? 'despesas' : 'todos');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Tx[]>([]);
  const [todayBalance, setTodayBalance] = useState(0);
  const [todayExp, setTodayExp] = useState(0);
  const [goal, setGoal] = useState(300);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const load = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 90); // 90 days to show decent history

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
      .filter((x) => {
        if (!catParam) return true;
        if (x.kind !== 'expense') return false;
        if (catParam === 'combustivel') return x.iconKey === 'fuel';
        if (catParam === 'oleo') return x.iconKey === 'wrench' && OIL_RX.test(x.title);
        if (catParam === 'pecas') return x.iconKey === 'wrench' && !OIL_RX.test(x.title);
        return true;
      })
      .filter((x) => {
        if (sinceParam && x.occurred_at < sinceParam) return false;
        if (untilParam && x.occurred_at > untilParam) return false;
        return true;
      })
      .filter((x) =>
        search.trim()
          ? (x.title + ' ' + x.subtitle).toLowerCase().includes(search.toLowerCase())
          : true
      );
  }, [items, tab, search, catParam, sinceParam, untilParam]);

  const months = useMemo(() => {
    const today = new Date();
    const monthsMap = new Map<string, Tx[]>(); 
    
    filtered.forEach(x => {
      const d = new Date(x.occurred_at);
      const mKey = format(d, 'yyyy-MM');
      if (!monthsMap.has(mKey)) monthsMap.set(mKey, []);
      monthsMap.get(mKey)!.push(x);
    });
    
    const outMonths: MonthGroup[] = [];
    
    Array.from(monthsMap.entries()).sort((a,b) => b[0].localeCompare(a[0])).forEach(([mKey, mTxs]) => {
      const monthDate = new Date(`${mKey}-01T00:00:00`);
      const isCurrentMonth = isSameMonth(monthDate, today);
      
      const weeksMap = new Map<string, Tx[]>(); 
      mTxs.forEach(x => {
        const d = new Date(x.occurred_at);
        const wStart = startOfWeek(d, { weekStartsOn: 1 });
        const wKey = format(wStart, 'yyyy-MM-dd');
        if (!weeksMap.has(wKey)) weeksMap.set(wKey, []);
        weeksMap.get(wKey)!.push(x);
      });
      
      const outWeeks: WeekGroup[] = [];
      Array.from(weeksMap.entries()).sort((a,b) => b[0].localeCompare(a[0])).forEach(([wKey, wTxs]) => {
        const wStartDate = new Date(`${wKey}T00:00:00`);
        const wEndDate = endOfWeek(wStartDate, { weekStartsOn: 1 });
        const isCurrentWeek = isSameWeek(wStartDate, today, { weekStartsOn: 1 });
        
        const daysMap = new Map<string, Tx[]>();
        wTxs.forEach(x => {
          const d = new Date(x.occurred_at);
          const dKey = format(d, 'yyyy-MM-dd');
          if (!daysMap.has(dKey)) daysMap.set(dKey, []);
          daysMap.get(dKey)!.push(x);
        });
        
        const outDays: DayGroup[] = [];
        Array.from(daysMap.entries()).sort((a,b) => b[0].localeCompare(a[0])).forEach(([dKey, dTxs]) => {
          const d = new Date(`${dKey}T00:00:00`);
          const yest = new Date(); yest.setDate(today.getDate() - 1);
          let label = format(d, "EEEE, dd 'de' MMM", { locale: ptBR }).toUpperCase();
          if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) label = `HOJE, ${format(d, "dd 'de' MMM", { locale: ptBR }).toUpperCase()}`;
          else if (format(d, 'yyyy-MM-dd') === format(yest, 'yyyy-MM-dd')) label = `ONTEM, ${format(d, "dd 'de' MMM", { locale: ptBR }).toUpperCase()}`;
          
          const balance = dTxs.reduce((s,x) => s + (x.positive ? x.amount : -x.amount), 0);
          outDays.push({ label, date: dKey, txs: dTxs, balance });
        });
        
        const balance = outDays.reduce((s, d) => s + d.balance, 0);
        let label = `Semana de ${format(wStartDate, 'dd/MM')} a ${format(wEndDate, 'dd/MM')}`;
        if (isCurrentWeek) label = 'Esta Semana';
        
        outWeeks.push({ label, start: wStartDate, end: wEndDate, days: outDays, balance, isCurrentWeek });
      });
      
      const balance = outWeeks.reduce((s, w) => s + w.balance, 0);
      const label = format(monthDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
      outMonths.push({ label, month: monthDate, weeks: outWeeks, balance, isCurrentMonth });
    });
    
    return outMonths;
  }, [filtered]);

  const handleEdit = (x: Tx) => {
    if (x.table === 'routes') {
      navigate(`/rota/nova?id=${x.raw_id}`);
    } else if (x.table === 'expenses') {
      const cat = x.tag?.toLowerCase() || 'combustivel';
      navigate(`/despesa/${cat}?id=${x.raw_id}`);
    } else {
      setEditTarget({ table: x.table, id: x.raw_id, positive: x.positive });
    }
  };

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

      {/* Months List */}
      <div className="mt-6 pb-12">
        {months.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8 rounded-2xl bg-surface border border-dashed border-border/40">
            Nenhuma transação encontrada.
          </p>
        )}
        {months.map(m => <MonthSection key={m.label} month={m} onEdit={handleEdit} />)}
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
