import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Wrench, CheckCircle2, History } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/queries/useProfile';
import { useRoutes } from '@/hooks/queries/useRoutes';
import { useCreateOilChange } from '@/hooks/queries/useMaintenance';
import { useProfileMutations } from '@/hooks/mutations/useProfileMutations';

export const OilChangeAlert = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: routes = [] } = useRoutes();
  const createOilChangeMutation = useCreateOilChange(user?.id);
  const { updateProfile } = useProfileMutations();

  const [resetting, setResetting] = useState(false);

  const s = useMemo(() => {
    if (!profile) return null;
    const threshold = Number(profile.oil_change_km ?? 0);
    if (!threshold || threshold <= 0) return null;

    const since = profile.last_oil_change_at ?? profile.created_at ?? new Date(0).toISOString();

    const routesKm = routes
      .filter((r) => r.occurred_at >= since)
      .reduce((acc, r) => acc + Number(r.distance_km || 0), 0);

    return {
      threshold,
      driven: routesKm,
      since,
    };
  }, [profile, routes]);

  if (!s) return null;
  const pct = s.threshold > 0 ? (s.driven / s.threshold) * 100 : 0;
  if (pct < 80) return null;

  const overdue = pct >= 100;
  const remaining = Math.max(0, s.threshold - s.driven);

  const reset = async () => {
    if (!user) return;
    setResetting(true);
    const now = new Date().toISOString();

    try {
      await createOilChangeMutation.mutateAsync({
        user_id: user.id,
        changed_at: now,
        km_at_change: Math.round(s.driven),
      });

      await updateProfile({
        userId: user.id,
        updates: { last_oil_change_at: now },
      });

      toast.success('Troca de óleo registrada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar troca';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={reset}
              disabled={resetting || createOilChangeMutation.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg bg-foreground text-background disabled:opacity-50 min-h-[44px]"
            >
              <CheckCircle2 className="size-3.5" />
              {resetting ? 'Salvando...' : 'Marquei a troca'}
            </button>
            <Link
              to="/trocas-oleo"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1.5 rounded-lg bg-background/40 text-current min-h-[44px]"
            >
              <History className="size-3.5" />
              Histórico
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OilChangeAlert;
