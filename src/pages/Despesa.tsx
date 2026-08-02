import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, SegButton, SubmitButton, FormShell, Select } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/QuickCombobox';
import { CardPaymentDialog, CardDetails } from '@/components/CardPaymentDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, Plus, Trash2, History } from 'lucide-react';

type Cat = 'combustivel' | 'manutencao' | 'alimentacao';

const titles: Record<Cat, { title: string; defaultTitle: string }> = {
  combustivel: { title: 'NOVO ABASTECIMENTO', defaultTitle: 'Abastecimento' },
  manutencao: { title: 'LANÇAR MANUTENÇÃO', defaultTitle: 'Manutenção' },
  alimentacao: { title: 'LANÇAMENTO DE ALIMENTAÇÃO', defaultTitle: 'Refeição' },
};

const allFuelTypes = ['Etanol', 'Gasolina Comum', 'Gasolina Aditivada', 'GNV', 'Diesel'];

/** Vida útil de referência (km) por tipo de peça/serviço */
const LIFE_REFERENCE: { match: string[]; km: number }[] = [
  { match: ['oleo', 'óleo'], km: 3000 },
  { match: ['filtro'], km: 6000 },
  { match: ['pastilha', 'freio'], km: 10000 },
  { match: ['vela'], km: 10000 },
  { match: ['relacao', 'relação', 'corrente', 'coroa', 'pinhao', 'pinhão'], km: 20000 },
  { match: ['pneu'], km: 25000 },
];

