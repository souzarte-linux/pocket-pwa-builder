import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/queries/useProfile';
import { useProfileMutations } from '@/hooks/mutations/useProfileMutations';

export const CadastroVeiculo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { updateProfile } = useProfileMutations();

  const [loading, setLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  const [form, setForm] = useState({
    marca: '',
    modelo: '',
    ano: '',
    placa: '',
    tanque: '',
    consumo: '',
    trocaOleo: '',
    carga: 'bag',
    pneuDianteiro: '',
    pneuTraseiro: '',
  });

  useEffect(() => {
    if (profile) {
      if (profile.avatar_url) setAvatar(profile.avatar_url);

      setForm({
        marca: profile.vehicle_brand ?? 'Honda',
        modelo: profile.vehicle_model ?? 'CB 500X',
        ano: profile.vehicle_year ? String(profile.vehicle_year) : '2024',
        placa: profile.plate ?? 'ABC-1234',
        tanque: profile.tank_size_l ? String(profile.tank_size_l) : '17',
        consumo: profile.avg_consumption_kml ? String(profile.avg_consumption_kml) : '25.5',
        trocaOleo: profile.oil_change_km ? String(profile.oil_change_km) : '5000',
        carga: profile.has_bag ? 'bag' : 'bau',
        pneuDianteiro: profile.tire_size_front ?? '110/80 R19',
        pneuTraseiro: profile.tire_size_rear ?? '160/60 R17',
      });
    }
  }, [profile]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBackClick = () => {
    // Alerta o usuário sobre perda de alterações não salvas
    setShowExitConfirm(true);
  };

  const confirmBackWithoutSave = () => {
    setShowExitConfirm(false);
    navigate(-1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (!user) {
        toast.error('Usuário não autenticado.');
        setLoading(false);
        return;
      }

      const payload = {
        vehicle_brand: form.marca.trim() || null,
        vehicle_model: form.modelo.trim() || null,
        vehicle_year: form.ano ? Number(form.ano) : null,
        plate: form.placa.trim().toUpperCase() || null,
        tank_size_l: form.tanque ? Number(form.tanque.replace(',', '.')) : null,
        avg_consumption_kml: form.consumo ? Number(form.consumo.replace(',', '.')) : null,
        oil_change_km: form.trocaOleo ? Number(form.trocaOleo.replace(',', '.')) : null,
        tire_size_front: form.pneuDianteiro.trim() || null,
        tire_size_rear: form.pneuTraseiro.trim() || null,
        has_bag: form.carga === 'bag',
        updated_at: new Date().toISOString(),
      };

      await updateProfile({ userId: user.id, updates: payload });
      toast.success('Veículo cadastrado com sucesso!');
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar';
      toast.error(`Erro ao salvar dados do veículo: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#000000] text-[#e5e2e1] min-h-screen font-lexend pb-32">
      {/* TopAppBar Navigation Shell com Seta para a Esquerda no canto superior esquerdo */}
      <nav className="bg-[#000000]/80 backdrop-blur-lg border-b border-[#333333] flex justify-between items-center w-full px-5 py-4 fixed top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="text-white hover:bg-white/10 p-2 rounded-full transition-colors active:scale-95 duration-150"
            title="Voltar à tela anterior"
          >
            <ArrowLeft className="size-6 text-[#FF5F00]" />
          </button>
          <h1 className="font-bold text-xl text-white">Cadastro do Veículo</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#FF5F00] font-black text-xl uppercase tracking-tighter hidden sm:inline">
            Velocity Log
          </span>
          <div className="w-10 h-10 rounded-full bg-[#201f1f] border border-white/10 overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#FF5F00] text-black font-black text-base grid place-items-center">
                M
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="mt-24 px-4 md:px-8 max-w-5xl mx-auto space-y-6">
        <header className="mb-6">
          <p className="text-[#e4bfb1] text-base">
            Preencha as informações técnicas do seu veículo para otimizar suas rotas e manutenções.
          </p>
        </header>

        {/* Form Bento Grid */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Basic Info Card */}
          <section className="md:col-span-8 bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ff5f00]">
              <span className="material-symbols-outlined text-2xl">directions_car</span>
              <h2 className="text-xl font-semibold text-white">Informações Básicas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Marca</label>
                <input
                  value={form.marca}
                  onChange={(e) => setField('marca', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="Ex: Honda"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Modelo</label>
                <input
                  value={form.modelo}
                  onChange={(e) => setField('modelo', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="Ex: CB 500X"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Ano</label>
                <input
                  value={form.ano}
                  onChange={(e) => setField('ano', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="2024"
                  type="number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Placa</label>
                <input
                  value={form.placa}
                  onChange={(e) => setField('placa', e.target.value.toUpperCase())}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm uppercase font-bold"
                  placeholder="ABC-1234"
                  type="text"
                />
              </div>
            </div>
          </section>

          {/* Status Quick Card */}
          <aside className="md:col-span-4 bg-[#ff5f00] rounded-2xl p-6 flex flex-col justify-between text-[#531a00] shadow-xl">
            <div>
              <span className="material-symbols-outlined text-5xl mb-4 filled-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <h3 className="text-2xl font-bold leading-tight mb-2 text-[#5a1c00]">Pronto para a Estrada</h3>
              <p className="text-sm font-medium opacity-90 leading-relaxed">
                Mantenha seus dados atualizados para receber alertas de manutenção preventiva.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 bg-black/20 p-3 rounded-xl backdrop-blur-sm text-black">
              <span className="material-symbols-outlined text-xl">info</span>
              <span className="text-xs font-semibold">Documentação em dia é obrigatória.</span>
            </div>
          </aside>

          {/* Technical Specs Card */}
          <section className="md:col-span-12 bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ff5f00]">
              <span className="material-symbols-outlined text-2xl">settings_suggest</span>
              <h2 className="text-xl font-semibold text-white">Especificações Técnicas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Capacidade do Tanque (L)</label>
                <input
                  value={form.tanque}
                  onChange={(e) => setField('tanque', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="17"
                  type="number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Consumo Médio (KM/L)</label>
                <input
                  value={form.consumo}
                  onChange={(e) => setField('consumo', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="25.5"
                  type="number"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Troca de Óleo (KM)</label>
                <input
                  value={form.trocaOleo}
                  onChange={(e) => setField('trocaOleo', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="5000"
                  type="number"
                />
              </div>
            </div>
          </section>

          {/* Logistics & Tires */}
          <section className="md:col-span-6 bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-xl border-l-4 border-[#ff5f00]">
            <div className="flex items-center gap-2 mb-4 text-[#ff5f00]">
              <span className="material-symbols-outlined text-2xl">inventory_2</span>
              <h2 className="text-xl font-semibold text-white">Logística de Carga</h2>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Tipo de Carga</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setField('carga', 'bag')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    form.carga === 'bag'
                      ? 'border-[#ff5f00] bg-[#ff5f00]/15 text-[#ff5f00] font-bold'
                      : 'border-[#333333] text-[#e4bfb1] hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">shopping_bag</span>
                  <span className="text-xs">Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => setField('carga', 'bau')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    form.carga === 'bau'
                      ? 'border-[#ff5f00] bg-[#ff5f00]/15 text-[#ff5f00] font-bold'
                      : 'border-[#333333] text-[#e4bfb1] hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">inventory_2</span>
                  <span className="text-xs">Baú</span>
                </button>

                <button
                  type="button"
                  onClick={() => setField('carga', 'nenhum')}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    form.carga === 'nenhum'
                      ? 'border-[#ff5f00] bg-[#ff5f00]/15 text-[#ff5f00] font-bold'
                      : 'border-[#333333] text-[#e4bfb1] hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">block</span>
                  <span className="text-xs">Nenhum</span>
                </button>
              </div>
            </div>
          </section>

          <section className="md:col-span-6 bg-[#121212]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-[#ff5f00]">
              <span className="material-symbols-outlined text-2xl">tire_repair</span>
              <h2 className="text-xl font-semibold text-white">Rodagem</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Pneu Dianteiro</label>
                <input
                  value={form.pneuDianteiro}
                  onChange={(e) => setField('pneuDianteiro', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="110/80 R19"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase font-medium tracking-wider text-[#e4bfb1] px-3">Pneu Traseiro</label>
                <input
                  value={form.pneuTraseiro}
                  onChange={(e) => setField('pneuTraseiro', e.target.value)}
                  className="bg-[#201f1f] border border-[#333333] rounded-full px-4 py-2.5 text-white placeholder-[#393939] outline-none focus:ring-2 focus:ring-[#ff5f00]/40 transition-all text-sm"
                  placeholder="160/60 R17"
                  type="text"
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/5 rounded-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-stone-400 text-lg">info</span>
              <p className="text-xs text-[#e4bfb1]">Calibragem correta economiza até 15% de combustível.</p>
            </div>
          </section>

          {/* Hidden Submit Button to support Enter key */}
          <button type="submit" className="hidden" />
        </form>
      </main>

      {/* Footer Action Bar */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#ff5f00] text-white font-bold text-lg py-4 rounded-full shadow-2xl shadow-orange-900/40 active:scale-[0.98] transition-all hover:brightness-110 flex justify-center items-center gap-2 uppercase tracking-wider"
          >
            <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            <span className="material-symbols-outlined text-2xl">save</span>
          </button>
        </div>
      </div>

      {/* Confirm Dialog ao clicar na seta para a esquerda */}
      <ConfirmDialog
        open={showExitConfirm}
        title="Descartar Alterações?"
        description="Você possui informações não salvas. Se voltar agora, todas as alterações efetuadas no cadastro do veículo serão perdidas."
        confirmLabel="Sair sem Salvar"
        cancelLabel="Continuar no Cadastro"
        onConfirm={confirmBackWithoutSave}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};

export default CadastroVeiculo;
