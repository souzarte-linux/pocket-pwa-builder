import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { parseCurrencyToNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useFinancialGoals } from '@/hooks/queries/useFinancialGoals';
import { useFinancialGoalMutations } from '@/hooks/mutations/useFinancialGoalMutations';
import { Loader2 } from 'lucide-react';

const formatGoalInput = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num) || num === 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const MetasFinanceiras = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: goals, isLoading: isGoalsLoading, isError } = useFinancialGoals(user?.id);
  const { updateGoals, isUpdating } = useFinancialGoalMutations(user?.id);

  const [metaDiaria, setMetaDiaria] = useState('');
  const [metaSemanal, setMetaSemanal] = useState('');
  const [metaMensal, setMetaMensal] = useState('');

  useEffect(() => {
    if (goals) {
      if (goals.daily_goal !== null && goals.daily_goal !== undefined) {
        setMetaDiaria(formatGoalInput(Number(goals.daily_goal)));
      }
      if (goals.weekly_goal !== null && goals.weekly_goal !== undefined) {
        setMetaSemanal(formatGoalInput(Number(goals.weekly_goal)));
      }
      if (goals.monthly_goal !== null && goals.monthly_goal !== undefined) {
        setMetaMensal(formatGoalInput(Number(goals.monthly_goal)));
      }
    }
  }, [goals]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        toast.error('Usuário não autenticado.');
        return;
      }

      const dailyNum = parseCurrencyToNumber(metaDiaria);
      const weeklyNum = parseCurrencyToNumber(metaSemanal);
      const monthlyNum = parseCurrencyToNumber(metaMensal);

      await updateGoals({
        userId: user.id,
        goals: {
          daily_goal: dailyNum,
          weekly_goal: weeklyNum,
          monthly_goal: monthlyNum,
        },
      });

      toast.success('Metas financeiras atualizadas com sucesso!');
      navigate(-1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar metas';
      toast.error(msg);
    }
  };

  return (
    <div className="bg-[#000000] text-[#e5e2e1] min-h-screen font-lexend relative">
      {/* Top Header */}
      <AppHeader title="Metas Financeiras" subtitle="Velocity Log" />

      {/* Mock Background Content (Dashboard View) */}
      <div className="fixed inset-0 z-0 overflow-hidden filter blur-md opacity-40 select-none pointer-events-none pt-20">
        <main className="p-6 grid grid-cols-12 gap-6">
          <div className="col-span-8 bg-[#201f1f] rounded-2xl h-64 p-4 border border-[#333333]" />
          <div className="col-span-4 bg-[#201f1f] rounded-2xl h-64 p-4 border border-[#333333]" />
          <div className="col-span-12 bg-[#201f1f] rounded-2xl h-96 p-4 border border-[#333333]" />
        </main>
      </div>

      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md">
        {/* Modal Card */}
        <div className="w-full max-w-lg bg-[#121212] rounded-2xl border border-[#333333] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Modal Header */}
          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[#FF5F00] text-3xl">track_changes</span>
              <h2 className="text-2xl font-bold text-white">Metas Financeiras</h2>
            </div>
            <p className="text-sm text-[#e4bfb1]/80">
              Ajuste seus objetivos de faturamento para otimizar sua performance logística.
            </p>
          </div>

          {isGoalsLoading ? (
            <div className="p-8 text-center text-[#e4bfb1] flex items-center justify-center gap-2">
              <Loader2 className="size-6 text-[#FF5F00] animate-spin" />
              <span className="text-sm font-semibold">Carregando metas financeiras...</span>
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-red-400">
              <p className="text-sm font-semibold">Não foi possível carregar as metas financeiras.</p>
            </div>
          ) : (
            /* Modal Content (Form Fields) */
            <form onSubmit={handleSave} className="px-8 pb-8 space-y-5">
              {/* Daily Goal */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-medium tracking-widest text-[#e4bfb1] block" htmlFor="meta-diaria">
                  Meta Diária
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-[#e4bfb1]/40">
                    R$
                  </span>
                  <input
                    id="meta-diaria"
                    type="text"
                    value={metaDiaria}
                    onChange={(e) => setMetaDiaria(e.target.value)}
                    className="w-full bg-[#1c1b1b] border border-[#333333] rounded-full pl-12 pr-4 py-3 font-bold text-xl text-white focus:outline-none focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00] transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Weekly Goal */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-medium tracking-widest text-[#e4bfb1] block" htmlFor="meta-semanal">
                  Meta Semanal
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-[#e4bfb1]/40">
                    R$
                  </span>
                  <input
                    id="meta-semanal"
                    type="text"
                    value={metaSemanal}
                    onChange={(e) => setMetaSemanal(e.target.value)}
                    className="w-full bg-[#1c1b1b] border border-[#333333] rounded-full pl-12 pr-4 py-3 font-bold text-xl text-white focus:outline-none focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00] transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Monthly Goal */}
              <div className="space-y-2">
                <label className="text-xs uppercase font-medium tracking-widest text-[#e4bfb1] block" htmlFor="meta-mensal">
                  Meta Mensal
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-lg text-[#e4bfb1]/40">
                    R$
                  </span>
                  <input
                    id="meta-mensal"
                    type="text"
                    value={metaMensal}
                    onChange={(e) => setMetaMensal(e.target.value)}
                    className="w-full bg-[#1c1b1b] border border-[#333333] rounded-full pl-12 pr-4 py-3 font-bold text-xl text-white focus:outline-none focus:border-[#FF5F00] focus:ring-1 focus:ring-[#FF5F00] transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-6 py-3 border-2 border-[#FF5F00] text-[#FF5F00] font-bold text-base rounded-full hover:bg-[#FF5F00]/10 active:scale-95 transition-all text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-6 py-3 bg-[#FF5F00] text-white font-bold text-base rounded-full shadow-lg shadow-orange-900/40 hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>{isUpdating ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Progress Insight Overlay */}
          <div className="bg-[#1c1b1b]/60 px-8 py-3 border-t border-[#333333] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00daf3] text-lg">auto_awesome</span>
              <span className="text-xs text-[#e4bfb1]">Sugestão baseada no histórico: R$ 420,00/dia</span>
            </div>
            <span className="material-symbols-outlined text-stone-500 text-lg cursor-help">info</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetasFinanceiras;
