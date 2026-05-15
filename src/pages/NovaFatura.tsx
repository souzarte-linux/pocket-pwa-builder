import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FormShell, Field, Select, Input, SubmitButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NovaFatura = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
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
    supabase.from('platforms').select('id, name').eq('active', true).then(({ data }) => {
      setPlatforms(data ?? []);
      if (data?.[0]) setPlatformId(data[0].id);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformId) return toast.error('Selecione a plataforma');
    if (new Date(periodEnd) < new Date(periodStart)) return toast.error('Fim do período deve ser maior que início');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    // 1. Create Billing Cycle
    const { data: cycle, error: cycleErr } = await supabase.from('billing_cycles').insert({
      user_id: u.user.id,
      platform_id: platformId,
      period_start: periodStart,
      period_end: periodEnd,
      expected_payment_date: expectedDate,
      status: 'pending'
    }).select().single();

    if (cycleErr || !cycle) {
      setLoading(false);
      return toast.error(cycleErr?.message || 'Erro ao criar fatura');
    }

    // 2. Associate Routes without a cycle in this period
    // We add T00:00:00 and T23:59:59 to encompass full days
    const { error: routeErr } = await supabase.from('routes')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .is('billing_cycle_id', null)
      .gte('occurred_at', `${periodStart}T00:00:00`)
      .lte('occurred_at', `${periodEnd}T23:59:59`);

    const { error: dailyErr } = await supabase.from('daily_totals')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .is('billing_cycle_id', null)
      .gte('occurred_at', `${periodStart}T00:00:00`)
      .lte('occurred_at', `${periodEnd}T23:59:59`);
      
    // 3. Associate Adjustments
    const { error: adjErr } = await supabase.from('financial_adjustments')
      .update({ billing_cycle_id: cycle.id })
      .eq('platform_id', platformId)
      .is('billing_cycle_id', null)
      .gte('occurred_at', periodStart)
      .lte('occurred_at', periodEnd);

    setLoading(false);
    toast.success('Fatura fechada e corridas associadas!');
    navigate('/faturas');
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
