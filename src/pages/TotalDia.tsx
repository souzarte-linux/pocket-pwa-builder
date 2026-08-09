import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, MaskedInput, TextArea, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UtensilsCrossed, Package, FileText } from 'lucide-react';
import { parseCurrencyToNumber, parseDistanceToNumber } from '@/lib/format';

import { usePlatforms } from '@/hooks/queries/usePlatforms';

const TotalDia = () => {
  const navigate = useNavigate();
  const { data: platforms = [] } = usePlatforms(true);
  const [platformId, setPlatformId] = useState('');
  const [subtract, setSubtract] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [distance, setDistance] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (platforms.length > 0 && !platformId) {
      setPlatformId(platforms[0].id);
    }
  }, [platforms, platformId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const occurred = new Date(`${date}T${time}:00`).toISOString();
    const { error } = await supabase.from('daily_totals').insert({
      user_id: u.user.id,
      platform_id: platformId || null,
      amount: parseCurrencyToNumber(amount),
      distance_km: parseDistanceToNumber(distance),
      product_type: type,
      subtract_routes: subtract,
      notes: notes || null,
      occurred_at: occurred,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Total do dia registrado!');
    navigate('/');
  };

  return (
    <AppShell back title="LANÇAR TOTAL DO DIA">
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>CONFIRMAR LANÇAMENTO ✓</SubmitButton>}>
          <div className="rounded-2xl bg-surface border border-border/40 p-4">
            <p className="text-sm">O valor a ser informado deverá ser reduzido das rotas realizadas no dia de hoje?</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <SegButton active={subtract} onClick={() => setSubtract(true)}>SIM</SegButton>
              <SegButton active={!subtract} onClick={() => setSubtract(false)}>NÃO</SegButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Hora"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>

          <Field label="Plataforma">
            <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
              <option value="">Selecione a Plataforma</option>
              {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Distância (km)"><MaskedInput maskType="distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Ex: 10,5" /></Field>
            <Field label="Valor (R$)"><MaskedInput maskType="currency" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex: 150,00" /></Field>
          </div>

          <Field label="Tipo de produto">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={type === 'alimento'} onClick={() => setType('alimento')}><span className="flex flex-col items-center gap-1"><UtensilsCrossed className="size-5" />Alimento</span></SegButton>
              <SegButton active={type === 'pacote'} onClick={() => setType('pacote')}><span className="flex flex-col items-center gap-1"><Package className="size-5" />Pacotes</span></SegButton>
              <SegButton active={type === 'documento'} onClick={() => setType('documento')}><span className="flex flex-col items-center gap-1"><FileText className="size-5" />Documentos</span></SegButton>
            </div>
          </Field>

          <Field label="Observações"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Trânsito intenso, chuva..." /></Field>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default TotalDia;
