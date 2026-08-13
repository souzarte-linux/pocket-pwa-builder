import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Calendar, 
  Building2, 
  FileText, 
  Tag, 
  History,
  ShieldCheck,
  Plus,
  Package,
  Layers,
  X,
  Save,
  Loader2,
  Trash2
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { formatBRL, formatKm } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOdometer } from '@/hooks/queries/useCurrentOdometer';
import { usePartMaintenance } from '@/hooks/queries/useMaintenance';
import { useExpenses } from '@/hooks/queries/useExpenses';
import { usePartsCatalog } from '@/hooks/queries/usePartsCatalog';
import { usePartsCatalogMutations } from '@/hooks/mutations/usePartsCatalogMutations';
import { toast } from 'sonner';

interface PartDisplayItem {
  id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_date?: string;
  category?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  unit?: string | null;
  notes?: string | null;
}

const DEFAULT_PARTS: { part_name: string; life_km: number }[] = [
  { part_name: 'Óleo do Motor', life_km: 1000 },
  { part_name: 'Filtro de Óleo', life_km: 3000 },
  { part_name: 'Pneu Dianteiro', life_km: 20000 },
  { part_name: 'Pneu Traseiro', life_km: 15000 },
  { part_name: 'Pastilha de Freio Dianteira', life_km: 10000 },
  { part_name: 'Lona de Freio Traseira', life_km: 15000 },
  { part_name: 'Kit Transmissão / Corrente', life_km: 15000 },
  { part_name: 'Vela de Ignição', life_km: 10000 },
  { part_name: 'Filtro de Ar', life_km: 10000 },
];

