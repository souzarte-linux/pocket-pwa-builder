import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FormShell, Field, Select, Input, MaskedInput, SubmitButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parseCurrencyToNumber } from '@/lib/format';

import { usePlatforms } from '@/hooks/queries/usePlatforms';

const DISCOUNT_TYPES = ['previdenciario', 'extravio', 'multa'];

const AjusteFinanceiro = () => {
  const navigate = useNavigate();
  const { data: platforms = [] } = usePlatforms(true);
  const [platformId, setPlatformId] = useState('');
  
  const [type, setType] = useState<string>('previdenciario');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (platforms.length > 0 && !platformId) {
      setPlatformId(platforms[0].id);
    }
  }, [platforms, platformId]);

  const isDiscount = DISCOUNT_TYPES.includes(type);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformId) return toast.error('Selecione a plataforma');
    
    const amt = parseCurrencyToNumber(amount);
    if (!amt || amt <= 0) return toast.error('Valor inválido');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase.from('financial_adjustments').insert({
      user_id: u.user.id,
      platform_id: platformId,
      type,
      amount: isDiscount ? -amt : amt,
      description,
      occurred_at: occurredAt
    });

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Ajuste financeiro registrado!');
    navigate('/faturas');
  };

  return (
    <AppShell back title={'AJUSTE FINANCEIRO\nDESCONTOS / ACRÉSCIMOS'}>
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>REGISTRAR AJUSTE ›</SubmitButton>}>
          
          <Field label="Tipo de Ajuste">
            <Select value={type} onChange={(e) => setType(e.target.value)} required>
              <optgroup label="Descontos (Abatimentos)">
                <option value="previdenciario">Previdenciário</option>
                <option value="extravio">Extravios</option>
                <option value="multa">Multas</option>
              </optgroup>
              <optgroup label="Acréscimos (Ganhos)">
                <option value="bonus_fatura">Bônus</option>
                <option value="gratificacao">Gratificação</option>
                <option value="incentivo">Incentivo</option>
                <option value="premiacao">Premiação</option>
              </optgroup>
            </Select>
          </Field>

          <Field label="Plataforma">
            <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)} required>
              {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <Field label="Valor do Ajuste (R$)">
            <MaskedInput 
              maskType="currency"
              inputMode="decimal" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0,00" 
              required
              className={isDiscount ? 'text-destructive font-black' : 'text-success font-black'}
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
