import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2, Scissors, Wallet } from 'lucide-react';

type Cycle = 'semanal' | 'quinzenal' | 'mensal' | 'misto';
type Segment = 'logistica' | 'delivery';
type PaymentModel = 'producao' | 'diaria';

const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

interface CycleEntry {
  cut: number;    // day of month the cycle closes (1-28)
  payDelay: number; // days after cut that payment arrives
}

const parseCycleEntries = (rules: any): CycleEntry[] => {
  try {
    const entries = rules?.cycle_entries;
    if (Array.isArray(entries) && entries.length > 0) {
      return entries.filter((e: any) => typeof e.cut === 'number');
    }
    // Migrate legacy flat cycle_days array
    const legacy = rules?.cycle_days;
    if (Array.isArray(legacy)) {
      return legacy.filter((x: any) => typeof x === 'number').map((d: number) => ({ cut: d, payDelay: 7 }));
    }
  } catch { /* ignore */ }
  return [{ cut: 1, payDelay: 7 }, { cut: 16, payDelay: 7 }];
};

const Plataforma = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'nova';

  const [name, setName] = useState('');
  const [cycle, setCycle] = useState<Cycle>('semanal');
  const [paymentDay, setPaymentDay] = useState('QUA');
  // Fixed-cycle payment delay in days after cycle closes
  const [fixedPayDelay, setFixedPayDelay] = useState('7');
  // Variable cycle entries: each has a cut day and its own pay delay
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>([
    { cut: 1, payDelay: 7 },
    { cut: 16, payDelay: 7 },
  ]);
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [pixType, setPixType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [segment, setSegment] = useState<Segment>('logistica');
  const [paymentModel, setPaymentModel] = useState<PaymentModel>('producao');
  const [loading, setLoading] = useState(false);

  const addEntry = () => {
    setCycleEntries(prev => [...prev, { cut: 1, payDelay: 7 }].sort((a, b) => a.cut - b.cut));
  };
  const removeEntry = (idx: number) => {
    setCycleEntries(prev => prev.filter((_, i) => i !== idx));
  };
  const updateEntry = (idx: number, field: keyof CycleEntry, val: number) => {
    setCycleEntries(prev =>
      prev.map((e, i) => i === idx ? { ...e, [field]: Math.max(1, val) } : e)
        .sort((a, b) => a.cut - b.cut)
    );
  };

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('platforms').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setName(data.name);
      setCycle(data.cycle as Cycle);
      setPaymentDay(data.payment_day ?? 'QUA');
      const entries = parseCycleEntries(data.rules);
      if (entries.length > 0) setCycleEntries(entries);
      const rules = (data.rules ?? {}) as { fixed_pay_delay?: string | number };
      const fd = rules.fixed_pay_delay;
      if (fd) setFixedPayDelay(String(fd));
      setBankName(data.bank_name ?? '');
      setAgency(data.bank_agency ?? '');
      setAccount(data.bank_account ?? '');
      setPixType(data.pix_key_type ?? 'CPF');
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

    let rules: any = {};
    if (cycle === 'misto') {
      rules = { cycle_entries: cycleEntries };
    } else {
      rules = { fixed_pay_delay: Number(fixedPayDelay) || 7 };
    }

    const payload = {
      user_id: u.user.id, name, cycle,
      payment_day: cycle === 'semanal' ? paymentDay : null,
      bank_name: bankName || null, bank_agency: agency || null,
      bank_account: account || null, pix_key_type: pixType, pix_key: pixKey || null, active: true,
      segment, payment_model: paymentModel,
      rules,
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

          {/* ── Semanal: choose week day + pay delay ── */}
          {cycle === 'semanal' && (
            <>
              <Field label="Dia de fechamento semanal">
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
              <Field label="Prazo de pagamento (dias após fechamento)">
                <div className="flex items-center gap-3">
                  <Wallet className="size-5 text-primary shrink-0" />
                  <input
                    type="number"
                    min={1}
                    value={fixedPayDelay}
                    onChange={e => setFixedPayDelay(e.target.value)}
                    placeholder="7"
                    className="flex-1 h-12 px-4 rounded-xl bg-surface-high border border-border/40 focus:border-primary outline-none text-center font-black text-lg text-primary"
                  />
                  <span className="text-sm text-muted-foreground font-bold">dias</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: se fechar toda {paymentDay} e o prazo for 3 dias, o pagamento cai na {paymentDay} seguinte da semana.
                </p>
              </Field>
            </>
          )}

          {/* ── Quinzenal/Mensal: just pay delay ── */}
          {(cycle === 'quinzenal' || cycle === 'mensal') && (
            <Field label="Prazo de pagamento (dias após fechamento do ciclo)">
              <div className="flex items-center gap-3">
                <Wallet className="size-5 text-primary shrink-0" />
                <input
                  type="number"
                  min={1}
                  value={fixedPayDelay}
                  onChange={e => setFixedPayDelay(e.target.value)}
                  placeholder="7"
                  className="flex-1 h-12 px-4 rounded-xl bg-surface-high border border-border/40 focus:border-primary outline-none text-center font-black text-lg text-primary"
                />
                <span className="text-sm text-muted-foreground font-bold">dias</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quantos dias após o fechamento do ciclo ({cycle}) o pagamento é realizado.
              </p>
            </Field>
          )}

          {/* ── Misto/Variável: cut day + pay delay per entry ── */}
          {cycle === 'misto' && (
            <div className="rounded-2xl bg-surface border border-border/40 p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="display text-base">Ciclos de pagamento</h3>
                <button
                  type="button"
                  onClick={addEntry}
                  className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition"
                >
                  + Adicionar ciclo
                </button>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Configure cada ciclo: o dia em que fecha e quantos dias depois o pagamento é realizado.
              </p>

              <div className="space-y-4">
                {cycleEntries.map((entry, idx) => (
                  <div key={idx} className="rounded-xl border border-border/40 bg-surface-high p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-primary uppercase tracking-wide">Ciclo {idx + 1}</span>
                      {cycleEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(idx)}
                          className="size-7 grid place-items-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition text-sm font-black"
                        >×</button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Scissors className="size-3" /> Fechamento
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Dia</span>
                          <input
                            type="number"
                            min={1}
                            max={28}
                            value={entry.cut}
                            onChange={e => updateEntry(idx, 'cut', Number(e.target.value))}
                            placeholder="1"
                            className="flex-1 h-12 px-2 rounded-xl bg-surface border border-border/40 focus:border-primary outline-none text-center font-black text-xl text-primary"
                          />
                          <span className="text-xs text-muted-foreground">do mês</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Wallet className="size-3" /> Pagamento
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            value={entry.payDelay}
                            onChange={e => updateEntry(idx, 'payDelay', Number(e.target.value))}
                            placeholder="7"
                            className="flex-1 h-12 px-2 rounded-xl bg-surface border border-border/40 focus:border-primary outline-none text-center font-black text-xl text-primary"
                          />
                          <span className="text-xs text-muted-foreground">dias<br/>depois</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground flex gap-2">
                      <Scissors className="size-3 text-primary mt-0.5 shrink-0" />
                      <span>Fecha dia <strong className="text-primary">{entry.cut}</strong> → paga dia <strong className="text-primary">{entry.cut + entry.payDelay > 28 ? `${entry.cut + entry.payDelay - 28} do mês seguinte` : entry.cut + entry.payDelay}</strong></span>
                    </div>
                  </div>
                ))}
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
