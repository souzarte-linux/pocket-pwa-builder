import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, SegButton, SubmitButton, FormShell, Select } from '@/components/forms/Form';
import { QuickCombobox } from '@/components/forms/QuickCombobox';
import { CardPaymentDialog, CardDetails } from '@/components/forms/CardPaymentDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, Plus, Trash2 } from 'lucide-react';

type Cat = 'combustivel' | 'manutencao' | 'alimentacao';

const titles: Record<Cat, { title: string; defaultTitle: string }> = {
  combustivel: { title: 'NOVO ABASTECIMENTO', defaultTitle: 'Abastecimento' },
  manutencao: { title: 'LANÇAR MANUTENÇÃO', defaultTitle: 'Manutenção' },
  alimentacao: { title: 'LANÇAMENTO DE ALIMENTAÇÃO', defaultTitle: 'Refeição' },
};

const allFuelTypes = ['Etanol', 'Gasolina Comum', 'Gasolina Aditivada', 'GNV', 'Diesel'];

const PART_LIFE_SUGGESTIONS: Record<string, number> = {
  óleo: 3000,
  oleo: 3000,
  'troca de óleo': 3000,
  'troca de oleo': 3000,
  pastilha: 10000,
  'pastilha de freio': 10000,
  freio: 10000,
  relação: 20000,
  relacao: 20000,
  corrente: 20000,
  'kit relação': 20000,
  pneu: 25000,
  pneus: 25000,
  'filtro de ar': 10000,
  'filtro de óleo': 3000,
  'filtro de oleo': 3000,
  vela: 15000,
  'vela de ignição': 15000,
};

