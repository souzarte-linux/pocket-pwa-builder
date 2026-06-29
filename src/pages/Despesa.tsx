import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, SegButton, SubmitButton, FormShell, Select } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, Wallet, Plus, Trash2 } from 'lucide-react';

type Cat = 'combustivel' | 'manutencao' | 'alimentacao';

const titles: Record<Cat, { title: string; defaultTitle: string }> = {
  combustivel: { title: 'NOVO ABASTECIMENTO', defaultTitle: 'Abastecimento' },
  manutencao: { title: 'LANÇAR MANUTENÇÃO', defaultTitle: 'Manutenção' },
  alimentacao: { title: 'LANÇAMENTO DE ALIMENTAÇÃO', defaultTitle: 'Refeição' },
};

const allFuelTypes = ['Etanol', 'Gasolina Comum', 'Gasolina Aditivada', 'GNV', 'Diesel'];

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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'carteira'>('pix');
  const [isFullTank, setIsFullTank] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [gasStations, setGasStations] = useState<any[]>([]);

  useEffect(() => {
    if (cat === 'combustivel') {
      supabase.from('gas_stations').select('*').order('name').then(({ data }) => {
        setGasStations(data ?? []);
      });
    }

    if (editId) {
      supabase.from('expenses').select('*').eq('id', editId).maybeSingle().then(({ data: e }) => {
        if (e) {
          setVendor(e.vendor ?? '');
          setTitle(e.title ?? '');
          setAmount(String(e.amount ?? ''));
          setLiters(String(e.liters ?? ''));
          setPricePerLiter(String(e.price_per_liter ?? ''));
          if (e.fuel_type) setFuelType(e.fuel_type);
          setOdometer(String(e.odometer_km ?? ''));
          setDate(new Date(e.occurred_at).toISOString().slice(0, 10));
          setDescription(e.description ?? '');
          setReceiptNumber(e.receipt_number ?? '');
          if (e.payment_method) setPaymentMethod(e.payment_method as any);
          setIsFullTank(e.is_full_tank ?? true);
        }
      });
    }
  }, [cat, editId]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const final = Number(amount.replace(',', '.')) || 0;
    
    const payload: any = {
      user_id: u.user.id,
      category: cat,
      title: title || titles[cat].defaultTitle,
      vendor: vendor || null,
      amount: final,
      liters: cat === 'combustivel' ? Number(liters.replace(',', '.')) || null : null,
      fuel_type: cat === 'combustivel' ? fuelType : null,
      price_per_liter: cat === 'combustivel' ? Number(pricePerLiter.replace(',', '.')) || null : null,
      odometer_km: cat === 'combustivel' ? Number(odometer.replace(',', '.')) || null : null,
      description: description || null,
      payment_method: paymentMethod,
      occurred_at: new Date(date + 'T12:00:00').toISOString(),
    };

    if (cat === 'combustivel') {
      payload.receipt_number = receiptNumber || null;
      payload.is_full_tank = isFullTank;
      if (vendor) {
        payload.vendor = vendor;
      }
    }

    let error;
    if (isEdit) {
      const res = await supabase.from('expenses').update(payload).eq('id', editId);
      error = res.error;
    } else {
      const res = await supabase.from('expenses').insert(payload);
      error = res.error;
    }

    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? 'Despesa atualizada!' : 'Despesa registrada!');
    navigate(isEdit ? '/historico' : '/');
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Deseja realmente excluir esta despesa?')) return;
    setDeleting(true);
    const { error } = await supabase.from('expenses').delete().eq('id', editId);
    setDeleting(false);
    if (error) return toast.error(error.message);
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
          ) : (
            <Field label={cat === 'manutencao' ? 'Oficina mecânica' : 'Nome do local'}>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={cat === 'alimentacao' ? 'Ex: Restaurante do Silva' : cat === 'manutencao' ? 'Ex: Oficina do João' : 'Ex: Nome do estabelecimento...'} />
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
              <Field label="Odômetro (km)">
                <Input inputMode="decimal" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Ex: 125450" />
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

          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
            <div className="grid grid-cols-4 gap-2">
              <SegButton active={paymentMethod === 'pix'} onClick={() => setPaymentMethod('pix')}><span className="flex flex-col items-center gap-1"><QrCode className="size-4" />PIX</span></SegButton>
              <SegButton active={paymentMethod === 'cartao'} onClick={() => setPaymentMethod('cartao')}><span className="flex flex-col items-center gap-1"><CreditCard className="size-4" />Cartão</span></SegButton>
              <SegButton active={paymentMethod === 'dinheiro'} onClick={() => setPaymentMethod('dinheiro')}><span className="flex flex-col items-center gap-1"><Banknote className="size-4" />Dinheiro</span></SegButton>
              <SegButton active={paymentMethod === 'carteira'} onClick={() => setPaymentMethod('carteira')}><span className="flex flex-col items-center gap-1"><Wallet className="size-4" />Carteira</span></SegButton>
            </div>
          </Field>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default Despesa;
