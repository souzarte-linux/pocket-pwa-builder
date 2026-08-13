import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Gauge, 
  Pencil, 
  Trash2, 
  History, 
  X, 
  Save, 
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Loader2
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { QuickCombobox } from '@/components/QuickCombobox';
import { Tables } from '@/integrations/supabase/types';
import { formatBRL, formatKm } from '@/lib/format';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOdometer } from '@/hooks/queries/useCurrentOdometer';
import {
  useOilChanges,
  usePartMaintenance,
  useCreateOilChange,
  useUpdateOilChange,
  useDeleteOilChange,
  useUpsertPartMaintenance,
} from '@/hooks/queries/useMaintenance';
import { usePartsCatalog } from '@/hooks/queries/usePartsCatalog';
import { useCompanies } from '@/hooks/queries/useCompanies';

interface PartMaintenanceDisplayItem {
  id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_date?: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  cost?: number;
  workshop?: string;
  notes?: string;
}

const DEFAULT_PARTS: { part_name: string; life_km: number }[] = [
  { part_name: 'Óleo do Motor', life_km: 3000 },
  { part_name: 'Filtro de Óleo', life_km: 6000 },
  { part_name: 'Pastilhas de Freio (Dianteira)', life_km: 10000 },
  { part_name: 'Pastilhas / Lonas de Freio (Traseira)', life_km: 12000 },
  { part_name: 'Kit Transmissão / Relação', life_km: 20000 },
  { part_name: 'Vela de Ignição', life_km: 10000 },
  { part_name: 'Filtro de Ar', life_km: 10000 },
  { part_name: 'Pneu Dianteiro', life_km: 25000 },
  { part_name: 'Pneu Traseiro', life_km: 20000 },
  { part_name: 'Fluido de Freio (DOT 4)', life_km: 15000 },
];

