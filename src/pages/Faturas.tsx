import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { Plus, CheckCircle, FileWarning, Wallet, Pencil, X, Save, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { startOfWeek, startOfMonth, addDays } from 'date-fns';
import { Field, Input, Select } from '@/components/forms/Form';

interface BillingCycle {
  id: string;
  platform_id: string;
  period_start: string;
  period_end: string;
  expected_payment_date: string;
  status: string;
  platform_name?: string;
  total_amount?: number;
}

interface EditState {
  period_start: string;
  period_end: string;
  expected_payment_date: string;
  status: string;
}

const STATUS_OPTIONS = ['pending', 'open', 'pago', 'cancelado'];
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', open: 'Em Aberto', pago: 'Recebido', cancelado: 'Cancelado',
};

const Faturas = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCycle, setEditingCycle] = useState<BillingCycle | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  // Platform filter: 'all' or a specific platform_id
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

  const fetchCycles = async () => {
    setLoading(true);
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

    const routeMap = (routesRes.data || []).reduce((acc: any, r: any) => {
      acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.amount) + Number(r.tip);
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

    setCycles(cyclesData.map(c => ({
      ...c,
      platform_name: (c.platforms as any)?.name || 'Desconhecida',
      total_amount: (routeMap[c.id] || 0) + (dailyMap[c.id] || 0) + (adjMap[c.id] || 0),
    })));
    setLoading(false);
  };

  const generateBillingCycles = async () => {
    const { data: platforms } = await supabase
      .from('platforms')
      .select('id, name, cycle, payment_day, rules');

    if (!platforms) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;

    for (const platform of platforms) {
      const rules = platform.rules as any;

      // ── Variable cycle (misto): uses cycle_entries [{cut, payDelay}] ──
      if (platform.cycle === 'misto') {
        const entries: { cut: number; payDelay: number }[] = Array.isArray(rules?.cycle_entries)
          ? rules.cycle_entries
          : (Array.isArray(rules?.cycle_days) // legacy migration
              ? rules.cycle_days.map((d: number) => ({ cut: d, payDelay: rules?.fixed_pay_delay ?? 7 }))
              : []);

        if (entries.length === 0) continue;

        const dom = today.getDate();
        const sorted = [...entries].sort((a, b) => a.cut - b.cut);

        // Find the entry whose cut day has just passed (or is today)
        const activeEntry = sorted.filter(e => e.cut <= dom).pop() ?? sorted[sorted.length - 1];
        const prevCut = activeEntry.cut;
        const prevCutMonth = prevCut <= dom ? today.getMonth() : today.getMonth() - 1;
        const cycleStart = new Date(today.getFullYear(), prevCutMonth, prevCut);

        // Find next cut entry
        const nextEntryIdx = (sorted.indexOf(activeEntry) + 1) % sorted.length;
        const nextEntry = sorted[nextEntryIdx];
        const nextCutMonth = nextEntry.cut <= prevCut ? today.getMonth() + 1 : today.getMonth();
        const rawEnd = new Date(today.getFullYear(), nextCutMonth, nextEntry.cut - 1);
        const cycleEnd = today < rawEnd ? today : rawEnd;

        // Avoid duplicate cycles for this window
        const { data: existing } = await supabase.from('billing_cycles')
          .select('id')
          .eq('platform_id', platform.id)
          .gte('period_start', cycleStart.toISOString().slice(0, 10))
          .limit(1);
        if (existing && existing.length > 0) continue;

        const payDate = addDays(cycleEnd, activeEntry.payDelay);
        await supabase.from('billing_cycles').insert({
          user_id: u.user.id,
          platform_id: platform.id,
          period_start: cycleStart.toISOString().slice(0, 10),
          period_end: cycleEnd.toISOString().slice(0, 10),
          expected_payment_date: payDate.toISOString().slice(0, 10),
          status: 'open',
        });
        continue;
      }

      // ── Fixed cycles: semanal, quinzenal, mensal ──
      const payDelay = Number(rules?.fixed_pay_delay) || 7;

      let cycleStart: Date;
      if (platform.cycle === 'semanal') {
        cycleStart = startOfWeek(today, { weekStartsOn: 1 });
      } else if (platform.cycle === 'quinzenal') {
        const midMonth = addDays(startOfMonth(today), 14);
        cycleStart = today < midMonth ? startOfMonth(today) : midMonth;
      } else if (platform.cycle === 'mensal') {
        cycleStart = startOfMonth(today);
      } else {
        continue;
      }

      const { data: existing } = await supabase.from('billing_cycles')
        .select('id')
        .eq('platform_id', platform.id)
        .gte('period_start', cycleStart.toISOString())
        .limit(1);
      if (existing && existing.length > 0) continue;

      const payDate = addDays(today, payDelay);
      await supabase.from('billing_cycles').insert({
        user_id: u.user.id,
        platform_id: platform.id,
        period_start: cycleStart.toISOString(),
        period_end: today.toISOString(),
        expected_payment_date: payDate.toISOString(),
        status: 'open',
      });
    }

    fetchCycles();
  };

  useEffect(() => { fetchCycles(); generateBillingCycles(); }, []);

  const openEdit = (c: BillingCycle) => {
    setEditingCycle(c);
    setEditState({
      period_start: c.period_start.slice(0, 10),
      period_end: c.period_end.slice(0, 10),
      expected_payment_date: c.expected_payment_date.slice(0, 10),
      status: c.status,
    });
  };

  const saveEdit = async () => {
    if (!editingCycle || !editState) return;
    setSaving(true);
    const { error } = await supabase.from('billing_cycles').update({
      period_start: editState.period_start,
      period_end: editState.period_end,
      expected_payment_date: editState.expected_payment_date,
      status: editState.status,
    }).eq('id', editingCycle.id);

    // Re-associate routes/daily_totals to match the updated date range
    if (!error) {
      await supabase.from('routes')
        .update({ billing_cycle_id: editingCycle.id })
        .eq('platform_id', editingCycle.platform_id)
        .gte('occurred_at', `${editState.period_start}T00:00:00`)
        .lte('occurred_at', `${editState.period_end}T23:59:59`);

      await supabase.from('daily_totals')
        .update({ billing_cycle_id: editingCycle.id })
        .eq('platform_id', editingCycle.platform_id)
        .gte('occurred_at', `${editState.period_start}T00:00:00`)
        .lte('occurred_at', `${editState.period_end}T23:59:59`);
    }

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Fatura atualizada!');
    setEditingCycle(null);
    setEditState(null);
    fetchCycles();
  };

  const markAsPaid = async (id: string) => {
    if (!confirm('Confirmar recebimento desta fatura?')) return;
    const { error } = await supabase.from('billing_cycles').update({ status: 'pago' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Fatura recebida!'); fetchCycles(); }
  };

  // Derive unique platforms from fetched cycles for the filter chips
  const platformOptions = Array.from(
    new Map(cycles.map(c => [c.platform_id, c.platform_name ?? ''])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filterFn = (c: BillingCycle) =>
    filterPlatform === 'all' || c.platform_id === filterPlatform;

  const pending = cycles.filter(c => c.status !== 'pago').filter(filterFn);
  const paid = cycles.filter(c => c.status === 'pago').filter(filterFn);
  const pendingTotal = pending.reduce((acc, c) => acc + (c.total_amount || 0), 0);
  const paidTotal = paid.reduce((acc, c) => acc + (c.total_amount || 0), 0);

  const CycleCard = ({ c }: { c: BillingCycle }) => {
    const isOverdue = c.status !== 'pago' && new Date(c.expected_payment_date) < new Date();
    return (
      <div className={`rounded-xl p-4 border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border/40 bg-surface'}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{c.platform_name}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(c.period_start).toLocaleDateString('pt-BR')} → {new Date(c.period_end).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-black text-xl ${c.status === 'pago' ? 'text-success' : 'text-primary'}`}>
              {formatBRL(c.total_amount || 0)}
            </p>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
              c.status === 'pago' ? 'bg-success/15 text-success' :
              isOverdue ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'
            }`}>
              {c.status === 'pago' ? 'Recebido' : isOverdue ? 'Atrasado' : 'A receber'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Previsto: {new Date(c.expected_payment_date).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex gap-2">
            {c.status !== 'pago' && (
              <button
                onClick={() => markAsPaid(c.id)}
                className="h-10 px-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wide rounded-lg active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <CheckCircle className="size-3.5" /> Baixar
              </button>
            )}
            <button
              onClick={() => openEdit(c)}
              className="h-10 px-3 bg-surface-high border border-border/40 text-foreground font-bold text-xs uppercase tracking-wide rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 hover:border-primary hover:text-primary"
            >
              <Pencil className="size-3.5" /> Editar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell title={'CONTAS A RECEBER\nFATURAS'} back>
      <div className="space-y-6 pb-24">

        {/* ── Platform filter chips ── */}
        {platformOptions.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Filtrar por plataforma</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterPlatform('all')}
                className={`h-9 px-4 rounded-full text-xs font-black uppercase tracking-wide transition active:scale-95 ${
                  filterPlatform === 'all'
                    ? 'bg-primary text-primary-foreground shadow-fab'
                    : 'bg-surface border border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {platformOptions.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterPlatform(filterPlatform === p.id ? 'all' : p.id)}
                  className={`h-9 px-4 rounded-full text-xs font-black uppercase tracking-wide transition active:scale-95 ${
                    filterPlatform === p.id
                      ? 'bg-primary text-primary-foreground shadow-fab'
                      : 'bg-surface border border-border/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {filterPlatform !== 'all' && (
              <div className="flex gap-3 mt-1">
                <div className="flex-1 rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wide">A receber</p>
                  <p className="display text-xl text-primary">{formatBRL(pendingTotal)}</p>
                </div>
                <div className="flex-1 rounded-xl bg-success/5 border border-success/20 p-3">
                  <p className="text-[10px] font-bold text-success uppercase tracking-wide">Recebido</p>
                  <p className="display text-xl text-success">{formatBRL(paidTotal)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Em Aberto</h2>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
              {formatBRL(pendingTotal)}
            </span>
          </div>
          {loading ? (
            <p className="text-sm text-center text-muted-foreground py-8">Carregando...</p>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 p-6 text-center bg-surface">
              <p className="text-sm text-muted-foreground">
                {filterPlatform === 'all' ? 'Nenhuma fatura em aberto.' : 'Nenhuma fatura em aberto para esta plataforma.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">{pending.map(c => <CycleCard key={c.id} c={c} />)}</div>
          )}
        </section>

        {paid.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Histórico Pago</h2>
            <div className="space-y-3 opacity-80">{paid.map(c => <CycleCard key={c.id} c={c} />)}</div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      {editingCycle && editState && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setEditingCycle(null)}>
          <div
            className="w-full max-w-lg bg-surface-container rounded-t-3xl p-6 space-y-5 border-t border-border/40 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="display text-xl">EDITAR FATURA</h2>
                <p className="text-sm text-primary font-bold">{editingCycle.platform_name}</p>
              </div>
              <button onClick={() => setEditingCycle(null)} className="size-10 grid place-items-center rounded-xl bg-surface-high text-muted-foreground hover:text-foreground">
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

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
              <span className="font-bold text-primary">ⓘ</span> Ao salvar, o sistema associará automaticamente as rotas e totais da plataforma que estejam dentro do período informado.
            </div>

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full h-14 bg-primary text-primary-foreground font-black text-sm uppercase rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              <Save className="size-5" />
              {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-[80px] right-4 flex flex-col gap-3">
        <button
          onClick={() => navigate('/ajuste-financeiro')}
          className="size-12 rounded-full bg-secondary text-secondary-foreground shadow-fab grid place-items-center active:scale-95 transition-transform"
          aria-label="Lançar Desconto ou Bônus"
        >
          <FileWarning className="size-5" />
        </button>
        <button
          onClick={() => navigate('/fatura/nova')}
          className="size-14 rounded-full bg-primary text-primary-foreground shadow-fab grid place-items-center active:scale-95 transition-transform"
          aria-label="Fechar Novo Ciclo"
        >
          <Plus className="size-6" strokeWidth={3} />
        </button>
      </div>
    </AppShell>
  );
};

export default Faturas;
