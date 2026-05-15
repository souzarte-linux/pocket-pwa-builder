import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FormShell, Field, Select, Input, SubmitButton, SegButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AjusteFinanceiro = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  
  const [type, setType] = useState<'bonus' | 'pnr'>('pnr');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  
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
    
    const amt = Number(amount.replace(',', '.'));
    if (!amt || amt <= 0) return toast.error('Valor inválido');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase.from('financial_adjustments').insert({
      user_id: u.user.id,
      platform_id: platformId,
      type,
      amount: type === 'pnr' ? -amt : amt, // PNR is negative, Bonus is positive
      description,
      occurred_at: occurredAt
    });

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Ajuste financeiro registrado!');
    navigate('/faturas');
  };

  return (
    <AppShell back title={'AJUSTE FINANCEIRO\nPNR / BÔNUS'}>
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>REGISTRAR AJUSTE ›</SubmitButton>}>
          
          <Field label="Tipo de Ajuste">
            <div className="grid grid-cols-2 gap-2">
              <SegButton active={type === 'pnr'} onClick={() => setType('pnr')} className="text-destructive font-black">
                DESCONTO (PNR)
              </SegButton>
              <SegButton active={type === 'bonus'} onClick={() => setType('bonus')} className="text-success font-black">
                BÔNUS / GRATIFICAÇÃO
              </SegButton>
            </div>
          </Field>

          <Field label="Plataforma">
            <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)} required>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <Field label="Valor do Ajuste (R$)">
            <Input 
              inputMode="decimal" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0,00" 
              required
              className={type === 'pnr' ? 'text-destructive font-black' : 'text-success font-black'}
            />
          </Field>

          <Field label="Descrição (Opcional)">
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Carga extraviada, Bônus de domingo..." />
          </Field>

          <Field label="Data da Ocorrência">
            <Input type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} required />
          </Field>

          <div className="rounded-xl border-l-4 border-info bg-surface p-4 flex gap-3 text-sm text-muted-foreground mt-4">
            <span className="text-info font-black">ⓘ</span>
            <p>
              Este ajuste ficará pendente e será automaticamente incluído e abatido/somado na próxima <strong>Fatura</strong> que você fechar para esta plataforma.
            </p>
          </div>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default AjusteFinanceiro;
