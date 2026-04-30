import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Field, Input, Select, SegButton, SubmitButton, FormShell } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

type Cycle = 'semanal' | 'quinzenal' | 'mensal';
const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];

const Plataforma = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== 'nova';

  const [name, setName] = useState('');
  const [cycle, setCycle] = useState<Cycle>('semanal');
  const [paymentDay, setPaymentDay] = useState('QUA');
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [pixType, setPixType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('platforms').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (!data) return;
      setName(data.name); setCycle(data.cycle as Cycle);
      setPaymentDay(data.payment_day ?? 'QUA');
      setBankName(data.bank_name ?? ''); setAgency(data.bank_agency ?? '');
      setAccount(data.bank_account ?? ''); setPixType(data.pix_key_type ?? 'CPF');
      setPixKey(data.pix_key ?? '');
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

          <Field label="Ciclo de pagamento">
            <div className="grid grid-cols-3 gap-2">
              {(['semanal', 'quinzenal', 'mensal'] as Cycle[]).map((c) => (
                <SegButton key={c} active={cycle === c} onClick={() => setCycle(c)}>{c.toUpperCase()}</SegButton>
              ))}
            </div>
          </Field>

          {cycle === 'semanal' && (
            <Field label="Dia do pagamento">
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((d) => (
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
