import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Route, Calendar, Clock, Fuel, Wrench, UtensilsCrossed, Package, FileText, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { QuickActionsFab } from '@/components/QuickActionsFab';
import { OilChangeAlert } from '@/components/OilChangeAlert';
import { PartMaintenanceAlerts } from '@/components/PartMaintenanceAlerts';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, todayBoundaries, relativeFromNow } from '@/lib/format';
import { toast } from 'sonner';

interface RouteRow {
  id: string;
  amount: number;
  tip: number;
  distance_km: number;
  product_type: string;
  occurred_at: string;
  origin: string | null;
  destination: string | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [todayNet, setTodayNet] = useState(0);
  const [goal, setGoal] = useState(0);
  const [recent, setRecent] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('daily_goal')
        .eq('id', u.user.id)
        .maybeSingle();
      if (profile?.daily_goal) setGoal(Number(profile.daily_goal));

      const { start, end } = todayBoundaries();
      const [routesRes, expRes, dailyRes] = await Promise.all([
        supabase
          .from('routes')
          .select('amount, tip, distance_km, product_type, occurred_at, origin, destination')
          .gte('occurred_at', start)
          .lte('occurred_at', end),
        supabase
          .from('expenses')
          .select('amount')
          .gte('occurred_at', start)
          .lte('occurred_at', end),
        supabase
          .from('daily_totals')
          .select('amount')
          .gte('occurred_at', start)
          .lte('occurred_at', end),
      ]);

      const earningsFromRoutes = (routesRes.data ?? []).reduce(
        (s, r) => s + Number(r.amount) + Number(r.tip ?? 0),
        0
      );
      const earningsFromDaily = (dailyRes.data ?? []).reduce(
        (s, r) => s + Number(r.amount),
        0
      );
      const totalExpenses = (expRes.data ?? []).reduce(
        (s, e) => s + Number(e.amount),
        0
      );
      const net = earningsFromRoutes + earningsFromDaily - totalExpenses;
      setTodayNet(net);

