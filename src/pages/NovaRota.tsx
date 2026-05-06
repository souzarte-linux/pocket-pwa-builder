import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UtensilsCrossed, Package, FileText, Plus } from 'lucide-react';

const NovaRota = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [amount, setAmount] = useState('');
  const [tip, setTip] = useState('');
  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [loading, setLoading] = useState(false);
  const nowLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [occurredAt, setOccurredAt] = useState<string>(nowLocal());

  useEffect(() => {
    supabase.from('platforms').select('id, name').eq('active', true).then(({ data }) => {
      setPlatforms(data ?? []);
      if (data?.[0]) setPlatformId(data[0].id);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from('routes').insert({
      user_id: u.user.id,
      platform_id: platformId || null,
      origin: origin || null,
      destination: destination || null,
      distance_km: Number(distance.replace(',', '.')) || 0,
      amount: Number(amount.replace(',', '.')) || 0,
      tip: Number(tip.replace(',', '.')) || 0,
      product_type: type,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Rota registrada!');
    navigate('/');
  };

  return (
    <AppShell back title="COURIER PRO" subtitle="Nova entrega — Registrar rota">
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>FINALIZAR E REGISTRAR ROTA ›</SubmitButton>}>
          <Field label="Plataforma de serviço">
            <div className="flex gap-2">
              <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)}>
                <option value="">Selecione a Plataforma</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => navigate('/plataforma/nova')}
                className="size-12 shrink-0 grid place-items-center rounded-xl bg-surface-high text-primary"
                aria-label="Nova plataforma"
              >
                <Plus className="size-5" />
              </button>
            </div>
          </Field>

          <Field label="Origem">
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Endereço de coleta" />
          </Field>
          <Field label="Destino">
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Endereço de entrega" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Distância (km)">
              <Input inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Valor (R$)">
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </Field>
          </div>

          <Field label="Gorjeta (R$)">
            <Input inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="0,00" />
          </Field>

          <Field label="Tipo de produto">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={type === 'alimento'} onClick={() => setType('alimento')}>
                <span className="flex flex-col items-center gap-1"><UtensilsCrossed className="size-5" />Alimento</span>
              </SegButton>
              <SegButton active={type === 'pacote'} onClick={() => setType('pacote')}>
                <span className="flex flex-col items-center gap-1"><Package className="size-5" />Pacotes</span>
              </SegButton>
              <SegButton active={type === 'documento'} onClick={() => setType('documento')}>
                <span className="flex flex-col items-center gap-1"><FileText className="size-5" />Doc</span>
              </SegButton>
            </div>
          </Field>

          <div className="rounded-xl border-l-4 border-warning bg-surface p-3 flex gap-2 text-xs text-muted-foreground">
            <span className="text-warning">ⓘ</span>
            Este registro será somado às suas metas diárias de ganhos e quilometragem.
          </div>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default NovaRota;
