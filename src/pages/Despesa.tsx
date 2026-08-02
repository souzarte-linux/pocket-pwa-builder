import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, SegButton, SubmitButton, FormShell, Select } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/QuickCombobox';
import { CardPaymentDialog, CardDetails } from '@/components/CardPaymentDialog';
import { DeleteInstallmentDialog } from '@/components/forms/DeleteInstallmentDialog';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, parseCurrencyInput, toLocalInput } from '@/lib/format';
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

/** Helper to calculate valid YYYY-MM-DD due date for a specific year, month, and due day */
const calculateCardDueDate = (year: number, monthIndex0: number, dueDay: number): string => {
  // Max days in the target month
  const maxDays = new Date(year, monthIndex0 + 1, 0).getDate();
  const safeDay = Math.min(dueDay, maxDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(monthIndex0 + 1)}-${pad(safeDay)}`;
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

  // Amount states: raw float for calculations vs formatted display string (R$ 0,00)
  const [amountNum, setAmountNum] = useState<number>(0);
  const [amountDisplay, setAmountDisplay] = useState<string>('');

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
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [installmentGroupId, setInstallmentGroupId] = useState<string | null>(null);
  const [deleteInstallmentOpen, setDeleteInstallmentOpen] = useState(false);
  const [isFullTank, setIsFullTank] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [gasStations, setGasStations] = useState<any[]>([]);
  const [partHistory, setPartHistory] = useState<any[]>([]);

  useEffect(() => {
    if (cat === 'combustivel') {
      supabase
        .from('gas_stations')
        .select('*')
        .order('name')
        .then(({ data }) => {
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
          setInstallmentGroupId(ex.installment_group_id ?? null);

          const val = Number(ex.amount ?? 0);
          setAmountNum(val);
          setAmountDisplay(val > 0 ? formatBRL(val) : '');

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
              cardDueDay: ex.card_due_day ?? null,
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

  // Bi-directional calculations for fuel category
  const handlePriceChange = (val: string) => {
    setPricePerLiter(val);
    if (cat !== 'combustivel') return;
    const p = Number(val.replace(',', '.')) || 0;
    const l = Number(liters.replace(',', '.')) || 0;
    const a = amountNum;
    if (p > 0 && l > 0) {
      const calcVal = Number((p * l).toFixed(2));
      setAmountNum(calcVal);
      setAmountDisplay(formatBRL(calcVal));
    } else if (p > 0 && a > 0) {
      setLiters((a / p).toFixed(2).replace('.', ','));
    }
  };

  const handleLitersChange = (val: string) => {
    setLiters(val);
    if (cat !== 'combustivel') return;
    const l = Number(val.replace(',', '.')) || 0;
    const p = Number(pricePerLiter.replace(',', '.')) || 0;
    const a = amountNum;
    if (l > 0 && p > 0) {
      const calcVal = Number((p * l).toFixed(2));
      setAmountNum(calcVal);
      setAmountDisplay(formatBRL(calcVal));
    } else if (l > 0 && a > 0) {
      setPricePerLiter((a / l).toFixed(2).replace('.', ','));
    }
  };

  // Live Currency Input Mask (centavos typing style)
  const handleAmountInputChange = (val: string) => {
    const parsed = parseCurrencyInput(val);
    setAmountDisplay(parsed.display);
    setAmountNum(parsed.numeric);

    if (cat !== 'combustivel') return;
    const a = parsed.numeric;
    const p = Number(pricePerLiter.replace(',', '.')) || 0;
    const l = Number(liters.replace(',', '.')) || 0;
    if (a > 0 && p > 0) setLiters((a / p).toFixed(2).replace('.', ','));
    else if (a > 0 && l > 0) setPricePerLiter((a / l).toFixed(2).replace('.', ','));
  };

  const selectedStation = gasStations.find((g) => g.name === vendor);
  const availableFuels =
    selectedStation?.fuel_types && selectedStation.fuel_types.length > 0
      ? selectedStation.fuel_types
      : allFuelTypes;

  const selectPayment = (m: 'pix' | 'cartao' | 'dinheiro') => {
    setPaymentMethod(m);
    if (m === 'cartao') setCardDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error('Usuário não autenticado.');
        setLoading(false);
        return;
      }
      const final = amountNum;
      if (!final || final <= 0) {
        toast.error('Informe o valor total pago.');
        setLoading(false);
        return;
      }

      const odo = Number(odometer.replace(',', '.')) || null;
      const occurred = new Date(when);

      const dueDay = paymentMethod === 'cartao' && cardDetails?.cardDueDay ? cardDetails.cardDueDay : null;
      let initialDueDate: string | null = null;
      if (dueDay) {
        initialDueDate = calculateCardDueDate(occurred.getFullYear(), occurred.getMonth(), dueDay);
      }

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
        card_due_day: dueDay,
        card_due_date: initialDueDate,
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

      const attemptSave = async (p: any) => {
        if (isEdit) {
          return await supabase.from('expenses').update(p).eq('id', editId);
        } else {
          const total = paymentMethod === 'cartao' ? Math.max(1, cardDetails?.installments ?? 1) : 1;
          if (total > 1) {
            const groupId = crypto.randomUUID();
            const [fy, fm] = (cardDetails?.firstMonth ?? occurred.toISOString().slice(0, 7))
              .split('-')
              .map(Number);

            const rows = Array.from({ length: total }, (_, i) => {
              const d = new Date(fy, fm - 1 + i, occurred.getDate(), occurred.getHours(), occurred.getMinutes());
              let instDueDate: string | null = null;
              if (dueDay) {
                instDueDate = calculateCardDueDate(fy, fm - 1 + i, dueDay);
              }
              const row: any = {
                ...p,
                occurred_at: d.toISOString(),
                amount: Number((final / total).toFixed(2)),
                title: `${p.title} (Parcela ${i + 1}/${total})`,
              };
              if (p.card_due_day !== undefined && dueDay) {
                row.card_due_day = dueDay;
              }
              if (p.card_due_date !== undefined && dueDay) {
                row.card_due_date = instDueDate;
              }
              if (p.card_brand !== undefined) {
                row.installment_group_id = groupId;
                row.installment_number = i + 1;
                row.installment_total = total;
              }
              return row;
            });
            return await supabase.from('expenses').insert(rows);
          } else {
            return await supabase.from('expenses').insert(p);
          }
        }
      };

      let { error } = await attemptSave(payload);

      // Fallback: If remote DB lacks extended columns (card_due_day, invoice_number, part_brand, etc.), retry with core payload
      if (
        error &&
        (error.code === 'PGRST204' ||
          error.message?.toLowerCase().includes('column') ||
          error.message?.toLowerCase().includes('schema cache'))
      ) {
        console.warn('Extended columns not present in expenses table, retrying with core payload:', error);
        const corePayload: any = {
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
        };
        if (cat === 'combustivel') {
          corePayload.receipt_number = receiptNumber || null;
          corePayload.is_full_tank = isFullTank;
        }
        const retryRes = await attemptSave(corePayload);
        error = retryRes.error;
      }

      // registra/atualiza controle de vida útil da peça se manutenção
      if (!error && cat === 'manutencao' && Number(lifeKm) > 0 && title.trim()) {
        try {
          await supabase.from('part_maintenance' as any).upsert(
            {
              user_id: u.user.id,
              part_name: title.trim(),
              life_km: Number(lifeKm),
              last_change_km: odo ?? 0,
              last_change_at: occurred.toISOString(),
            } as any,
            { onConflict: 'user_id,part_name' },
          );
        } catch (e) {
          console.error(e);
        }
      }

      if (cat === 'manutencao' && vendor) localStorage.setItem('lastCompany', vendor);

      setLoading(false);

      if (error) {
        console.error('Error saving expense:', error);
        toast.error(`Erro ao salvar despesa: ${error.message || 'Tente novamente.'}`);
        return;
      }

      toast.success(isEdit ? 'Despesa atualizada!' : 'Despesa registrada!');
      navigate(isEdit ? '/historico' : '/');
    } catch (err: any) {
      console.error('Unexpected error saving expense:', err);
      setLoading(false);
      toast.error(`Erro ao salvar: ${err.message || 'Tente novamente.'}`);
    }
  };

  const handleDelete = async () => {
    if (!editId) return;

    if (installmentGroupId) {
      setDeleteInstallmentOpen(true);
      return;
    }

    if (!confirm('Deseja realmente excluir esta despesa?')) return;
    setDeleting(true);
    const { error } = await supabase.from('expenses').delete().eq('id', editId);
    setDeleting(false);
    if (error) return (console.error(error), toast.error('Erro ao excluir despesa.'));
    toast.success('Despesa excluída!');
    navigate('/historico');
  };

  return (
    <AppShell back title={isEdit ? `EDITAR ${titles[cat].defaultTitle.toUpperCase()}` : titles[cat].title}>
      <form onSubmit={submit}>
        <FormShell
          footer={
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
          }
        >
          {cat === 'combustivel' ? (
            <Field label="Posto de abastecimento">
              <div className="flex gap-2">
                <Select
                  value={vendor}
                  onChange={(e) => {
                    setVendor(e.target.value);
                    const st = gasStations.find((x) => x.name === e.target.value);
                    if (st && st.fuel_types && st.fuel_types.length > 0) {
                      if (!st.fuel_types.includes(fuelType)) setFuelType(st.fuel_types[0]);
                    }
                  }}
                >
                  <option value="">Selecione o Posto</option>
                  {gasStations.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.brand})
                    </option>
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
          ) : (
            <Field label={cat === 'manutencao' ? 'Empresa' : 'Nome do local'}>
              {cat === 'manutencao' ? (
                <QuickCombobox
                  table="companies"
                  value={vendor}
                  onChange={setVendor}
                  rememberKey="lastCompany"
                  placeholder="Selecione ou digite a empresa"
                />
              ) : (
                <Input
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Ex: Restaurante do Silva"
                />
              )}
            </Field>
          )}

          {cat !== 'combustivel' && (
            <Field label={cat === 'manutencao' ? 'Peça/Serviço' : 'O que foi comprado'}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={cat === 'manutencao' ? 'Ex: Troca de óleo, pastilha de freio' : 'Ex: Almoço, lanche…'}
              />
            </Field>
          )}

          {cat === 'manutencao' && historyWithDelta.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-surface p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase">
                <History className="size-3.5 text-primary" />
                Histórico desta peça/serviço
              </div>
              <ul className="divide-y divide-border/20 text-xs">
                {historyWithDelta.map((h) => (
                  <li key={h.id} className="py-1.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground">
                        {new Date(h.occurred_at).toLocaleDateString('pt-BR')}
                      </span>
                      {h.odometer_km != null && (
                        <span className="text-muted-foreground ml-2">
                          ({Number(h.odometer_km).toLocaleString('pt-BR')} km)
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">R$ {Number(h.amount).toFixed(2)}</span>
                      {h.delta != null && (
                        <span className="block text-[10px] text-muted-foreground">
                          +{h.delta.toLocaleString('pt-BR')} km desde a anterior
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cat === 'combustivel' && (
            <>
              <Field label="Tipo de combustível">
                <Select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  {availableFuels.map((f: string) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço/Litro">
                  <Input
                    inputMode="decimal"
                    value={pricePerLiter}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="Ex: 5,89"
                  />
                </Field>
                <Field label="Litros">
                  <Input
                    inputMode="decimal"
                    value={liters}
                    onChange={(e) => handleLitersChange(e.target.value)}
                    placeholder="Ex: 20,0"
                  />
                </Field>
              </div>
            </>
          )}

          {cat !== 'alimentacao' && (
            <Field label="Odômetro (km)">
              <Input
                inputMode="decimal"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="Ex: 125450"
              />
            </Field>
          )}

          {cat === 'manutencao' && (
            <>
              <Field label="Vida útil (km)">
                <Input
                  inputMode="decimal"
                  value={lifeKm}
                  onChange={(e) => {
                    setLifeKm(e.target.value);
                    setLifeTouched(true);
                  }}
                  placeholder="Ex: 3000 (dispara alerta ao atingir 90%)"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca da peça">
                  <Input value={partBrand} onChange={(e) => setPartBrand(e.target.value)} placeholder="Ex: Mobil, Cobreq" />
                </Field>
                <Field label="Modelo da peça">
                  <Input value={partModel} onChange={(e) => setPartModel(e.target.value)} placeholder="Ex: Super 20w50" />
                </Field>
              </div>

              <Field label="Nota Fiscal">
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Nº da NF ou recibo" />
              </Field>
            </>
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

          {/* Valor Total Pago with Live R$ Currency Mask */}
          <Field label="Valor total pago">
            <Input
              inputMode="numeric"
              value={amountDisplay}
              onChange={(e) => handleAmountInputChange(e.target.value)}
              placeholder="R$ 0,00"
              className={cat === 'combustivel' ? 'border-2 !border-primary text-primary font-black' : ''}
              required
            />
          </Field>

          <Field label="Data e Hora">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          </Field>

          {cat === 'combustivel' && (
            <Field label="Cupom Fiscal (Opcional)">
              <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Nº do cupom ou chave de acesso" />
            </Field>
          )}

          <Field label="Observação (Opcional)">
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                cat === 'alimentacao'
                  ? 'Descreva os itens consumidos…'
                  : cat === 'manutencao'
                  ? 'Notas adicionais sobre a manutenção…'
                  : 'Alguma anotação sobre o abastecimento?'
              }
            />
          </Field>

          <Field label="Forma de pagamento">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={paymentMethod === 'pix'} onClick={() => selectPayment('pix')}>
                <span className="flex flex-col items-center gap-1">
                  <QrCode className="size-4" />
                  PIX
                </span>
              </SegButton>
              <SegButton active={paymentMethod === 'cartao'} onClick={() => selectPayment('cartao')}>
                <span className="flex flex-col items-center gap-1">
                  <CreditCard className="size-4" />
                  Cartão
                </span>
              </SegButton>
              <SegButton active={paymentMethod === 'dinheiro'} onClick={() => selectPayment('dinheiro')}>
                <span className="flex flex-col items-center gap-1">
                  <Banknote className="size-4" />
                  Dinheiro
                </span>
              </SegButton>
            </div>
            {paymentMethod === 'cartao' && cardDetails && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between bg-surface p-2.5 rounded-lg border border-border/40">
                <div>
                  <span className="font-bold text-foreground">
                    {cardDetails.brand || 'Cartão'} {cardDetails.operator && `• ${cardDetails.operator}`}{' '}
                    {cardDetails.installments > 1 && `(${cardDetails.installments}x)`}
                  </span>
                  {cardDetails.cardDueDay && (
                    <span className="block text-[11px] text-muted-foreground">
                      Vencimento fatura: Dia {cardDetails.cardDueDay}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => setCardDialogOpen(true)} className="text-primary font-bold">
                  Editar
                </button>
              </div>
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

      {editId && installmentGroupId && (
        <DeleteInstallmentDialog
          open={deleteInstallmentOpen}
          onOpenChange={setDeleteInstallmentOpen}
          currentExpenseId={editId}
          installmentGroupId={installmentGroupId}
          onDeleted={() => navigate('/historico')}
        />
      )}
    </AppShell>
  );
};

export default Despesa;
