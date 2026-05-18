import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UtensilsCrossed, Package, FileText, Plus } from 'lucide-react';

const NovaRota = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string, segment: string, payment_model: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [packageCount, setPackageCount] = useState('1');
  const [packageUnitPrice, setPackageUnitPrice] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [tip, setTip] = useState('');

  const selectedP = platforms.find(p => p.id === platformId);
  const isDelivery = selectedP?.segment === 'delivery';
  const isDiaria = selectedP?.payment_model === 'diaria';

  const amountNum = (isDelivery || isDiaria)
    ? (Number(fixedAmount.replace(',', '.')) || 0)
    : (Number(packageCount.replace(',', '.')) || 0) * (Number(packageUnitPrice.replace(',', '.')) || 0);

  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [loading, setLoading] = useState(false);
  const nowLocal = (offsetMin = 0) => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + offsetMin * 60000);
    return d.toISOString().slice(0, 16);
  };
  const [occurredAt, setOccurredAt] = useState<string>(nowLocal());
  const [startAt, setStartAt] = useState<string>(nowLocal(-60));
  const [endAt, setEndAt] = useState<string>(nowLocal());
  const [breakMin, setBreakMin] = useState<string>('0');
  const [startKm, setStartKm] = useState<string>('0');
  const [endKm, setEndKm] = useState<string>('0');

  useEffect(() => {
    supabase.from('platforms').select('id, name, segment, payment_model').eq('active', true).then(({ data }) => {
      setPlatforms(data ?? []);
      if (data?.[0]) {
        setPlatformId(data[0].id);
        if (data[0].segment === 'delivery') setType('alimento');
        else setType('pacote');
      }
    });
  }, []);

  useEffect(() => {
    const s = Number(startKm.replace(',', '.')) || 0;
    const e = Number(endKm.replace(',', '.')) || 0;
    if (s > 0 && e > s) {
      setDistance((e - s).toFixed(1).replace('.', ','));
    }
  }, [startKm, endKm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt) return toast.error('Informe início e fim da jornada.');
    const startedISO = new Date(startAt).toISOString();
    const endedISO = new Date(endAt).toISOString();
    if (new Date(endedISO) <= new Date(startedISO)) {
      return toast.error('A hora final deve ser maior que a inicial.');
    }
    const sKm = Number(startKm.replace(',', '.')) || 0;
    const eKm = Number(endKm.replace(',', '.')) || 0;
    if (eKm > 0 && eKm < sKm) return toast.error('KM final deve ser ≥ KM inicial.');

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('routes').insert({
      user_id: u.user.id,
      platform_id: platformId || null,
      origin: origin || null,
      destination: destination || null,
      distance_km: Number(distance.replace(',', '.')) || 0,
      amount: amountNum,
      package_count: isDelivery ? 1 : (Number(packageCount.replace(',', '.')) || 0),
      package_unit_price: (isDelivery || isDiaria) ? 0 : (Number(packageUnitPrice.replace(',', '.')) || 0),
      tip: Number(tip.replace(',', '.')) || 0,
      product_type: type,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      started_at: startedISO,
      ended_at: endedISO,
      break_minutes: Number(breakMin) || 0,
      start_km: sKm,
      end_km: eKm,
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
              <Select value={platformId} onChange={(e) => {
                const newId = e.target.value;
                setPlatformId(newId);
                const p = platforms.find(x => x.id === newId);
                if (p?.segment === 'delivery') setType('alimento');
                else setType('pacote');
              }}>
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


          <Field label="Data do registro">
            <Input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 mt-4 pt-4 border-t border-border/40">
            <h3 className="text-sm font-semibold text-primary uppercase">Jornada de Trabalho</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início (data e hora)">
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </Field>
              <Field label="Fim (data e hora)">
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  required
                />
              </Field>
            </div>
            
            <Field label="Intervalo / descanso (minutos)">
              <Input
                type="number"
                min="0"
                step="1"
                value={breakMin}
                onChange={(e) => setBreakMin(e.target.value)}
                placeholder="0"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3 mb-4 border-b border-border/40 pb-4">
              <Field label="KM inicial">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="KM final">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={endKm}
                  onChange={(e) => setEndKm(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          </div>

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
            <Field label="Gorjeta (R$)">
              <Input inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="0,00" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isDelivery && (
              <Field label="Quantidade Pacotes">
                <Input inputMode="numeric" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} placeholder="0" />
              </Field>
            )}
            
            {isDiaria ? (
              <Field label="Valor da Diária (R$)">
                <Input inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
              </Field>
            ) : isDelivery ? (
              <Field label="Valor da Corrida (R$)">
                <Input inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
              </Field>
            ) : (
              <Field label="Valor por Pacote (R$)">
                <Input inputMode="decimal" value={packageUnitPrice} onChange={(e) => setPackageUnitPrice(e.target.value)} placeholder="0,00" />
              </Field>
            )}
          </div>

          <div className="rounded-xl bg-surface-high p-3 flex items-center justify-between">
            <span className="label-up text-xs text-muted-foreground">Valor total</span>
            <span className="display text-xl text-primary">
              {amountNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

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
