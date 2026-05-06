import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  Field,
  Input,
  TextArea,
  Select,
  SegButton,
  SubmitButton,
  FormShell,
} from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, UtensilsCrossed, Package, FileText } from 'lucide-react';

const nowLocal = (offsetMin = 0) => {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000 + offsetMin * 60000);
  return d.toISOString().slice(0, 16);
};

const HorasTrabalhadas = () => {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [platformId, setPlatformId] = useState('');
  const [startAt, setStartAt] = useState(nowLocal(-60));
  const [endAt, setEndAt] = useState(nowLocal());
  const [type, setType] = useState<'alimento' | 'pacote' | 'documento'>('alimento');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // New platform inline
  const [showNewPlat, setShowNewPlat] = useState(false);
  const [newPlatName, setNewPlatName] = useState('');
  const [creatingPlat, setCreatingPlat] = useState(false);

  const loadPlatforms = async () => {
    const { data } = await supabase
      .from('platforms')
      .select('id, name')
      .eq('active', true)
      .order('name');
    setPlatforms(data ?? []);
    if (!platformId && data?.[0]) setPlatformId(data[0].id);
  };

  useEffect(() => {
    loadPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPlatformInline = async () => {
    if (!newPlatName.trim()) return;
    setCreatingPlat(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from('platforms')
      .insert({
        user_id: u.user.id,
        name: newPlatName.trim(),
        cycle: 'semanal',
        active: true,
      })
      .select('id, name')
      .single();
    setCreatingPlat(false);
    if (error) return toast.error(error.message);
    if (data) {
      setPlatforms((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setPlatformId(data.id);
      setNewPlatName('');
      setShowNewPlat(false);
      toast.success('Plataforma adicionada!');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt) return toast.error('Informe início e fim.');
    const startedISO = new Date(startAt).toISOString();
    const endedISO = new Date(endAt).toISOString();
    if (new Date(endedISO) <= new Date(startedISO)) {
      return toast.error('A hora final deve ser maior que a inicial.');
    }
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from('work_sessions').insert({
      user_id: u.user.id,
      platform_id: platformId || null,
      product_type: type,
      notes: notes || null,
      started_at: startedISO,
      ended_at: endedISO,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Horas registradas!');
    navigate('/');
  };

  return (
    <AppShell back title="HORAS TRABALHADAS">
      <form onSubmit={submit}>
        <FormShell footer={<SubmitButton loading={loading}>SALVAR REGISTRO ✓</SubmitButton>}>
          <Field label="Plataforma">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
              >
                <option value="">Selecione a Plataforma</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setShowNewPlat((v) => !v)}
                className="h-12 w-12 grid place-items-center rounded-xl bg-primary text-primary-foreground active:scale-95 transition"
                aria-label="Adicionar plataforma"
              >
                <Plus className="size-5" />
              </button>
            </div>
            {showNewPlat && (
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <Input
                  value={newPlatName}
                  onChange={(e) => setNewPlatName(e.target.value)}
                  placeholder="Nome da nova plataforma"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={createPlatformInline}
                  disabled={creatingPlat}
                  className="h-12 px-4 rounded-xl bg-success text-success-foreground font-bold text-sm disabled:opacity-60"
                >
                  {creatingPlat ? '...' : 'OK'}
                </button>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3">
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

          <Field label="Tipo de entrega">
            <div className="grid grid-cols-3 gap-2">
              <SegButton active={type === 'alimento'} onClick={() => setType('alimento')}>
                <span className="flex flex-col items-center gap-1">
                  <UtensilsCrossed className="size-5" />
                  Alimento
                </span>
              </SegButton>
              <SegButton active={type === 'pacote'} onClick={() => setType('pacote')}>
                <span className="flex flex-col items-center gap-1">
                  <Package className="size-5" />
                  Pacotes
                </span>
              </SegButton>
              <SegButton active={type === 'documento'} onClick={() => setType('documento')}>
                <span className="flex flex-col items-center gap-1">
                  <FileText className="size-5" />
                  Documentos
                </span>
              </SegButton>
            </div>
          </Field>

          <Field label="Observações">
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes da jornada…"
            />
          </Field>
        </FormShell>
      </form>
    </AppShell>
  );
};

export default HorasTrabalhadas;
