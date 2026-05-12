import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const MetasFinanceiras = () => {
  const navigate = useNavigate();
  const [metaDiaria, setMetaDiaria] = useState("350,00");
  const [metaSemanal, setMetaSemanal] = useState("2.100,00");
  const [metaMensal, setMetaMensal] = useState("8.500,00");

  return (
    <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-[#101010] shadow-[0_60px_120px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="p-7 space-y-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl bg-[#1b1b1b] border border-[#FF5F00]/20 text-[#FF8A2D]">
              <Target size={24} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Metas Financeiras</h1>
              <p className="text-sm leading-6 text-[#c8b1a4] max-w-xs">
                Ajuste seus objetivos de faturamento para otimizar sua performance logística.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dab9a6]">Meta Diária</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[#FFB699] transition hover:bg-white/15">
                      <Info size={12} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#121212] text-white border border-white/10">
                    Valor recomendado com base no histórico de entregas.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-4 flex items-center justify-between gap-3">
                <span className="text-sm uppercase tracking-[0.18em] text-[#d6b9a7]">R$</span>
                <input
                  value={metaDiaria}
                  onChange={(event) => setMetaDiaria(event.target.value)}
                  className="w-full bg-transparent text-right text-2xl font-semibold text-white outline-none placeholder:text-white/30"
                  placeholder="0,00"
                  type="text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dab9a6]">Meta Semanal</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[#FFB699] transition hover:bg-white/15">
                      <Info size={12} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#121212] text-white border border-white/10">
                    Esta meta ajuda a planejar receitas semanais de forma mais consistente.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-4 flex items-center justify-between gap-3">
                <span className="text-sm uppercase tracking-[0.18em] text-[#d6b9a7]">R$</span>
                <input
                  value={metaSemanal}
                  onChange={(event) => setMetaSemanal(event.target.value)}
                  className="w-full bg-transparent text-right text-2xl font-semibold text-white outline-none placeholder:text-white/30"
                  placeholder="0,00"
                  type="text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#dab9a6]">Meta Mensal</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[#FFB699] transition hover:bg-white/15">
                      <Info size={12} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#121212] text-white border border-white/10">
                    Com base nas metas diárias e semanais, é mais fácil manter o foco mensal.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-5 py-4 flex items-center justify-between gap-3">
                <span className="text-sm uppercase tracking-[0.18em] text-[#d6b9a7]">R$</span>
                <input
                  value={metaMensal}
                  onChange={(event) => setMetaMensal(event.target.value)}
                  className="w-full bg-transparent text-right text-2xl font-semibold text-white outline-none placeholder:text-white/30"
                  placeholder="0,00"
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-[#FF5F00] text-[#FF8A2D] hover:bg-[#ff5f00]/10"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="w-full rounded-full bg-[#FF5F00] text-black shadow-[0_20px_30px_rgba(255,95,0,0.32)] hover:bg-[#ff7b2e]"
            >
              Salvar
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#090909] px-7 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-[#d6b9a7]">
            <div className="w-9 h-9 rounded-2xl bg-[#111111] border border-white/10 flex items-center justify-center text-[#4de6ff]">
              <Sparkles size={18} />
            </div>
            <span>Sugestão baseada no histórico: R$ 420,00/dia</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-[#FFB699] hover:bg-white/10 transition-colors">
                <Info size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#121212] text-white border border-white/10">
              Ajuste sua meta para melhorar o desempenho e manter a consistência de ganhos.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default MetasFinanceiras;