export const VidaUtilPecas: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: currentOdometer = null } = useCurrentOdometer(user?.id);
  const { data: dbParts = [], isLoading: isPartsLoading } = usePartMaintenance(user?.id);
  const { data: catalogParts = [], isLoading: isCatalogLoading } = usePartsCatalog(user?.id);
  const { data: allExpenses = [], isLoading: isExpLoading } = useExpenses();
  const { createPart, deletePart, isCreating } = usePartsCatalogMutations(user?.id);

  // Modal para cadastrar nova peça no Catálogo Centralizado
  const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCategory, setNewPartCategory] = useState('');
  const [newPartBrand, setNewPartBrand] = useState('');
  const [newPartModel, setNewPartModel] = useState('');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartLifeKm, setNewPartLifeKm] = useState('10000');
  const [newPartUnit, setNewPartUnit] = useState('unidade');
  const [newPartNotes, setNewPartNotes] = useState('');

  // Mescla peças monitoradas de part_maintenance com o catálogo centralizado de peças
  const parts: PartDisplayItem[] = useMemo(() => {
    if (dbParts && dbParts.length > 0) {
      return dbParts.map((p) => {
        const catMatch = catalogParts.find(
          (cp) => cp.name.toLowerCase() === p.part_name.toLowerCase()
        );
        const resolvedLife = Number(p.life_km) || catMatch?.default_life_km || 10000;
        return {
          id: p.id,
          part_name: p.part_name,
          life_km: resolvedLife,
          last_change_km: Number(p.last_change_km) || 0,
          last_change_date: p.last_change_at,
          category: catMatch?.category,
          manufacturer: catMatch?.manufacturer,
          brand: catMatch?.brand,
          model: catMatch?.model,
          sku: catMatch?.sku,
          unit: catMatch?.unit,
          notes: catMatch?.notes,
        };
      });
    }

    if (catalogParts && catalogParts.length > 0) {
      return catalogParts.map((cp) => ({
        id: cp.id,
        part_name: cp.name,
        life_km: cp.default_life_km || 10000,
        last_change_km: 0,
        category: cp.category,
        manufacturer: cp.manufacturer,
        brand: cp.brand,
        model: cp.model,
        sku: cp.sku,
        unit: cp.unit,
        notes: cp.notes,
      }));
    }

    return DEFAULT_PARTS.map((p, idx) => ({
      id: `def-${idx}`,
      part_name: p.part_name,
      life_km: p.life_km,
      last_change_km: 0,
    }));
  }, [dbParts, catalogParts]);

  const history = useMemo(() => {
    return allExpenses
      .filter((e) => e.category === 'manutencao')
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  }, [allExpenses]);

  const handleCreateCatalogPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) {
      toast.error('Informe o nome da peça/produto.');
      return;
    }
    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    try {
      await createPart({
        user_id: user.id,
        name: newPartName.trim(),
        category: newPartCategory.trim() || null,
        brand: newPartBrand.trim() || null,
        model: newPartModel.trim() || null,
        sku: newPartSku.trim() || null,
        default_life_km: Number(newPartLifeKm) || 10000,
        unit: newPartUnit.trim() || 'unidade',
        notes: newPartNotes.trim() || null,
      });

      toast.success(`Peça "${newPartName.trim()}" cadastrada no catálogo!`);
      setShowAddCatalogModal(false);
      setNewPartName('');
      setNewPartCategory('');
      setNewPartBrand('');
      setNewPartModel('');
      setNewPartSku('');
      setNewPartLifeKm('10000');
      setNewPartUnit('unidade');
      setNewPartNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar';
      toast.error(`Erro ao cadastrar peça: ${msg}`);
    }
  };

  const handleDeleteCatalogPart = async (id: string, name: string) => {
    if (!confirm(`Deseja remover "${name}" do catálogo de peças?`)) return;
    try {
      await deletePart(id);
      toast.success('Peça removida do catálogo.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover';
      toast.error(`Erro ao remover: ${msg}`);
    }
  };

  return (
    <AppShell title="VIDA ÚTIL DAS PEÇAS" back>
      <div className="space-y-6 max-w-4xl mx-auto font-lexend">
        {/* Banner Odômetro Atual */}
        <div className="rounded-2xl bg-surface-container border border-border/40 p-4 shadow-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
              <Gauge className="size-6" />
            </div>
            <div>
              <p className="label-up text-xs text-muted-foreground">Odômetro Atual Estimado</p>
              <h2 className="display text-2xl text-foreground font-extrabold">
                {currentOdometer !== null ? formatKm(currentOdometer) : 'Não informado'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddCatalogModal(true)}
              className="h-11 px-3.5 rounded-xl bg-surface-high border border-border/40 text-foreground font-bold text-xs uppercase shadow hover:bg-surface-highest active:scale-95 transition flex items-center gap-1.5 shrink-0"
              title="Cadastrar peça no catálogo"
            >
              <Plus className="size-4 text-primary" />
              <span className="hidden sm:inline">Nova Peça</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/despesa/manutencao')}
              className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase shadow hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 shrink-0"
            >
              <Wrench className="size-4" />
              <span className="hidden sm:inline">Lançar Manutenção</span>
            </button>
          </div>
        </div>

        {/* SEÇÃO 1: Peças Monitoradas com Metadados do Catálogo */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <h2 className="display text-lg uppercase font-bold text-foreground tracking-tight">
                Peças Monitoradas ({parts.length})
              </h2>
            </div>
          </div>

          {isPartsLoading || isCatalogLoading ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-xs">Carregando catálogo de peças…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parts.map((p) => {
                const kmDriven = currentOdometer !== null ? Math.max(0, currentOdometer - p.last_change_km) : 0;
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

                    {/* Chips de Metadados do Catálogo */}
                    {(p.brand || p.model || p.sku || p.category) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] font-semibold text-muted-foreground">
                        {p.category && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-high border border-border/40 text-foreground">
                            {p.category}
                          </span>
                        )}
                        {p.brand && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {p.brand}
                          </span>
                        )}
                        {p.model && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-high text-muted-foreground">
                            Mod: {p.model}
                          </span>
                        )}
                        {p.sku && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-high text-muted-foreground">
                            SKU: {p.sku}
                          </span>
                        )}
                      </div>
                    )}

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

        {/* SEÇÃO 2: Catálogo de Peças Cadastradas */}
        {catalogParts.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Package className="size-5" />
                <h2 className="display text-lg uppercase font-bold text-foreground tracking-tight">
                  Catálogo de Peças Cadastradas ({catalogParts.length})
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {catalogParts.map((cp) => (
                <div
                  key={cp.id}
                  className="rounded-2xl bg-surface-container border border-border/40 p-3.5 space-y-2 relative group hover:border-primary/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-foreground truncate">{cp.name}</h4>
                      <p className="text-[11px] text-primary font-bold">
                        {cp.default_life_km ? `${formatKm(cp.default_life_km)} de vida útil` : 'Vida útil livre'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCatalogPart(cp.id, cp.name)}
                      className="p-1.5 text-stone-500 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition shrink-0"
                      title="Excluir peça do catálogo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    {cp.category && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-high border border-border/20">
                        {cp.category}
                      </span>
                    )}
                    {cp.brand && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {cp.brand}
                      </span>
                    )}
                    {cp.sku && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-high">
                        SKU: {cp.sku}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEÇÃO 3: Peças Substituídas / Serviços Realizados */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-primary">
            <History className="size-5" />
            <h2 className="display text-lg uppercase font-bold text-foreground tracking-tight">
              Histórico de Peças Substituídas & Serviços ({history.length})
            </h2>
          </div>

          {isExpLoading ? (
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
              {history.map((h, idx) => (
                <div
                  key={h.id || `hist-${idx}`}
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

        {/* Modal Cadastrar Nova Peça no Catálogo */}
        {showAddCatalogModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-surface border-2 border-primary/40 rounded-3xl p-6 shadow-2xl space-y-5 text-foreground relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setShowAddCatalogModal(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full bg-surface-high transition"
              >
                <X className="size-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary text-primary-foreground rounded-2xl shrink-0 font-extrabold">
                  <Package className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-foreground uppercase tracking-tight">
                    Cadastrar Peça no Catálogo
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione especificações técnicas e vida útil padrão.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCatalogPart} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                    Nome da Peça / Produto *
                  </label>
                  <input
                    type="text"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="Ex: Pastilha de Freio Dianteira"
                    className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Categoria (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPartCategory}
                      onChange={(e) => setNewPartCategory(e.target.value)}
                      placeholder="Ex: Freios, Motor, Pneus"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Vida Útil Padrão (KM) *
                    </label>
                    <input
                      type="number"
                      value={newPartLifeKm}
                      onChange={(e) => setNewPartLifeKm(e.target.value)}
                      placeholder="Ex: 10000"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Marca / Fabricante (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPartBrand}
                      onChange={(e) => setNewPartBrand(e.target.value)}
                      placeholder="Ex: Cobreq, Mobil, Bosch"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Modelo (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPartModel}
                      onChange={(e) => setNewPartModel(e.target.value)}
                      placeholder="Ex: Cerâmica Pro, 20w50"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Código SKU / Referência (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPartSku}
                      onChange={(e) => setNewPartSku(e.target.value)}
                      placeholder="Ex: CBQ-1234"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                      Unidade de Medida (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newPartUnit}
                      onChange={(e) => setNewPartUnit(e.target.value)}
                      placeholder="Ex: unidade, litro, par"
                      className="w-full h-14 px-4 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">
                    Observações Técnicas (Opcional)
                  </label>
                  <textarea
                    value={newPartNotes}
                    onChange={(e) => setNewPartNotes(e.target.value)}
                    rows={2}
                    placeholder="Instruções de instalação, intervalo de verificação, etc."
                    className="w-full p-3 bg-surface-high border-2 border-border/40 focus:border-primary rounded-2xl text-foreground font-semibold text-sm outline-none transition resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCatalogModal(false)}
                    className="flex-1 h-12 rounded-2xl bg-surface-high text-foreground font-bold text-sm hover:bg-surface-highest transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    <span>{isCreating ? 'Cadastrando...' : 'Cadastrar Peça'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default VidaUtilPecas;
