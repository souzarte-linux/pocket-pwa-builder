import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  Plus,
  Settings,
  Calendar,
  SlidersHorizontal,
  X,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Truck,
  Bike,
} from 'lucide-react';
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
  segment?: string | null;
  total?: number;
}

const cycleLabel = (c?: string | null, day?: string | null) => {
  if (!c) return 'SEMANAL';
  if (c === 'semanal' && day) return `SEMANAL (${day.slice(0, 3).toUpperCase()})`;
  if (c === 'quinzenal') return 'QUINZENAL';
  if (c === 'mensal') return 'MENSAL';
  return c.toUpperCase();
};

const Apps = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'delivery' | 'logistica'>('all');
  const [sortBy, setSortBy] = useState<'alphabetical' | 'highest_earning' | 'lowest_earning'>('alphabetical');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: ps } = await supabase
        .from('platforms')
        .select('id, name, cycle, payment_day, active, segment')
        .order('name', { ascending: true });

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

      const list = (ps ?? []).map((p) => ({
        ...p,
        active: p.active ?? true,
        total: totals.get(p.id) ?? 0,
      }));

      // Default sorting: Alphabetical (A-Z)
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      setPlatforms(list);
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

  const filteredAndSortedPlatforms = useMemo(() => {
    let result = [...platforms];

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((p) => p.active);
    } else if (statusFilter === 'inactive') {
      result = result.filter((p) => !p.active);
    }

    // Category (Segment) filter
    if (segmentFilter !== 'all') {
      result = result.filter((p) => (p.segment ?? 'logistica') === segmentFilter);
    }

    // Sorting: Alphabetical (A-Z) by default
    if (sortBy === 'highest_earning') {
      result.sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
    } else if (sortBy === 'lowest_earning') {
      result.sort((a, b) => (a.total ?? 0) - (b.total ?? 0));
    } else {
      // 'alphabetical' (Default)
      result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    }

    return result;
  }, [platforms, statusFilter, segmentFilter, sortBy]);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (segmentFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'alphabetical' ? 1 : 0);

  return (
    <AppShell
      headerRight={
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="relative size-10 grid place-items-center rounded-xl bg-surface-high border border-border/50 text-foreground hover:bg-surface-bright active:scale-95 transition"
          aria-label="Filtrar e ordenar plataformas"
        >
          <SlidersHorizontal className="size-5 text-primary" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center shadow">
              {activeFilterCount}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-3xl text-primary leading-tight">
            GESTOR DE
            <br />
            PLATAFORMAS
          </h2>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            Plataformas com as quais você trabalha. Acompanhe seus ganhos e calendário de pagamentos.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {filteredAndSortedPlatforms.length} {filteredAndSortedPlatforms.length === 1 ? 'Plataforma' : 'Plataformas'}
        </span>
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border/40 text-xs font-bold text-primary hover:bg-surface-high transition"
        >
          <SlidersHorizontal className="size-3.5" />
          Filtros & Ordenação {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {filteredAndSortedPlatforms.length === 0 ? (
          <li className="p-8 rounded-2xl bg-surface border border-border/40 text-center space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Nenhuma plataforma encontrada com os filtros selecionados.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSegmentFilter('all');
                setSortBy('alphabetical');
              }}
              className="text-xs font-bold text-primary underline"
            >
              Limpar filtros
            </button>
          </li>
        ) : (
          filteredAndSortedPlatforms.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl bg-surface border border-border/40 p-4 shadow-card flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-bold text-lg truncate">{p.name}</h3>
                    {p.segment && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-surface-high text-muted-foreground shrink-0 flex items-center gap-1">
                        {p.segment === 'delivery' ? <Bike className="size-3" /> : <Truck className="size-3" />}
                        {p.segment}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={p.active}
                      onCheckedChange={() => handleToggleActive(p.id, p.active)}
                      className="data-[state=checked]:bg-success data-[state=unchecked]:bg-destructive/60"
                      aria-label={`Status de ${p.name}`}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${
                        p.active ? 'text-success' : 'text-destructive'
                      }`}
                    >
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
          ))
        )}

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

      {/* Filter & Sort Modal */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container border-t sm:border border-border/60 rounded-t-3xl sm:rounded-3xl p-5 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="display text-xl text-foreground">FILTRAR & ORDENAR</h3>
                <p className="text-xs text-muted-foreground">Personalize a exibição das suas plataformas</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="size-9 grid place-items-center rounded-xl bg-surface-high text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Status da Plataforma
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    statusFilter === 'all'
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    statusFilter === 'active'
                      ? 'bg-success/20 text-success border-success'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Ativas
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    statusFilter === 'inactive'
                      ? 'bg-destructive/20 text-destructive border-destructive'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Inativas
                </button>
              </div>
            </div>

            {/* Category (Segment) Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Tipo de Categoria
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSegmentFilter('all')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    segmentFilter === 'all'
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentFilter('delivery')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    segmentFilter === 'delivery'
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setSegmentFilter('logistica')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                    segmentFilter === 'logistica'
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-muted-foreground'
                  }`}
                >
                  Logística
                </button>
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Ordenação
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSortBy('alphabetical')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-left transition flex items-center justify-between border ${
                    sortBy === 'alphabetical'
                      ? 'bg-primary/15 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-foreground'
                  }`}
                >
                  <span>Ordem Alfabética (A-Z)</span>
                  <span className="text-[10px] uppercase opacity-70 font-semibold">(Padrão)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('highest_earning')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-left transition flex items-center justify-between border ${
                    sortBy === 'highest_earning'
                      ? 'bg-primary/15 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-foreground'
                  }`}
                >
                  <span>Maior Ganho</span>
                  <ArrowDownWideNarrow className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('lowest_earning')}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-left transition flex items-center justify-between border ${
                    sortBy === 'lowest_earning'
                      ? 'bg-primary/15 text-primary border-primary'
                      : 'bg-surface-high border-transparent text-foreground'
                  }`}
                >
                  <span>Menor Ganho</span>
                  <ArrowUpNarrowWide className="size-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSegmentFilter('all');
                  setSortBy('alphabetical');
                }}
                className="h-12 border border-border/60 text-muted-foreground font-extrabold text-xs uppercase rounded-xl hover:bg-surface-high transition"
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="h-12 bg-primary text-primary-foreground font-black text-xs uppercase rounded-xl shadow-fab active:scale-95 transition"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Apps;