const suggestLife = (title: string) => {
  const t = title.toLowerCase();
  const hit = LIFE_REFERENCE.find((r) => r.match.some((m) => t.includes(m)));
  return hit ? String(hit.km) : '';
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const Despesa = () => {
  const { categoria } = useParams<{ categoria: Cat }>();
  const cat = (categoria ?? 'combustivel') as Cat;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEdit = !!editId;

  const [vendor, setVendor] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina Comum');
  const [odometer, setOdometer] = useState('');
  const [lifeKm, setLifeKm] = useState('');
  const [lifeTouched, setLifeTouched] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [partBrand, setPartBrand] = useState('');
  const [partModel, setPartModel] = useState('');
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()));
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [isFullTank, setIsFullTank] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [gasStations, setGasStations] = useState<any[]>([]);
  const [partHistory, setPartHistory] = useState<any[]>([]);

  useEffect(() => {
    if (cat === 'combustivel') {
      supabase.from('gas_stations').select('*').order('name').then(({ data }) => {
        setGasStations(data ?? []);
      });
    }
    if (cat === 'manutencao' && !isEdit) {
      const last = localStorage.getItem('lastCompany');
      if (last) setVendor(last);
    }

    if (editId) {
      supabase.from('expenses').select('*').eq('id', editId).maybeSingle().then(({ data: e }) => {
        if (e) {
          const ex = e as any;
          setVendor(ex.vendor ?? '');
          setTitle(ex.title ?? '');
          setAmount(String(ex.amount ?? ''));
          setLiters(String(ex.liters ?? ''));
          setPricePerLiter(String(ex.price_per_liter ?? ''));
          if (ex.fuel_type) setFuelType(ex.fuel_type);
          setOdometer(ex.odometer_km != null ? String(ex.odometer_km) : '');
          setWhen(toLocalInput(ex.occurred_at));
          setDescription(ex.description ?? '');
          setReceiptNumber(ex.receipt_number ?? '');
          setInvoiceNumber(ex.invoice_number ?? '');
          setPartBrand(ex.part_brand ?? '');
          setPartModel(ex.part_model ?? '');
          if (ex.payment_method && ex.payment_method !== 'carteira') setPaymentMethod(ex.payment_method);
          if (ex.payment_method === 'cartao') {
            setCardDetails({
              brand: ex.card_brand ?? '',
              operator: ex.card_operator ?? '',
              installments: ex.installment_total ?? 1,
              firstMonth: String(ex.occurred_at).slice(0, 7),
            });
          }
          setIsFullTank(ex.is_full_tank ?? true);
          setLifeTouched(true);
        }
      });
    }
  }, [cat, editId, isEdit]);

  // sugestão automática de vida útil a partir do nome da peça
  useEffect(() => {
    if (cat !== 'manutencao' || lifeTouched) return;
    setLifeKm(suggestLife(title));
  }, [title, cat, lifeTouched]);

  // histórico da mesma peça/serviço
  useEffect(() => {
    if (cat !== 'manutencao' || title.trim().length < 3) {
      setPartHistory([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('expenses')
        .select('id, title, amount, odometer_km, occurred_at')
        .eq('category', 'manutencao')
        .ilike('title', title.trim())
        .order('occurred_at', { ascending: false })
        .limit(6);
      setPartHistory((data ?? []).filter((d: any) => d.id !== editId));
    }, 350);
    return () => clearTimeout(t);
  }, [title, cat, editId]);

  const historyWithDelta = useMemo(
    () =>
      partHistory.map((h, i) => {
        const prev = partHistory[i + 1];
        const delta =
          prev && h.odometer_km != null && prev.odometer_km != null
            ? Number(h.odometer_km) - Number(prev.odometer_km)
            : null;
        return { ...h, delta };
      }),
    [partHistory],
  );

  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    if (cat !== 'combustivel') return;
    const p = Number(val.replace(',', '.')) || 0;
    const l = Number(liters.replace(',', '.')) || 0;
    const a = Number(amount.replace(',', '.')) || 0;
    if (p > 0 && l > 0) setAmount((p * l).toFixed(2).replace('.', ','));
    else if (p > 0 && a > 0) setLiters((a / p).toFixed(2).replace('.', ','));
  };

  const handleLitersChange = (val: string) => {
    setLiters(val);
    if (cat !== 'combustivel') return;
    const l = Number(val.replace(',', '.')) || 0;
    const p = Number(pricePerLiter.replace(',', '.')) || 0;
    const a = Number(amount.replace(',', '.')) || 0;
    if (l > 0 && p > 0) setAmount((p * l).toFixed(2).replace('.', ','));
    else if (l > 0 && a > 0) setPricePerLiter((a / l).toFixed(2).replace('.', ','));
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    if (cat !== 'combustivel') return;
    const a = Number(val.replace(',', '.')) || 0;
    const p = Number(pricePerLiter.replace(',', '.')) || 0;
    const l = Number(liters.replace(',', '.')) || 0;
    if (a > 0 && p > 0) setLiters((a / p).toFixed(2).replace('.', ','));
    else if (a > 0 && l > 0) setPricePerLiter((a / l).toFixed(2).replace('.', ','));
  };

  const selectedStation = gasStations.find(g => g.name === vendor);
  const availableFuels = selectedStation?.fuel_types && selectedStation.fuel_types.length > 0
    ? selectedStation.fuel_types
    : allFuelTypes;

  const selectPayment = (m: 'pix' | 'cartao' | 'dinheiro') => {
    setPaymentMethod(m);
    if (m === 'cartao') setCardDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return;
    }
    const final = Number(amount.replace(',', '.')) || 0;
    const odo = Number(odometer.replace(',', '.')) || null;
    const occurred = new Date(when);

    const payload: any = {
      user_id: u.user.id,
      category: cat,
      title: title || titles[cat].defaultTitle,
      vendor: vendor || null,
      amount: final,
      liters: cat === 'combustivel' ? Number(liters.replace(',', '.')) || null : null,
      fuel_type: cat === 'combustivel' ? fuelType : null,
      price_per_liter: cat === 'combustivel' ? Number(pricePerLiter.replace(',', '.')) || null : null,
      odometer_km: cat === 'alimentacao' ? null : odo,
      description: description || null,
      payment_method: paymentMethod,
      occurred_at: occurred.toISOString(),
      card_brand: paymentMethod === 'cartao' ? cardDetails?.brand || null : null,
      card_operator: paymentMethod === 'cartao' ? cardDetails?.operator || null : null,
    };

    if (cat === 'combustivel') {
      payload.receipt_number = receiptNumber || null;
      payload.is_full_tank = isFullTank;
    }

    if (cat === 'manutencao') {
      payload.invoice_number = invoiceNumber || null;
      payload.part_brand = partBrand || null;
      payload.part_model = partModel || null;
    }

    let error;
    if (isEdit) {
      const res = await supabase.from('expenses').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const total = paymentMethod === 'cartao' ? Math.max(1, cardDetails?.installments ?? 1) : 1;
      if (total > 1) {
        const groupId = crypto.randomUUID();
        const [fy, fm] = (cardDetails?.firstMonth ?? occurred.toISOString().slice(0, 7))
          .split('-')
          .map(Number);
        const rows = Array.from({ length: total }, (_, i) => {
          const d = new Date(fy, fm - 1 + i, occurred.getDate(), occurred.getHours(), occurred.getMinutes());
          return {
            ...payload,
            occurred_at: d.toISOString(),
            amount: Number((final / total).toFixed(2)),
            installment_group_id: groupId,
            installment_number: i + 1,
            installment_total: total,
            title: `${payload.title} (Parcela ${i + 1}/${total})`,
          };
        });
        const res = await supabase.from('expenses').insert(rows);
        error = res.error;
      } else {
        const res = await supabase.from('expenses').insert(payload);
        error = res.error;
      }
    }

    // registra/atualiza controle de vida útil da peça
    if (!error && cat === 'manutencao' && Number(lifeKm) > 0 && title.trim()) {
      const { error: pmErr } = await supabase.from('part_maintenance' as any).upsert(
        {
          user_id: u.user.id,
          part_name: title.trim(),
          life_km: Number(lifeKm),
          last_change_km: odo ?? 0,
          last_change_at: occurred.toISOString(),
        } as any,
        { onConflict: 'user_id,part_name' },
      );
      if (pmErr) console.error(pmErr);
    }

    if (cat === 'manutencao' && vendor) localStorage.setItem('lastCompany', vendor);

    setLoading(false);
    if (error) return (console.error(error), toast.error("Erro ao salvar. Tente novamente."));
    toast.success(isEdit ? 'Despesa atualizada!' : 'Despesa registrada!');
    navigate(isEdit ? '/historico' : '/');
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Deseja realmente excluir esta despesa?')) return;
    setDeleting(true);
    const { error } = await supabase.from('expenses').delete().eq('id', editId);
    setDeleting(false);
    if (error) return (console.error(error), toast.error("Erro ao salvar. Tente novamente."));
    toast.success('Despesa excluída!');
    navigate('/historico');
  };

  return (
    <AppShell back title={isEdit ? `EDITAR ${titles[cat].defaultTitle.toUpperCase()}` : titles[cat].title}>
      <form onSubmit={submit}>
        <FormShell footer={
          <div className="flex flex-col gap-2 w-full">
            <SubmitButton loading={loading}>{isEdit ? 'SALVAR ALTERAÇÕES' : 'SALVAR DESPESA'}</SubmitButton>
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full h-14 rounded-xl border border-destructive/40 text-destructive font-black tracking-wide flex items-center justify-center gap-2 bg-surface hover:bg-destructive/10 transition active:scale-[0.98]"
              >
                <Trash2 className="size-5" />
                {deleting ? 'EXCLUINDO...' : 'EXCLUIR DESPESA'}
              </button>
            )}
          </div>
        }>

          {cat === 'combustivel' ? (
            <Field label="Posto de abastecimento">
              <div className="flex gap-2">
                <Select value={vendor} onChange={(e) => {
                  setVendor(e.target.value);
                  const st = gasStations.find(x => x.name === e.target.value);
                  if (st && st.fuel_types && st.fuel_types.length > 0) {
                    if (!st.fuel_types.includes(fuelType)) {
                      setFuelType(st.fuel_types[0]);
                    }
                  }
                }}>
                  <option value="">Selecione o Posto</option>
                  {gasStations.map(g => (
                    <option key={g.id} value={g.name}>{g.name} ({g.brand})</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => navigate('/posto/novo')}
                  className="size-12 shrink-0 grid place-items-center rounded-xl bg-surface-high text-primary border border-border/40"
                  aria-label="Novo posto"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </Field>
          ) : cat === 'manutencao' ? (
            <Field label="Empresa">
              <QuickCombobox
                table="companies"
                value={vendor}
                onChange={setVendor}
                rememberKey="lastCompany"
                placeholder="Selecione a empresa"
              />
            </Field>
          ) : (
            <Field label="Nome do local">
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Ex: Restaurante do Silva" />
            </Field>
          )}

          {cat !== 'combustivel' && (
            <Field label={cat === 'manutencao' ? 'Peça/Serviço' : 'O que foi comprado'}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={cat === 'manutencao' ? 'Ex: Troca de óleo' : 'Ex: Almoço, lanche…'} />
            </Field>
          )}

          {cat === 'combustivel' && (
            <>
              <Field label="Tipo de combustível">
                <Select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  {availableFuels.map((f: string) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço/Litro">
                  <Input inputMode="decimal" value={pricePerLiter} onChange={(e) => handlePriceChange(e.target.value)} placeholder="Ex: 5,89" />
                </Field>
                <Field label="Litros">
                  <Input inputMode="decimal" value={liters} onChange={(e) => handleLitersChange(e.target.value)} placeholder="Ex: 20,0" />
                </Field>
              </div>
            </>
          )}

          {cat !== 'alimentacao' && (
            <Field label="Odômetro (km)">
              <Input inputMode="decimal" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Ex: 125450" />
            </Field>
          )}

          {cat === 'combustivel' && (
            <Field label="Completou o tanque?">
              <div className="grid grid-cols-2 gap-2">
                <SegButton active={isFullTank} onClick={() => setIsFullTank(true)}>
                  SIM, TANQUE CHEIO
                </SegButton>
                <SegButton active={!isFullTank} onClick={() => setIsFullTank(false)}>
                  NÃO, PARCIAL
                </SegButton>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Informe corretamente — o cálculo de <strong>km/L real</strong> usa o método tanque-a-tanque entre dois abastecimentos completos.
              </p>
            </Field>
          )}

          {cat === 'manutencao' && (
            <>
              <Field label="Vida útil (km)">
                <Input
                  inputMode="decimal"
                  value={lifeKm}
                  onChange={(e) => {
                    setLifeTouched(true);
                    setLifeKm(e.target.value);
                  }}
                  placeholder="Ex: 10000"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Sugerido automaticamente pelo tipo de peça — você pode ajustar. Avisamos quando faltar 10% para o limite.
                </p>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca da peça">
                  <Input value={partBrand} onChange={(e) => setPartBrand(e.target.value)} placeholder="Ex: Bosch" />
                </Field>
                <Field label="Modelo">
                  <Input value={partModel} onChange={(e) => setPartModel(e.target.value)} placeholder="Ex: 428H" />
                </Field>
              </div>

              <Field label="Nota Fiscal">
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Nº da nota fiscal" />
              </Field>

              {historyWithDelta.length > 0 && (
                <section className="rounded-xl bg-surface-high p-4">
                  <h3 className="flex items-center gap-2 text-xs label-up text-muted-foreground">
                    <History className="size-4" /> Histórico desta peça
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {historyWithDelta.map((h) => (
                      <li key={h.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {new Date(h.occurred_at).toLocaleDateString('pt-BR')}
                          {h.odometer_km != null ? ` • ${Math.round(Number(h.odometer_km))} km` : ''}
                        </span>
                        <span className="font-bold">
                          {h.delta != null ? `+${Math.round(h.delta)} km rodados` : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          <Field label="Valor total pago">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Ex: 0,00"
              className={cat === 'combustivel' ? 'border-2 !border-primary text-primary font-black' : ''}
              required
            />
          </Field>

          <Field label="Data e hora">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          </Field>

          {cat === 'combustivel' && (
            <>
              <Field label="Cupom Fiscal (Opcional)">
                <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Nº do cupom ou chave de acesso" />
              </Field>
              <Field label="Observação (Opcional)">
                <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Alguma anotação sobre o abastecimento?" />
              </Field>
            </>
          )}

          {cat === 'alimentacao' && (
            <Field label="O que foi comprado"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva os itens consumidos…" /></Field>
          )}

          {cat === 'manutencao' && (
            <Field label="Observação"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notas adicionais sobre a manutenção…" /></Field>
          )}

          <Field label="Forma de pagamento">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={paymentMethod === 'pix'} onClick={() => selectPayment('pix')}><span className="flex flex-col items-center gap-1"><QrCode className="size-4" />PIX</span></SegButton>
              <SegButton active={paymentMethod === 'cartao'} onClick={() => selectPayment('cartao')}><span className="flex flex-col items-center gap-1"><CreditCard className="size-4" />Cartão</span></SegButton>
              <SegButton active={paymentMethod === 'dinheiro'} onClick={() => selectPayment('dinheiro')}><span className="flex flex-col items-center gap-1"><Banknote className="size-4" />Dinheiro</span></SegButton>
            </div>
            {paymentMethod === 'cartao' && (
              <button
                type="button"
                onClick={() => setCardDialogOpen(true)}
                className="mt-2 w-full text-left text-xs text-muted-foreground underline"
              >
                {cardDetails
                  ? `${cardDetails.brand || 'Bandeira'} • ${cardDetails.operator || 'Operadora'} • ${
                      cardDetails.installments > 1 ? `${cardDetails.installments}x` : 'À vista'
                    } — editar`
                  : 'Informar dados do cartão'}
              </button>
            )}
          </Field>
        </FormShell>
      </form>

      <CardPaymentDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        value={cardDetails}
        onConfirm={setCardDetails}
      />
    </AppShell>
  );
};

export default Despesa;
