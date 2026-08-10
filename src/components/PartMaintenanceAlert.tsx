import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Wrench, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { useCurrentOdometer } from '@/hooks/queries/useCurrentOdometer';
import { usePartMaintenance, useUpdatePartMaintenance } from '@/hooks/queries/useMaintenance';
import { useRoutes } from '@/hooks/queries/useRoutes';

export interface PartMaintenanceItem {
  id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_at: string;
  driven_km: number;
  pct: number;
  overdue: boolean;
  remaining: number;
}

export const PartMaintenanceAlert = () => {
  const { user } = useAuth();
  const { data: currentOdometer = null } = useCurrentOdometer(user?.id);
  const { data: parts = [] } = usePartMaintenance(user?.id);
  const { data: routes = [] } = useRoutes();

  const updatePartMutation = useUpdatePartMaintenance(user?.id);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const items: PartMaintenanceItem[] = useMemo(() => {
    if (!parts || parts.length === 0) return [];
    const odo = currentOdometer ?? 0;
    const alertItems: PartMaintenanceItem[] = [];

    for (const p of parts) {
      const lifeKm = Number(p.life_km);
      if (lifeKm <= 0) continue;

      const lastKm = Number(p.last_change_km);
      let drivenKm = odo > lastKm ? odo - lastKm : 0;

      // Fallback: If odometer was not updated, estimate from routes distance_km since last_change_at
      if (drivenKm === 0 && p.last_change_at) {
        const sumDist = routes
          .filter((r) => r.occurred_at >= p.last_change_at)
          .reduce((acc, r) => acc + Number(r.distance_km || 0), 0);
        drivenKm = sumDist;
      }

      const pct = (drivenKm / lifeKm) * 100;

      // Show alert if >= 90% of life_km reached
      if (pct >= 90) {
        alertItems.push({
          id: p.id,
          part_name: p.part_name,
          life_km: lifeKm,
          last_change_km: lastKm,
          last_change_at: p.last_change_at,
          driven_km: drivenKm,
          pct,
          overdue: pct >= 100,
          remaining: Math.max(0, lifeKm - drivenKm),
        });
      }
    }

    return alertItems;
  }, [parts, currentOdometer, routes]);

  const handleReset = async (item: PartMaintenanceItem) => {
    if (!user) return;

    const newKmStr = prompt(
      `Informe o odômetro (KM) no momento da troca de "${item.part_name}":`,
      String(Math.round(item.last_change_km + item.driven_km))
    );
    if (newKmStr === null) return;

    const newKm = Number(newKmStr.replace(',', '.')) || Math.round(item.last_change_km + item.driven_km);
    setResettingId(item.id);

    try {
      const now = new Date().toISOString();
      await updatePartMutation.mutateAsync({
        id: item.id,
        payload: {
          last_change_km: newKm,
          last_change_at: now,
        },
      });
      toast.success(`Troca de "${item.part_name}" atualizada!`);
    } catch {
      toast.error('Erro ao atualizar troca de peça');
    } finally {
      setResettingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 mt-4">
      {items.map((item) => (
        <section
          key={item.id}
          className={`rounded-2xl border p-4 shadow-card transition ${
            item.overdue
              ? 'bg-destructive/10 border-destructive/40 text-destructive'
              : 'bg-warning/10 border-warning/40 text-warning'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="size-10 rounded-xl bg-background/40 grid place-items-center shrink-0">
              {item.overdue ? <AlertTriangle className="size-5" /> : <Wrench className="size-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="display text-base leading-tight uppercase">
                {item.overdue
                  ? `MANUTENÇÃO ATRASADA: ${item.part_name}`
                  : `TROCA DE PEÇA PRÓXIMA: ${item.part_name}`}
              </h3>
              <p className="mt-1 text-xs text-foreground/80">
                {item.overdue
                  ? `Você ultrapassou em ${Math.round(item.driven_km - item.life_km)} KM o limite de ${Math.round(
                      item.life_km
                    )} KM.`
                  : `Faltam ${Math.round(item.remaining)} KM para o limite de ${Math.round(
                      item.life_km
                    )} KM.`}
              </p>

              {/* Progress bar */}
              <div className="mt-2.5 h-2 rounded-full bg-background/40 overflow-hidden">
                <div
                  className="h-full bg-current transition-all"
                  style={{ width: `${Math.min(100, item.pct)}%` }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleReset(item)}
                  disabled={resettingId === item.id}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3.5 py-2 rounded-lg bg-foreground text-background hover:opacity-90 transition disabled:opacity-50 min-h-[44px]"
                >
                  <CheckCircle2 className="size-4" />
                  {resettingId === item.id ? 'Salvando...' : 'Marcar troca realizada'}
                </button>
                <Link
                  to="/historico?cat=pecas"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-2 rounded-lg bg-background/40 text-current hover:bg-background/60 transition min-h-[44px]"
                >
                  <History className="size-4" />
                  Histórico
                </Link>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};
