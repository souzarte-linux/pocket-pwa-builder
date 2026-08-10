import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { StatCard } from '@/components/StatCard';
import { PartMaintenanceAlert } from '@/components/PartMaintenanceAlert';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { formatBRL, todayBoundaries, startOfWeek, startOfMonth } from '@/lib/format';
import { Fuel, Wrench, UtensilsCrossed, TrendingUp } from 'lucide-react';

import { usePlatforms } from '@/hooks/queries/usePlatforms';
import { useProfile } from '@/hooks/queries/useProfile';
import { useRoutes } from '@/hooks/queries/useRoutes';
import { useDailyTotals } from '@/hooks/queries/useDailyTotals';
import { useExpenses } from '@/hooks/queries/useExpenses';
import { useAuth } from '@/hooks/useAuth';

const Painel = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<'7d' | '30d'>('7d');

  const { data: profile } = useProfile(user?.id);
  const { data: activePlatforms = [] } = usePlatforms(true);

  // Earliest date needed: covers both current month and 30-day trend
  const earliestSince = useMemo(() => {
    const d35 = new Date();
    d35.setHours(0, 0, 0, 0);
    d35.setDate(d35.getDate() - 35);
    const mStart = new Date(startOfMonth());
    return (d35 < mStart ? d35 : mStart).toISOString();
  }, []);

  const { data: routes = [] } = useRoutes({ since: earliestSince });
  const { data: dailyTotals = [] } = useDailyTotals({ since: earliestSince });
  const { data: expenses = [] } = useExpenses({ since: earliestSince });

  const dailyGoal = profile?.daily_goal ? Number(profile.daily_goal) : 0;
  const weeklyGoal = profile?.weekly_goal ? Number(profile.weekly_goal) : 0;
  const monthlyGoal = profile?.monthly_goal ? Number(profile.monthly_goal) : 0;

  const {
    daily,
    weekly,
    monthly,
    todayPackages,
    weeklyPackages,
    monthlyPackages,
    platforms,
    exp,
  } = useMemo(() => {
    const today = todayBoundaries();
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();

    const today_r = routes.filter((r) => r.occurred_at >= today.start && r.occurred_at <= today.end);
    const week_r = routes.filter((r) => r.occurred_at >= weekStart);
    const month_r = routes.filter((r) => r.occurred_at >= monthStart);

    const today_d = dailyTotals.filter((d) => d.occurred_at >= today.start && d.occurred_at <= today.end);
    const week_d = dailyTotals.filter((d) => d.occurred_at >= weekStart);
    const month_d = dailyTotals.filter((d) => d.occurred_at >= monthStart);

    const sum = (arr: any[]) =>
      arr.reduce((s, r) => s + Number(r.amount) + Number(r.tip ?? 0), 0);

    const sumPackages = (arr: any[]) =>
      arr.reduce(
        (s, r) =>
          s +
          (Number(r.small_packages_count ?? r.package_count ?? 0) +
            Number(r.large_packages_count ?? 0)),
        0
      );

    const d = sum(today_r) + sum(today_d);
    const w = sum(week_r) + sum(week_d);
    const m = sum(month_r) + sum(month_d);

    const tp = sumPackages(today_r);
    const wp = sumPackages(week_r);
    const mp = sumPackages(month_r);

    // Earnings by platform (current month - active platforms only)
    const map = new Map<string, number>();
    [...month_r, ...month_d].forEach((r: any) => {
      if (!r.platform_id) return;
      map.set(r.platform_id, (map.get(r.platform_id) ?? 0) + Number(r.amount) + Number(r.tip ?? 0));
    });
    const ps = activePlatforms
      .map((p) => ({ name: p.name, total: map.get(p.id) ?? 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Expenses by category (month)
    const month_e = expenses.filter((e) => e.occurred_at >= monthStart);
    const eAgg = { combustivel: 0, manutencao: 0, alimentacao: 0 };
    month_e.forEach((e: any) => {
      if (e.category in eAgg) eAgg[e.category as keyof typeof eAgg] += Number(e.amount);
    });

    return {
      daily: d,
      weekly: w,
      monthly: m,
      todayPackages: tp,
      weeklyPackages: wp,
      monthlyPackages: mp,
      platforms: ps,
      exp: eAgg,
    };
  }, [routes, dailyTotals, expenses, activePlatforms]);

  // Trend — "7d" = current week starting Monday; "30d" = last 30 days
  const trend = useMemo(() => {
    const days = range === '7d' ? 7 : 30;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    if (range === '7d') {
      since.setDate(since.getDate() - ((since.getDay() + 6) % 7));
    } else {
      since.setDate(since.getDate() - (days - 1));
    }
    const sinceIso = since.toISOString();
    const tr = routes.filter((r) => r.occurred_at >= sinceIso);
    const td = dailyTotals.filter((d) => d.occurred_at >= sinceIso);

    const buckets = new Array(days).fill(0);
    [...tr, ...td].forEach((r: any) => {
      const d = new Date(r.occurred_at);
      d.setHours(0, 0, 0, 0);
      const idx = Math.round((d.getTime() - since.getTime()) / 86400000);
      if (idx >= 0 && idx < days) {
        buckets[idx] += Number(r.amount) + Number(r.tip ?? 0);
      }
    });
    return buckets;
  }, [routes, dailyTotals, range]);

  const dailyPct = dailyGoal > 0 ? (daily / dailyGoal) * 100 : 0;
  const weeklyPct = weeklyGoal > 0 ? (weekly / weeklyGoal) * 100 : 0;
  const monthlyPct = monthlyGoal > 0 ? (monthly / monthlyGoal) * 100 : 0;
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
          trend={dailyGoal > 0 ? `${Math.round(dailyPct)}%` : undefined}
          progress={dailyGoal > 0 ? dailyPct : undefined}
          hint={`${todayPackages} pacotes hoje`}
        />
        <StatCard
          label="Lucro Semanal"
          value={formatBRL(weekly)}
          trend={weeklyGoal > 0 ? `${Math.round(weeklyPct)}%` : undefined}
          progress={weeklyGoal > 0 ? weeklyPct : undefined}
          hint={`${weeklyPackages} pacotes esta semana`}
        />
        <StatCard
          label="Meta Mensal"
          value={monthlyGoal > 0 ? formatBRL(monthlyGoal) : 'Não definida'}
          highlight
          progress={monthlyGoal > 0 ? monthlyPct : undefined}
          hint={monthlyGoal > 0 ? `Progresso ${Math.round(monthlyPct)}% • ${formatBRL(monthly)} • ${monthlyPackages} pacotes este mês` : `${formatBRL(monthly)} faturados este mês`}
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
