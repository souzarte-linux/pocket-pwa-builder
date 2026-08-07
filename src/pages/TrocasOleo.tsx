import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Calendar, 
  Gauge, 
  DollarSign, 
  Pencil, 
  Trash2, 
  Info, 
  ShieldCheck, 
  History,
  Check,
  X,
  Eye,
  Save,
  FolderPlus,
  ChevronRight
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { QuickCombobox } from '@/components/QuickCombobox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PartMaintenanceItem {
  id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_date: string;
  cost?: number;
  workshop?: string;
  notes?: string;
}

// Peças padrão pré-configuradas para monitoramento preventivo
const DEFAULT_PARTS: Omit<PartMaintenanceItem, 'id'>[] = [
  { part_name: 'Óleo do Motor', life_km: 3000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Filtro de Óleo', life_km: 6000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Pastilhas de Freio', life_km: 8000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Pneu Traseiro', life_km: 12000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Pneu Dianteiro', life_km: 15000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Kit Transmissão / Corrente', life_km: 15000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Vela de Ignição', life_km: 10000, last_change_km: 0, last_change_date: new Date().toISOString() },
  { part_name: 'Filtro de Ar', life_km: 10000, last_change_km: 0, last_change_date: new Date().toISOString() },
];

export const TrocasOleo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentOdometer, setCurrentOdometer] = useState<number>(45000);
  const [parts, setParts] = useState<PartMaintenanceItem[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Form para registrar nova troca/manutenção
  const [selectedPart, setSelectedPart] = useState('Óleo do Motor');
  const [customPartName, setCustomPartName] = useState('');
  const [changeKm, setChangeKm] = useState('45000');
  const [lifeKm, setLifeKm] = useState('3000');
  const [cost, setCost] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [notes, setNotes] = useState('');
  const [changeDate, setChangeDate] = useState(new Date().toISOString().slice(0, 16));

  // Modal para criar nova peça com vida útil pelo botão "+"
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartNameInput, setNewPartNameInput] = useState('');
  const [newPartLifeInput, setNewPartLifeInput] = useState('10000');

  // Modal de Detalhes do Histórico (Exibição) + Edição
  const [viewHistoryItem, setViewHistoryItem] = useState<any | null>(null);
  const [isEditingHistoryModal, setIsEditingHistoryModal] = useState(false);
  const [editHistoryKm, setEditHistoryKm] = useState('');
  const [editHistoryDate, setEditHistoryDate] = useState('');
  const [editHistoryNotes, setEditHistoryNotes] = useState('');

  const loadData = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      // Buscar odômetro atual baseado em despesas/trocas
      const [expRes, oilRes] = await Promise.all([
        supabase.from('expenses').select('odometer_km').order('odometer_km', { ascending: false }).limit(1),
        supabase.from('oil_changes' as any).select('km_at_change').order('km_at_change', { ascending: false }).limit(1),
      ]);

      const odoExp = Number((expRes.data?.[0] as any)?.odometer_km ?? 0);
      const odoOil = Number((oilRes.data?.[0] as any)?.km_at_change ?? 0);
      const latestOdo = Math.max(45000, odoExp, odoOil);
      setCurrentOdometer(latestOdo);
      setChangeKm(String(latestOdo));

      // Buscar histórico de trocas de óleo e serviços
      const { data: oilData } = await supabase
        .from('oil_changes' as any)
        .select('*')
        .eq('user_id', u.user.id)
        .order('changed_at', { ascending: false });

      if (oilData) {
        setHistory(oilData);
      }

      // Buscar peças cadastradas na tabela part_maintenance
      const { data: partData } = await supabase
        .from('part_maintenance' as any)
        .select('*')
        .eq('user_id', u.user.id);

      if (partData && partData.length > 0) {
        setParts(partData as any);
        const firstPart = partData[0] as any;
        if (firstPart?.part_name) {
          setSelectedPart(firstPart.part_name);
          setLifeKm(String(firstPart.life_km || 3000));
        }
      } else {
        // Mock peças default com base no odômetro atual
        const defaultList: PartMaintenanceItem[] = DEFAULT_PARTS.map((p, index) => ({
          id: `def-${index}`,
          part_name: p.part_name,
          life_km: p.life_km,
          last_change_km: Math.max(0, latestOdo - Math.floor(Math.random() * p.life_km * 0.8)),
          last_change_date: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        }));
        setParts(defaultList);
        if (defaultList.length > 0) {
          setSelectedPart(defaultList[0].part_name);
          setLifeKm(String(defaultList[0].life_km));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados de manutenção:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quando o usuário seleciona uma peça do combobox, preenche a vida útil padrão ou cadastrada
  const handlePartSelect = (partName: string) => {
    setSelectedPart(partName);
    const foundInParts = parts.find((p) => p.part_name.toLowerCase() === partName.toLowerCase());
    const foundInDefault = DEFAULT_PARTS.find((p) => p.part_name.toLowerCase() === partName.toLowerCase());
    const found = foundInParts || foundInDefault;
    if (found) {
      setLifeKm(String(found.life_km));
    }
  };

  // Criar nova peça com vida útil personalizada usando o botão "+"
  const handleCreateCustomPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartNameInput.trim()) {
      toast.error('Informe o nome da nova peça');
      return;
    }

    const lifeNum = Number(newPartLifeInput) || 10000;
    const newPartObj: PartMaintenanceItem = {
      id: `custom-${Date.now()}`,
      part_name: newPartNameInput.trim(),
      life_km: lifeNum,
      last_change_km: currentOdometer,
      last_change_date: new Date().toISOString(),
    };

    setParts((prev) => [newPartObj, ...prev]);
    setSelectedPart(newPartNameInput.trim());
    setLifeKm(String(lifeNum));
    setShowAddPartModal(false);
    setNewPartNameInput('');
    setNewPartLifeInput('10000');
    toast.success(`Peça "${newPartObj.part_name}" criada com vida útil de ${lifeNum.toLocaleString('pt-BR')} KM!`);
  };

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const partName = selectedPart;
      const kmNum = Number(changeKm) || currentOdometer;
      const lifeNum = Number(lifeKm) || 3000;
      const costNum = Number(cost) || 0;

      // 1. Salva no histórico de trocas de óleo / serviços
      const { error: oilErr } = await supabase.from('oil_changes' as any).insert({
        user_id: u.user.id,
        changed_at: new Date(changeDate).toISOString(),
        km_at_change: kmNum,
        notes: `${partName} ${costNum ? `- R$ ${costNum}` : ''} ${workshop ? `(${workshop})` : ''} ${notes ? `- ${notes}` : ''}`,
      } as any);

      if (oilErr) {
        console.error('Erro ao salvar historico:', oilErr);
      }

      // 2. Atualiza a lista local de monitoramento de peças
      const updatedParts = [...parts];
      const existingIdx = updatedParts.findIndex((p) => p.part_name.toLowerCase() === partName.toLowerCase());

      if (existingIdx >= 0) {
        updatedParts[existingIdx] = {
          ...updatedParts[existingIdx],
          last_change_km: kmNum,
          life_km: lifeNum,
          last_change_date: new Date(changeDate).toISOString(),
          cost: costNum,
          workshop,
          notes,
        };
      } else {
        updatedParts.push({
          id: `custom-${Date.now()}`,
          part_name: partName,
          life_km: lifeNum,
          last_change_km: kmNum,
          last_change_date: new Date(changeDate).toISOString(),
          cost: costNum,
          workshop,
          notes,
        });
      }

      setParts(updatedParts);

      // Tenta atualizar no Supabase
      await supabase.from('part_maintenance' as any).upsert({
        user_id: u.user.id,
        part_name: partName,
        life_km: lifeNum,
        last_change_km: kmNum,
        last_change_date: new Date(changeDate).toISOString(),
      } as any);

      toast.success(`Manutenção de "${partName}" registrada com sucesso!`);
      setCost('');
      setWorkshop('');
      setNotes('');
      setCustomPartName('');
      loadData();
    } catch (err: any) {
      toast.error('Erro ao registrar manutenção: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exibir Modal de Detalhes Completo
  const handleOpenViewHistory = (it: any) => {
    setViewHistoryItem(it);
    setIsEditingHistoryModal(false);
    setEditHistoryKm(String(it.km_at_change));
    setEditHistoryDate(new Date(it.changed_at).toISOString().slice(0, 16));
    setEditHistoryNotes(it.notes ?? '');
  };

  // Abrir direto modo Edição
  const handleOpenEditHistory = (e: React.MouseEvent, it: any) => {
    e.stopPropagation();
    setViewHistoryItem(it);
    setIsEditingHistoryModal(true);
    setEditHistoryKm(String(it.km_at_change));
    setEditHistoryDate(new Date(it.changed_at).toISOString().slice(0, 16));
    setEditHistoryNotes(it.notes ?? '');
  };

  // Salvar Edição do Histórico
  const handleSaveHistoryEdit = async () => {
    if (!viewHistoryItem) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('oil_changes' as any)
        .update({
          changed_at: new Date(editHistoryDate).toISOString(),
          km_at_change: Number(editHistoryKm) || 0,
          notes: editHistoryNotes || null,
        } as any)
        .eq('id', viewHistoryItem.id);

      if (error) {
        toast.error('Erro ao atualizar: ' + error.message);
      } else {
        toast.success('Registro do histórico atualizado!');
        setViewHistoryItem(null);
        setIsEditingHistoryModal(false);
        loadData();
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar registro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Deseja remover este registro do histórico?')) return;
    try {
      await supabase.from('oil_changes' as any).delete().eq('id', id);
      toast.success('Registro removido com sucesso!');
      if (viewHistoryItem?.id === id) setViewHistoryItem(null);
      loadData();
    } catch (err: any) {
      toast.error('Erro ao remover registro.');
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader 
        title="MONITORAMENTO DE PEÇAS" 
        subtitle="Manutenção Preventiva do Veículo" 
        back 
      />

      <main className="px-5 pt-6 max-w-3xl mx-auto space-y-6">
        {/* Banner de Apresentação */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center gap-4 relative overflow-hidden shadow-xl">
          <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold shadow-lg">
            <Wrench className="size-7" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#e5e2e1]">Controle de Vida Útil</h2>
            <p className="text-xs text-[#ab8a7d] mt-0.5 font-medium">
              Acompanhe o desgaste de cada peça, receba alertas preventivos e evite quebras inesperadas.
            </p>
          </div>
        </div>

        {/* ========================================================
           SEÇÃO 1: PAINEL DE VIDA ÚTIL DAS PEÇAS (MONITORAMENTO)
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#ff5f00]">
              <Gauge className="size-5" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                Vida Útil das Peças
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#201f1f] px-3 py-1.5 rounded-full border border-stone-800 text-xs font-bold text-[#ffb599]">
                <Clock className="size-4 text-[#ff5f00]" />
                <span>Odômetro: {currentOdometer.toLocaleString('pt-BR')} KM</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/vida-util-pecas')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-high hover:bg-surface-highest border border-border/40 text-xs font-bold text-primary transition active:scale-95"
              >
                <span>Ver tudo</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>

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
                  className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden ${
                    overdue
                      ? 'bg-red-950/30 border-red-800/60 text-red-200'
                      : warning
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                      : 'bg-[#201f1f] border-stone-800 text-[#e5e2e1]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                        {p.part_name}
                      </h3>
                      <p className="text-[11px] text-[#ab8a7d] font-semibold mt-0.5">
                        Última troca: {p.last_change_km.toLocaleString('pt-BR')} KM
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
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold text-[10px] uppercase">
                        <CheckCircle2 className="size-3" /> OK
                      </span>
                    )}
                  </div>

                  {/* Barra de Desgaste Visual */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#ab8a7d]">Desgaste: {pct}%</span>
                      <span className={overdue ? 'text-red-400 font-extrabold' : warning ? 'text-amber-400' : 'text-[#ff5f00]'}>
                        {overdue 
                          ? `Vencida há ${Math.abs(kmRemaining).toLocaleString('pt-BR')} KM`
                          : `Faltam ${kmRemaining.toLocaleString('pt-BR')} KM`}
                      </span>
                    </div>

                    <div className="h-3 bg-[#0e0e0e] rounded-full overflow-hidden p-0.5 border border-stone-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          overdue ? 'bg-red-600' : warning ? 'bg-amber-500' : 'bg-[#ff5f00]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================
           SEÇÃO 2: REGISTRAR NOVA TROCA (COM BOTÃO + PARA NOVA PEÇA)
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#ff5f00]">
              <Plus className="size-5" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                Registrar Nova Troca / Manutenção
              </h2>
            </div>
          </div>

          <form onSubmit={handleRegisterService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Campo Peça / Serviço com QuickCombobox */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Peça / Serviço
                </label>
                <QuickCombobox
                  table="parts_catalog"
                  value={selectedPart}
                  onChange={handlePartSelect}
                  placeholder="Selecione ou cadastre uma peça/serviço"
                  rememberKey="lastPartName"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  KM no Momento da Troca
                </label>
                <input
                  type="number"
                  value={changeKm}
                  onChange={(e) => setChangeKm(e.target.value)}
                  placeholder="Ex: 45000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Vida Útil Recomendada (KM)
                </label>
                <input
                  type="number"
                  value={lifeKm}
                  onChange={(e) => setLifeKm(e.target.value)}
                  placeholder="Ex: 3000"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Valor Gasto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Ex: 120.00"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Oficina / Mecânico (Opcional)
                </label>
                <input
                  type="text"
                  value={workshop}
                  onChange={(e) => setWorkshop(e.target.value)}
                  placeholder="Ex: Auto Elétrica Silva"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                Observações / Detalhes do Serviço
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Troca de óleo + filtro de ar lavável"
                className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[56px] bg-[#ff5f00] text-black font-extrabold text-base uppercase tracking-wider rounded-2xl shadow-xl hover:bg-[#ffb599] active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Wrench className="size-5" />
              <span>{loading ? 'Registrando...' : 'Registrar Troca / Manutenção'}</span>
            </button>
          </form>
        </section>

        {/* ========================================================
           SEÇÃO 3: HISTÓRICO DE TROCAS E SERVIÇOS REALIZADOS
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-4">
          <div className="flex items-center gap-2 text-[#ff5f00]">
            <History className="size-5" />
            <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
              Histórico de Serviços Realizados
            </h2>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-[#ab8a7d] bg-[#201f1f] rounded-2xl border border-stone-800">
              <p className="text-sm font-semibold">Nenhuma troca ou serviço registrado no histórico.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((it) => (
                <div 
                  key={it.id}
                  onClick={() => handleOpenViewHistory(it)}
                  className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 flex items-center justify-between gap-3 hover:border-[#ff5f00]/50 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-[#ff5f00]/15 text-[#ff5f00] rounded-xl shrink-0 group-hover:bg-[#ff5f00] group-hover:text-black transition">
                      <Wrench className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-white group-hover:text-[#ffb599] transition truncate">
                        {it.notes || 'Troca de Óleo / Serviço'}
                      </h4>
                      <p className="text-xs text-[#ab8a7d] font-semibold mt-0.5">
                        KM: {Number(it.km_at_change).toLocaleString('pt-BR')} • {new Date(it.changed_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Ícones de Edição e Lixeira no Histórico */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handleOpenEditHistory(e, it)}
                      className="p-2 text-stone-400 hover:text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-xl transition"
                      title="Editar registro do histórico"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, it.id)}
                      className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition"
                      title="Excluir registro do histórico"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ========================================================
         MODAL 1: CRIAR NOVA PEÇA COM VIDA ÚTIL (BOTÃO "+")
         ======================================================== */}
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
                <FolderPlus className="size-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">Nova Peça para Monitoramento</h3>
                <p className="text-xs text-[#ab8a7d]">Cadastre uma peça personalizada e sua vida útil recomendada.</p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomPart} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome da Peça / Serviço</label>
                <input
                  type="text"
                  value={newPartNameInput}
                  onChange={(e) => setNewPartNameInput(e.target.value)}
                  placeholder="Ex: Amortecedor Traseiro"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Vida Útil Recomendada (KM)</label>
                <input
                  type="number"
                  value={newPartLifeInput}
                  onChange={(e) => setNewPartLifeInput(e.target.value)}
                  placeholder="Ex: 20000"
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
                  Adicionar Peça
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
         MODAL 2: DETALHES COMPLETOS / EDIÇÃO DO ITEM DO HISTÓRICO
         ======================================================== */}
      {viewHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-lexend">
          <div className="w-full max-w-lg bg-[#1c1b1b] border-2 border-[#ff5f00]/50 rounded-3xl p-6 shadow-2xl space-y-5 text-[#e5e2e1] relative overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl shrink-0 font-extrabold">
                  <Wrench className="size-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white uppercase tracking-tight">
                    {isEditingHistoryModal ? 'Editar Registro de Serviço' : 'Detalhes do Serviço Realizado'}
                  </h3>
                  <p className="text-xs text-[#ab8a7d]">
                    {isEditingHistoryModal ? 'Altere as informações necessárias abaixo' : 'Modo de visualização detalhada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Ícone de Edição dentro da Janela de Detalhes */}
                {!isEditingHistoryModal && (
                  <button
                    onClick={() => setIsEditingHistoryModal(true)}
                    className="p-2.5 text-[#ff5f00] hover:bg-[#ff5f00]/15 rounded-2xl border border-[#ff5f00]/30 transition"
                    title="Editar informações deste serviço"
                  >
                    <Pencil className="size-5" />
                  </button>
                )}
                <button
                  onClick={() => setViewHistoryItem(null)}
                  className="p-2 text-[#ab8a7d] hover:text-white rounded-full bg-[#201f1f] transition"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {isEditingHistoryModal ? (
              /* MODO DE EDIÇÃO NO MODAL */
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Data e Hora do Serviço</label>
                  <input
                    type="datetime-local"
                    value={editHistoryDate}
                    onChange={(e) => setEditHistoryDate(e.target.value)}
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">KM no Momento da Troca</label>
                  <input
                    type="number"
                    value={editHistoryKm}
                    onChange={(e) => setEditHistoryKm(e.target.value)}
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Detalhes / Observações</label>
                  <input
                    type="text"
                    value={editHistoryNotes}
                    onChange={(e) => setEditHistoryNotes(e.target.value)}
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingHistoryModal(false)}
                    className="flex-1 h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHistoryEdit}
                    disabled={loading}
                    className="flex-1 h-12 rounded-2xl bg-[#ff5f00] text-black font-extrabold text-sm hover:bg-[#ffb599] transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save className="size-4" />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            ) : (
              /* MODO DE VISUALIZAÇÃO COMPLETA NO MODAL */
              <div className="space-y-4 pt-1">
                <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-3">
                  <div>
                    <span className="block text-[10px] text-[#ab8a7d] uppercase font-extrabold">Serviço / Peça</span>
                    <span className="text-base font-extrabold text-white">
                      {viewHistoryItem.notes || 'Troca de Óleo / Manutenção'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
                    <div>
                      <span className="block text-[10px] text-[#ab8a7d] uppercase font-extrabold">Data do Registro</span>
                      <span className="text-sm font-bold text-[#e5e2e1]">
                        {new Date(viewHistoryItem.changed_at).toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-[#ab8a7d] uppercase font-extrabold">KM Registrado</span>
                      <span className="text-sm font-extrabold text-[#ff5f00]">
                        {Number(viewHistoryItem.km_at_change).toLocaleString('pt-BR')} KM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewHistoryItem(null)}
                    className="w-full h-12 rounded-2xl bg-[#201f1f] text-[#e5e2e1] font-bold text-sm hover:bg-[#252424] transition"
                  >
                    Fechar Visualização
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrocasOleo;
