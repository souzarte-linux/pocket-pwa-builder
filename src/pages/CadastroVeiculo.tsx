import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Info, Briefcase, Archive, CircleSlash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CadastroVeiculo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    tanque: '',
    consumo: '',
    trocaOleo: '',
    pneuDianteiro: '',
    pneuTraseiro: '',
    carga: 'bag',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.user.id)
          .maybeSingle();

        if (profile) {
          const p = profile as any;
          setForm({
            marca: p.vehicle_brand ?? '',
            modelo: p.vehicle_model ?? '',
            ano: p.vehicle_year ? String(p.vehicle_year) : '',
            placa: p.plate ?? '',
            tanque: p.tank_size_l ? String(p.tank_size_l) : '',
            consumo: p.avg_consumption_kml ? String(p.avg_consumption_kml) : '',
            trocaOleo: p.oil_change_km ? String(p.oil_change_km) : '',
            pneuDianteiro: p.tire_size_front ?? '',
            pneuTraseiro: p.tire_size_rear ?? '',
            carga: p.has_bag ? 'bag' : 'nenhum',
          });
        }
      } catch (err) {
        console.error('Error loading vehicle profile:', err);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const payload = {
        vehicle_brand: form.marca.trim() || null,
        vehicle_model: form.modelo.trim() || null,
        vehicle_year: form.ano ? Number(form.ano) || null : null,
        plate: form.placa.trim().toUpperCase() || null,
        tank_size_l: form.tanque ? Number(form.tanque.replace(',', '.')) || null : null,
        avg_consumption_kml: form.consumo ? Number(form.consumo.replace(',', '.')) || null : null,
        oil_change_km: form.trocaOleo ? Number(form.trocaOleo.replace(',', '.')) || null : null,
        tire_size_front: form.pneuDianteiro.trim() || null,
        tire_size_rear: form.pneuTraseiro.trim() || null,
        has_bag: form.carga !== 'nenhum',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(payload as any).eq('id', u.user.id);
      setLoading(false);

      if (error) {
        console.error('Error updating vehicle profile:', error);
        toast.error(`Erro ao salvar dados do veículo: ${error.message}`);
        return;
      }

      toast.success('Veículo atualizado com sucesso!');
    } catch (err: any) {
      console.error('Unexpected error saving vehicle:', err);
      setLoading(false);
      toast.error('Erro ao salvar dados do veículo.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="max-w-md mx-auto px-5 pb-10">
        <header className="sticky top-0 z-30 mt-5 mb-6 rounded-[32px] border border-white/10 bg-[#0c0c0c]/95 px-4 py-4 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-surface text-primary transition hover:bg-surface-high"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-[#f2c6aa]">Cadastro do Veículo</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-black uppercase tracking-tight text-white">Velocity</span>
                <span className="text-lg font-black uppercase tracking-tight text-primary-container">Log</span>
              </div>
            </div>
            <div className="h-11 w-11 rounded-full overflow-hidden border border-white/10 bg-surface">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces"
                alt="Perfil"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#d9bba8]">
            Preencha as informações técnicas do seu veículo para otimizar suas rotas e manutenções.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-[32px] border border-white/10 bg-[#101010] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-surface-container-high border border-white/10 text-primary-container">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Informações Básicas</h2>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Marca</label>
              <input
                value={form.marca}
                onChange={(event) => setField('marca', event.target.value)}
                placeholder="Ex: Honda"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
              />
            </div>
            <div className="space-y-3 mt-4">
              <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Modelo</label>
              <input
                value={form.modelo}
                onChange={(event) => setField('modelo', event.target.value)}
                placeholder="Ex: CB 500X"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-3">
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Ano</label>
                <input
                  value={form.ano}
                  onChange={(event) => setField('ano', event.target.value)}
                  placeholder="2024"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Placa</label>
                <input
                  value={form.placa}
                  onChange={(event) => setField('placa', event.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white uppercase placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[32px] bg-primary-container px-5 py-6 shadow-[0_30px_60px_rgba(255,95,0,0.25)]">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-black/15 text-black">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-black">Pronto para a Estrada</h2>
                <p className="mt-2 text-sm leading-6 text-black/80">
                  Mantenha seus dados atualizados para receber alertas de manutenção preventiva.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-[28px] border border-black/20 bg-black/10 px-4 py-4 text-sm text-black/90 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4" />
                <span>Documentação em dia é obrigatória.</span>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#101010] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-surface-container-high border border-white/10 text-primary-container">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Especificações Técnicas</h2>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Capacidade do Tanque (L)</label>
                <input
                  value={form.tanque}
                  onChange={(event) => setField('tanque', event.target.value)}
                  placeholder="17"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Consumo Médio (KM/L)</label>
                <input
                  value={form.consumo}
                  onChange={(event) => setField('consumo', event.target.value)}
                  placeholder="25.5"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Troca de Óleo (KM)</label>
                <input
                  value={form.trocaOleo}
                  onChange={(event) => setField('trocaOleo', event.target.value)}
                  placeholder="5000"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#101010] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-surface-container-high border border-white/10 text-primary-container">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Logística de Carga</h2>
              </div>
            </div>
            <p className="mb-4 text-sm uppercase tracking-[0.25em] text-[#c9b29f]">Tipo de Carga</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setField('carga', 'bag')}
                className={`rounded-3xl border px-3 py-3 text-sm font-semibold transition ${form.carga === 'bag' ? 'border-primary-container bg-primary-container text-black shadow-[0_20px_40px_rgba(255,95,0,0.28)]' : 'border-white/10 bg-white/5 text-white hover:border-primary-container'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Bag
                </div>
              </button>
              <button
                type="button"
                onClick={() => setField('carga', 'bau')}
                className={`rounded-3xl border px-3 py-3 text-sm font-semibold transition ${form.carga === 'bau' ? 'border-primary-container bg-primary-container text-black shadow-[0_20px_40px_rgba(255,95,0,0.28)]' : 'border-white/10 bg-white/5 text-white hover:border-primary-container'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Archive className="h-4 w-4" />
                  Baú
                </div>
              </button>
              <button
                type="button"
                onClick={() => setField('carga', 'nenhum')}
                className={`rounded-3xl border px-3 py-3 text-sm font-semibold transition ${form.carga === 'nenhum' ? 'border-primary-container bg-primary-container text-black shadow-[0_20px_40px_rgba(255,95,0,0.28)]' : 'border-white/10 bg-white/5 text-white hover:border-primary-container'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CircleSlash className="h-4 w-4" />
                  Nenhum
                </div>
              </button>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#101010] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-3xl bg-surface-container-high border border-white/10 text-primary-container">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Rodagem</h2>
              </div>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Pneu Dianteiro</label>
                <input
                  value={form.pneuDianteiro}
                  onChange={(event) => setField('pneuDianteiro', event.target.value)}
                  placeholder="110/80 R19"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.3em] text-[#c9b29f]">Pneu Traseiro</label>
                <input
                  value={form.pneuTraseiro}
                  onChange={(event) => setField('pneuTraseiro', event.target.value)}
                  placeholder="160/60 R17"
                  className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-4 text-white placeholder:text-white/30 outline-none transition focus:border-primary-container"
                />
              </div>
            </div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#d9bba8]">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Calibragem correta economiza até 15% de combustível.</span>
              </div>
            </div>
          </section>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary-container px-6 py-4 text-black font-semibold shadow-[0_20px_50px_rgba(255,95,0,0.32)] hover:bg-[#ff7b2e] disabled:opacity-60"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CadastroVeiculo;
