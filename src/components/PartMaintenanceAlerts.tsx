import { useMemo } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOdometer } from '@/hooks/queries/useCurrentOdometer';
import { usePartMaintenance } from '@/hooks/queries/useMaintenance';

interface Item {
  name: string;
  driven: number;
  life: number;
  pct: number;
}

export const PartMaintenanceAlerts = () => {
  const { user } = useAuth();
  const { data: currentOdometer = null } = useCurrentOdometer(user?.id);
  const { data: parts = [] } = usePartMaintenance(user?.id);

  const items: Item[] = useMemo(() => {
    const odo = currentOdometer ?? 0;
    if (odo <= 0 || !parts || parts.length === 0) return [];

    return parts
      .map((r) => {
        const life = Number(r.life_km || 0);
        const driven = Math.max(0, odo - Number(r.last_change_km || 0));
        return { name: r.part_name, life, driven, pct: life > 0 ? (driven / life) * 100 : 0 };
      })
      .filter((i) => i.life > 0 && i.pct >= 90)
      .sort((a, b) => b.pct - a.pct);
  }, [parts, currentOdometer]);

  if (items.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      {items.map((i) => {
        const overdue = i.pct >= 100;
        return (
          <section
            key={i.name}
            className={`rounded-2xl border p-4 ${
              overdue
                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                : 'bg-warning/10 border-warning/40 text-warning'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="size-10 rounded-xl bg-background/40 grid place-items-center shrink-0">
                {overdue ? <AlertTriangle className="size-5" /> : <Wrench className="size-5" />}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="display text-base leading-tight uppercase">
                  {overdue ? `${i.name}: troca vencida` : `${i.name}: troca próxima`}
                </h3>
                <p className="mt-1 text-xs text-foreground/80">
                  {overdue
                    ? `Você ultrapassou em ${Math.round(i.driven - i.life)} KM a vida útil de ${Math.round(i.life)} KM.`
                    : `Faltam ${Math.round(i.life - i.driven)} KM para os ${Math.round(i.life)} KM de vida útil.`}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-background/40 overflow-hidden">
                  <div
                    className="h-full bg-current transition-all"
                    style={{ width: `${Math.min(100, i.pct)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default PartMaintenanceAlerts;
