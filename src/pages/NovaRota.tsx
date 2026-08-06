import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, MaskedInput, TextArea, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UtensilsCrossed, Package, FileText, Plus, Trash2 } from 'lucide-react';
import {
  getRouteInitialKmValue,
  toLocalInput,
  parseCurrencyToNumber,
  parseDistanceToNumber,
  parsePackageToNumber,
} from '@/lib/format';

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
  const [smallPackageCount, setSmallPackageCount] = useState('');
  const [largePackageCount, setLargePackageCount] = useState('');
  const [largePackagePrices, setLargePackagePrices] = useState<number[]>([]);
  const [showLargePackageModal, setShowLargePackageModal] = useState(false);
  const [tempLargePackagePrices, setTempLargePackagePrices] = useState<string[]>([]);
  const [packageUnitPrice, setPackageUnitPrice] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [tip, setTip] = useState('');

  const selectedP = platforms.find(p => p.id === platformId);
  const isDelivery = selectedP?.segment === 'delivery';
  const isDiaria = selectedP?.payment_model === 'diaria';

  const smallPkgCount = parsePackageToNumber(smallPackageCount);
  const smallPkgPrice = parseCurrencyToNumber(packageUnitPrice);
  const largePkgSum = largePackagePrices.reduce((a, b) => a + (parseCurrencyToNumber(b) || 0), 0);
  const amountNum = (isDelivery || isDiaria)
    ? parseCurrencyToNumber(fixedAmount)
    : (smallPkgCount * smallPkgPrice) + largePkgSum;

  const openLargePackageModal = (countOverride?: number) => {
    const count = Math.max(0, (countOverride ?? parsePackageToNumber(largePackageCount)) || 0);
    if (count <= 0) {
      setShowLargePackageModal(false);
      return;
    }

    const newTemp = Array.from({ length: count }, (_, i) => 
      largePackagePrices[i] !== undefined ? String(largePackagePrices[i]) : ''
    );
    setTempLargePackagePrices(newTemp);
    setShowLargePackageModal(true);
  };

  const handleLargePackageCountChange = (val: string) => {
    if (val === '') {
      setLargePackageCount('');
      setLargePackagePrices([]);
      setShowLargePackageModal(false);
      return;
    }
    const count = Math.max(0, parsePackageToNumber(val));
    setLargePackageCount(String(count));
    if (count > 0) {
      openLargePackageModal(count);
    } else {
      setLargePackagePrices([]);
      setShowLargePackageModal(false);
    }
  };

  const applyToAllPrices = () => {
    const firstVal = tempLargePackagePrices[0] || '0';
    setTempLargePackagePrices(Array(tempLargePackagePrices.length).fill(firstVal));
  };

  const saveLargePackagePrices = () => {
    const prices = tempLargePackagePrices.map(p => parseCurrencyToNumber(p));
    setLargePackagePrices(prices);
    setShowLargePackageModal(false);
  };

  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const nowLocal = (offsetMin = 0) => {
    return toLocalInput(new Date(Date.now() + offsetMin * 60000));
  };
  const [occurredAt, setOccurredAt] = useState<string>(nowLocal());
  const [startAt, setStartAt] = useState<string>(nowLocal(-60));
  const [endAt, setEndAt] = useState<string>(nowLocal());
  const [breakMin, setBreakMin] = useState<string>('');
  const [startKm, setStartKm] = useState<string>('');
  const [endKm, setEndKm] = useState<string>('');

  useEffect(() => {
    supabase.from('platforms').select('id, name, segment, payment_model').eq('active', true).then(async ({ data }) => {
      setPlatforms(data ?? []);

      const { data: latestRoute } = await supabase
        .from('routes')
        .select('end_km')
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const fallbackStartKm = getRouteInitialKmValue((latestRoute as { end_km?: number | null } | null)?.end_km ?? null);

      if (editId) {
        const { data: r } = await supabase.from('routes').select('*').eq('id', editId).maybeSingle();
        if (r) {
          setPlatformId(r.platform_id ?? '');
          setOrigin(r.origin ?? '');
          setDestination(r.destination ?? '');
          setDistance(r.distance_km ? String(r.distance_km) : '');
          const smallPkgVal = r.small_packages_count ?? r.package_count;
          setSmallPackageCount(smallPkgVal ? String(smallPkgVal) : '');
          setLargePackageCount(r.large_packages_count ? String(r.large_packages_count) : '');
          setLargePackagePrices((r.large_packages_prices as number[]) ?? []);
          setPackageUnitPrice(r.package_unit_price ? String(r.package_unit_price) : '');
          setFixedAmount(r.amount ? String(r.amount) : '');
          setTip(r.tip ? String(r.tip) : '');
          setType(r.product_type as 'alimento' | 'pacote' | 'documento');
          setOccurredAt(toLocalInput(r.occurred_at));
          if (r.started_at) setStartAt(toLocalInput(r.started_at));
          if (r.ended_at) setEndAt(toLocalInput(r.ended_at));
          setBreakMin(r.break_minutes ? String(r.break_minutes) : '');
          setStartKm(r.start_km != null ? String(r.start_km) : '');
          setEndKm(r.end_km != null ? String(r.end_km) : '');
        }
      } else {
        setStartKm(fallbackStartKm);
        if (data?.[0]) {
          setPlatformId(data[0].id);
          if (data[0].segment === 'delivery') setType('alimento');
          else setType('pacote');
        }
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
    const totalCount = isDelivery ? 1 : (parsePackageToNumber(smallPackageCount) + parsePackageToNumber(largePackageCount));
    const payload = {
      user_id: u.user.id,
      platform_id: platformId || null,
      origin: origin || null,
      destination: destination || null,
      distance_km: parseDistanceToNumber(distance),
      amount: amountNum,
      package_count: totalCount,
      package_unit_price: (isDelivery || isDiaria) ? 0 : parseCurrencyToNumber(packageUnitPrice),
      tip: parseCurrencyToNumber(tip),
      product_type: type,
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
      started_at: startedISO,
      ended_at: endedISO,
      break_minutes: Number(breakMin) || 0,
      start_km: sKm,
      end_km: eKm,
      small_packages_count: isDelivery ? 0 : parsePackageToNumber(smallPackageCount),
      large_packages_count: isDelivery ? 0 : parsePackageToNumber(largePackageCount),
      large_packages_prices: isDelivery ? [] : largePackagePrices.map(p => parseCurrencyToNumber(p)),
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
    if (error) return (console.error(error), toast.error("Erro ao salvar. Tente novamente."));
    toast.success(isEdit ? 'Rota atualizada!' : 'Rota registrada!');
    navigate(isEdit ? '/historico' : '/');
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Deseja realmente excluir esta rota?')) return;
    setDeleting(true);
    const { error } = await supabase.from('routes').delete().eq('id', editId);
    setDeleting(false);
    if (error) return (console.error(error), toast.error("Erro ao salvar. Tente novamente."));
    toast.success('Rota excluída!');
    navigate('/historico');
  };

  return (
    <AppShell back title={isEdit ? "Editar entrega" : "COURIER PRO"} subtitle={isEdit ? undefined : "Nova entrega — Registrar rota"}>
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
              <Field label="Início (d/h)">
                <Input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </Field>
              <Field label="Fim (d/h)">
                <Input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field label="Intervalo / descanso (min)">
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
              <MaskedInput maskType="distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Ex: 10,5" />
            </Field>
            <Field label="Gorjeta (R$)">
              <MaskedInput maskType="currency" inputMode="decimal" value={tip} onChange={(e) => setTip(e.target.value)} placeholder="Ex: 5,00" />
            </Field>
          </div>

          {!isDelivery && !isDiaria && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between h-full">
                <Field label="Pacotinhos">
                  <MaskedInput maskType="package" inputMode="numeric" value={smallPackageCount} onChange={(e) => setSmallPackageCount(e.target.value)} placeholder="Ex: 10" />
                </Field>
              </div>
              <div className="flex flex-col justify-between h-full">
                <Field label="Valor do Pacotinho (R$)">
                  <MaskedInput maskType="currency" inputMode="decimal" value={packageUnitPrice} onChange={(e) => setPackageUnitPrice(e.target.value)} placeholder="Ex: 1,50" />
                </Field>
              </div>
              <div className="flex flex-col justify-between h-full">
                <Field label="Volumosos">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <MaskedInput
                      maskType="volume"
                      inputMode="numeric"
                      value={largePackageCount}
                      onChange={(e) => handleLargePackageCountChange(e.target.value)}
                      onClick={() => {
                        if (parsePackageToNumber(largePackageCount) > 0) openLargePackageModal(parsePackageToNumber(largePackageCount));
                      }}
                      placeholder="Ex: 2"
                    />
                    {parsePackageToNumber(largePackageCount) > 0 && (
                      <button
                        type="button"
                        onClick={() => openLargePackageModal(parsePackageToNumber(largePackageCount))}
                        className="w-full sm:w-auto px-3 h-14 rounded-xl bg-surface-bright text-xs text-primary font-bold hover:bg-surface-bright/80 transition shrink-0"
                      >
                        Valores
                      </button>
                    )}
                  </div>
                </Field>
              </div>
              <div className="flex flex-col justify-between h-full">
                <Field label="Quantidade Pacotes Total">
                  <MaskedInput 
                    maskType="package_total"
                    readOnly 
                    disabled 
                    value={smallPackageCount || largePackageCount ? String(smallPkgCount + parsePackageToNumber(largePackageCount)) : ''} 
                    placeholder="Total automático"
                    className="opacity-90 bg-surface-high/80 font-bold"
                  />
                </Field>
              </div>
            </div>
          )}

          {(isDiaria || isDelivery) && (
            <div className="grid grid-cols-1 gap-3">
              {isDiaria ? (
                <Field label="Valor da Diária (R$)">
                  <MaskedInput maskType="currency" inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
                </Field>
              ) : (
                <Field label="Valor da Corrida (R$)">
                  <MaskedInput maskType="currency" inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
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
            className="w-full max-w-lg bg-surface-container rounded-t-3xl p-4 sm:p-6 space-y-4 border-t border-border/40 shadow-2xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="display text-xl">VALORES DOS VOLUMOSOS</h2>
                <p className="text-sm text-primary font-bold">
                  {parsePackageToNumber(largePackageCount) === 1 ? '1 volume' : `${largePackageCount} volumes`}
                </p>
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

            <div className="max-h-[45vh] overflow-y-auto space-y-4 pr-1">
              {tempLargePackagePrices.map((price, idx) => (
                <div key={idx} className="w-full">
                  <Field label={`Valor do Volume #${idx + 1} (R$)`}>
                    <MaskedInput
                      maskType="currency"
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
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
