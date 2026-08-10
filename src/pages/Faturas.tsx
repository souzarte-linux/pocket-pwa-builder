import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { formatBRL, parseCurrencyToNumber } from '@/lib/format';
import { 
  Plus, 
  CheckCircle, 
  FileWarning, 
  Wallet, 
  Pencil, 
  X, 
  Save, 
  SlidersHorizontal, 
  Trash2, 
  CalendarCheck,
  ArrowRight,
  ArrowLeft,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Field, Input, MaskedInput, Select } from '@/components/forms/Form';
import { checkOverlap } from '@/lib/billing';
import { useAuth } from '@/hooks/useAuth';
import { usePlatforms } from '@/hooks/queries/usePlatforms';
import { useBillingCyclesWithTotals } from '@/hooks/queries/useBillingCycles';
import { useBillingCycleMutations } from '@/hooks/mutations/useBillingCycleMutations';
import { useFinancialAdjustmentMutations } from '@/hooks/mutations/useFinancialAdjustmentMutations';
import { getFinancialAdjustments } from '@/api/adjustments.api';
import { ConfirmCycleModal } from '@/components/faturas/ConfirmCycleModal';
import type { BillingCycleWithTotals } from '@/api/billing.api';

interface EditState {
  period_start: string;
  period_end: string;
  expected_payment_date: string;
  status: string;
  previdenciario: string;
  extravio: string;
  multa: string;
  bonus_fatura: string;
  gratificacao: string;
  incentivo: string;
  premiacao: string;
}

const ADJUSTMENT_TYPES = [
  'previdenciario',
  'extravio',
  'multa',
  'bonus_fatura',
  'gratificacao',
  'incentivo',
  'premiacao',
] as const;

const STATUS_OPTIONS = ['pending', 'open', 'pendente_confirmacao', 'pago', 'cancelado'];
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', 
  open: 'A receber', 
  pendente_confirmacao: 'Pendente Confirmação',
  pago: 'Recebido', 
  cancelado: 'Cancelado',
};

// Componente para Card Deslizável na Seção "Em Aberto" (Direita = Baixar, Esquerda = Editar)
interface SwipeableCycleCardProps {
  c: BillingCycleWithTotals;
  onPay: (c: BillingCycleWithTotals) => void;
  onEdit: (c: BillingCycleWithTotals) => void;
  onView: (c: BillingCycleWithTotals) => void;
  onConfirm?: (c: BillingCycleWithTotals) => void;
  fmtDate: (iso: string) => string;
  isOverdue: boolean;
}