const DEFAULT_COMPANIES = ['Oficina do João', 'Auto Peças Silva', 'Mecânica Central', 'Concessionária'];

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

  // Date and Time inputs
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [time, setTime] = useState(now.toTimeString().slice(0, 5));

  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro'>('pix');
  const [isFullTank, setIsFullTank] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New maintenance fields
  const [partLifeKm, setPartLifeKm] = useState('');
  const [partBrand, setPartBrand] = useState('');
  const [partModel, setPartModel] = useState('');

  // Card details & modal
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);

  // Gas stations & Companies
  const [gasStations, setGasStations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES);

  useEffect(() => {
    if (cat === 'combustivel') {
      supabase
        .from('gas_stations')
        .select('*')
        .order('name')
        .then(({ data }) => {
          setGasStations(data ?? []);
        });
    } else if (cat === 'manutencao') {
      supabase
        .from('companies')
        .select('name')
        .order('name')
        .then(({ data }) => {
          if (data) {
            const dbCompanies = data.map((c) => c.name);
            setCompanies(Array.from(new Set([...DEFAULT_COMPANIES, ...dbCompanies])));
          }
        });
    }

    if (editId) {
      supabase
        .from('expenses')
        .select('*')
        .eq('id', editId)
        .maybeSingle()
        .then(({ data: e }) => {
          if (e) {
            setVendor(e.vendor ?? '');
            setTitle(e.title ?? '');
            setAmount(String(e.amount ?? ''));
            setLiters(String(e.liters ?? ''));
            setPricePerLiter(String(e.price_per_liter ?? ''));
            if (e.fuel_type) setFuelType(e.fuel_type);
            setOdometer(String(e.odometer_km ?? ''));

            if (e.occurred_at) {
              const dt = new Date(e.occurred_at);
              setDate(dt.toISOString().slice(0, 10));
              setTime(dt.toTimeString().slice(0, 5));
            }

            setDescription(e.description ?? '');
            setReceiptNumber(e.receipt_number ?? '');

            if (e.payment_method && e.payment_method !== 'carteira') {
              setPaymentMethod(e.payment_method as any);
            } else {
              setPaymentMethod('dinheiro');
            }

            setIsFullTank(e.is_full_tank ?? true);
            if (e.part_life_km) setPartLifeKm(String(e.part_life_km));
            if (e.part_brand) setPartBrand(e.part_brand);
            if (e.part_model) setPartModel(e.part_model);

            if (e.card_brand || e.card_operator) {
              setCardDetails({
                cardBrand: e.card_brand || '',
                cardOperator: e.card_operator || '',
                isInstallment: (e.installment_total ?? 1) > 1,
                installmentTotal: e.installment_total || 1,
                firstInstallmentDate: date,
              });
            }
          }
        });
    }
  }, [cat, editId]);

  // Handle title auto suggestion for part life km
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (cat === 'manutencao') {
      const lower = val.toLowerCase().trim();
      if (PART_LIFE_SUGGESTIONS[lower]) {
        setPartLifeKm(String(PART_LIFE_SUGGESTIONS[lower]));
      }
    }
  };

  const handleAddNewCompany = async (name: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from('companies').insert({
        user_id: u.user.id,
        name,
      });
    }
    setCompanies((prev) => Array.from(new Set([...prev, name])));
  };

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

  const selectedStation = gasStations.find((g) => g.name === vendor);
  const availableFuels =
    selectedStation?.fuel_types && selectedStation.fuel_types.length > 0
      ? selectedStation.fuel_types
      : allFuelTypes;

  const handleSelectPaymentMethod = (method: 'pix' | 'cartao' | 'dinheiro') => {
    setPaymentMethod(method);
    if (method === 'cartao') {
      setCardDialogOpen(true);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const finalAmount = Number(amount.replace(',', '.')) || 0;

    // Combine date and time
    const occurredAtIso = new Date(`${date}T${time || '12:00'}:00`).toISOString();

    const basePayload: any = {
      user_id: u.user.id,
      category: cat,
      title: title || titles[cat].defaultTitle,
      vendor: vendor || null,
      amount: finalAmount,
      liters: cat === 'combustivel' ? Number(liters.replace(',', '.')) || null : null,
      fuel_type: cat === 'combustivel' ? fuelType : null,
      price_per_liter: cat === 'combustivel' ? Number(pricePerLiter.replace(',', '.')) || null : null,
      odometer_km:
        cat === 'combustivel' || cat === 'manutencao'
          ? Number(odometer.replace(',', '.')) || null
          : null,
      description: description || null,
      payment_method: paymentMethod,
      occurred_at: occurredAtIso,
    };

    if (cat === 'combustivel') {
      basePayload.receipt_number = receiptNumber || null;
      basePayload.is_full_tank = isFullTank;
    } else if (cat === 'manutencao') {
      basePayload.receipt_number = receiptNumber || null;
      basePayload.part_life_km = Number(partLifeKm.replace(',', '.')) || null;
      basePayload.part_brand = partBrand || null;
      basePayload.part_model = partModel || null;
    }

    if (paymentMethod === 'cartao' && cardDetails) {
      basePayload.card_brand = cardDetails.cardBrand || null;
      basePayload.card_operator = cardDetails.cardOperator || null;
    }

    let mainError: any = null;

    // Check if card payment with multiple installments
    if (
      !isEdit &&
      paymentMethod === 'cartao' &&
      cardDetails?.isInstallment &&
      cardDetails.installmentTotal > 1
    ) {
      const totalInstallments = cardDetails.installmentTotal;
      const groupId = crypto.randomUUID();
      const perInstallmentAmount = Math.floor((finalAmount / totalInstallments) * 100) / 100;
      const firstInstallmentAmount =
        Math.round((finalAmount - perInstallmentAmount * (totalInstallments - 1)) * 100) / 100;

      const rowsToInsert = [];
      const baseDate = new Date(`${cardDetails.firstInstallmentDate}T${time || '12:00'}:00`);

      for (let i = 0; i < totalInstallments; i++) {
        const instDate = new Date(baseDate);
        instDate.setMonth(instDate.getMonth() + i);

        rowsToInsert.push({
          ...basePayload,
          title: `${title || titles[cat].defaultTitle} (${i + 1}/${totalInstallments})`,
          amount: i === 0 ? firstInstallmentAmount : perInstallmentAmount,
          installment_group_id: groupId,
          installment_number: i + 1,
          installment_total: totalInstallments,
          occurred_at: instDate.toISOString(),
        });
      }

      const res = await supabase.from('expenses').insert(rowsToInsert);
      mainError = res.error;
    } else {
      if (isEdit) {
        const res = await supabase.from('expenses').update(basePayload).eq('id', editId);
        mainError = res.error;
      } else {
        const res = await supabase.from('expenses').insert(basePayload);
        mainError = res.error;
      }
    }

    // Upsert into part_maintenance if maintenance with useful life & odometer
    if (!mainError && cat === 'manutencao' && title.trim() && odometer && partLifeKm) {
      const lifeKmNum = Number(partLifeKm.replace(',', '.')) || 0;
      const odoKmNum = Number(odometer.replace(',', '.')) || 0;

      if (lifeKmNum > 0 && odoKmNum > 0) {
        // Upsert by part_name
        const { data: existingPart } = await supabase
          .from('part_maintenance')
          .select('id')
          .eq('user_id', u.user.id)
          .ilike('part_name', title.trim())
          .maybeSingle();

        if (existingPart) {
          await supabase
            .from('part_maintenance')
            .update({
              life_km: lifeKmNum,
              last_change_km: odoKmNum,
              last_change_at: occurredAtIso,
            })
            .eq('id', existingPart.id);
        } else {
          await supabase.from('part_maintenance').insert({
            user_id: u.user.id,
            part_name: title.trim(),
            life_km: lifeKmNum,
            last_change_km: odoKmNum,
            last_change_at: occurredAtIso,
          });
        }
      }
    }

    setLoading(false);
    if (mainError) {
      console.error(mainError);
      return toast.error('Erro ao salvar despesa. Tente novamente.');
    }

    toast.success(isEdit ? 'Despesa atualizada!' : 'Despesa registrada!');
    navigate(isEdit ? '/historico' : '/');
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Deseja realmente excluir esta despesa?')) return;
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
              <SubmitButton loading={loading}>
                {isEdit ? 'SALVAR ALTERAÇÕES' : 'SALVAR DESPESA'}
              </SubmitButton>
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
                      if (!st.fuel_types.includes(fuelType)) {
                        setFuelType(st.fuel_types[0]);
                      }
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
          ) : cat === 'manutencao' ? (
            <Field label="Empresa">
              <QuickCombobox
                value={vendor}
                onChange={setVendor}
                options={companies}
                placeholder="Selecione ou busque a empresa..."
                searchPlaceholder="Buscar empresa..."
                addNewTitle="Cadastrar Nova Empresa"
                onAddNew={handleAddNewCompany}
                storageKey="last_company"
              />
            </Field>
          ) : (
            <Field label="Nome do local">
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Ex: Restaurante do Silva"
              />
            </Field>
          )}

          {cat !== 'combustivel' && (
            <Field label={cat === 'manutencao' ? 'Peça/Serviço' : 'O que foi comprado'}>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={cat === 'manutencao' ? 'Ex: Troca de óleo, Pastilha de freio…' : 'Ex: Almoço, lanche…'}
              />
            </Field>
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

              <Field label="Odômetro (km)">
                <Input
                  inputMode="decimal"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="Ex: 125450"
                />
              </Field>

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
            </>
          )}

          {/* Maintenance Hodometer and Useful Life fields */}
          {cat === 'manutencao' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Odômetro (km)">
                  <Input
                    inputMode="decimal"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    placeholder="Ex: 45200"
                  />
                </Field>
                <Field label="Vida útil (km)">
                  <Input
                    inputMode="decimal"
                    value={partLifeKm}
                    onChange={(e) => setPartLifeKm(e.target.value)}
                    placeholder="Ex: 3000"
                  />
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-3">
                * Sugestão preenchida automaticamente. Alerte sobre a próxima troca na Home/Painel.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Marca da Peça (Opcional)">
                  <Input
                    value={partBrand}
                    onChange={(e) => setPartBrand(e.target.value)}
                    placeholder="Ex: Mobil, Cobreq…"
                  />
                </Field>
                <Field label="Modelo (Opcional)">
                  <Input
                    value={partModel}
                    onChange={(e) => setPartModel(e.target.value)}
                    placeholder="Ex: Super 20w50"
                  />
                </Field>
              </div>
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Hora">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </Field>
          </div>

          {cat === 'combustivel' && (
            <>
              <Field label="Cupom Fiscal (Opcional)">
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Nº do cupom ou chave de acesso"
                />
              </Field>
              <Field label="Observação (Opcional)">
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Alguma anotação sobre o abastecimento?"
                />
              </Field>
            </>
          )}

          {cat === 'manutencao' && (
            <>
              <Field label="Nota Fiscal (Opcional)">
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Nº da nota fiscal ou recibo"
                />
              </Field>
              <Field label="Observação (Opcional)">
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas adicionais sobre a manutenção…"
                />
              </Field>
            </>
          )}

          {cat === 'alimentacao' && (
            <Field label="O que foi comprado">
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os itens consumidos…"
              />
            </Field>
          )}

          {/* Payment Method Selector (Pix, Cartão, Dinheiro) */}
          <Field label="Forma de pagamento">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={paymentMethod === 'pix'} onClick={() => handleSelectPaymentMethod('pix')}>
                <span className="flex flex-col items-center gap-1">
                  <QrCode className="size-4" />
                  PIX
                </span>
              </SegButton>
              <SegButton active={paymentMethod === 'cartao'} onClick={() => handleSelectPaymentMethod('cartao')}>
                <span className="flex flex-col items-center gap-1">
                  <CreditCard className="size-4" />
                  Cartão
                </span>
              </SegButton>
              <SegButton active={paymentMethod === 'dinheiro'} onClick={() => handleSelectPaymentMethod('dinheiro')}>
                <span className="flex flex-col items-center gap-1">
                  <Banknote className="size-4" />
                  Dinheiro
                </span>
              </SegButton>
            </div>
            {paymentMethod === 'cartao' && cardDetails && (
              <div className="mt-2.5 p-3 rounded-xl bg-surface-high border border-primary/20 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-primary uppercase">{cardDetails.cardBrand}</span> •{' '}
                  <span>{cardDetails.cardOperator}</span>
                  {cardDetails.isInstallment && (
                    <span className="ml-1 text-muted-foreground">
                      ({cardDetails.installmentTotal}x parcelado)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCardDialogOpen(true)}
                  className="text-primary font-bold underline"
                >
                  Alterar
                </button>
              </div>
            )}
          </Field>
        </FormShell>
      </form>

      {/* Card Details Dialog */}
      <CardPaymentDialog
        open={cardDialogOpen}
        onOpenChange={setCardDialogOpen}
        onConfirm={(details) => {
          setCardDetails(details);
          setPaymentMethod('cartao');
        }}
        initialData={cardDetails || undefined}
      />
    </AppShell>
  );
};

export default Despesa;
