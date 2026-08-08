import { useEffect, useState } from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PartRow {
  part_name: string;
  life_km: number;
  last_change_km: number;
}

interface Item {
  name: string;
  driven: number;
  life: number;
  pct: number;
}

/** Estimates the current odometer from the highest known reading. */
const getCurrentOdometer = async () => {
  const [exp, oil, routes] = await Promise.all([
    supabase.from('expenses').select('odometer_km').not('odometer_km', 'is', null).order('odometer_km', { ascending: false }).limit(1),
    supabase.from('oil_changes').select('km_at_change').order('km_at_change', { ascending: false }).limit(1),
    supabase.from('routes').select('end_km').order('end_km', { ascending: false }).limit(1),
  ]);
  const a = Number(exp.data?.[0]?.odometer_km ?? 0);
  const b = Number(oil.data?.[0]?.km_at_change ?? 0);
  const c = Number(routes.data?.[0]?.end_km ?? 0);
  return Math.max(a, b, c);
};

export const PartMaintenanceAlerts = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data }, odo] = await Promise.all([
        supabase.from('part_maintenance').select('part_name, life_km, last_change_km').eq('user_id', u.user.id),
        getCurrentOdometer(),
      ]);
      if (odo <= 0) return;
      const rows = data ?? [];
      const list = rows
        .map((r) => {
          const life = Number(r.life_km || 0);
          const driven = Math.max(0, odo - Number(r.last_change_km || 0));
          return { name: r.part_name, life, driven, pct: life > 0 ? (driven / life) * 100 : 0 };
        })
        .filter((i) => i.life > 0 && i.pct >= 90)
        .sort((a, b) => b.pct - a.pct);
      setItems(list);
    })();
  }, []);

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
