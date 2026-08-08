import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
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
import { startOfWeek, startOfMonth, addDays } from 'date-fns';
import { Field, Input, MaskedInput, Select } from '@/components/forms/Form';
import { checkOverlap, getPlatformCycleIntervals } from '@/lib/billing';
import { ConfirmCycleModal } from '@/components/faturas/ConfirmCycleModal';

interface BillingCycle {
  id: string;
  platform_id: string;
  period_start: string;
  period_end: string;
  expected_payment_date: string;
  status: string;
  platform_name?: string;
  total_amount?: number;
  route_amount?: number;
  tip_total?: number;
  daily_amount?: number;
  adjustments_total?: number;
}

interface PlatformDb {
  id: string;
  name: string;
  active: boolean;
}

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
  c: BillingCycle;
  onPay: (c: BillingCycle) => void;
  onEdit: (c: BillingCycle) => void;
  onView: (c: BillingCycle) => void;
  onConfirm?: (c: BillingCycle) => void;
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
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [platformsDb, setPlatformsDb] = useState<PlatformDb[]>([]);
  const [editingCycle, setEditingCycle] = useState<BillingCycle | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [viewingCycle, setViewingCycle] = useState<BillingCycle | null>(null);
  const [confirmingCycle, setConfirmingCycle] = useState<BillingCycle | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [payingCycle, setPayingCycle] = useState<BillingCycle | null>(null);
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return d < todayStr;
  };

  const fetchCycles = async () => {
    setLoading(true);

    const { data: pData } = await supabase
      .from('platforms')
      .select('id, name, active');
    if (pData) {
      setPlatformsDb(
        pData.map((p) => ({ id: p.id, name: p.name, active: p.active ?? true }))
      );
    }

    const { data: cyclesData, error } = await supabase
      .from('billing_cycles')
      .select(`id, platform_id, period_start, period_end, expected_payment_date, status, platforms ( name )`)
      .order('expected_payment_date', { ascending: true });

    if (error) { toast.error(error.message); setLoading(false); return; }

    const cycleIds = cyclesData.map(c => c.id);
    const [routesRes, dailiesRes, adjustmentsRes] = await Promise.all([
      supabase.from('routes').select('amount, tip, billing_cycle_id').in('billing_cycle_id', cycleIds),
      supabase.from('daily_totals').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds),
      supabase.from('financial_adjustments').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds),
    ]);

    const routeAmountMap = (routesRes.data || []).reduce((acc: any, r: any) => {
      acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.amount);
      return acc;
    }, {});
    const tipMap = (routesRes.data || []).reduce((acc: any, r: any) => {
      acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.tip);
      return acc;
    }, {});
    const dailyMap = (dailiesRes.data || []).reduce((acc: any, d: any) => {
      acc[d.billing_cycle_id] = (acc[d.billing_cycle_id] || 0) + Number(d.amount);
      return acc;
    }, {});
    const adjMap = (adjustmentsRes.data || []).reduce((acc: any, a: any) => {
      acc[a.billing_cycle_id] = (acc[a.billing_cycle_id] || 0) + Number(a.amount);
      return acc;
    }, {});

    setCycles(cyclesData.map(c => {
      const routeAmt = routeAmountMap[c.id] || 0;
      const tipAmt = tipMap[c.id] || 0;
      const dailyAmt = dailyMap[c.id] || 0;
      const adjAmt = adjMap[c.id] || 0;
      return {
        ...c,
        platform_name: (c.platforms as { name?: string } | null)?.name || 'Desconhecida',
        route_amount: routeAmt,
        tip_total: tipAmt,
        daily_amount: dailyAmt,
        adjustments_total: adjAmt,
        total_amount: routeAmt + tipAmt + dailyAmt + adjAmt,
      };
    }));
    setLoading(false);
  };

  const generateBillingCycles = async () => {
    // 1. Buscar apenas plataformas ATIVAS
    const { data: platforms } = await supabase
      .from('platforms')
      .select('id, name, cycle, payment_day, rules, active')
      .eq('active', true);

    if (!platforms || platforms.length === 0) return;

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;

    for (const platform of platforms) {
      // 2. Calcular intervalos do ciclo ATUAL e PRÓXIMO ciclo (mês corrente e mês seguinte)
      const intervals = getPlatformCycleIntervals(platform);

      for (const interval of intervals) {
        const { periodStart, periodEnd, expectedPaymentDate } = interval;
        const startISO = `${periodStart}T00:00:00`;
        const endISO = `${periodEnd}T23:59:59`;

        // 3. Validar sobreposição antes de tentar criar
        const overlapResult = await checkOverlap(platform.id, periodStart, periodEnd);
        if (overlapResult.hasOverlap) {
          continue; // Pular pois já existe ciclo ativo sobreposto
        }

        // 1 & 2. Verificar se existe ao menos um registro em routes ou daily_totals sem fatura
        const { data: unassignedRoutes } = await supabase
          .from('routes')
          .select('id')
          .eq('platform_id', platform.id)
          .is('billing_cycle_id', null)
          .gte('occurred_at', startISO)
          .lte('occurred_at', endISO)
          .limit(1);

        const hasRoutes = unassignedRoutes && unassignedRoutes.length > 0;

        let hasDailies = false;
        if (!hasRoutes) {
          const { data: unassignedDailies } = await supabase
            .from('daily_totals')
            .select('id')
            .eq('platform_id', platform.id)
            .is('billing_cycle_id', null)
            .gte('occurred_at', startISO)
            .lte('occurred_at', endISO)
            .limit(1);
          hasDailies = !!(unassignedDailies && unassignedDailies.length > 0);
        }

        // Se não houver nenhum registro sem fatura no período, NÃO criar a fatura
        if (!hasRoutes && !hasDailies) {
          continue;
        }

        // Criar o billing_cycle
        const { data: newCycle, error: insertErr } = await supabase
          .from('billing_cycles')
          .insert({
            user_id: u.user.id,
            platform_id: platform.id,
            period_start: periodStart,
            period_end: periodEnd,
            expected_payment_date: expectedPaymentDate,
            status: 'pendente_confirmacao',
          })
          .select('id')
          .single();

        if (insertErr || !newCycle) continue;

        // Criar registro de notificação
        await supabase.from('notifications').insert({
          user_id: u.user.id,
          type: 'fatura_gerada',
          billing_cycle_id: newCycle.id,
          read: false,
        });

        // 1 & 4. Associar automaticamente os registros sem fatura ou pertencentes a esta mesma fatura
        await supabase
          .from('routes')
          .update({ billing_cycle_id: newCycle.id })
          .eq('platform_id', platform.id)
          .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${newCycle.id}`)
          .gte('occurred_at', startISO)
          .lte('occurred_at', endISO);

        await supabase
          .from('daily_totals')
          .update({ billing_cycle_id: newCycle.id })
          .eq('platform_id', platform.id)
          .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${newCycle.id}`)
          .gte('occurred_at', startISO)
          .lte('occurred_at', endISO);

        await supabase
          .from('financial_adjustments')
          .update({ billing_cycle_id: newCycle.id })
          .eq('platform_id', platform.id)
          .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${newCycle.id}`)
          .gte('occurred_at', periodStart)
          .lte('occurred_at', periodEnd);
      }
    }

    fetchCycles();
  };

  useEffect(() => { fetchCycles(); generateBillingCycles(); }, []);

  const openEdit = async (c: BillingCycle) => {
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

    const { data: adjList } = await supabase
      .from('financial_adjustments')
      .select('type, amount')
      .eq('billing_cycle_id', c.id)
      .in('type', [...ADJUSTMENT_TYPES]);

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

    // 3. Validar sobreposição antes de salvar edições manuais
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

    const { error } = await supabase.from('billing_cycles').update({
      period_start: editState.period_start,
      period_end: editState.period_end,
      expected_payment_date: editState.expected_payment_date,
      status: editState.status,
    }).eq('id', editingCycle.id);

    if (!error) {
      // 4. Só associar registros sem fatura ou já vinculados a esta própria fatura
      await supabase.from('routes')
        .update({ billing_cycle_id: editingCycle.id })
        .eq('platform_id', editingCycle.platform_id)
        .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${editingCycle.id}`)
        .gte('occurred_at', `${editState.period_start}T00:00:00`)
        .lte('occurred_at', `${editState.period_end}T23:59:59`);

      await supabase.from('daily_totals')
        .update({ billing_cycle_id: editingCycle.id })
        .eq('platform_id', editingCycle.platform_id)
        .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${editingCycle.id}`)
        .gte('occurred_at', `${editState.period_start}T00:00:00`)
        .lte('occurred_at', `${editState.period_end}T23:59:59`);

      await supabase.from('financial_adjustments')
        .update({ billing_cycle_id: editingCycle.id })
        .eq('platform_id', editingCycle.platform_id)
        .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${editingCycle.id}`)
        .gte('occurred_at', editState.period_start)
        .lte('occurred_at', editState.period_end);

      // --- Salvar Descontos e Acréscimos (financial_adjustments) ---
      const { data: u } = await supabase.auth.getUser();
      if (u?.user) {
        // 1. Apagar apenas os 7 tipos específicos desta fatura para evitar duplicação em reedições
        await supabase
          .from('financial_adjustments')
          .delete()
          .eq('billing_cycle_id', editingCycle.id)
          .in('type', [...ADJUSTMENT_TYPES]);

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
              user_id: u.user.id,
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
          await supabase.from('financial_adjustments').insert(newAdjustments);
        }
      }
    }

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Fatura atualizada!');
    setEditingCycle(null);
    setEditState(null);
    fetchCycles();
  };

  const openPay = (c: BillingCycle) => {
    setPayingCycle(c);
    setPaidDate(todayISO());
  };

  const confirmPay = async () => {
    if (!payingCycle) return;
    setSaving(true);
    const { error } = await supabase.from('billing_cycles').update({
      status: 'pago',
      expected_payment_date: paidDate,
    }).eq('id', payingCycle.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Fatura recebida!');
    setPayingCycle(null);
    fetchCycles();
  };

  const deleteCycle = async () => {
    if (!editingCycle) return;
    if (!confirm(`Excluir permanentemente a fatura de ${editingCycle.platform_name}?\nAs rotas vinculadas serão desassociadas.`)) return;
    setDeleting(true);

    await supabase.from('routes')
      .update({ billing_cycle_id: null })
      .eq('billing_cycle_id', editingCycle.id);
    await supabase.from('daily_totals')
      .update({ billing_cycle_id: null })
      .eq('billing_cycle_id', editingCycle.id);
    await supabase.from('financial_adjustments')
      .update({ billing_cycle_id: null })
      .eq('billing_cycle_id', editingCycle.id);

    const { error } = await supabase.from('billing_cycles').delete().eq('id', editingCycle.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success('Fatura excluída com sucesso!');
    setEditingCycle(null);
    setEditState(null);
    fetchCycles();
  };

  // ── LÓGICA DE FILTROS & PLATAFORMAS DESABILITADAS (Item 1 & 2) ──
  const activePlatformIds = new Set(
    platformsDb.filter((p) => p.active !== false).map((p) => p.id)
  );

  // Extrair todas as plataformas presentes nos ciclos
  const allPlatformsInCycles = Array.from(
    new Map(cycles.map((c) => [c.platform_id, c.platform_name ?? ''])).entries()
  ).map(([id, name]) => {
    const isPlatformActive = activePlatformIds.has(id);
    const hasPending = cycles.some(
      (c) => c.platform_id === id && c.status !== 'pago'
    );
    return { id, name, isPlatformActive, hasPending };
  });

  // Se a plataforma for desabilitada na Aba Apps (active === false),
  // só aparece nos filtros se TIVER faturas pendentes / em aberto!
  const visiblePlatforms = allPlatformsInCycles.filter(
    (p) => p.isPlatformActive || p.hasPending
  );

  // Filtros com Badge / Contagem (Item 2: Badge Filter)
  const totalPendingCyclesCount = cycles.filter((c) => c.status !== 'pago').length;

  const platformBadgeOptions = [
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

  const filterFn = (c: BillingCycle) =>
    filterPlatform === 'all' || c.platform_id === filterPlatform;

  const pending = cycles.filter((c) => c.status !== 'pago').filter(filterFn);
  const paid = cycles.filter((c) => c.status === 'pago').filter(filterFn);
  const pendingTotal = pending.reduce((acc, c) => acc + (c.total_amount || 0), 0);
  const paidTotal = paid.reduce((acc, c) => acc + (c.total_amount || 0), 0);

  return (
    <AppShell title={'CONTAS A RECEBER\nFATURAS'} back>
      <div className="space-y-6 pb-24 font-lexend">

        {/* ── Filtro por Badge / Contagem (Badge Filter) ── */}
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

        {/* ── Seção "Em Aberto" com Destaque Visual (Item 3) ── */}
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

          {/* Dica de Uso com Deslize (Slide Gesture) na seção Em Aberto */}
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
            <p className="text-sm text-center text-[#ab8a7d] py-8 font-medium">Carregando faturas...</p>
          ) : pending.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-stone-800 p-8 text-center bg-[#1c1b1b]">
              <p className="text-sm font-semibold text-[#ab8a7d]">
                {filterPlatform === 'all'
                  ? 'Nenhuma fatura em aberto no momento.'
                  : 'Nenhuma fatura em aberto para esta plataforma.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((c) => (
                <SwipeableCycleCard
                  key={c.id}
                  c={c}
                  onPay={openPay}
                  onEdit={openEdit}
                  onView={setViewingCycle}
                  onConfirm={setConfirmingCycle}
                  fmtDate={fmtDate}
                  isOverdue={isBeforeToday(c.expected_payment_date)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Seção "Histórico Pago" com Destaque Visual (Item 3 & 4) ── */}
        <section className="space-y-4 pt-4 border-t border-stone-800/80">
          <div className="bg-[#1c1b1b] p-4.5 rounded-3xl border-2 border-emerald-500/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl shrink-0 font-extrabold border border-emerald-500/30">
                <CalendarCheck className="size-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white uppercase tracking-wide flex items-center gap-2">
                  HISTÓRICO PAGO
                </h2>
                <p className="text-xs text-[#ab8a7d] font-medium">
                  Faturas liquidadas e recebidas
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-3.5 py-1.5 rounded-full border border-emerald-800/60 shadow">
                {paid.length} {paid.length === 1 ? 'recebida' : 'recebidas'} • {formatBRL(paidTotal)}
              </span>
            </div>
          </div>

          {paid.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-stone-800 p-6 text-center bg-[#1c1b1b]">
              <p className="text-xs font-semibold text-[#ab8a7d]">Nenhuma fatura paga no histórico.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paid.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setViewingCycle(c)}
                  className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-stone-800 hover:border-emerald-500/40 transition-all space-y-3 cursor-pointer group shadow"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition">
                        {c.platform_name}
                      </h3>
                      <p className="text-xs text-[#ab8a7d] font-medium mt-0.5">
                        Período: {fmtDate(c.period_start)} → {fmtDate(c.period_end)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-xl text-emerald-400">
                        {formatBRL(c.total_amount || 0)}
                      </p>
                      <span className="inline-block mt-1 text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                        Recebido
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-xs text-[#ab8a7d]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span>Recebido em: <strong className="text-white">{fmtDate(c.expected_payment_date)}</strong></span>
                    </div>
                    <span className="text-[11px] text-stone-400 group-hover:text-white font-extrabold underline">
                      Clique para Visualizar ➔
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modal de Visualização (Item 4: Apenas Leitura com Fechar e Editar) ── */}
      {viewingCycle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewingCycle(null)}
        >
          <div
            className="w-full max-w-md bg-[#1c1b1b] border-2 border-stone-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#ab8a7d]">
                  VISUALIZAR FATURA
                </span>
                <h2 className="font-extrabold text-xl text-white mt-0.5 flex items-center gap-2">
                  <Building2 className="size-5 text-[#ff5f00]" />
                  {viewingCycle.platform_name}
                </h2>
              </div>
              <button
                onClick={() => setViewingCycle(null)}
                className="p-2 rounded-xl bg-[#201f1f] text-stone-400 hover:text-white transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[#ab8a7d] font-semibold">Valor Total:</span>
                  <span className="font-extrabold text-xl text-[#ffb599]">
                    {formatBRL(viewingCycle.total_amount || 0)}
                  </span>
                </div>

                {/* Detalhamento dos Componentes do Valor Total */}
                <div className="pt-2 border-t border-stone-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#ab8a7d]">Rotas/Diárias (Valor Bruto):</span>
                    <span className="font-bold text-white">
                      {formatBRL((viewingCycle.route_amount || 0) + (viewingCycle.daily_amount || 0))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[#ab8a7d]">Gorjetas:</span>
                    <span className="font-bold text-white">
                      {formatBRL(viewingCycle.tip_total || 0)}
                    </span>
                  </div>

                  {!!viewingCycle.adjustments_total && viewingCycle.adjustments_total !== 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#ab8a7d]">Ajustes da Plataforma (Descontos/Acréscimos):</span>
                      <span className={`font-bold ${viewingCycle.adjustments_total > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {viewingCycle.adjustments_total > 0 ? `+${formatBRL(viewingCycle.adjustments_total)}` : formatBRL(viewingCycle.adjustments_total)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nota de Conferência */}
                <p className="text-xs text-[#ab8a7d] pt-2 border-t border-stone-800/40 leading-relaxed">
                  Confira este valor com o relatório oficial da plataforma. Gorjetas geralmente não aparecem no repasse informado pela empresa — leve isso em conta ao comparar.
                </p>
              </div>

              <div className="flex justify-between items-center bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[#ab8a7d] font-semibold">Período de Apuração:</span>
                <span className="font-bold text-white">
                  {fmtDate(viewingCycle.period_start)} → {fmtDate(viewingCycle.period_end)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[#ab8a7d] font-semibold">
                  {viewingCycle.status === 'pago' ? 'Data do Recebimento:' : 'Data Prevista:'}
                </span>
                <span className="font-bold text-white">
                  {fmtDate(viewingCycle.expected_payment_date)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-[#201f1f] p-3.5 rounded-2xl border border-stone-800">
                <span className="text-[#ab8a7d] font-semibold">Status do Ciclo:</span>
                <span
                  className={`px-3 py-1 rounded-full font-extrabold text-xs uppercase ${
                    viewingCycle.status === 'pago'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                  }`}
                >
                  {STATUS_LABEL[viewingCycle.status] || viewingCycle.status}
                </span>
              </div>
            </div>

            {/* Dois botões exigidos: Fechar e Editar */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setViewingCycle(null)}
                className="flex-1 h-12 rounded-xl bg-[#201f1f] font-extrabold text-stone-300 hover:bg-[#2a2a2a] transition uppercase text-sm"
              >
                FECHAR
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingCycle;
                  setViewingCycle(null);
                  openEdit(target);
                }}
                className="flex-1 h-12 rounded-xl bg-[#ff5f00] text-black font-extrabold flex items-center justify-center gap-2 hover:bg-[#ffb599] transition shadow-lg uppercase text-sm"
              >
                <Pencil className="size-4 stroke-[3]" />
                EDITAR
              </button>
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
            className="w-full max-w-lg bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="font-extrabold text-xl text-white flex items-center gap-2">
                  <Pencil className="size-5 text-[#ff5f00]" />
                  EDITAR FATURA
                </h2>
                <p className="text-sm text-[#ffb599] font-bold">{editingCycle.platform_name}</p>
              </div>
              <button onClick={() => setEditingCycle(null)} className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f]">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Início do Período">
                <Input type="date" value={editState.period_start} onChange={e => setEditState(s => s ? { ...s, period_start: e.target.value } : s)} />
              </Field>
              <Field label="Fim do Período">
                <Input type="date" value={editState.period_end} onChange={e => setEditState(s => s ? { ...s, period_end: e.target.value } : s)} />
              </Field>
            </div>

            <Field label="Data Prevista de Pagamento">
              <Input type="date" value={editState.expected_payment_date} onChange={e => setEditState(s => s ? { ...s, expected_payment_date: e.target.value } : s)} />
            </Field>

            <Field label="Status da Fatura">
              <Select value={editState.status} onChange={e => setEditState(s => s ? { ...s, status: e.target.value } : s)}>
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>{STATUS_LABEL[st] ?? st}</option>
                ))}
              </Select>
            </Field>

            {/* ── Seção Descontos e Acréscimos ── */}
            <div className="pt-2 border-t border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Descontos e Acréscimos
                </h3>
                <span className="text-[10px] text-[#ab8a7d]">Opcional</span>
              </div>

              {/* Descontos (Rótulos Vermelhos) */}
              <div className="space-y-2.5 p-3.5 bg-[#201f1f] border border-red-900/40 rounded-2xl">
                <span className="text-xs font-extrabold text-red-400 uppercase tracking-wide block border-b border-red-900/30 pb-1.5">
                  Descontos (Abatimentos)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-extrabold text-red-400 mb-1">Previdenciário</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.previdenciario}
                      onChange={e => setEditState(s => s ? { ...s, previdenciario: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-red-900/40 focus:border-red-500 bg-[#1c1b1b] text-red-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-red-400 mb-1">Extravios</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.extravio}
                      onChange={e => setEditState(s => s ? { ...s, extravio: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-red-900/40 focus:border-red-500 bg-[#1c1b1b] text-red-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-red-400 mb-1">Multas</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.multa}
                      onChange={e => setEditState(s => s ? { ...s, multa: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-red-900/40 focus:border-red-500 bg-[#1c1b1b] text-red-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Acréscimos (Rótulos Verdes) */}
              <div className="space-y-2.5 p-3.5 bg-[#201f1f] border border-emerald-900/40 rounded-2xl">
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wide block border-b border-emerald-900/30 pb-1.5">
                  Acréscimos (Ganhos)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-extrabold text-emerald-400 mb-1">Bônus</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.bonus_fatura}
                      onChange={e => setEditState(s => s ? { ...s, bonus_fatura: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-emerald-900/40 focus:border-emerald-500 bg-[#1c1b1b] text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-emerald-400 mb-1">Gratificação</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.gratificacao}
                      onChange={e => setEditState(s => s ? { ...s, gratificacao: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-emerald-900/40 focus:border-emerald-500 bg-[#1c1b1b] text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-emerald-400 mb-1">Incentivo</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.incentivo}
                      onChange={e => setEditState(s => s ? { ...s, incentivo: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-emerald-900/40 focus:border-emerald-500 bg-[#1c1b1b] text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-emerald-400 mb-1">Premiação</label>
                    <MaskedInput
                      maskType="currency"
                      inputMode="decimal"
                      value={editState.premiacao}
                      onChange={e => setEditState(s => s ? { ...s, premiacao: e.target.value } : s)}
                      placeholder="0,00"
                      className="h-11 text-xs border-emerald-900/40 focus:border-emerald-500 bg-[#1c1b1b] text-emerald-400 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#201f1f] border border-stone-800 rounded-2xl p-3.5 text-xs text-[#ab8a7d]">
              <span className="font-bold text-[#ffb599]">ⓘ Aviso:</span> Ao salvar, o sistema reassociará automaticamente as rotas e totais diários dentro do período informado.
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={saveEdit}
                disabled={saving || deleting}
                className="w-full h-12 bg-[#ff5f00] text-black font-extrabold text-sm uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-[#ffb599] transition disabled:opacity-60 shadow-lg"
              >
                <Save className="size-5 stroke-[3]" />
                {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </button>

              <button
                onClick={deleteCycle}
                disabled={saving || deleting}
                className="w-full h-12 bg-red-950/40 border border-red-800/60 text-red-400 font-extrabold text-sm uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-red-900/40 transition disabled:opacity-40"
              >
                <Trash2 className="size-4" />
                {deleting ? 'EXCLUINDO...' : 'EXCLUIR FATURA PERMANENTEMENTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Baixar / Confirmar Recebimento Fatura ── */}
      {payingCycle && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" 
          onClick={() => setPayingCycle(null)}
        >
          <div
            className="w-full max-w-lg bg-[#1c1b1b] border-2 border-stone-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="font-extrabold text-xl text-white flex items-center gap-2">
                  <CheckCircle className="size-5 text-emerald-400" />
                  BAIXAR FATURA (LIQUIDAR)
                </h2>
                <p className="text-sm text-[#ffb599] font-bold">{payingCycle.platform_name}</p>
              </div>
              <button onClick={() => setPayingCycle(null)} className="p-2 text-stone-400 hover:text-white rounded-xl bg-[#201f1f]">
                <X className="size-5" />
              </button>
            </div>

            <Field label="Data de Recebimento do Pagamento">
              <Input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} />
            </Field>

            <button
              onClick={confirmPay}
              disabled={saving}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm uppercase rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 shadow-lg"
            >
              <CalendarCheck className="size-5" />
              {saving ? 'PROCESSANDO...' : 'CONFIRMAR RECEBIMENTO'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Fatura Gerada Automaticamente */}
      {confirmingCycle && (
        <ConfirmCycleModal
          cycle={confirmingCycle}
          onClose={() => setConfirmingCycle(null)}
          onSuccess={() => fetchCycles()}
        />
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-[80px] right-4 flex flex-col gap-3 z-40">
        <button
          onClick={() => navigate('/ajuste-financeiro')}
          className="size-12 rounded-2xl bg-[#201f1f] text-[#ffb599] border border-stone-800 shadow-xl grid place-items-center active:scale-95 hover:border-[#ff5f00] transition-all"
          aria-label="Lançar Desconto ou Bônus"
          title="Lançar Desconto ou Bônus"
        >
          <FileWarning className="size-5" />
        </button>
        <button
          onClick={() => navigate('/fatura/nova')}
          className="size-14 rounded-2xl bg-[#ff5f00] text-black shadow-xl grid place-items-center active:scale-95 hover:bg-[#ffb599] transition-all"
          aria-label="Fechar Novo Ciclo"
          title="Fechar Novo Ciclo"
        >
          <Plus className="size-7 stroke-[3]" />
        </button>
      </div>
    </AppShell>
  );
};

export default Faturas;
