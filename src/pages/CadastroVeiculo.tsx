import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bike, 
  Car, 
  Truck, 
  Save, 
  ShieldCheck, 
  Info, 
  Fuel, 
  Wrench, 
  Package, 
  CheckCircle2
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const CadastroVeiculo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<'moto' | 'carro' | 'van' | 'bike'>('moto');

  const [form, setForm] = useState({
    marca: 'Honda',
    modelo: 'CG 160 Fan',
    ano: '2023',
    placa: 'ABC-1D23',
    cor: 'Preto Fosco',
    tanque: '16.1',
    consumo: '42.5',
    trocaOleo: '3000',
    combustivel: 'Flex',
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
            marca: p.vehicle_brand ?? 'Honda',
            modelo: p.vehicle_model ?? 'CG 160 Fan',
            ano: p.vehicle_year ? String(p.vehicle_year) : '2023',
            placa: p.plate ?? 'ABC-1D23',
            cor: p.vehicle_color ?? 'Preto Fosco',
            tanque: p.tank_size_l ? String(p.tank_size_l) : '16.1',
            consumo: p.avg_consumption_kml ? String(p.avg_consumption_kml) : '42.5',
            trocaOleo: p.oil_change_km ? String(p.oil_change_km) : '3000',
            combustivel: p.fuel_type ?? 'Flex',
            carga: p.has_bag ? 'bag' : 'bau',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados do veículo:', err);
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
        vehicle_brand: form.marca.trim(),
        vehicle_model: form.modelo.trim(),
        vehicle_year: form.ano ? Number(form.ano) : null,
        plate: form.placa.trim().toUpperCase(),
        tank_size_l: form.tanque ? Number(form.tanque.replace(',', '.')) : null,
        avg_consumption_kml: form.consumo ? Number(form.consumo.replace(',', '.')) : null,
        oil_change_km: form.trocaOleo ? Number(form.trocaOleo.replace(',', '.')) : null,
        has_bag: form.carga === 'bag',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').update(payload as any).eq('id', u.user.id);

      if (error) {
        toast.error(`Erro ao salvar dados do veículo: ${error.message}`);
      } else {
        toast.success('Informações do veículo atualizadas com sucesso!');
      }
    } catch (err: any) {
      toast.error('Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-lexend pb-28">
      <AppHeader title="CADASTRO DO VEÍCULO" subtitle="Velocity Log - Dados Técnicos" />

      <main className="px-5 pt-6 max-w-xl mx-auto space-y-6">
        {/* Banner Informativo */}
        <div className="bg-[#1c1b1b] p-5 rounded-3xl border-2 border-[#ff5f00]/40 flex items-center gap-4 relative overflow-hidden shadow-xl">
          <div className="p-3 bg-[#ff5f00] text-black rounded-2xl shrink-0 font-extrabold">
            <Bike className="size-8" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#e5e2e1]">Veículo da Frota</h2>
            <p className="text-xs text-[#ab8a7d] mt-0.5 font-medium">
              Configure as especificações para calcular autonomia, revisões de óleo e custos por km.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Seleção do Tipo de Veículo */}
          <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#ff5f00]">
              Tipo de Veículo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'moto', label: 'Moto', icon: Bike },
                { id: 'carro', label: 'Carro', icon: Car },
                { id: 'van', label: 'Van', icon: Truck },
                { id: 'bike', label: 'Bicicleta', icon: Bike },
              ].map((item) => {
                const Icon = item.icon;
                const selected = tipoVeiculo === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTipoVeiculo(item.id as any)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                      selected
                        ? 'bg-[#ff5f00] text-black border-[#ff5f00] font-extrabold shadow-lg'
                        : 'bg-[#201f1f] text-[#e5e2e1] border-stone-800 hover:border-stone-700 font-bold'
                    }`}
                  >
                    <Icon className="size-5 mb-1" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dados Gerais do Veículo */}
          <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
              <Bike className="size-4" /> Informações do Veículo
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Marca</label>
                <input
                  type="text"
                  value={form.marca}
                  onChange={(e) => setField('marca', e.target.value)}
                  placeholder="Ex: Honda"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Modelo</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setField('modelo', e.target.value)}
                  placeholder="Ex: CG 160 Fan"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Ano</label>
                <input
                  type="text"
                  value={form.ano}
                  onChange={(e) => setField('ano', e.target.value)}
                  placeholder="Ex: 2023"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Placa</label>
                <input
                  type="text"
                  value={form.placa}
                  onChange={(e) => setField('placa', e.target.value.toUpperCase())}
                  placeholder="ABC-1D23"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-extrabold uppercase text-base outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Cor</label>
              <input
                type="text"
                value={form.cor}
                onChange={(e) => setField('cor', e.target.value)}
                placeholder="Ex: Preto Fosco / Prata"
                className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
              />
            </div>
          </div>

          {/* Especificações de Desempenho e Manutenção */}
          <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
              <Fuel className="size-4" /> Desempenho e Consumo
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Tanque (Litros)</label>
                <input
                  type="text"
                  value={form.tanque}
                  onChange={(e) => setField('tanque', e.target.value)}
                  placeholder="16.1"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Média (km/L)</label>
                <input
                  type="text"
                  value={form.consumo}
                  onChange={(e) => setField('consumo', e.target.value)}
                  placeholder="42.5"
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Intervalo Troca de Óleo (km)</label>
              <input
                type="text"
                value={form.trocaOleo}
                onChange={(e) => setField('trocaOleo', e.target.value)}
                placeholder="3000"
                className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[56px] bg-[#ff5f00] text-black font-extrabold text-base uppercase tracking-wider rounded-2xl shadow-xl hover:bg-[#ffb599] active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Save className="size-5" />
            <span>{loading ? 'Salvando...' : 'Salvar Dados do Veículo'}</span>
          </button>
        </form>
      </main>
    </div>
  );
};

export default CadastroVeiculo;
