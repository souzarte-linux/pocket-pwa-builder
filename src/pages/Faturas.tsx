import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { Plus, CheckCircle, FileWarning, Wallet } from 'lucide-react';
import { toast } from 'sonner';

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

const Faturas = () => {
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<BillingCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCycles = async () => {
    setLoading(true);
    const { data: cyclesData, error } = await supabase
      .from('billing_cycles')
      .select(`
        id, platform_id, period_start, period_end, expected_payment_date, status,
        platforms ( name )
      `)
      .order('expected_payment_date', { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Now calculate total_amount for each cycle from routes and daily_totals and adjustments
    const cycleIds = cyclesData.map(c => c.id);
    
    // Fetch routes and daily totals linked to these cycles
    const [routesRes, dailiesRes, adjustmentsRes] = await Promise.all([
      supabase.from('routes').select('amount, tip, billing_cycle_id').in('billing_cycle_id', cycleIds),
      supabase.from('daily_totals').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds),
      supabase.from('financial_adjustments').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds)
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

    const formatted = cyclesData.map(c => ({
      ...c,
      platform_name: (c.platforms as any)?.name || 'Desconhecida',
      total_amount: (routeMap[c.id] || 0) + (dailyMap[c.id] || 0) + (adjMap[c.id] || 0)
    }));

    setCycles(formatted);
    setLoading(false);
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const markAsPaid = async (id: string) => {
    if (!confirm('Confirmar recebimento desta fatura?')) return;
    const { error } = await supabase.from('billing_cycles').update({ status: 'pago' }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Fatura recebida!');
      fetchCycles();
    }
  };

  const pending = cycles.filter(c => c.status !== 'pago');
  const paid = cycles.filter(c => c.status === 'pago');

  const CycleCard = ({ c }: { c: BillingCycle }) => {
    const isOverdue = c.status !== 'pago' && new Date(c.expected_payment_date) < new Date();
    
    return (
      <div className={`rounded-xl p-4 border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-border/40 bg-surface'}`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">{c.platform_name}</h3>
            <p className="text-xs text-muted-foreground">
              Período: {new Date(c.period_start).toLocaleDateString('pt-BR')} até {new Date(c.period_end).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-black text-xl ${c.status === 'pago' ? 'text-success' : 'text-primary'}`}>
              {formatBRL(c.total_amount || 0)}
            </p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {c.status === 'pago' ? 'Recebido' : isOverdue ? 'Atrasado' : 'A receber'}
            </p>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Previsto: {new Date(c.expected_payment_date).toLocaleDateString('pt-BR')}</span>
          </div>
          
          {c.status !== 'pago' && (
            <button 
              onClick={() => markAsPaid(c.id)}
              className="h-10 px-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wide rounded-lg active:scale-95 transition-transform"
            >
              Baixar Pagamento
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppShell title={'CONTAS A RECEBER\nFATURAS'} back>
      <div className="space-y-6 pb-24">
        
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Em Aberto</h2>
            <div className="text-right">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                {formatBRL(pending.reduce((acc, c) => acc + (c.total_amount || 0), 0))}
              </span>
            </div>
          </div>
          
          {loading ? (
            <p className="text-sm text-center text-muted-foreground py-8">Carregando...</p>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 p-6 text-center bg-surface">
              <p className="text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(c => <CycleCard key={c.id} c={c} />)}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Histórico Pago</h2>
          </div>
          {paid.length === 0 ? (
             <p className="text-xs text-muted-foreground text-center py-4">Nenhum histórico.</p>
          ) : (
            <div className="space-y-3 opacity-80">
              {paid.map(c => <CycleCard key={c.id} c={c} />)}
            </div>
          )}
        </section>
      </div>

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
