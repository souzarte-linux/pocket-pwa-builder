import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Plus, Settings, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, startOfMonth } from '@/lib/format';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Platform {
  id: string;
  name: string;
  cycle: string;
  payment_day: string | null;
  active: boolean;
  total?: number;
}

const cycleLabel = (c: string, day: string | null) => {
  if (c === 'semanal' && day) return `SEMANAL (${day.slice(0, 3).toUpperCase()})`;
  if (c === 'quinzenal') return 'QUINZENAL';
  if (c === 'mensal') return 'MENSAL';
  return c.toUpperCase();
};

const Apps = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: ps } = await supabase
        .from('platforms')
        .select('id, name, cycle, payment_day, active')
        .order('created_at', { ascending: false });
      const monthStart = startOfMonth();
      const { data: r } = await supabase
        .from('routes')
        .select('platform_id, amount, tip')
        .gte('occurred_at', monthStart);
      const { data: dt } = await supabase
        .from('daily_totals')
        .select('platform_id, amount')
        .gte('occurred_at', monthStart);

      const totals = new Map<string, number>();
      [...(r ?? []), ...(dt ?? [])].forEach((row: any) => {
        if (!row.platform_id) return;
        totals.set(
          row.platform_id,
          (totals.get(row.platform_id) ?? 0) + Number(row.amount) + Number(row.tip ?? 0)
        );
      });
      setPlatforms((ps ?? []).map((p) => ({ ...p, active: p.active ?? true, total: totals.get(p.id) ?? 0 })));
    };
    load();
  }, []);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const nextActive = !currentActive;
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p))
    );

    const { error } = await supabase
      .from('platforms')
      .update({ active: nextActive })
      .eq('id', id);

    if (error) {
      console.error(error);
      toast.error('Erro ao atualizar status da plataforma');
      setPlatforms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: currentActive } : p))
      );
      return;
    }

    toast.success(nextActive ? 'Plataforma ativada' : 'Plataforma desativada');
  };

  return (
    <AppShell>
      <h2 className="display text-3xl text-primary leading-tight">
        GESTOR DE
        <br />
        PLATAFORMAS
      </h2>
      <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
        Plataformas com as quais você trabalha. Acompanhe seus ganhos e calendário de pagamentos.
      </p>

      <ul className="mt-5 space-y-3">
        {platforms.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg truncate">{p.name}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={p.active}
                    onCheckedChange={() => handleToggleActive(p.id, p.active)}
                    className="data-[state=checked]:bg-success data-[state=unchecked]:bg-destructive/60"
                    aria-label={`Status de ${p.name}`}
                  />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${p.active ? 'text-success' : 'text-destructive'}`}>
                    {p.active ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs label-up text-muted-foreground">
                <Calendar className="size-3.5" /> {cycleLabel(p.cycle, p.payment_day)}
              </p>
              <div className="mt-3">
                <p className="text-[10px] label-up text-muted-foreground">Est. de pagamento</p>
                <p className="text-primary font-bold">{formatBRL(p.total ?? 0)}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/plataforma/${p.id}`)}
              className="size-11 grid place-items-center rounded-xl bg-surface-high text-foreground hover:bg-surface-highest shrink-0"
              aria-label={`Editar ${p.name}`}
            >
              <Settings className="size-5" />
            </button>
          </li>
        ))}

        <li>
          <button
            onClick={() => navigate('/plataforma/nova')}
            className="w-full p-6 rounded-2xl border-2 border-dashed border-primary/60 text-primary hover:bg-primary/10 active:scale-[0.98] transition flex flex-col items-center gap-2"
          >
            <Plus className="size-8" strokeWidth={2.5} />
            <span className="display text-lg">ADICIONAR NOVA PLATAFORMA</span>
          </button>
        </li>
      </ul>
    </AppShell>
  );
};

export default Apps;
