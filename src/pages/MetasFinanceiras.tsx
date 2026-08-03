import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  TrendingUp, 
  Sparkles, 
  Save, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Plus 
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';

export const MetasFinanceiras = () => {
  const navigate = useNavigate();
  const [metaDiaria, setMetaDiaria] = useState('350');
  const [metaSemanal, setMetaSemanal] = useState('2100');
  const [metaMensal, setMetaMensal] = useState('8400');
  const [acumuladoMes, setAcumuladoMes] = useState('5880');
  const [loading, setLoading] = useState(false);

  const numDiaria = parseFloat(metaDiaria) || 0;
  const numMensal = parseFloat(metaMensal) || 1;
  const numAcumulado = parseFloat(acumuladoMes) || 0;
  const progresso = Math.min(100, Math.round((numAcumulado / numMensal) * 100));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Metas financeiras salvas com sucesso!');
    }, 500);
  };

  const handleAddPreset = (value: number) => {
    const novao = (numDiaria + value).toString();
    setMetaDiaria(novao);
    setMetaSemanal((parseFloat(novao) * 6).toString());
    setMetaMensal((parseFloat(novao) * 24).toString());
  };

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-lexend pb-28">
      <AppHeader title="METAS FINANCEIRAS" subtitle="Planejamento de Faturamento" />

      <main className="px-5 pt-6 max-w-xl mx-auto space-y-6">
        {/* Banner Hero */}
        <div className="bg-[#1c1b1b] p-6 rounded-3xl border-2 border-[#ff5f00]/40 relative overflow-hidden shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3.5 bg-[#ff5f00] text-black rounded-2xl font-black shrink-0 shadow-lg">
                <Target className="size-7" />
              </div>
              <div>
                <h2 className="font-extrabold text-xl text-[#e5e2e1]">Objetivo Financeiro</h2>
                <p className="text-xs text-[#ab8a7d] mt-0.5 font-medium">Foco diário para máxima rentabilidade</p>
              </div>
            </div>
          </div>

          {/* Progress Tracker Bar */}
          <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold">
              <span className="text-[#ab8a7d] uppercase tracking-wider">Progresso Mês Atual</span>
              <span className="text-[#ff5f00]">R$ {numAcumulado.toLocaleString('pt-BR')} ({progresso}%)</span>
            </div>
            <div className="h-4 bg-[#0e0e0e] rounded-full overflow-hidden p-0.5 border border-stone-800">
              <div 
                className="h-full bg-gradient-to-r from-[#ff5f00] to-[#ffb599] rounded-full transition-all duration-500" 
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="text-[11px] text-[#ab8a7d] font-semibold text-right">
              Faltam R$ {Math.max(0, numMensal - numAcumulado).toLocaleString('pt-BR')} para atingir a meta
            </p>
          </div>
        </div>

        {/* Form Meta inputs */}
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
                <DollarSign className="size-4" /> Meta Diária (R$)
              </h3>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                ~ {Math.ceil(numDiaria / 15)} entregas/dia
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-[#ff5f00]">R$</span>
              <input
                type="number"
                value={metaDiaria}
                onChange={(e) => {
                  const val = e.target.value;
                  setMetaDiaria(val);
                  const n = parseFloat(val) || 0;
                  setMetaSemanal((n * 6).toString());
                  setMetaMensal((n * 24).toString());
                }}
                className="w-full h-16 pl-14 pr-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-black text-2xl outline-none transition"
                placeholder="350"
                required
              />
            </div>

            {/* Presets rápidas */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-bold text-[#ab8a7d] mr-1">Incrementar:</span>
              {[50, 100, 200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddPreset(val)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#201f1f] text-[#ffb599] border border-stone-800 hover:border-[#ff5f00] font-bold text-xs active:scale-95 transition"
                >
                  <Plus className="size-3" /> R$ {val}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
              <Calendar className="size-4" /> Projeção Semanal e Mensal
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Meta Semanal (6 dias)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={metaSemanal}
                    onChange={(e) => setMetaSemanal(e.target.value)}
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-extrabold text-lg outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Meta Mensal (24 dias)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={metaMensal}
                    onChange={(e) => setMetaMensal(e.target.value)}
                    className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-extrabold text-lg outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card de Sugestão Inteligente */}
          <div className="bg-[#0e0e0e] p-4 rounded-2xl border border-stone-800 flex items-center gap-3">
            <div className="p-2.5 bg-[#00daf3]/20 text-[#00daf3] rounded-xl shrink-0 font-bold">
              <Sparkles className="size-5" />
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-[#e5e2e1] block">Recomendação do Sistema:</span>
              <span className="text-[#ab8a7d]">Com base nos seus horários de maior demanda, metas acima de R$ 380/dia são altamente atingíveis.</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[56px] bg-[#ff5f00] text-black font-extrabold text-base uppercase tracking-wider rounded-2xl shadow-xl hover:bg-[#ffb599] active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Save className="size-5" />
            <span>{loading ? 'Salvando...' : 'Salvar Metas Financeiras'}</span>
          </button>
        </form>
      </main>
    </div>
  );
};

export default MetasFinanceiras;
