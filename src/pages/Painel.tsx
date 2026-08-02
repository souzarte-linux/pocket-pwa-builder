import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/StatCard';
import { PartMaintenanceAlert } from '@/components/PartMaintenanceAlert';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, todayBoundaries, startOfWeek, startOfMonth } from '@/lib/format';
import { Fuel, Wrench, UtensilsCrossed, TrendingUp } from 'lucide-react';

interface PlatformStat {
  name: string;
  total: number;
}

const Painel = () => {
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [goal, setGoal] = useState(3450);
  const [monthly, setMonthly] = useState(0);
  const [todayPackages, setTodayPackages] = useState(0);
  const [weeklyPackages, setWeeklyPackages] = useState(0);
  const [monthlyPackages, setMonthlyPackages] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
  const [exp, setExp] = useState({ combustivel: 0, manutencao: 0, alimentacao: 0 });
  const [trend, setTrend] = useState<number[]>([]);
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_goal')
        .eq('id', u.user.id)
        .maybeSingle();
      if (profile?.monthly_goal) setGoal(Number(profile.monthly_goal));

      const today = todayBoundaries();
      const weekStart = startOfWeek();
      const monthStart = startOfMonth();

      const sumRoutes = async (gte: string, lte?: string) => {
        let q = supabase.from('routes').select('amount, tip, platform_id, package_count, small_packages_count, large_packages_count').gte('occurred_at', gte);
        if (lte) q = q.lte('occurred_at', lte);
        const { data } = await q;
        return data ?? [];
      };
      const sumDaily = async (gte: string, lte?: string) => {
        let q = supabase.from('daily_totals').select('amount, platform_id').gte('occurred_at', gte);
        if (lte) q = q.lte('occurred_at', lte);
        const { data } = await q;
        return data ?? [];
      };

      const [today_r, week_r, month_r, today_d, week_d, month_d] = await Promise.all([
        sumRoutes(today.start, today.end),
        sumRoutes(weekStart),
        sumRoutes(monthStart),
        sumDaily(today.start, today.end),
        sumDaily(weekStart),
        sumDaily(monthStart),
      ]);

      const sum = (arr: any[]) =>
        arr.reduce((s, r) => s + Number(r.amount) + Number(r.tip ?? 0), 0);
      
      const sumPackages = (arr: any[]) =>
        arr.reduce((s, r) => s + (Number(r.small_packages_count ?? r.package_count ?? 0) + Number(r.large_packages_count ?? 0)), 0);

      setDaily(sum(today_r) + sum(today_d));
      setWeekly(sum(week_r) + sum(week_d));
      setMonthly(sum(month_r) + sum(month_d));
      
      const totalTodayPackages = sumPackages(today_r);
      const totalWeeklyPackages = sumPackages(week_r);
      const totalMonthlyPackages = sumPackages(month_r);
      setTodayPackages(totalTodayPackages);
      setWeeklyPackages(totalWeeklyPackages);
      setMonthlyPackages(totalMonthlyPackages);

      // Earnings by platform (current month)
      const { data: plats } = await supabase.from('platforms').select('id, name');
      const map = new Map<string, number>();
      [...month_r, ...month_d].forEach((r: any) => {
        if (!r.platform_id) return;
        map.set(r.platform_id, (map.get(r.platform_id) ?? 0) + Number(r.amount) + Number(r.tip ?? 0));
      });
      const ps = (plats ?? [])
        .map((p) => ({ name: p.name, total: map.get(p.id) ?? 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setPlatforms(ps);

      // Expenses by category (month)
      const { data: ex } = await supabase
        .from('expenses')
        .select('category, amount')
        .gte('occurred_at', monthStart);
      const eAgg = { combustivel: 0, manutencao: 0, alimentacao: 0 };
      (ex ?? []).forEach((e: any) => {
        if (e.category in eAgg) eAgg[e.category as keyof typeof eAgg] += Number(e.amount);
      });
      setExp(eAgg);

      // Trend — "7d" = current week starting Monday; "30d" = last 30 days
      const days = range === '7d' ? 7 : 30;
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      if (range === '7d') {
        since.setDate(since.getDate() - ((since.getDay() + 6) % 7));
      } else {
        since.setDate(since.getDate() - (days - 1));
      }
      const { data: tr } = await supabase
        .from('routes')
        .select('amount, tip, occurred_at')
        .gte('occurred_at', since.toISOString());
      const { data: td } = await supabase
        .from('daily_totals')
        .select('amount, occurred_at')
        .gte('occurred_at', since.toISOString());
      const buckets = new Array(days).fill(0);
      [...(tr ?? []), ...(td ?? [])].forEach((r: any) => {
        const d = new Date(r.occurred_at);
        d.setHours(0, 0, 0, 0);
        const idx = Math.round((d.getTime() - since.getTime()) / 86400000);
        if (idx >= 0 && idx < days) {
          buckets[idx] += Number(r.amount) + Number(r.tip ?? 0);
        }
      });
      setTrend(buckets);
    };
    load();
  }, [range]);

  const dailyPct = (daily / 200) * 100;
  const weeklyPct = (weekly / 1000) * 100;
  const monthlyPct = goal > 0 ? (monthly / goal) * 100 : 0;
  const maxTrend = Math.max(1, ...trend);
  const totalEarnings = platforms.reduce((s, p) => s + p.total, 0);

  return (
    <AppShell>
      <div className="mb-4">
        <PartMaintenanceAlert />
      </div>
      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 md:items-start">
        <StatCard
          label="Lucro Diário"
          value={formatBRL(daily)}
          trend={`${Math.round(dailyPct)}%`}
          progress={dailyPct}
          hint={`${todayPackages} pacotes hoje`}
        />
        <StatCard
          label="Lucro Semanal"
          value={formatBRL(weekly)}
          trend={`${Math.round(weeklyPct)}%`}
          progress={weeklyPct}
          hint={`${weeklyPackages} pacotes esta semana`}
        />
        <StatCard
          label="Meta Mensal"
          value={formatBRL(goal)}
          highlight
          progress={monthlyPct}
          hint={`Progresso ${Math.round(monthlyPct)}% • ${formatBRL(monthly)} • ${monthlyPackages} pacotes este mês`}
          right={<TrendingUp className="size-5 text-primary" />}
        />

        {/* By platform */}
        <section className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card md:col-span-2 lg:col-span-2">
          <h3 className="display text-lg mb-3">GANHOS POR PLATAFORMA</h3>
          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Cadastre plataformas em "Apps".
            </p>
          ) : (
            <ul className="space-y-3">
              {platforms.map((p) => {
                const pct = totalEarnings > 0 ? (p.total / totalEarnings) * 100 : 0;
                return (
                  <li key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold uppercase">{p.name}</span>
                      <span className="text-primary font-bold">{formatBRL(p.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-bright overflow-hidden">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Despesas */}
        <section className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card">
          <h3 className="display text-lg mb-3">DESPESAS</h3>
          <ul className="space-y-3">
            <ExpRow Icon={Fuel} label="Combustível" value={exp.combustivel} color="bg-warning/15 text-warning" />
            <ExpRow Icon={Wrench} label="Manutenção" value={exp.manutencao} color="bg-info/15 text-info" />
            <ExpRow Icon={UtensilsCrossed} label="Refeições" value={exp.alimentacao} color="bg-success/15 text-success" />
          </ul>
        </section>

        {/* Trend chart */}
        <section className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="display text-lg">TENDÊNCIA DE DESEMPENHO</h3>
            <div className="flex items-center bg-surface-high rounded-lg p-0.5">
              {(['7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                    range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-40 flex items-end gap-1.5">
            {trend.map((v, i) => {
              const days = range === '7d' ? 7 : 30;
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              d.setDate(d.getDate() - (days - 1) + i);
              const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
              // Monday-first ordering: shift so Monday=0..Sunday=6
              const jsDay = d.getDay();
              const mondayIdx = (jsDay + 6) % 7;
              const orderedNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
              const weekdayLabel = orderedNames[mondayIdx];
              const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-primary/40 to-primary transition-all"
                  style={{ height: `${(v / maxTrend) * 100}%`, minHeight: '4px' }}
                  title={`${weekdayLabel} (${dateLabel}) — ${formatBRL(v)}`}
                />
              );
            })}
          </div>
        </section>
      </div>
      <QuickActionsFab />
    </AppShell>
  );
};

const ExpRow = ({ Icon, label, value, color }: any) => (
  <li className="flex items-center gap-3">
    <span className={`size-10 rounded-lg grid place-items-center ${color}`}>
      <Icon className="size-5" />
    </span>
    <div className="flex-1">
      <p className="font-bold text-sm uppercase">{label}</p>
      <p className="text-xs text-muted-foreground">{formatBRL(value)}</p>
    </div>
  </li>
);

export default Painel;
