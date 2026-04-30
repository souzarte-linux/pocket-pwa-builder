import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, TextArea, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, Wallet } from 'lucide-react';

type Cat = 'combustivel' | 'manutencao' | 'alimentacao';

const titles: Record<Cat, { title: string; defaultTitle: string }> = {
  combustivel: { title: 'NOVO ABASTECIMENTO', defaultTitle: 'Abastecimento' },
  manutencao: { title: 'LANÇAR MANUTENÇÃO', defaultTitle: 'Manutenção' },
  alimentacao: { title: 'LANÇAMENTO DE ALIMENTAÇÃO', defaultTitle: 'Refeição' },
};

const Despesa = () => {
  const { categoria } = useParams<{ categoria: Cat }>();
  const cat = (categoria ?? 'combustivel') as Cat;
  const navigate = useNavigate();

  const [vendor, setVendor] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina Comum');
  const [odometer, setOdometer] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao' | 'dinheiro' | 'carteira'>('pix');
  const [loading, setLoading] = useState(false);

  // Auto compute total for fuel
  const computedTotal =
    cat === 'combustivel' && liters && pricePerLiter
      ? (Number(liters.replace(',', '.')) * Number(pricePerLiter.replace(',', '.'))).toFixed(2)
      : amount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const final = Number(String(computedTotal).replace(',', '.')) || 0;
    const { error } = await supabase.from('expenses').insert({
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
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Despesa registrada!');
    navigate('/');
  };

  return (
    <AppShell back title={titles[cat].title}>
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>SALVAR DESPESA</SubmitButton>}>
          <Field label={cat === 'combustivel' ? 'Posto de abastecimento' : cat === 'manutencao' ? 'Oficina mecânica' : 'Nome do local'}>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={cat === 'alimentacao' ? 'Ex: Restaurante do Silva' : 'Selecione…'} />
          </Field>

          {cat !== 'combustivel' && (
            <Field label={cat === 'manutencao' ? 'Peça/Serviço' : 'O que foi comprado'}>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={cat === 'manutencao' ? 'Ex: Troca de óleo' : 'Almoço, lanche…'} />
            </Field>
          )}

          {cat === 'combustivel' && (
            <>
              <Field label="Tipo de combustível">
                <Input value={fuelType} onChange={(e) => setFuelType(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço/Litro"><Input inputMode="decimal" value={pricePerLiter} onChange={(e) => setPricePerLiter(e.target.value)} placeholder="5,89" /></Field>
                <Field label="Litros"><Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="20.00" /></Field>
              </div>
              <Field label="Odômetro (km)"><Input inputMode="decimal" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="125450" /></Field>
            </>
          )}

          <Field label="Valor total pago">
            <Input
              inputMode="decimal"
              value={cat === 'combustivel' ? String(computedTotal) : amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              readOnly={cat === 'combustivel' && !!liters && !!pricePerLiter}
              className={cat === 'combustivel' ? 'border-2 !border-primary' : ''}
            />
          </Field>

          <Field label="Data"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>

          {cat === 'alimentacao' && (
            <Field label="O que foi comprado"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva os itens consumidos…" /></Field>
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
