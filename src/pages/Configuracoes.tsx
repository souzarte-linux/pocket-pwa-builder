import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Field, FormShell, Input, Select, SubmitButton } from '@/components/forms/Form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileForm {
  full_name: string;
  gender: string;
  daily_goal: string;
  weekly_goal: string;
  monthly_goal: string;
  vehicle: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year: string;
  plate: string;
  tank_size_l: string;
  avg_consumption_kml: string;
  oil_change_km: string;
  tire_size_front: string;
  tire_size_rear: string;
  has_bag: string;
}

const empty: ProfileForm = {
  full_name: '', gender: '', daily_goal: '', weekly_goal: '', monthly_goal: '',
  vehicle: 'moto', vehicle_brand: '', vehicle_model: '', vehicle_year: '', plate: '',
  tank_size_l: '', avg_consumption_kml: '', oil_change_km: '',
  tire_size_front: '', tire_size_rear: '', has_bag: 'false',
};

const Configuracoes = () => {
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? '',
          gender: (data as any).gender ?? '',
          daily_goal: data.daily_goal?.toString() ?? '',
          weekly_goal: (data as any).weekly_goal?.toString() ?? '',
          monthly_goal: data.monthly_goal?.toString() ?? '',
          vehicle: data.vehicle ?? 'moto',
          vehicle_brand: (data as any).vehicle_brand ?? '',
          vehicle_model: (data as any).vehicle_model ?? '',
          vehicle_year: (data as any).vehicle_year?.toString() ?? '',
          plate: data.plate ?? '',
          tank_size_l: (data as any).tank_size_l?.toString() ?? '',
          avg_consumption_kml: (data as any).avg_consumption_kml?.toString() ?? '',
          oil_change_km: (data as any).oil_change_km?.toString() ?? '',
          tire_size_front: (data as any).tire_size_front ?? '',
          tire_size_rear: (data as any).tire_size_rear ?? '',
          has_bag: (data as any).has_bag ? 'true' : 'false',
        });
      }
    })();
  }, []);

  const set = <K extends keyof ProfileForm>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    const num = (s: string) => (s === '' ? null : Number(s));
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || null,
      gender: form.gender || null,
      daily_goal: num(form.daily_goal),
      weekly_goal: num(form.weekly_goal),
      monthly_goal: num(form.monthly_goal),
      vehicle: form.vehicle as any,
      vehicle_brand: form.vehicle_brand || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null,
      plate: form.plate || null,
      tank_size_l: num(form.tank_size_l),
      avg_consumption_kml: num(form.avg_consumption_kml),
      oil_change_km: num(form.oil_change_km),
      tire_size_front: form.tire_size_front || null,
      tire_size_rear: form.tire_size_rear || null,
      has_bag: form.has_bag === 'true',
    } as any).eq('id', userId);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Configurações salvas');
  };

  return (
    <AppShell title={'CONFIGURAÇÕES'} back>
      <form onSubmit={onSubmit}>
        <div className="rounded-3xl border border-primary-container/30 bg-surface-container p-5 shadow-[0_20px_80px_rgba(255,95,0,0.12)] [&_label]:text-primary-container [&_label]:uppercase [&_label]:font-semibold [&_label]:text-[10px] [&_label]:tracking-[0.18em] [&_input]:!border-primary-container/30 [&_input]:!focus:border-primary-container [&_input]:!bg-surface-container [&_select]:!border-primary-container/30 [&_select]:!focus:border-primary-container [&_select]:!bg-surface-container">
          <FormShell footer={<SubmitButton loading={loading}>SALVAR</SubmitButton>}>
            <h3 className="display text-primary-container text-lg">PERFIL</h3>
            <Field label="Nome completo">
              <Input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Selecione</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </Select>
            </Field>

            <h3 className="display text-primary-container text-lg pt-4">METAS</h3>
            <Field label="Meta diária (R$)">
              <Input type="number" step="0.01" value={form.daily_goal} onChange={(e) => set('daily_goal', e.target.value)} />
            </Field>
            <Field label="Meta semanal (R$)">
              <Input type="number" step="0.01" value={form.weekly_goal} onChange={(e) => set('weekly_goal', e.target.value)} />
            </Field>
            <Field label="Meta mensal (R$)">
              <Input type="number" step="0.01" value={form.monthly_goal} onChange={(e) => set('monthly_goal', e.target.value)} />
            </Field>

            <h3 className="display text-primary-container text-lg pt-4">VEÍCULO</h3>
            <Field label="Tipo">
              <Select value={form.vehicle} onChange={(e) => set('vehicle', e.target.value)}>
                <option value="moto">Moto</option>
                <option value="carro">Carro</option>
                <option value="bike">Bike</option>
                <option value="patinete">Patinete</option>
              </Select>
            </Field>
            <Field label="Marca"><Input value={form.vehicle_brand} onChange={(e) => set('vehicle_brand', e.target.value)} /></Field>
            <Field label="Modelo"><Input value={form.vehicle_model} onChange={(e) => set('vehicle_model', e.target.value)} /></Field>
            <Field label="Ano de fabricação"><Input type="number" value={form.vehicle_year} onChange={(e) => set('vehicle_year', e.target.value)} /></Field>
            <Field label="Placa"><Input value={form.plate} onChange={(e) => set('plate', e.target.value.toUpperCase())} /></Field>
            <Field label="Tamanho do tanque (litros)"><Input type="number" step="0.1" value={form.tank_size_l} onChange={(e) => set('tank_size_l', e.target.value)} /></Field>
            <Field label="Consumo médio (km/l)"><Input type="number" step="0.1" value={form.avg_consumption_kml} onChange={(e) => set('avg_consumption_kml', e.target.value)} /></Field>
            <Field label="Troca de óleo a cada (KM)"><Input type="number" value={form.oil_change_km} onChange={(e) => set('oil_change_km', e.target.value)} /></Field>
            <Field label="Tamanho do pneu dianteiro"><Input value={form.tire_size_front} onChange={(e) => set('tire_size_front', e.target.value)} placeholder="ex: 80/100-18" /></Field>
            <Field label="Tamanho do pneu traseiro"><Input value={form.tire_size_rear} onChange={(e) => set('tire_size_rear', e.target.value)} placeholder="ex: 90/90-18" /></Field>
            <Field label="Possui Bag ou Baú?">
              <Select value={form.has_bag} onChange={(e) => set('has_bag', e.target.value)}>
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </Select>
            </Field>
          </FormShell>
        </div>
      </form>
    </AppShell>
  );
};

export default Configuracoes;