export const Manutencao: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const { data: currentOdometer = null } = useCurrentOdometer(user?.id);
  const { data: history = [], isLoading: isHistoryLoading } = useOilChanges(user?.id);
  const { data: dbParts = [], isLoading: isPartsLoading } = usePartMaintenance(user?.id);
  const { data: catalogParts = [] } = usePartsCatalog(user?.id);
  const { data: companies = [] } = useCompanies(user?.id);

  const createOilChangeMutation = useCreateOilChange(user?.id);
  const updateOilChangeMutation = useUpdateOilChange();
  const deleteOilChangeMutation = useDeleteOilChange();
  const upsertPartMutation = useUpsertPartMaintenance(user?.id);

  const [activeTab, setActiveTab] = useState<'lancar' | 'historico' | 'pecas'>('lancar');

  // Form State
  const [selectedPart, setSelectedPart] = useState('Óleo do Motor');
  const [changeKm, setChangeKm] = useState('');
  const [lifeKm, setLifeKm] = useState('3000');
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [changeDate, setChangeDate] = useState(new Date().toISOString().slice(0, 16));

  // Modal para nova peça com vida útil
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartNameInput, setNewPartNameInput] = useState('');
  const [newPartLifeInput, setNewPartLifeInput] = useState('10000');

  // Modal de Detalhes / Edição de Histórico
  const [viewHistoryItem, setViewHistoryItem] = useState<Tables<'oil_changes'> | null>(null);
  const [isEditingHistoryModal, setIsEditingHistoryModal] = useState(false);
  const [editHistoryKm, setEditHistoryKm] = useState('');
  const [editHistoryDate, setEditHistoryDate] = useState('');
  const [editHistoryNotes, setEditHistoryNotes] = useState('');

  // Auto-preenche odômetro atual se não tiver preenchido
  useEffect(() => {
    if (currentOdometer !== null && !changeKm) {
      setChangeKm(String(currentOdometer));
    }
  }, [currentOdometer, changeKm]);

  // Se veio parâmetro de edição pela URL (ex: ?id=xxx)
  useEffect(() => {
    const histId = searchParams.get('id');
    if (histId && history.length > 0) {
      const found = history.find((h) => h.id === histId);
      if (found) {
        setViewHistoryItem(found);
        setIsEditingHistoryModal(true);
        setEditHistoryKm(String(found.km_at_change ?? 0));
        setEditHistoryDate(new Date(found.changed_at).toISOString().slice(0, 16));
        setEditHistoryNotes(found.notes ?? '');
      }
    }
  }, [searchParams, history]);

  // Mescla peças de part_maintenance com catálogo de peças
  const parts: PartMaintenanceDisplayItem[] = useMemo(() => {
    if (dbParts && dbParts.length > 0) {
      return dbParts.map((pd) => {
        const catMatch = catalogParts.find(
          (cp) => cp.name.toLowerCase() === pd.part_name.toLowerCase()
        );
        return {
          id: pd.id,
          part_name: pd.part_name,
          life_km: Number(pd.life_km) || catMatch?.default_life_km || 3000,
          last_change_km: Number(pd.last_change_km) || 0,
          last_change_date: pd.last_change_at,
          category: catMatch?.category,
          brand: catMatch?.brand,
          model: catMatch?.model,
          sku: catMatch?.sku,
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
        brand: cp.brand,
        model: cp.model,
        sku: cp.sku,
      }));
    }

    return DEFAULT_PARTS.map((p, idx) => ({
      id: `def-${idx}`,
      part_name: p.part_name,
      life_km: p.life_km,
      last_change_km: 0,
    }));
  }, [dbParts, catalogParts]);

  // Quando seleciona peça, preenche vida útil a partir do catálogo ou lista
  const handlePartSelect = (partName: string) => {
    setSelectedPart(partName);
    const catMatch = catalogParts.find((cp) => cp.name.toLowerCase() === partName.toLowerCase());
    if (catMatch && catMatch.default_life_km) {
      setLifeKm(String(catMatch.default_life_km));
      return;
    }
    const partMatch = parts.find((p) => p.part_name.toLowerCase() === partName.toLowerCase());
    const defaultMatch = DEFAULT_PARTS.find((p) => p.part_name.toLowerCase() === partName.toLowerCase());
    const found = partMatch || defaultMatch;
    if (found) {
      setLifeKm(String(found.life_km));
    }
  };

  // Criar nova peça com vida útil pelo modal "+"
  const handleCreateCustomPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartNameInput.trim()) {
      toast.error('Informe o nome da nova peça');
      return;
    }

    const lifeNum = Number(newPartLifeInput) || 10000;
    setSelectedPart(newPartNameInput.trim());
    setLifeKm(String(lifeNum));
    setShowAddPartModal(false);
    setNewPartNameInput('');
    setNewPartLifeInput('10000');
    toast.success(`Peça "${newPartNameInput.trim()}" selecionada com vida útil de ${lifeNum.toLocaleString('pt-BR')} KM!`);
  };

  // Registrar Manutenção / Troca de Óleo
  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Usuário não autenticado.');
      return;
    }

    try {
      const partName = selectedPart.trim();
      const kmNum = Number(changeKm) || currentOdometer || 0;
      const lifeNum = Number(lifeKm) || 3000;
      const costNum = Number(cost) || 0;

      // 1. Grava no histórico de trocas de óleo (oil_changes)
      await createOilChangeMutation.mutateAsync({
        user_id: user.id,
        changed_at: new Date(changeDate).toISOString(),
        km_at_change: kmNum,
        notes: `${partName} ${costNum ? `- R$ ${costNum}` : ''} ${workshop ? `(${workshop})` : ''} ${notes ? `- ${notes}` : ''}`,
      });

      // 2. Atualiza a vida útil em part_maintenance
      await upsertPartMutation.mutateAsync({
        user_id: user.id,
        part_name: partName,
        life_km: lifeNum,
        last_change_km: kmNum,
        last_change_at: new Date(changeDate).toISOString(),
      });

      toast.success(`Manutenção de "${partName}" registrada com sucesso!`);
      setCost('');
      setWorkshop('');
      setNotes('');
      setActiveTab('historico');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar';
      toast.error(msg);
    }
  };

  // Exibir Modal de Detalhes Completo
  const handleOpenViewHistory = (it: Tables<'oil_changes'>) => {
    setViewHistoryItem(it);
    setIsEditingHistoryModal(false);
    setEditHistoryKm(String(it.km_at_change ?? 0));
    setEditHistoryDate(new Date(it.changed_at).toISOString().slice(0, 16));
    setEditHistoryNotes(it.notes ?? '');
  };

  // Abrir direto modo Edição
  const handleOpenEditHistory = (e: React.MouseEvent, it: Tables<'oil_changes'>) => {
    e.stopPropagation();
    setViewHistoryItem(it);
    setIsEditingHistoryModal(true);
    setEditHistoryKm(String(it.km_at_change ?? 0));
    setEditHistoryDate(new Date(it.changed_at).toISOString().slice(0, 16));
    setEditHistoryNotes(it.notes ?? '');
  };

  // Salvar Edição do Histórico
  const handleSaveHistoryEdit = async () => {
    if (!viewHistoryItem) return;
    try {
      await updateOilChangeMutation.mutateAsync({
        id: viewHistoryItem.id,
        payload: {
          changed_at: new Date(editHistoryDate).toISOString(),
          km_at_change: Number(editHistoryKm) || 0,
          notes: editHistoryNotes || null,
        },
      });

      toast.success('Registro de manutenção atualizado!');
      setViewHistoryItem(null);
      setIsEditingHistoryModal(false);
    } catch {
      toast.error('Erro ao atualizar registro.');
    }
  };

  // Excluir registro do histórico
  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja remover este registro de manutenção?')) return;
    try {
      await deleteOilChangeMutation.mutateAsync(id);
      toast.success('Registro removido com sucesso!');
      if (viewHistoryItem?.id === id) setViewHistoryItem(null);
    } catch {
      toast.error('Erro ao remover registro.');
    }
  };

  const isActionLoading =
    createOilChangeMutation.isPending ||
    updateOilChangeMutation.isPending ||
    deleteOilChangeMutation.isPending ||
    upsertPartMutation.isPending;

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="MANUTENÇÃO & TROCAS DE ÓLEO" subtitle="Gestão Unificada de Peças, Serviços e Óleo" back />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner Odômetro & Resumo */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
              <Wrench className="size-7" />
            </div>
            <div>
              <p className="text-xs text-[#ab8a7d] uppercase font-bold tracking-wider">Odômetro Atual Estimado</p>
              <h2 className="font-extrabold text-2xl text-white">
                {currentOdometer !== null ? formatKm(currentOdometer) : 'Não informado'}
              </h2>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 rounded-full bg-[#ff5f00]/15 text-[#ffb599] font-extrabold text-xs">
              {history.length} Registros
            </span>
          </div>
        </div>

        {/* Abas da Página */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#1c1b1b] border-2 border-stone-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('lancar')}
            className={`h-12 rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-1.5 ${
              activeTab === 'lancar'
                ? 'bg-[#ff5f00] text-black shadow-lg'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Plus className="size-4 stroke-[3]" />
            <span>Lançar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`h-12 rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-1.5 ${
              activeTab === 'historico'
                ? 'bg-[#ff5f00] text-black shadow-lg'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <History className="size-4" />
            <span>Histórico ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pecas')}
            className={`h-12 rounded-xl text-xs font-extrabold uppercase transition flex items-center justify-center gap-1.5 ${
              activeTab === 'pecas'
                ? 'bg-[#ff5f00] text-black shadow-lg'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>Peças ({parts.length})</span>
          </button>
        </div>

        {/* ABA 1: Formulário de Lançamento */}
        {activeTab === 'lancar' && (
          <form onSubmit={handleRegisterService} className="bg-[#1c1b1b] p-6 rounded-3xl border-2 border-stone-800 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-lg text-white uppercase tracking-tight flex items-center gap-2">
              <Wrench className="size-5 text-[#ff5f00]" />
              Registrar Nova Troca / Manutenção
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-[#ab8a7d]">Peça ou Serviço *</label>
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(true)}
                  className="text-xs font-bold text-[#ff5f00] hover:underline flex items-center gap-1"
                >
                  <Plus className="size-3.5" /> Criar Peça Personalizada
                </button>
              </div>

              <QuickCombobox
                table="parts_catalog"
                value={selectedPart}
                onChange={handlePartSelect}
                placeholder="Selecione ou busque a peça/serviço..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">KM do Odômetro *</label>
                <input
                  type="number"
                  value={changeKm}
                  onChange={(e) => setChangeKm(e.target.value)}
                  placeholder="Ex: 45200"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Vida Útil Estimada (KM) *</label>
                <input
                  type="number"
                  value={lifeKm}
                  onChange={(e) => setLifeKm(e.target.value)}
                  placeholder="Ex: 3000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Ex: 150,00"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Oficina / Prestadora</label>
                <QuickCombobox
                  table="companies"
                  value={workshop}
                  onChange={setWorkshop}
                  placeholder="Selecione ou digite a oficina..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Data e Hora *</label>
              <input
                type="datetime-local"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
                className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Observações (Opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Marca do óleo, modelo da peça, observações mecânicas..."
                className="w-full p-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isActionLoading}
              className="w-full h-14 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm uppercase hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              {isActionLoading ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
              <span>{isActionLoading ? 'Registrando...' : 'Registrar Manutenção'}</span>
            </button>
          </form>
        )}

        {/* ABA 2: Histórico */}
        {activeTab === 'historico' && (
          <div className="space-y-3">
            {isHistoryLoading ? (
              <div className="text-center py-12 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 flex items-center justify-center gap-2">
                <Loader2 className="size-5 text-[#ff5f00] animate-spin" />
                <span className="text-xs font-semibold">Carregando histórico de manutenções...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 space-y-2">
                <p className="text-sm font-semibold">Nenhuma manutenção ou troca registrada até o momento.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('lancar')}
                  className="px-4 py-2 rounded-xl bg-[#ff5f00] text-black font-bold text-xs uppercase shadow hover:bg-[#ffb599] transition"
                >
                  Lançar primeira manutenção
                </button>
              </div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => handleOpenViewHistory(h)}
                  className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-stone-800 hover:border-[#ff5f00]/40 transition space-y-2 cursor-pointer shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                        {h.notes || 'Manutenção Geral'}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#ab8a7d] font-semibold mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5 text-[#ff5f00]" />
                          {new Date(h.changed_at).toLocaleDateString('pt-BR')}
                        </span>
                        {h.km_at_change != null && (
                          <span className="flex items-center gap-1 text-[#ffb599]">
                            <Gauge className="size-3.5 text-[#ff5f00]" />
                            {formatKm(h.km_at_change)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditHistory(e, h)}
                        className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                        title="Editar Registro"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryItem(e, h.id)}
                        className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                        title="Excluir Registro"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA 3: Peças Monitoradas */}
        {activeTab === 'pecas' && (
          <div className="space-y-3">
            {isPartsLoading ? (
              <div className="text-center py-12 text-[#ab8a7d] bg-[#1c1b1b] rounded-3xl border border-stone-800 flex items-center justify-center gap-2">
                <Loader2 className="size-5 text-[#ff5f00] animate-spin" />
                <span className="text-xs font-semibold">Carregando peças monitoradas...</span>
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
                      className={`p-5 rounded-3xl border-2 transition-all space-y-3 relative overflow-hidden ${
                        overdue
                          ? 'bg-red-950/30 border-red-800/60 text-red-200'
                          : warning
                          ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                          : 'bg-[#1c1b1b] border-stone-800 text-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-extrabold text-base text-white">{p.part_name}</h4>
                          <p className="text-xs text-[#ab8a7d] font-semibold mt-0.5">
                            Última troca: {p.last_change_km > 0 ? formatKm(p.last_change_km) : 'Não registrada'}
                          </p>
                        </div>

                        {overdue ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[10px] uppercase animate-pulse">
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
                      <div className="grid grid-cols-3 gap-2 py-1 text-center bg-[#201f1f] rounded-2xl p-2.5 border border-stone-800">
                        <div>
                          <p className="text-[9px] text-[#ab8a7d] uppercase font-bold">Vida Útil</p>
                          <p className="font-bold text-xs text-white">{formatKm(p.life_km)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#ab8a7d] uppercase font-bold">Rodado</p>
                          <p className="font-bold text-xs text-white">{formatKm(kmDriven)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#ab8a7d] uppercase font-bold">Restante</p>
                          <p
                            className={`font-extrabold text-xs ${
                              overdue ? 'text-red-400' : warning ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {kmRemaining <= 0 ? `-${formatKm(Math.abs(kmRemaining))}` : formatKm(kmRemaining)}
                          </p>
                        </div>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#ab8a7d]">
                          <span>Desgaste</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#201f1f] overflow-hidden border border-stone-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              overdue ? 'bg-red-500' : warning ? 'bg-amber-500' : 'bg-[#ff5f00]'
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
          </div>
        )}
      </main>

      {/* Modal Criar Peça Personalizada com Vida Útil */}
      {showAddPartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
            <button
              onClick={() => setShowAddPartModal(false)}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
                <Package className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Nova Peça Personalizada</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre uma nova peça com vida útil personalizada.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomPart} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Peça *</label>
                <input
                  type="text"
                  value={newPartNameInput}
                  onChange={(e) => setNewPartNameInput(e.target.value)}
                  placeholder="Ex: Correia de Transmissão"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Vida Útil Estimada (KM) *</label>
                <input
                  type="number"
                  value={newPartLifeInput}
                  onChange={(e) => setNewPartLifeInput(e.target.value)}
                  placeholder="Ex: 10000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartModal(false)}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg"
                >
                  Usar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Registro do Histórico */}
      {viewHistoryItem && isEditingHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-md bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative">
            <button
              onClick={() => {
                setViewHistoryItem(null);
                setIsEditingHistoryModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                <Pencil className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Editar Manutenção</h3>
                <p className="text-xs text-[#ab8a7d]">Altere a data, odômetro ou observações deste registro.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">KM do Odômetro</label>
                <input
                  type="number"
                  value={editHistoryKm}
                  onChange={(e) => setEditHistoryKm(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Data e Hora</label>
                <input
                  type="datetime-local"
                  value={editHistoryDate}
                  onChange={(e) => setEditHistoryDate(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Observações</label>
                <textarea
                  value={editHistoryNotes}
                  onChange={(e) => setEditHistoryNotes(e.target.value)}
                  rows={3}
                  className="w-full p-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewHistoryItem(null);
                    setIsEditingHistoryModal(false);
                  }}
                  className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveHistoryEdit}
                  className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Save className="size-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manutencao;
