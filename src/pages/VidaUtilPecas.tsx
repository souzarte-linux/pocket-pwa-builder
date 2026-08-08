import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Calendar, 
  DollarSign, 
  Building2, 
  FileText, 
  Tag, 
  History,
  Pencil,
  ChevronRight
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatKm } from '@/lib/format';

interface PartMaintenanceItem {
  id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_date?: string;
}

interface MaintenanceExpense {
  id: string;
  title: string;
  amount: number;
  occurred_at: string;
  odometer_km?: number | null;
  vendor?: string | null;
  invoice_number?: string | null;
  part_brand?: string | null;
  part_model?: string | null;
}

const DEFAULT_PARTS = [
  { part_name: 'Óleo do Motor', life_km: 3000 },
  { part_name: 'Filtro de Óleo', life_km: 6000 },
  { part_name: 'Pastilhas de Freio', life_km: 8000 },
  { part_name: 'Pneu Traseiro', life_km: 12000 },
  { part_name: 'Pneu Dianteiro', life_km: 15000 },
  { part_name: 'Kit Transmissão / Corrente', life_km: 15000 },
  { part_name: 'Vela de Ignição', life_km: 10000 },
  { part_name: 'Filtro de Ar', life_km: 10000 },
];

export const VidaUtilPecas: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentOdometer, setCurrentOdometer] = useState<number>(45000);
  const [parts, setParts] = useState<PartMaintenanceItem[]>([]);
  const [history, setHistory] = useState<MaintenanceExpense[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      // 1. Fetch current vehicle odometer
      const [expRes, oilRes, routeRes] = await Promise.all([
        supabase.from('expenses').select('odometer_km').not('odometer_km', 'is', null).order('odometer_km', { ascending: false }).limit(1),
        supabase.from('oil_changes').select('km_at_change').order('km_at_change', { ascending: false }).limit(1),
        supabase.from('routes').select('end_km').order('end_km', { ascending: false }).limit(1),
      ]);

      const odoExp = Number(expRes.data?.[0]?.odometer_km ?? 0);
      const odoOil = Number(oilRes.data?.[0]?.km_at_change ?? 0);
      const odoRoute = Number(routeRes.data?.[0]?.end_km ?? 0);
      const latestOdo = Math.max(45000, odoExp, odoOil, odoRoute);
      setCurrentOdometer(latestOdo);

      // 2. Fetch monitored parts from part_maintenance
      const { data: partData } = await supabase
        .from('part_maintenance')
        .select('*')
        .eq('user_id', u.user.id);

      if (partData && partData.length > 0) {
        setParts(partData);
      } else {
        // Fallback to DEFAULT_PARTS list if none exists yet
        const defaultList: PartMaintenanceItem[] = DEFAULT_PARTS.map((p, idx) => ({
          id: `def-${idx}`,
          part_name: p.part_name,
          life_km: p.life_km,
          last_change_km: 0,
        }));
        setParts(defaultList);
      }

      // 3. Fetch full maintenance history from expenses
      const { data: expData } = await supabase
        .from('expenses')
        .select('id, title, amount, occurred_at, odometer_km, vendor, invoice_number, part_brand, part_model')
        .eq('user_id', u.user.id)
        .eq('category', 'manutencao')
        .order('occurred_at', { ascending: false });

      if (expData) {
        setHistory(expData);
      }
    } catch (err) {
      console.error('Erro ao carregar vida útil das peças:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <AppShell title="VIDA ÚTIL DAS PEÇAS" back>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Banner Odômetro Atual */}
        <div className="rounded-2xl bg-surface-container border border-border/40 p-4 shadow-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
              <Gauge className="size-6" />
            </div>
            <div>
              <p className="label-up text-xs text-muted-foreground">Odômetro Atual Estimado</p>
              <h2 className="display text-2xl text-foreground font-extrabold">{formatKm(currentOdometer)}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/despesa/manutencao')}
            className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase shadow hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 shrink-0"
          >
            <Wrench className="size-4" />
            <span className="hidden sm:inline">Lançar Manutenção</span>
          </button>
        </div>

        {/* SEÇÃO 1: Peças Monitoradas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Wrench className="size-5" />
              <h2 className="display text-lg uppercase font-bold text-foreground tracking-tight">
                Peças Monitoradas ({parts.length})
              </h2>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-xs text-muted-foreground py-6">Carregando peças…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parts.map((p) => {
                const kmDriven = Math.max(0, currentOdometer - p.last_change_km);
                const kmRemaining = p.life_km - kmDriven;
                const pct = Math.min(100, Math.round((kmDriven / p.life_km) * 100));
                const overdue = kmRemaining <= 0;
                const warning = !overdue && pct >= 80;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate('/despesa/manutencao')}
                    className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden cursor-pointer hover:border-primary/50 active:scale-[0.99] ${
                      overdue
                        ? 'bg-red-950/30 border-red-800/60 text-red-200'
                        : warning
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-surface-container border-border/40 text-foreground'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
                          {p.part_name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                          Última troca: {p.last_change_km > 0 ? formatKm(p.last_change_km) : 'Não registrada'}
                        </p>
                      </div>

                      {overdue ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground font-extrabold text-[10px] uppercase animate-pulse">
                          <AlertTriangle className="size-3" /> Vencida
                        </span>
                      ) : warning ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-black font-extrabold text-[10px] uppercase">
                          <Clock className="size-3" /> Atenção
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase">
                          <CheckCircle2 className="size-3" /> Em Dia
                        </span>
                      )}
                    </div>

                    {/* Dados de KM */}
                    <div className="grid grid-cols-3 gap-2 py-1 text-center bg-surface-high/50 rounded-xl p-2">
                      <div>
                        <p className="label-up text-[9px] text-muted-foreground">Vida Útil</p>
                        <p className="font-bold text-xs text-foreground">{formatKm(p.life_km)}</p>
                      </div>
                      <div>
                        <p className="label-up text-[9px] text-muted-foreground">Rodado</p>
                        <p className="font-bold text-xs text-foreground">{formatKm(kmDriven)}</p>
                      </div>
                      <div>
                        <p className="label-up text-[9px] text-muted-foreground">Restante</p>
                        <p
                          className={`font-extrabold text-xs ${
                            overdue ? 'text-destructive' : warning ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {kmRemaining <= 0 ? `-${formatKm(Math.abs(kmRemaining))}` : formatKm(kmRemaining)}
                        </p>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                        <span>Desgaste</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-bright overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            overdue
                              ? 'bg-destructive'
                              : warning
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SEÇÃO 2: Peças Substituídas / Serviços Realizados */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-primary">
            <History className="size-5" />
            <h2 className="display text-lg uppercase font-bold text-foreground tracking-tight">
              Histórico de Peças Substituídas & Serviços ({history.length})
            </h2>
          </div>

          {loading ? (
            <p className="text-center text-xs text-muted-foreground py-6">Carregando histórico…</p>
          ) : history.length === 0 ? (
            <div className="rounded-2xl bg-surface-container border border-border/40 p-6 text-center text-sm text-muted-foreground space-y-2">
              <p>Nenhuma manutenção ou troca registrada até o momento.</p>
              <button
                type="button"
                onClick={() => navigate('/despesa/manutencao')}
                className="px-4 py-2 rounded-lg bg-surface-high font-bold text-xs text-primary hover:bg-surface-highest transition"
              >
                Lançar primeira manutenção
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => navigate(`/despesa/manutencao?id=${h.id}`)}
                  className="rounded-2xl bg-surface-container border border-border/40 p-4 shadow-card space-y-2 cursor-pointer hover:border-primary/40 transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                        {h.title || 'Manutenção Geral'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-primary" />
                          {new Date(h.occurred_at).toLocaleDateString('pt-BR')}
                        </span>
                        {h.odometer_km != null && (
                          <span className="flex items-center gap-1">
                            <Gauge className="size-3.5 text-primary" />
                            {formatKm(h.odometer_km)}
                          </span>
                        )}
                        {h.vendor && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3.5 text-primary" />
                            {h.vendor}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-base text-primary">
                        {formatBRL(h.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes extras se existirem */}
                  {(h.invoice_number || h.part_brand || h.part_model) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20 text-xs">
                      {h.invoice_number && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-high text-muted-foreground font-medium">
                          <FileText className="size-3 text-primary" />
                          NF: {h.invoice_number}
                        </span>
                      )}
                      {h.part_brand && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-high text-muted-foreground font-medium">
                          <Tag className="size-3 text-primary" />
                          Marca: {h.part_brand}
                        </span>
                      )}
                      {h.part_model && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-high text-muted-foreground font-medium">
                          <Wrench className="size-3 text-primary" />
                          Modelo: {h.part_model}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default VidaUtilPecas;