      const recData = routesRes.data ?? [];
      setRecent(
        recData.slice(0, 4).map((r) => ({
          ...r,
          amount: Number(r.amount),
          tip: Number(r.tip ?? 0),
          distance_km: Number(r.distance_km ?? 0),
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  const pct = goal > 0 ? Math.min(100, Math.max(0, (todayNet / goal) * 100)) : 0;
  const remaining = goal > 0 ? Math.max(0, goal - todayNet) : 0;

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Metric hero - High impact card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-surface border border-border/40 p-5 shadow-card relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="label-up text-xs text-muted-foreground">Lucro líquido hoje</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
              Sessão ativa
            </span>
          </div>
          <div className="mt-2 flex items-end gap-3 flex-wrap">
            <span className={`display text-4xl md:text-5xl ${todayNet < 0 ? 'text-destructive' : 'text-primary'}`}>
              {loading ? '—' : formatBRL(todayNet)}
            </span>
            {!loading && pct > 0 && (
              <span className="mb-1.5 text-success font-bold text-sm">↑ {Math.round(pct)}%</span>
            )}
          </div>
          <div className="mt-3 h-2 rounded-full bg-surface-bright overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-bold">META: {goal > 0 ? formatBRL(goal) : 'Não definida'}</span>
            {goal > 0 && <span className="font-bold">FALTAM {formatBRL(remaining)}</span>}
          </div>
        </motion.section>

        <div className="space-y-3">
          <OilChangeAlert />
          <PartMaintenanceAlerts />
        </div>

        {/* Big actions - Uniform equal size on all devices */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
          <button
            onClick={() => navigate('/rota/nova')}
            className="w-full min-h-[96px] h-full p-5 rounded-xl bg-primary text-primary-foreground text-left shadow-fab active:scale-[0.98] transition flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="display text-lg sm:text-xl leading-tight truncate">LANÇAR GANHOS POR ROTA</h2>
              <p className="mt-1 text-xs label-up opacity-80 truncate">Distância • Valor • Tipo</p>
            </div>
            <Route className="size-8 shrink-0" strokeWidth={2.4} />
          </button>

          <button
            onClick={() => navigate('/total-dia')}
            className="w-full min-h-[96px] h-full p-5 rounded-xl bg-surface border border-border/40 text-left shadow-card active:scale-[0.98] transition flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="display text-lg sm:text-xl text-primary leading-tight truncate">LANÇAR TOTAL DO DIA</h2>
              <p className="mt-1 text-xs label-up text-muted-foreground truncate">
                Sincronização final do turno
              </p>
            </div>
            <Calendar className="size-8 text-primary shrink-0" strokeWidth={2.4} />
          </button>

          <button
            onClick={() => navigate('/faturas')}
            className="w-full min-h-[96px] h-full p-5 rounded-xl bg-surface border border-border/40 text-left shadow-card active:scale-[0.98] transition flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <h2 className="display text-lg sm:text-xl text-success leading-tight truncate">CONTAS A RECEBER</h2>
              <p className="mt-1 text-xs label-up text-muted-foreground truncate">
                Fechar faturas e baixar pagamentos
              </p>
            </div>
            <Wallet className="size-8 text-success shrink-0" strokeWidth={2.4} />
          </button>
        </section>
      </div>

      {/* Quick expense */}
      <section className="mt-7">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="display text-lg">LANÇAMENTO RÁPIDO DE DESPESA</h3>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <QuickExp to="/despesa/combustivel" Icon={Fuel} label="Combustível" color="text-warning" />
          <QuickExp to="/despesa/manutencao" Icon={Wrench} label="Manutenção" color="text-info" />
          <QuickExp
            to="/despesa/alimentacao"
            Icon={UtensilsCrossed}
            label="Alimentação"
            color="text-success"
          />
        </div>
      </section>

      {/* Recent routes */}
      <section className="mt-7">
        <div className="flex items-center justify-between mb-3">
          <h3 className="display text-lg">ROTAS RECENTES</h3>
          <button
            onClick={() => navigate('/historico')}
            className="text-primary text-xs font-bold underline underline-offset-2"
          >
            VER TUDO
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 rounded-xl bg-surface border border-dashed border-border/40">
            Nenhuma rota registrada ainda.
            <br />
            <span className="text-primary font-semibold">Toque em "Lançar Ganhos por Rota".</span>
          </p>
        ) : (
          <ul className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-4">
            {recent.map((r) => (
              <li
                key={r.id}
                className="relative pl-3 rounded-xl bg-surface border border-border/40 p-3 flex items-center gap-3"
              >
                <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-primary" />
                <span className="size-11 rounded-lg bg-surface-high grid place-items-center text-primary shrink-0">
                  {r.product_type === 'pacote' ? (
                    <Package className="size-5" />
                  ) : r.product_type === 'documento' ? (
                    <FileText className="size-5" />
                  ) : (
                    <UtensilsCrossed className="size-5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{Number(r.distance_km).toFixed(1)} KM</p>
                  <p className="text-xs text-muted-foreground uppercase truncate">
                    {r.product_type} • {relativeFromNow(r.occurred_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatBRL(Number(r.amount))}</p>
                  {Number(r.tip) > 0 && (
                    <p className="text-[11px] text-success font-semibold">
                      +{formatBRL(Number(r.tip))} GORJETA
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <QuickActionsFab />
    </AppShell>
  );
};

const QuickExp = ({
  to,
  Icon,
  label,
  color,
}: {
  to: string;
  Icon: any;
  label: string;
  color: string;
}) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="rounded-xl bg-surface border border-border/40 p-3 flex flex-col items-center gap-2 hover:bg-surface-high active:scale-95 transition"
    >
      <Icon className={`size-7 ${color}`} strokeWidth={2.2} />
      <span className="text-[11px] label-up text-muted-foreground">{label}</span>
    </button>
  );
};

export default Home;
