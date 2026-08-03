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
  X
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
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

  // Edição
  const [editingId, setEditingId] = useState<string | null>(null);

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
      }
    } catch (err) {
      console.error('Erro ao carregar dados de manutenção:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quando o usuário seleciona uma peça do dropdown, preenche a vida útil padrão
  const handlePartSelect = (partName: string) => {
    setSelectedPart(partName);
    const found = DEFAULT_PARTS.find((p) => p.part_name === partName);
    if (found) {
      setLifeKm(String(found.life_km));
    }
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

      const partName = selectedPart === 'Outra Peça' ? customPartName : selectedPart;
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

      // Tenta atualizar no Supabase se existir a tabela part_maintenance
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

  const handleDeleteHistoryItem = async (id: string) => {
    if (!confirm('Deseja remover este registro do histórico?')) return;
    try {
      await supabase.from('oil_changes' as any).delete().eq('id', id);
      toast.success('Registro removido com sucesso!');
      loadData();
    } catch (err: any) {
      toast.error('Erro ao remover registro.');
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      <AppHeader title="MONITORAMENTO DE PEÇAS" subtitle="Manutenção Preventiva do Veículo" />

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#ff5f00]">
              <Gauge className="size-5" />
              <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
                Vida Útil das Peças
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-[#201f1f] px-3 py-1.5 rounded-full border border-stone-800 text-xs font-bold text-[#ffb599]">
              <Clock className="size-4 text-[#ff5f00]" />
              <span>Odômetro: {currentOdometer.toLocaleString('pt-BR')} KM</span>
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
           SEÇÃO 2: REGISTRAR NOVA TROCA OU SERVIÇO REALIZADO
           ======================================================== */}
        <section className="bg-[#1c1b1b] p-6 rounded-3xl border border-[#2a2a2a] space-y-4">
          <div className="flex items-center gap-2 text-[#ff5f00]">
            <Plus className="size-5" />
            <h2 className="text-lg font-extrabold text-white uppercase tracking-tight">
              Registrar Nova Troca / Manutenção
            </h2>
          </div>

          <form onSubmit={handleRegisterService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                  Peça / Serviço
                </label>
                <select
                  value={selectedPart}
                  onChange={(e) => handlePartSelect(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                >
                  {DEFAULT_PARTS.map((p) => (
                    <option key={p.part_name} value={p.part_name}>
                      {p.part_name} (Vida: {p.life_km.toLocaleString('pt-BR')} KM)
                    </option>
                  ))}
                  <option value="Outra Peça">Outra Peça / Serviço Personalizado</option>
                </select>
              </div>

              {selectedPart === 'Outra Peça' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">
                    Nome da Peça / Serviço
                  </label>
                  <input
                    type="text"
                    value={customPartName}
                    onChange={(e) => setCustomPartName(e.target.value)}
                    placeholder="Ex: Correia Dentada"
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-white font-semibold text-sm outline-none transition"
                    required
                  />
                </div>
              )}

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
                  className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 flex items-center justify-between gap-3 hover:border-stone-700 transition"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-[#ff5f00]/15 text-[#ff5f00] rounded-xl shrink-0">
                      <Wrench className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-white truncate">
                        {it.notes || 'Troca de Óleo / Serviço'}
                      </h4>
                      <p className="text-xs text-[#ab8a7d] font-semibold mt-0.5">
                        KM: {Number(it.km_at_change).toLocaleString('pt-BR')} • {new Date(it.changed_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteHistoryItem(it.id)}
                    className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl transition shrink-0"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default TrocasOleo;
