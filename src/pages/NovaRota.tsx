import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UtensilsCrossed, Package, FileText, Plus, Trash2 } from 'lucide-react';

const NovaRota = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;
  const [platforms, setPlatforms] = useState<{ id: string; name: string, segment: string, payment_model: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [smallPackageCount, setSmallPackageCount] = useState('1');
  const [largePackageCount, setLargePackageCount] = useState('0');
  const [largePackagePrices, setLargePackagePrices] = useState<number[]>([]);
  const [showLargePackageModal, setShowLargePackageModal] = useState(false);
  const [tempLargePackagePrices, setTempLargePackagePrices] = useState<string[]>([]);
  const [packageUnitPrice, setPackageUnitPrice] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [tip, setTip] = useState('');

  const selectedP = platforms.find(p => p.id === platformId);
  const isDelivery = selectedP?.segment === 'delivery';
  const isDiaria = selectedP?.payment_model === 'diaria';

  const smallPkgCount = Number(smallPackageCount) || 0;
  const smallPkgPrice = Number(packageUnitPrice.replace(',', '.')) || 0;
  const largePkgSum = largePackagePrices.reduce((a, b) => a + (Number(b) || 0), 0);
  const amountNum = (isDelivery || isDiaria)
    ? (Number(fixedAmount.replace(',', '.')) || 0)
    : (smallPkgCount * smallPkgPrice) + largePkgSum;

  const handleLargePackageCountChange = (val: string) => {
    const count = Math.max(0, parseInt(val) || 0);
    setLargePackageCount(String(count));
    if (count > 0) {
      // prefill temp array with existing prices or empty strings
      const newTemp = Array.from({ length: count }, (_, i) => String(largePackagePrices[i] ?? ''));
      setTempLargePackagePrices(newTemp);
      setShowLargePackageModal(true);
    } else {
      setLargePackagePrices([]);
    }
  };

  const applyToAllPrices = () => {
    const firstVal = tempLargePackagePrices[0] || '0';
    setTempLargePackagePrices(Array(tempLargePackagePrices.length).fill(firstVal));
  };

  const saveLargePackagePrices = () => {
    const prices = tempLargePackagePrices.map(p => Number(p.replace(',', '.')) || 0);
    setLargePackagePrices(prices);
    setShowLargePackageModal(false);
  };

  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    supabase.from('platforms').select('id, name, segment, payment_model').eq('active', true).then(async ({ data }) => {
      setPlatforms(data ?? []);

      if (editId) {
        const { data: r } = await supabase.from('routes').select('*').eq('id', editId).maybeSingle();
        if (r) {
          setPlatformId(r.platform_id ?? '');
          setOrigin(r.origin ?? '');
          setDestination(r.destination ?? '');
          setDistance(String(r.distance_km ?? ''));
          setSmallPackageCount(String(r.small_packages_count ?? r.package_count ?? '1'));
          setLargePackageCount(String(r.large_packages_count ?? '0'));
          setLargePackagePrices((r.large_packages_prices as number[]) ?? []);
          setPackageUnitPrice(String(r.package_unit_price ?? ''));
          setFixedAmount(String(r.amount ?? ''));
          setTip(String(r.tip ?? ''));
          setType(r.product_type as 'alimento' | 'pacote' | 'documento');
          setOccurredAt(new Date(r.occurred_at).toISOString().slice(0, 16));
          if (r.started_at) setStartAt(new Date(r.started_at).toISOString().slice(0, 16));
          if (r.ended_at) setEndAt(new Date(r.ended_at).toISOString().slice(0, 16));
          setBreakMin(String(r.break_minutes ?? '0'));
          setStartKm(String(r.start_km ?? '0'));
          setEndKm(String(r.end_km ?? '0'));
        }
      } else if (data?.[0]) {
        setPlatformId(data[0].id);
        if (data[0].segment === 'delivery') setType('alimento');
        else setType('pacote');
      }
    });
  }, [editId]);

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
    const totalCount = isDelivery ? 1 : (Number(smallPackageCount) + Number(largePackageCount));
    const payload = {
      user_id: u.user.id,
      platform_id: platformId || null,
      origin: origin || null,
      destination: destination || null,
      distance_km: Number(distance.replace(',', '.')) || 0,
      amount: amountNum,
      package_count: totalCount,
      package_unit_price: (isDelivery || isDiaria) ? 0 : (Number(packageUnitPrice.replace(',', '.')) || 0),
      tip: Number(tip.replace(',', '.')) || 0,
      product_type: type,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      started_at: startedISO,
      ended_at: endedISO,
      break_minutes: Number(breakMin) || 0,
      start_km: sKm,
      end_km: eKm,
      small_packages_count: isDelivery ? 0 : Number(smallPackageCount),
      large_packages_count: isDelivery ? 0 : Number(largePackageCount),
      large_packages_prices: isDelivery ? [] : largePackagePrices,
    };

    let error;
    if (isEdit) {
      const res = await supabase.from('routes').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('routes').insert(payload);
      error = res.error;
    }

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? 'Rota atualizada!' : 'Rota registrada!');
    navigate(isEdit ? '/historico' : '/');
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Deseja realmente excluir esta rota?')) return;
    setDeleting(true);
    const { error } = await supabase.from('routes').delete().eq('id', editId);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success('Rota excluída!');
    navigate('/historico');
  };

  return (
    <AppShell back title="COURIER PRO" subtitle={isEdit ? "Editar entrega" : "Nova entrega — Registrar rota"}>
      <form onSubmit={submit}>
        <FormShell footer={
          <div className="flex flex-col gap-2 w-full">
            <SubmitButton loading={loading}>{isEdit ? 'SALVAR ALTERAÇÕES ›' : 'FINALIZAR E REGISTRAR ROTA ›'}</SubmitButton>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full h-14 rounded-xl border border-destructive/40 text-destructive font-black tracking-wide flex items-center justify-center gap-2 bg-surface hover:bg-destructive/10 transition active:scale-[0.98]"
              >
                <Trash2 className="size-5" />
                {deleting ? 'EXCLUINDO...' : 'EXCLUIR ROTA'}
              </button>
            )}
          </div>
        }>
          <h3 className="text-sm font-semibold text-primary uppercase">PLATAFORMA</h3>
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

          <h3 className="text-sm font-semibold text-primary uppercase">LOGISTICA E RECEITA</h3>

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

          {!isDelivery && !isDiaria && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pacotinhos">
                <Input inputMode="numeric" value={smallPackageCount} onChange={(e) => setSmallPackageCount(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Valor do Pacotinho (R$)">
                <Input inputMode="decimal" value={packageUnitPrice} onChange={(e) => setPackageUnitPrice(e.target.value)} placeholder="0,00" />
              </Field>
              
              <Field label="Volumosos">
                <div className="flex gap-2">
                  <Input inputMode="numeric" value={largePackageCount} onChange={(e) => handleLargePackageCountChange(e.target.value)} placeholder="0" />
                  {Number(largePackageCount) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const count = Number(largePackageCount);
                        const newTemp = Array.from({ length: count }, (_, i) => String(largePackagePrices[i] ?? ''));
                        setTempLargePackagePrices(newTemp);
                        setShowLargePackageModal(true);
                      }}
                      className="px-3 rounded-xl bg-surface-bright text-xs text-primary font-bold hover:bg-surface-bright/80 transition shrink-0"
                    >
                      Valores
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Quantidade Pacotes Total">
                <Input readOnly disabled value={String(smallPkgCount + (Number(largePackageCount) || 0))} />
              </Field>
            </div>
          )}

          {(isDiaria || isDelivery) && (
            <div className="grid grid-cols-1 gap-3">
              {isDiaria ? (
                <Field label="Valor da Diária (R$)">
                  <Input inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
                </Field>
              ) : (
                <Field label="Valor da Corrida (R$)">
                  <Input inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
                </Field>
              )}
            </div>
          )}

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
      {showLargePackageModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowLargePackageModal(false)}>
          <div
            className="w-full max-w-lg bg-surface-container rounded-t-3xl p-6 space-y-5 border-t border-border/40 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="display text-xl">VALORES DOS VOLUMOSOS</h2>
                <p className="text-sm text-primary font-bold">{largePackageCount} pacote(s) volumoso(s)</p>
              </div>
              <button type="button" onClick={() => setShowLargePackageModal(false)} className="size-10 grid place-items-center rounded-xl bg-surface-high text-muted-foreground hover:text-foreground">
                <Package className="size-5" />
              </button>
            </div>

            {tempLargePackagePrices.length > 1 && (
              <button
                type="button"
                onClick={applyToAllPrices}
                className="w-full py-2 bg-surface text-primary font-bold text-xs uppercase rounded-xl border border-primary/20 hover:bg-surface-high active:scale-95 transition"
              >
                Aplicar valor do 1º para todos
              </button>
            )}

            <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-1">
              {tempLargePackagePrices.map((price, idx) => (
                <Field key={idx} label={`Valor do Volume #${idx + 1} (R$)`}>
                  <Input
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => {
                      const updated = [...tempLargePackagePrices];
                      updated[idx] = e.target.value;
                      setTempLargePackagePrices(updated);
                    }}
                    placeholder="0,00"
                  />
                </Field>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLargePackageModal(false)}
                className="h-14 border border-border/60 text-muted-foreground font-black text-sm uppercase rounded-xl active:scale-[0.98] transition hover:bg-surface-high"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveLargePackagePrices}
                className="h-14 bg-primary text-primary-foreground font-black text-sm uppercase rounded-xl active:scale-[0.98] transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default NovaRota;