const SwipeableCycleCard: React.FC<SwipeableCycleCardProps> = ({
  c,
  onPay,
  onEdit,
  onView,
  onConfirm,
  fmtDate,
  isOverdue,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const hasSwipedRef = useRef(false);

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    hasSwipedRef.current = false;
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping) return;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    if (Math.abs(diff) > 10) {
      hasSwipedRef.current = true;
    }
    const clamped = Math.max(-140, Math.min(140, diff));
    setTranslateX(clamped);
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const diff = currentXRef.current - startXRef.current;

    setTranslateX(0);

    if (diff > 45) {
      hasSwipedRef.current = true;
      if (c.status === 'pendente_confirmacao' && onConfirm) {
        onConfirm(c);
      } else {
        onPay(c);
      }
    } else if (diff < -45) {
      hasSwipedRef.current = true;
      onEdit(c);
    }
  };

  const handleClick = () => {
    if (!hasSwipedRef.current) {
      if (c.status === 'pendente_confirmacao' && onConfirm) {
        onConfirm(c);
      } else {
        onView(c);
      }
    }
    hasSwipedRef.current = false;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl touch-pan-y">
      {/* Ações de Fundo */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded-2xl bg-[#131313] border border-stone-800">
        <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase">
          <CheckCircle2 className="size-5" />
          <span>{c.status === 'pendente_confirmacao' ? 'Confirmar' : 'Liquidar'}</span>
        </div>
        <div className="flex items-center gap-2 text-[#ff5f00] font-extrabold text-xs uppercase">
          <span>Editar</span>
          <Pencil className="size-5" />
        </div>
      </div>

      {/* Card Principal Arrastável */}
      <div
        style={{ transform: `translateX(${translateX}px)` }}
        className={`relative z-10 transition-transform duration-150 ease-out bg-[#201f1f] p-4 rounded-2xl border ${
          isOverdue ? 'border-red-800/80 bg-red-950/20' : 'border-stone-800'
        } cursor-pointer`}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-extrabold text-base text-white">{c.platform_name}</h4>
            <p className="text-xs text-[#ab8a7d] mt-0.5 font-semibold">
              Período: {fmtDate(c.period_start)} a {fmtDate(c.period_end)}
            </p>
          </div>
          <span className="font-extrabold text-lg text-[#ff5f00]">
            {formatBRL(c.total_amount || 0)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-800/60 text-xs">
          <span className={`font-bold ${isOverdue ? 'text-red-400 font-extrabold' : 'text-[#ab8a7d]'}`}>
            Vencimento: {fmtDate(c.expected_payment_date)}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase ${
            c.status === 'pendente_confirmacao'
              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
              : c.status === 'open'
              ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40'
              : 'bg-stone-800 text-stone-300'
          }`}>
            {STATUS_LABEL[c.status] || c.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export const Faturas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: platformsDb = [] } = usePlatforms();
  const { data: cycles = [], isLoading: loading } = useBillingCyclesWithTotals();

  const {
    updateBillingCycle,
    deleteBillingCycle,
    linkCycleTransactions,
    unlinkCycleTransactions,
    autoGenerateBillingCycles,
  } = useBillingCycleMutations();

  const {
    createAdjustmentsBatch,
    deleteCycleAdjustmentsByType,
  } = useFinancialAdjustmentMutations();

  const [editingCycle, setEditingCycle] = useState<BillingCycleWithTotals | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [viewingCycle, setViewingCycle] = useState<BillingCycleWithTotals | null>(null);
  const [confirmingCycle, setConfirmingCycle] = useState<BillingCycleWithTotals | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [payingCycle, setPayingCycle] = useState<BillingCycleWithTotals | null>(null);

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [paidDate, setPaidDate] = useState(todayISO());

  const fmtDate = (iso: string) => {
    if (!iso) return '';
    const d = iso.slice(0, 10);
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const isBeforeToday = (iso: string) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return d < todayStr;
  };

  // Automated generation of billing cycles when user is loaded
  useEffect(() => {
    if (user?.id) {
      autoGenerateBillingCycles(user.id).catch((err) => {
        console.error('Error generating billing cycles:', err);
      });
    }
  }, [user?.id]);

  const openEdit = async (c: BillingCycleWithTotals) => {
    setEditingCycle(c);
    const initialState: EditState = {
      period_start: c.period_start.slice(0, 10),
      period_end: c.period_end.slice(0, 10),
      expected_payment_date: c.expected_payment_date.slice(0, 10),
      status: c.status,
      previdenciario: '',
      extravio: '',
      multa: '',
      bonus_fatura: '',
      gratificacao: '',
      incentivo: '',
      premiacao: '',
    };
    setEditState(initialState);

    const adjList = await getFinancialAdjustments({ cycleId: c.id });

    if (adjList && adjList.length > 0) {
      const loadedState = { ...initialState };
      adjList.forEach((adj) => {
        const positiveVal = Math.abs(Number(adj.amount || 0));
        if (positiveVal > 0 && adj.type in loadedState) {
          loadedState[adj.type as keyof EditState] = String(positiveVal);
        }
      });
      setEditState(loadedState);
    }
  };

  const saveEdit = async () => {
    if (!editingCycle || !editState) return;
    setSaving(true);

    // Validar sobreposição antes de salvar edições manuais
    const overlapResult = await checkOverlap(
      editingCycle.platform_id,
      editState.period_start,
      editState.period_end,
      editingCycle.id
    );

    if (overlapResult.hasOverlap && overlapResult.conflictingCycle) {
      setSaving(false);
      const conf = overlapResult.conflictingCycle;
      return toast.error(
        `Conflito de período! A fatura de ${conf.platform_name || editingCycle.platform_name} no período ${fmtDate(conf.period_start)} até ${fmtDate(conf.period_end)} já está ativa.`
      );
    }

    try {
      await updateBillingCycle({
        id: editingCycle.id,
        payload: {
          period_start: editState.period_start,
          period_end: editState.period_end,
          expected_payment_date: editState.expected_payment_date,
          status: editState.status as any,
        },
      });

      // Associar registros pertencentes a esta fatura
      await linkCycleTransactions({
        cycleId: editingCycle.id,
        platformId: editingCycle.platform_id,
        periodStart: editState.period_start,
        periodEnd: editState.period_end,
      });

      // Salvar Descontos e Acréscimos (financial_adjustments)
      if (user?.id) {
        // 1. Apagar apenas os 7 tipos específicos desta fatura para evitar duplicação em reedições
        await deleteCycleAdjustmentsByType({
          cycleId: editingCycle.id,
          types: [...ADJUSTMENT_TYPES],
        });

        // 2. Inserir registros para cada campo preenchido (> 0)
        const discountTypes = ['previdenciario', 'extravio', 'multa'];
        const newAdjustments = [];
        const occurredIso = editState.expected_payment_date
          ? `${editState.expected_payment_date}T12:00:00.000Z`
          : new Date().toISOString();

        for (const adjType of ADJUSTMENT_TYPES) {
          const valStr = editState[adjType as keyof EditState];
          const numVal = parseCurrencyToNumber(valStr);
          if (numVal > 0) {
            const isDiscount = discountTypes.includes(adjType);
            newAdjustments.push({
              user_id: user.id,
              platform_id: editingCycle.platform_id,
              billing_cycle_id: editingCycle.id,
              type: adjType,
              amount: isDiscount ? -Math.abs(numVal) : Math.abs(numVal),
              occurred_at: occurredIso,
              description: `Ajuste da fatura: ${adjType}`,
            });
          }
        }

        if (newAdjustments.length > 0) {
          await createAdjustmentsBatch(newAdjustments);
        }
      }

      setSaving(false);
      toast.success('Fatura atualizada!');
      setEditingCycle(null);
      setEditState(null);
    } catch (error: any) {
      setSaving(false);
      return toast.error(error?.message || 'Erro ao atualizar fatura');
    }
  };

  const openPay = (c: BillingCycleWithTotals) => {
    setPayingCycle(c);
    setPaidDate(todayISO());
  };

  const confirmPay = async () => {
    if (!payingCycle) return;
    setSaving(true);
    try {
      await updateBillingCycle({
        id: payingCycle.id,
        payload: {
          status: 'pago',
          expected_payment_date: paidDate,
        },
      });
      setSaving(false);
      toast.success('Fatura recebida!');
      setPayingCycle(null);
    } catch (error: any) {
      setSaving(false);
      return toast.error(error?.message || 'Erro ao receber fatura');
    }
  };

  const deleteCycle = async () => {
    if (!editingCycle) return;
    if (!confirm(`Excluir permanentemente a fatura de ${editingCycle.platform_name}?\nAs rotas vinculadas serão desassociadas.`)) return;
    setDeleting(true);

    try {
      await unlinkCycleTransactions(editingCycle.id);
      await deleteBillingCycle(editingCycle.id);
      setDeleting(false);
      toast.success('Fatura excluída com sucesso!');
      setEditingCycle(null);
      setEditState(null);
    } catch (error: any) {
      setDeleting(false);
      return toast.error(error?.message || 'Erro ao excluir fatura');
    }
  };

  // ── LÓGICA DE FILTROS & PLATAFORMAS DESABILITADAS ──
  const activePlatformIds = useMemo(
    () => new Set(platformsDb.filter((p) => p.active !== false).map((p) => p.id)),
    [platformsDb]
  );

  const allPlatformsInCycles = useMemo(() => {
    return Array.from(
      new Map(cycles.map((c) => [c.platform_id, c.platform_name ?? ''])).entries()
    ).map(([id, name]) => {
      const isPlatformActive = activePlatformIds.has(id);
      const hasPending = cycles.some(
        (c) => c.platform_id === id && c.status !== 'pago'
      );
      return { id, name, isPlatformActive, hasPending };
    });
  }, [cycles, activePlatformIds]);

  const visiblePlatforms = useMemo(
    () => allPlatformsInCycles.filter((p) => p.isPlatformActive || p.hasPending),
    [allPlatformsInCycles]
  );

  const totalPendingCyclesCount = useMemo(
    () => cycles.filter((c) => c.status !== 'pago').length,
    [cycles]
  );

  const platformBadgeOptions = useMemo(() => {
    return [
      {
        id: 'all',
        name: 'Todas',
        badgeCount: totalPendingCyclesCount > 0 ? totalPendingCyclesCount : cycles.length,
      },
      ...visiblePlatforms.map((p) => {
        const pCycles = cycles.filter((c) => c.platform_id === p.id);
        const pPendingCount = pCycles.filter((c) => c.status !== 'pago').length;
        return {
          id: p.id,
          name: p.name,
          badgeCount: pPendingCount > 0 ? pPendingCount : pCycles.length,
        };
      }),
    ];
  }, [cycles, totalPendingCyclesCount, visiblePlatforms]);

  const filterFn = (c: BillingCycleWithTotals) =>
    filterPlatform === 'all' || c.platform_id === filterPlatform;

  const pending = useMemo(() => cycles.filter((c) => c.status !== 'pago').filter(filterFn), [cycles, filterPlatform]);
  const paid = useMemo(() => cycles.filter((c) => c.status === 'pago').filter(filterFn), [cycles, filterPlatform]);
  const pendingTotal = useMemo(() => pending.reduce((acc, c) => acc + (c.total_amount || 0), 0), [pending]);
  const paidTotal = useMemo(() => paid.reduce((acc, c) => acc + (c.total_amount || 0), 0), [paid]);

  return (
    <AppShell title={'CONTAS A RECEBER\nFATURAS'} back>
      <div className="space-y-6 pb-24 font-lexend">

        {/* ── Filtro por Badge / Contagem ── */}
        {platformBadgeOptions.length > 1 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-[#ff5f00]" />
              <span className="text-xs font-extrabold text-[#ab8a7d] uppercase tracking-widest">
                Filtrar por Plataforma (Contagem)
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {platformBadgeOptions.map((p) => {
                const isActive = filterPlatform === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setFilterPlatform(isActive && p.id !== 'all' ? 'all' : p.id)}
                    className={`h-11 px-4 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 border shadow-sm ${
                      isActive
                        ? 'bg-[#ff5f00] text-black border-[#ff5f00]'
                        : 'bg-[#1c1b1b] text-[#e5e2e1] border-stone-800 hover:border-[#ff5f00]/40'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isActive
                          ? 'bg-black/30 text-black'
                          : 'bg-[#201f1f] text-[#ffb599] border border-stone-800'
                      }`}
                    >
                      {p.badgeCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Seção "Em Aberto" com Destaque Visual ── */}
        <section className="space-y-4">
          <div className="bg-[#1c1b1b] p-4.5 rounded-3xl border-2 border-amber-500/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl shrink-0 font-extrabold border border-amber-500/30">
                <Wallet className="size-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white uppercase tracking-wide flex items-center gap-2">
                  EM ABERTO
                </h2>
                <p className="text-xs text-[#ab8a7d] font-medium">
                  Faturas pendentes e valores a receber
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-amber-400 bg-amber-950/80 px-3.5 py-1.5 rounded-full border border-amber-800/60 shadow">
                {pending.length} {pending.length === 1 ? 'fatura' : 'faturas'} • {formatBRL(pendingTotal)}
              </span>
            </div>
          </div>

          {/* Dica de Uso com Deslize */}
          {pending.length > 0 && (
            <div className="flex flex-col items-center justify-center text-center text-xs py-1 space-y-1 font-bold">
              <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                <ArrowRight className="size-4 stroke-[2.5]" />
                <span>Direita: Baixar</span>
              </span>
              <span className="text-[#ffb599] flex items-center justify-center gap-1.5">
                <ArrowLeft className="size-4 stroke-[2.5]" />
                <span>Esquerda: Editar</span>
              </span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs text-[#ab8a7d] font-bold animate-pulse">
              Carregando faturas...
            </div>
          ) : pending.length === 0 ? (
            <div className="p-6 text-center bg-[#1c1b1b] rounded-2xl border border-stone-800 text-xs text-[#ab8a7d]">
              Nenhuma fatura em aberto encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((c) => {
                const isOverdue = isBeforeToday(c.expected_payment_date);
                return (
                  <SwipeableCycleCard
                    key={c.id}
                    c={c}
                    fmtDate={fmtDate}
                    isOverdue={isOverdue}
                    onPay={openPay}
                    onEdit={openEdit}
                    onView={setViewingCycle}
                    onConfirm={setConfirmingCycle}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── Seção "Faturas Pagas / Recebidas" ── */}
        <section className="space-y-4 pt-2">
          <div className="bg-[#1c1b1b] p-4.5 rounded-3xl border border-stone-800 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl shrink-0 font-extrabold border border-emerald-500/30">
                <CheckCircle className="size-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white uppercase tracking-wide flex items-center gap-2">
                  RECEBIDAS
                </h2>
                <p className="text-xs text-[#ab8a7d] font-medium">
                  Faturas pagas e liquidadas
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-800/60 shadow">
                {paid.length} {paid.length === 1 ? 'fatura' : 'faturas'} • {formatBRL(paidTotal)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#ab8a7d] font-bold animate-pulse">
              Carregando faturas...
            </div>
          ) : paid.length === 0 ? (
            <div className="p-6 text-center bg-[#1c1b1b] rounded-2xl border border-stone-800 text-xs text-[#ab8a7d]">
              Nenhuma fatura recebida até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {paid.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setViewingCycle(c)}
                  className="bg-[#1c1b1b] p-4 rounded-2xl border border-stone-800 hover:border-emerald-500/40 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-white">{c.platform_name}</h4>
                      <p className="text-xs text-[#ab8a7d] mt-0.5 font-semibold">
                        Período: {fmtDate(c.period_start)} a {fmtDate(c.period_end)}
                      </p>
                    </div>
                    <span className="font-extrabold text-lg text-emerald-400">
                      {formatBRL(c.total_amount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-800/60 text-xs">
                    <span className="text-[#ab8a7d] font-medium">
                      Pago em: {fmtDate(c.expected_payment_date)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                      RECEBIDO
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Botão Flutuante / Ações Extras ── */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-20">
          <button
            onClick={() => navigate('/faturas/nova')}
            className="size-14 rounded-2xl bg-[#ff5f00] text-black font-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition"
            title="Criar Nova Fatura Manual"
          >
            <Plus className="size-7 stroke-[3]" />
          </button>
        </div>

        {/* ── Modal de Detalhes da Fatura (Visualização) ── */}
        {viewingCycle && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setViewingCycle(null)}
          >
            <div
              className="w-full max-w-lg bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 font-lexend max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="font-extrabold text-xl text-white">DETALHES DA FATURA</h2>
                  <p className="text-sm text-[#ff5f00] font-bold mt-0.5">
                    {viewingCycle.platform_name}
                  </p>
                </div>
                <button
                  onClick={() => setViewingCycle(null)}
                  className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f] transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-2.5">
                  <div className="flex justify-between items-center text-[#ab8a7d]">
                    <span>Período da Fatura:</span>
                    <strong className="text-white font-extrabold">
                      {fmtDate(viewingCycle.period_start)} → {fmtDate(viewingCycle.period_end)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[#ab8a7d]">
                    <span>Data Vencimento / Pagamento:</span>
                    <strong className="text-white font-extrabold">
                      {fmtDate(viewingCycle.expected_payment_date)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[#ab8a7d]">
                    <span>Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-stone-800 text-stone-300">
                      {STATUS_LABEL[viewingCycle.status] || viewingCycle.status}
                    </span>
                  </div>
                </div>

                <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-2">
                  <h3 className="font-extrabold text-xs text-[#ab8a7d] uppercase tracking-wider mb-2">
                    Composição do Valor
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Rotas & Corridas:</span>
                    <span className="font-bold text-white">
                      {formatBRL(viewingCycle.route_amount || 0)}
                    </span>
                  </div>
                  {(viewingCycle.tip_total || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Gorjetas:</span>
                      <span className="font-bold text-emerald-400">
                        +{formatBRL(viewingCycle.tip_total || 0)}
                      </span>
                    </div>
                  )}
                  {(viewingCycle.daily_amount || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Totais Diários / Fechamento:</span>
                      <span className="font-bold text-white">
                        +{formatBRL(viewingCycle.daily_amount || 0)}
                      </span>
                    </div>
                  )}
                  {(viewingCycle.adjustments_total || 0) !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Ajustes & Descontos:</span>
                      <span
                        className={`font-bold ${
                          (viewingCycle.adjustments_total || 0) < 0
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {(viewingCycle.adjustments_total || 0) > 0 ? '+' : ''}
                        {formatBRL(viewingCycle.adjustments_total || 0)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-800 flex justify-between items-center text-sm font-extrabold">
                    <span className="text-white">Total Líquido da Fatura:</span>
                    <span className="text-[#ff5f00] text-lg">
                      {formatBRL(viewingCycle.total_amount || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const c = viewingCycle;
                    setViewingCycle(null);
                    openEdit(c);
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#201f1f] border border-stone-800 text-[#ffb599] font-bold text-xs uppercase hover:bg-stone-800 transition flex items-center justify-center gap-2"
                >
                  <Pencil className="size-4" />
                  <span>Editar Fatura</span>
                </button>
                {viewingCycle.status !== 'pago' && (
                  <button
                    onClick={() => {
                      const c = viewingCycle;
                      setViewingCycle(null);
                      openPay(c);
                    }}
                    className="flex-1 h-12 rounded-xl bg-[#ff5f00] text-black font-extrabold text-xs uppercase hover:bg-[#ffb599] transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="size-4 stroke-[3]" />
                    <span>Baixar (Recebido)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal de Edição da Fatura ── */}
        {editingCycle && editState && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setEditingCycle(null)}
          >
            <div
              className="w-full max-w-lg bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 font-lexend max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="font-extrabold text-xl text-white">EDITAR FATURA</h2>
                  <p className="text-sm text-[#ff5f00] font-bold mt-0.5">
                    {editingCycle.platform_name}
                  </p>
                </div>
                <button
                  onClick={() => setEditingCycle(null)}
                  className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f] transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início do Período">
                    <Input
                      type="date"
                      value={editState.period_start}
                      onChange={(e) =>
                        setEditState({ ...editState, period_start: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field label="Fim do Período">
                    <Input
                      type="date"
                      value={editState.period_end}
                      onChange={(e) =>
                        setEditState({ ...editState, period_end: e.target.value })
                      }
                      required
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vencimento / Recebimento">
                    <Input
                      type="date"
                      value={editState.expected_payment_date}
                      onChange={(e) =>
                        setEditState({
                          ...editState,
                          expected_payment_date: e.target.value,
                        })
                      }
                      required
                    />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={editState.status}
                      onChange={(e) =>
                        setEditState({ ...editState, status: e.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABEL[st] || st}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {/* Seção de Ajustes e Descontos */}
                <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-3">
                  <h3 className="font-extrabold text-xs text-[#ffb599] uppercase tracking-wider">
                    Descontos & Acréscimos (Ajustes Fatura)
                  </h3>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-red-400 uppercase">
                      Descontos / Abatimentos:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Previdenciário</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.previdenciario}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              previdenciario: e.target.value,
                            })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Extravios</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.extravio}
                          onChange={(e) =>
                            setEditState({ ...editState, extravio: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Multas</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.multa}
                          onChange={(e) =>
                            setEditState({ ...editState, multa: e.target.value })
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-stone-800">
                    <label className="text-[11px] font-bold text-emerald-400 uppercase">
                      Acréscimos / Bonificações:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Bônus de Fatura</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.bonus_fatura}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              bonus_fatura: e.target.value,
                            })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Gratificação</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.gratificacao}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              gratificacao: e.target.value,
                            })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Incentivo</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.incentivo}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              incentivo: e.target.value,
                            })
                          }
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#ab8a7d]">Premiação</span>
                        <MaskedInput
                          maskType="currency"
                          value={editState.premiacao}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              premiacao: e.target.value,
                            })
                          }
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={deleteCycle}
                  disabled={deleting || saving}
                  className="h-12 px-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-400 font-bold text-xs uppercase hover:bg-red-900/50 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="size-4" />
                  <span>Excluir</span>
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || deleting}
                  className="flex-1 h-12 rounded-xl bg-[#ff5f00] text-black font-extrabold text-xs uppercase hover:bg-[#ffb599] transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Save className="size-4 stroke-[3]" />
                  <span>{saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal de Baixar / Liquidar Fatura ── */}
        {payingCycle && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
            onClick={() => setPayingCycle(null)}
          >
            <div
              className="w-full max-w-md bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 font-lexend"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h2 className="font-extrabold text-xl text-white">RECEBER FATURA</h2>
                  <p className="text-sm text-[#ff5f00] font-bold mt-0.5">
                    {payingCycle.platform_name}
                  </p>
                </div>
                <button
                  onClick={() => setPayingCycle(null)}
                  className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f] transition"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="bg-[#201f1f] p-4 rounded-2xl border border-stone-800 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#ab8a7d]">Valor a Receber:</span>
                  <span className="font-extrabold text-xl text-emerald-400">
                    {formatBRL(payingCycle.total_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#ab8a7d] pt-2 border-t border-stone-800">
                  <span>Período:</span>
                  <span className="font-bold text-white">
                    {fmtDate(payingCycle.period_start)} a {fmtDate(payingCycle.period_end)}
                  </span>
                </div>
              </div>

              <Field label="Data Efetiva do Pagamento">
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </Field>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingCycle(null)}
                  className="flex-1 h-12 rounded-xl bg-[#201f1f] border border-stone-800 text-[#ab8a7d] font-bold text-xs uppercase hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmPay}
                  disabled={saving}
                  className="flex-1 h-12 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase hover:bg-emerald-400 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4 stroke-[3]" />
                  <span>{saving ? 'CONFIRMANDO...' : 'CONFIRMAR RECEBIMENTO'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal de Confirmação de Fatura Gerada Automaticamente ── */}
        {confirmingCycle && (
          <ConfirmCycleModal
            cycle={{
              id: confirmingCycle.id,
              platform_name: confirmingCycle.platform_name,
              period_start: confirmingCycle.period_start,
              period_end: confirmingCycle.period_end,
              expected_payment_date: confirmingCycle.expected_payment_date,
              total_amount: confirmingCycle.total_amount,
              status: confirmingCycle.status,
            }}
            onClose={() => setConfirmingCycle(null)}
          />
        )}
      </div>
    </AppShell>
  );
};

export default Faturas;
