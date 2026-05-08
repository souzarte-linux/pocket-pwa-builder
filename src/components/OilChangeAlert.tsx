import { useEffect, useState } from 'react';
import { AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface State {
  threshold: number;
  driven: number;
  since: string | null;
}

export const OilChangeAlert = () => {
  const [s, setS] = useState<State | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: p } = await supabase
      .from('profiles')
      .select('oil_change_km, last_oil_change_at, created_at')
      .eq('id', u.user.id)
      .maybeSingle();
    const threshold = Number((p as any)?.oil_change_km ?? 0);
    if (!threshold || threshold <= 0) {
      setS(null);
      return;
    }
    const since: string =
      (p as any)?.last_oil_change_at ?? (p as any)?.created_at ?? new Date(0).toISOString();

    const [routesRes, sessRes] = await Promise.all([
      supabase
        .from('routes')
        .select('distance_km')
        .gte('occurred_at', since),
      supabase
        .from('work_sessions')
        .select('start_km, end_km')
        .gte('started_at', since),
    ]);
    const routesKm = (routesRes.data ?? []).reduce(
      (acc, r: any) => acc + Number(r.distance_km || 0),
      0,
    );
    const sessKm = (sessRes.data ?? []).reduce((acc, r: any) => {
      const diff = Number(r.end_km || 0) - Number(r.start_km || 0);
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    setS({ threshold, driven: routesKm + sessKm, since });
  };

  useEffect(() => {
    load();
  }, []);

  if (!s) return null;
  const pct = s.threshold > 0 ? (s.driven / s.threshold) * 100 : 0;
  if (pct < 80) return null;

  const overdue = pct >= 100;
  const remaining = Math.max(0, s.threshold - s.driven);

  const reset = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setResetting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ last_oil_change_at: new Date().toISOString() } as any)
      .eq('id', u.user.id);
    setResetting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Troca de óleo registrada');
    load();
  };

  return (
    <section
      className={`mt-5 rounded-2xl border p-4 ${
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
          <h3 className="display text-base leading-tight">
            {overdue ? 'TROCA DE ÓLEO ATRASADA' : 'TROCA DE ÓLEO PRÓXIMA'}
          </h3>
          <p className="mt-1 text-xs text-foreground/80">
            {overdue
              ? `Você ultrapassou em ${Math.round(s.driven - s.threshold)} KM o limite de ${Math.round(
                  s.threshold,
                )} KM.`
              : `Faltam ${Math.round(remaining)} KM para os ${Math.round(
                  s.threshold,
                )} KM recomendados.`}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-background/40 overflow-hidden">
            <div
              className="h-full bg-current transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <button
            onClick={reset}
            disabled={resetting}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg bg-foreground text-background disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" />
            {resetting ? 'Salvando...' : 'Marquei a troca'}
          </button>
        </div>
      </div>
    </section>
  );
};
