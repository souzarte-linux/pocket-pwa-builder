import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FormShell, Field, Select, Input, SubmitButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { checkOverlap } from '@/lib/billing';

import { usePlatforms } from '@/hooks/queries/usePlatforms';
import { useBillingCycleMutations } from '@/hooks/mutations/useBillingCycleMutations';

const NovaFatura = () => {
  const navigate = useNavigate();
  const { data: platforms = [] } = usePlatforms(true);
  const { createBillingCycle } = useBillingCycleMutations();
  const [platformId, setPlatformId] = useState('');

  // Default to last week
  const lastWeekStart = new Date();
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const [periodStart, setPeriodStart] = useState(lastWeekStart.toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));

  const nextFriday = new Date();
  nextFriday.setDate(nextFriday.getDate() + ((5 + 7 - nextFriday.getDay()) % 7 || 7));
  const [expectedDate, setExpectedDate] = useState(nextFriday.toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (platforms.length > 0 && !platformId) {
      setPlatformId(platforms[0].id);
    }
  }, [platforms, platformId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformId) return toast.error('Selecione a plataforma');
    if (new Date(periodEnd) < new Date(periodStart)) return toast.error('Fim do período deve ser maior que início');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    // Check overlap
    const { hasOverlap, conflictingCycle: conf } = await checkOverlap(
      platformId,
      periodStart,
      periodEnd
    );

    if (hasOverlap && conf) {
      setLoading(false);
      const fmtDateStr = (iso: string) => {
        const [y, m, d] = iso.slice(0, 10).split('-');
        return `${d}/${m}/${y}`;
      };
      return toast.error(
        `Conflito de período! A fatura de ${conf.platform_name || 'outra'} no período ${fmtDateStr(conf.period_start)} até ${fmtDateStr(conf.period_end)} já está ativa.`
      );
    }

    try {
      // 1. Create Billing Cycle
      const cycle = await createBillingCycle({
        user_id: u.user.id,
        platform_id: platformId,
        period_start: periodStart,
        period_end: periodEnd,
        expected_payment_date: expectedDate,
        status: 'pending'
      });

      if (!cycle) {
        setLoading(false);
        return toast.error('Erro ao criar fatura');
      }

    // 2. Associate Routes without a cycle or owned by this cycle in this period
    const { error: routeErr } = await supabase.from('routes')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycle.id}`)
      .gte('occurred_at', `${periodStart}T00:00:00`)
      .lte('occurred_at', `${periodEnd}T23:59:59`);

    const { error: dailyErr } = await supabase.from('daily_totals')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycle.id}`)
      .gte('occurred_at', `${periodStart}T00:00:00`)
      .lte('occurred_at', `${periodEnd}T23:59:59`);

    // 3. Associate Adjustments
    const { error: adjErr } = await supabase.from('financial_adjustments')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .or(`billing_cycle_id.is.null,billing_cycle_id.eq.${cycle.id}`)
      .gte('occurred_at', periodStart)
      .lte('occurred_at', periodEnd);

    setLoading(false);
    toast.success('Fatura fechada e corridas associadas!');
    navigate('/faturas');
  } catch (err: any) {
    setLoading(false);
    return toast.error(err?.message || 'Erro ao criar fatura');
  }
};

  return (
    <AppShell back title={'FECHAR CICLO\nNOVA FATURA'}>
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>GERAR FATURA E VINCULAR CORRIDAS ›</SubmitButton>}>
          <Field label="Plataforma">
            <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)} required>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Início do Período">
              <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} required />
            </Field>
            <Field label="Fim do Período">
              <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} required />
            </Field>
          </div>

          <Field label="Data Prevista para Pagamento">
            <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} required />
          </Field>

          <div className="rounded-xl border-l-4 border-info bg-surface p-4 flex gap-3 text-sm text-muted-foreground mt-4">
            <span className="text-info font-black">ⓘ</span>
            <p>
              O sistema vai varrer todas as suas rotas e totais da <strong className="text-foreground">Plataforma</strong> selecionada dentro deste <strong className="text-foreground">Período</strong>, e associá-las a esta Fatura para calcular o valor exato a receber.
            </p>
          </div>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default NovaFatura;
