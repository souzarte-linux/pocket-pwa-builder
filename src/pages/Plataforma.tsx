import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

type Cycle = 'semanal' | 'quinzenal' | 'mensal' | 'misto';
type Segment = 'logistica' | 'delivery';
type PaymentModel = 'producao' | 'diaria';
const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

// Cycle days for variable billing – stores day-of-month numbers
const parseCycleDays = (rules: any): number[] => {
  try {
    const d = Array.isArray(rules?.cycle_days) ? rules.cycle_days : JSON.parse(rules?.cycle_days ?? '[]');
    return d.filter((x: any) => typeof x === 'number');
  } catch { return []; }
};

const Plataforma = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'nova';

  const [name, setName] = useState('');
  const [cycle, setCycle] = useState<Cycle>('semanal');
  const [paymentDay, setPaymentDay] = useState('QUA');
  // Variable cycle: list of day-of-month numbers (1-28) when the cycle closes
  const [cycleDays, setCycleDays] = useState<number[]>([1, 16]);
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [pixType, setPixType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [segment, setSegment] = useState<Segment>('logistica');
  const [paymentModel, setPaymentModel] = useState<PaymentModel>('producao');
  const [loading, setLoading] = useState(false);

  const addCycleDay = () => setCycleDays(prev => [...prev, 1].sort((a, b) => a - b));
  const removeCycleDay = (idx: number) => setCycleDays(prev => prev.filter((_, i) => i !== idx));
  const updateCycleDay = (idx: number, val: number) => {
    const clamped = Math.max(1, Math.min(28, val));
    setCycleDays(prev => prev.map((d, i) => i === idx ? clamped : d).sort((a, b) => a - b));
  };

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('platforms').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setName(data.name); setCycle(data.cycle as Cycle);
      setPaymentDay(data.payment_day ?? 'QUA');
      const cd = parseCycleDays(data.rules);
      if (cd.length > 0) setCycleDays(cd);
      setBankName(data.bank_name ?? ''); setAgency(data.bank_agency ?? '');
      setAccount(data.bank_account ?? ''); setPixType(data.pix_key_type ?? 'CPF');
      setPixKey(data.pix_key ?? '');
      if (data.segment) setSegment(data.segment as Segment);
      if (data.payment_model) setPaymentModel(data.payment_model as PaymentModel);
    });
  }, [id, isEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id, name, cycle,
      payment_day: cycle === 'semanal' ? paymentDay : null,
      bank_name: bankName || null, bank_agency: agency || null,
      bank_account: account || null, pix_key_type: pixType, pix_key: pixKey || null, active: true,
      segment, payment_model: paymentModel,
      rules: cycle === 'misto' ? { cycle_days: cycleDays } : {},
    };
    const { error } = isEdit
      ? await supabase.from('platforms').update(payload).eq('id', id!)
      : await supabase.from('platforms').insert(payload);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? 'Plataforma atualizada!' : 'Plataforma vinculada!');
    navigate('/apps');
  };

  const remove = async () => {
    if (!isEdit) return;
    if (!confirm('Excluir esta plataforma?')) return;
    await supabase.from('platforms').delete().eq('id', id!);
    toast.success('Removida.');
    navigate('/apps');
  };

  return (
    <AppShell back title={isEdit ? 'EDITAR PLATAFORMA' : 'NOVA PLATAFORMA'} headerRight={
      isEdit ? (
        <button onClick={remove} className="size-10 grid place-items-center rounded-xl bg-destructive/15 text-destructive" aria-label="Excluir"><Trash2 className="size-5" /></button>
      ) : undefined
    }>
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>{isEdit ? 'SALVAR ALTERAÇÕES' : 'VINCULAR PLATAFORMA'}</SubmitButton>}>
          <Field label="Nome da plataforma">
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Digite o nome da plataforma" />
          </Field>

          <Field label="Segmento de Operação">
            <div className="grid grid-cols-2 gap-2">
              <SegButton active={segment === 'logistica'} onClick={() => setSegment('logistica')}>Logística</SegButton>
              <SegButton active={segment === 'delivery'} onClick={() => setSegment('delivery')}>Delivery</SegButton>
            </div>
          </Field>

          <Field label="Modelo de Pagamento">
            <div className="grid grid-cols-2 gap-2">
              <SegButton active={paymentModel === 'producao'} onClick={() => setPaymentModel('producao')}>Produção (Pacote)</SegButton>
              <SegButton active={paymentModel === 'diaria'} onClick={() => setPaymentModel('diaria')}>Diária (Fixo)</SegButton>
            </div>
          </Field>

          <Field label="Ciclo de pagamento">
            <div className="grid grid-cols-2 gap-2">
              {(['semanal', 'quinzenal', 'mensal', 'misto'] as Cycle[]).map((c) => (
                <SegButton key={c} active={cycle === c} onClick={() => setCycle(c)}>
                  {c === 'misto' ? 'VARIÁVEL' : c.toUpperCase()}
                </SegButton>
              ))}
            </div>
          </Field>

          {cycle === 'semanal' && (
            <Field label="Dia do pagamento (semanal)">
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPaymentDay(d)}
                    className={`h-11 rounded-lg text-xs font-bold transition ${paymentDay === d ? 'bg-primary text-primary-foreground' : 'bg-surface-high text-foreground'}`}
                  >{d}</button>
                ))}
              </div>
            </Field>
          )}

          {cycle === 'misto' && (
            <div className="rounded-2xl bg-surface border border-border/40 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="display text-base">Dias de corte do ciclo</h3>
                <button
                  type="button"
                  onClick={addCycleDay}
                  className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition"
                >
                  + Adicionar dia
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Informe em quais dias do mês o ciclo fecha (ex: dia 1 e dia 16 para quinzenal variável). O sistema gerará faturas automaticamente nestas datas.
              </p>
              <div className="space-y-2">
                {cycleDays.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-bold w-20">Dia do mês</span>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={day}
                      onChange={e => updateCycleDay(idx, Number(e.target.value))}
                      className="flex-1 h-12 px-4 rounded-xl bg-surface-high border border-border/40 focus:border-primary outline-none text-center font-black text-lg text-primary"
                    />
                    {cycleDays.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCycleDay(idx)}
                        className="size-10 grid place-items-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                      >
                        <span className="font-black text-lg">×</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wide">Prévia dos fechamentos</p>
                <p className="text-sm text-foreground mt-1">
                  {cycleDays.map(d => `Todo dia ${d}`).join(' · ')}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-surface border border-border/40 p-4 space-y-4">
            <h3 className="display text-base">Dados de recebimento</h3>
            <Field label="Instituição financeira"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex: Nubank, Itaú…" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Agência"><Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="0001" /></Field>
              <Field label="Conta"><Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="123456-7" /></Field>
            </div>
          </div>

          <div className="rounded-2xl bg-surface border border-border/40 p-4 space-y-4">
            <h3 className="display text-base">Chave PIX</h3>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <Select value={pixType} onChange={(e) => setPixType(e.target.value)}>
                <option>CPF</option><option>CNPJ</option><option>E-mail</option><option>Celular</option><option>Aleatória</option>
              </Select>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default Plataforma;
