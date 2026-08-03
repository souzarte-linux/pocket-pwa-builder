import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { X, Save, ArrowLeft } from 'lucide-react';

// Help functions for visual masks
const formatDisplayDate = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatDisplayPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}.${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)}.${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const unmaskDigits = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const PerfilMotorista = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form & Profile states
  const [nome, setNome] = useState('Fernando Souza');
  const [sexo, setSexo] = useState('Masculino');
  const [dataNasc, setDataNasc] = useState('12/05/1994');
  const [email, setEmail] = useState('fernando.souza@email.com');
  const [celular, setCelular] = useState('(11) 9.8765-4321');
  const [whatsapp, setWhatsapp] = useState(true);
  const [redeSocial, setRedeSocial] = useState('fernando_souza');
  const [tipoVeiculo, setTipoVeiculo] = useState<'moto' | 'carro' | 'bike'>('moto');
  const [modeloVeiculo, setModeloVeiculo] = useState('Honda CG 160');
  const [placaVeiculo, setPlacaVeiculo] = useState('KNT-1V23');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Password fields
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email || 'fernando.souza@email.com');
      setNome(u.user_metadata?.full_name || 'Fernando Souza');

      supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p) {
            const profileData = p as any;
            if (profileData.full_name) setNome(profileData.full_name);
            if (profileData.avatar_url) setAvatar(profileData.avatar_url);
            if (profileData.phone) setCelular(formatDisplayPhone(profileData.phone));
            if (profileData.birth_date) setDataNasc(formatDisplayDate(profileData.birth_date));
            if (profileData.vehicle_model) setModeloVeiculo(profileData.vehicle_model);
            if (profileData.plate) setPlacaVeiculo(profileData.plate);
          }
        });
    });
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplayDate(e.target.value);
    setDataNasc(formatted);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplayPhone(e.target.value);
    setCelular(formatted);
  };

  const handleCloseEditClick = () => {
    // Alerta o usuário que edições não salvas serão perdidas ao fechar no "X"
    setShowExitConfirm(true);
  };

  const confirmExitWithoutSave = () => {
    setShowExitConfirm(false);
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const u = (await supabase.auth.getUser()).data.user;
      if (u) {
        // Envia para o Banco de Dados os campos sem a máscara
        const rawPhone = unmaskDigits(celular);
        const rawDate = unmaskDigits(dataNasc);

        await supabase.from('profiles').upsert({
          id: u.id,
          full_name: nome,
          phone: rawPhone,
          birth_date: rawDate,
          vehicle_model: modeloVeiculo,
          plate: placaVeiculo,
          updated_at: new Date().toISOString(),
        } as any);
      }
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
    } catch (err: any) {
      toast.error('Erro ao salvar perfil: ' + (err.message || 'Falha de conexão'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen font-lexend pb-36">
      {/* App Header com Menu Hamburger */}
      {!isEditing ? (
        <AppHeader 
          title="PERFIL MOTORISTA" 
          subtitle="Kinetic Velocity" 
        />
      ) : (
        /* Cabeçalho de Edição com Título + Botão X no Canto Superior Direito */
        <header className="sticky top-0 z-30 bg-[#000000] flex justify-between items-center w-full px-5 h-16 border-b-2 border-[#FF5F00] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseEditClick}
              className="text-[#FF5F00] p-2 rounded-full hover:bg-white/5 transition active:scale-95"
              title="Voltar"
            >
              <ArrowLeft className="size-6" />
            </button>
            <h1 className="font-lexend font-black uppercase tracking-tighter text-xl text-[#FF5F00]">
              Editar Perfil
            </h1>
          </div>

          {/* Botão Superior Direito X para fechar com Alerta */}
          <button
            type="button"
            onClick={handleCloseEditClick}
            className="size-10 grid place-items-center rounded-full bg-[#201f1f] text-[#FF5F00] hover:bg-red-900/30 hover:text-red-400 border border-stone-800 transition active:scale-95 shadow-md"
            title="Fechar edição (X)"
          >
            <X className="size-6" />
          </button>
        </header>
      )}

      <main className="mt-6 px-5 max-w-2xl mx-auto space-y-6">
        {isEditing ? (
          /* ========================================================
             E D I T A R   P E R F I L   (editar_perfil_de_motorista)
             ======================================================== */
          <form onSubmit={handleSaveProfile} className="space-y-8 pt-2">
            {/* Photo Section */}
            <section className="flex flex-col items-center justify-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-[#ff5f00] overflow-hidden bg-[#201f1f] shadow-xl">
                  {avatar ? (
                    <img src={avatar} alt={nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#ff5f00] text-black font-black text-4xl grid place-items-center uppercase">
                      {nome[0] || 'M'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toast.info('Selecione uma foto da sua galeria')}
                  className="absolute bottom-0 right-0 bg-[#ff5f00] text-black p-3 rounded-full border-4 border-[#131313] active:scale-95 transition-transform shadow-xl"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>
              <p className="mt-4 font-bold text-xl text-[#e5e2e1] uppercase tracking-tight">{nome}</p>
            </section>

            {/* Personal Info Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#ff5f00] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  person
                </span>
                <h2 className="text-xl font-bold text-white">Informações Pessoais</h2>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-[#ab8a7d] px-2">Nome Completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none transition-colors text-base text-white"
                  placeholder="Fernando Anunciação de Souza"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[#ab8a7d] px-2">Sexo</label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none appearance-none text-base text-white"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                    <option value="Prefiro não dizer">Prefiro não dizer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[#ab8a7d] px-2">Data Nasc.</label>
                  <input
                    type="text"
                    value={dataNasc}
                    onChange={handleDateChange}
                    placeholder="DD/MM/YYYY"
                    maxLength={10}
                    className="w-full h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-base text-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-[#ab8a7d] px-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-base text-white"
                  placeholder="fernando.souza@email.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-[#ab8a7d] px-2">Celular</label>
                <div className="flex items-center gap-3">
                  <input
                    type="tel"
                    value={celular}
                    onChange={handlePhoneChange}
                    placeholder="(00) 0.0000-0000"
                    maxLength={16}
                    className="flex-grow h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-base text-white font-medium"
                    required
                  />
                  <div className="flex items-center bg-[#201f1f] border-2 border-[#353534] rounded-full px-4 h-14 gap-2">
                    <span className="material-symbols-outlined text-green-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      chat
                    </span>
                    <input
                      type="checkbox"
                      checked={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.checked)}
                      className="w-5 h-5 rounded bg-[#353534] border-none text-[#ff5f00] focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-[#ab8a7d] px-2">Rede Social (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ab8a7d]">@</span>
                  <input
                    type="text"
                    value={redeSocial}
                    onChange={(e) => setRedeSocial(e.target.value)}
                    className="w-full h-14 bg-[#201f1f] border-2 border-[#353534] rounded-full pl-10 pr-6 focus:border-[#ff5f00] outline-none text-base text-white"
                    placeholder="fernando_souza"
                  />
                </div>
              </div>
            </section>

            {/* Vehicle Info Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#ff5f00] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  moped
                </span>
                <h2 className="text-xl font-bold text-white">Veículo Atual</h2>
              </div>
              <div className="bg-[#201f1f] border-2 border-[#353534] p-4 rounded-xl space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[#ab8a7d]">Tipo de Veículo</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoVeiculo('moto')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                        tipoVeiculo === 'moto'
                          ? 'border-[#ff5f00] bg-[#ff5f00]/10 text-[#ff5f00]'
                          : 'border-[#353534] text-[#ab8a7d] hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined">moped</span>
                      <span className="text-[10px] font-black uppercase mt-1">Moto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoVeiculo('carro')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                        tipoVeiculo === 'carro'
                          ? 'border-[#ff5f00] bg-[#ff5f00]/10 text-[#ff5f00]'
                          : 'border-[#353534] text-[#ab8a7d] hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined">directions_car</span>
                      <span className="text-[10px] font-black uppercase mt-1">Carro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoVeiculo('bike')}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${
                        tipoVeiculo === 'bike'
                          ? 'border-[#ff5f00] bg-[#ff5f00]/10 text-[#ff5f00]'
                          : 'border-[#353534] text-[#ab8a7d] hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined">pedal_bike</span>
                      <span className="text-[10px] font-black uppercase mt-1">Bike</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-[#ab8a7d]">Modelo</label>
                    <input
                      type="text"
                      value={modeloVeiculo}
                      onChange={(e) => setModeloVeiculo(e.target.value)}
                      className="w-full h-12 bg-[#353534] border-none rounded-lg px-4 focus:ring-2 focus:ring-[#ff5f00] outline-none text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-[#ab8a7d]">Placa</label>
                    <input
                      type="text"
                      value={placaVeiculo}
                      onChange={(e) => setPlacaVeiculo(e.target.value.toUpperCase())}
                      className="w-full h-12 bg-[#353534] border-none rounded-lg px-4 focus:ring-2 focus:ring-[#ff5f00] outline-none text-white font-bold uppercase"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Security Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#ff5f00] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  security
                </span>
                <h2 className="text-xl font-bold text-white">Segurança</h2>
              </div>
              <div className="bg-[#1c1b1b] p-4 rounded-xl space-y-3 border-l-4 border-[#ff5f00]">
                <h3 className="text-base font-bold text-white">Alterar Senha</h3>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Senha Atual"
                  className="w-full h-12 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-white"
                />
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova Senha"
                  className="w-full h-12 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-white"
                />
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirmar Nova Senha"
                  className="w-full h-12 bg-[#201f1f] border-2 border-[#353534] rounded-full px-6 focus:border-[#ff5f00] outline-none text-white"
                />
              </div>
            </section>

            {/* Botão Inferior Centralizado "Salvar Alterações" */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#131313] via-[#131313]/95 to-transparent pt-8 z-40 flex justify-center">
              <div className="max-w-2xl w-full">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[64px] bg-[#ff5f00] text-black font-lexend font-black text-xl uppercase tracking-widest rounded-full shadow-[0_8px_24px_rgba(255,95,0,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Save className="size-6" />
                  <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ========================================================
             R E S U M O   D O   P E R F I L  (resumo_do_perfil_ajustado)
             ======================================================== */
          <div className="space-y-6">
            {/* Profile Hero Section */}
            <section className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#ff5f00] shadow-xl shadow-orange-900/20">
                  {avatar ? (
                    <img src={avatar} alt={nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#ff5f00] text-black font-black text-4xl grid place-items-center uppercase">
                      {nome[0] || 'M'}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <span>{nome}</span>
                  <span
                    onClick={() => setIsEditing(true)}
                    className="material-symbols-outlined text-gray-400 text-xl cursor-pointer hover:text-[#ff5f00] transition-colors"
                    title="Editar Perfil"
                  >
                    edit
                  </span>
                </h1>
              </div>
            </section>

            {/* Bento Grid Sections */}
            <div className="grid grid-cols-1 gap-6">
              {/* Section: Metas Financeiras */}
              <div className="bg-[#121212] rounded-2xl border p-6 hover:border-[#ff5f00]/40 transition-all group border-zinc-700">
                <div className="flex justify-between items-start mb-6 relative">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ff5f00] text-2xl">payments</span>
                      <h2 className="text-xl font-bold text-white whitespace-nowrap">Metas Financeiras</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/metas-financeiras')}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-[#353534] hover:bg-[#ff5f00] text-white transition-all"
                      title="Editar Metas"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Rendimento Mensal</span>
                      <span className="text-xl font-bold text-[#ff5f00]">
                        R$ 8.450 / <span className="text-gray-500 text-sm">R$ 12.000</span>
                      </span>
                    </div>
                    <div className="h-3 bg-[#353534] rounded-full overflow-hidden">
                      <div className="h-full bg-[#ff5f00] w-[70%] rounded-full relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Média Diária</span>
                      <span className="text-lg font-semibold text-white">R$ 380,00</span>
                    </div>
                    <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Dias Ativos</span>
                      <span className="text-lg font-semibold text-white">22 Dias</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Dados do Veículo */}
              <button
                type="button"
                onClick={() => navigate('/cadastro-veiculo')}
                className="bg-[#121212] rounded-2xl border p-6 text-left hover:border-[#ff5f00]/40 transition-all flex items-center gap-6 group border-zinc-700 w-full"
              >
                <div className="w-20 h-20 rounded-xl bg-[#ff5f00]/20 flex items-center justify-center shrink-0 border border-[#ff5f00]/40">
                  <span className="material-symbols-outlined text-[#ff5f00] text-4xl">two_wheeler</span>
                </div>
                <div className="flex-grow space-y-1">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff5f00]">local_shipping</span>
                    Dados do Veículo
                  </h2>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-[#e5e2e1]">{modeloVeiculo}</span>
                    <span className="text-sm text-gray-400 font-medium">Placa: {placaVeiculo} • Prata</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-[#ff5f00] group-hover:border-[#ff5f00] transition-all text-white shrink-0">
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Alerta de confirmação para sair da edição sem salvar */}
      <ConfirmDialog
        open={showExitConfirm}
        title="Descartar Alterações?"
        description="Você possui alterações não salvas no perfil. Se sair agora, todas as edições serão perdidas."
        confirmLabel="Sair sem Salvar"
        cancelLabel="Continuar Editando"
        onConfirm={confirmExitWithoutSave}
        onCancel={() => setShowExitConfirm(false)}
      />
    </div>
  );
};

export default PerfilMotorista;