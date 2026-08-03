import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Bike, 
  Target, 
  Edit3, 
  CheckCircle2, 
  Star, 
  Package, 
  Phone, 
  Mail, 
  CreditCard, 
  FileText, 
  Save, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PerfilMotorista = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('Fernando Souza');
  const [email, setEmail] = useState('fernando.souza@sigmalog.com.br');
  const [phone, setPhone] = useState('(11) 98765-4321');
  const [cpf, setCpf] = useState('123.456.789-00');
  const [cnh, setCnh] = useState('98765432100');
  const [cnhCategory, setCnhCategory] = useState('A / B');
  const [pixKey, setPixKey] = useState('12345678900');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Vehicle info
  const [vehicleModel, setVehicleModel] = useState('Honda CG 160 Fan');
  const [vehiclePlate, setVehiclePlate] = useState('ABC-1D23');
  const [vehicleColor, setVehicleColor] = useState('Preto Fosco');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email || 'fernando.souza@sigmalog.com.br');
      setName(u.user_metadata?.full_name || 'Fernando Souza');

      supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p) {
            const profileData = p as any;
            if (profileData.full_name) setName(profileData.full_name);
            if (profileData.avatar_url) setAvatar(profileData.avatar_url);
            if (profileData.phone) setPhone(profileData.phone);
            if (profileData.vehicle_model) setVehicleModel(profileData.vehicle_model);
            if (profileData.plate) setVehiclePlate(profileData.plate);
          }
        });
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const u = (await supabase.auth.getUser()).data.user;
      if (u) {
        await supabase.from('profiles').upsert({
          id: u.id,
          full_name: name,
          phone: phone,
          vehicle_model: vehicleModel,
          plate: vehiclePlate,
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
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-lexend pb-28">
      <AppHeader title={isEditing ? 'EDITAR PERFIL' : 'PERFIL DO MOTORISTA'} subtitle="Kinetic Velocity Logistics" />

      <main className="px-5 pt-6 max-w-xl mx-auto space-y-6">
        {/* Toggle Mode Banner */}
        <div className="flex items-center justify-between bg-[#1c1b1b] p-2.5 rounded-2xl border border-[#ff5f00]/30">
          <span className="text-xs font-bold uppercase tracking-wider text-[#ab8a7d] px-3">
            {isEditing ? 'Modo de Edição' : 'Visão Geral do Perfil'}
          </span>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5f00] text-black font-extrabold text-xs uppercase tracking-wider active:scale-95 transition shadow-lg"
          >
            {isEditing ? (
              <>
                <X className="size-4" /> Cancelar
              </>
            ) : (
              <>
                <Edit3 className="size-4" /> Editar Perfil
              </>
            )}
          </button>
        </div>

        {/* Profile Card Hero */}
        <section className="bg-[#1c1b1b] rounded-3xl p-6 border-2 border-[#ff5f00]/30 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff5f00]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative group mb-4">
            <div className="size-28 rounded-full border-4 border-[#ff5f00] overflow-hidden bg-[#0e0e0e] shadow-xl">
              {avatar ? (
                <img src={avatar} alt={name} className="size-full object-cover" />
              ) : (
                <div className="size-full bg-[#ff5f00] text-black font-black text-4xl grid place-items-center uppercase">
                  {name[0] || 'M'}
                </div>
              )}
            </div>
            {isEditing && (
              <button 
                type="button" 
                onClick={() => toast.info('Selecione uma imagem na sua galeria')}
                className="absolute bottom-0 right-0 bg-[#ff5f00] text-black p-2.5 rounded-full border-2 border-[#131313] active:scale-90 shadow-lg"
              >
                <Edit3 className="size-4" />
              </button>
            )}
          </div>

          <h2 className="font-extrabold text-2xl text-[#e5e2e1] uppercase tracking-tight">{name}</h2>
          <p className="text-xs text-[#ab8a7d] font-medium mt-0.5">{email}</p>

          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff5f00]/15 text-[#ffb599] border border-[#ff5f00]/30 font-bold text-xs">
            <ShieldCheck className="size-4 text-[#ff5f00]" />
            <span>Motorista Verificado • CNH {cnhCategory}</span>
          </div>

          {/* Quick Metrics */}
          {!isEditing && (
            <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-5 border-t border-[#2a2a2a]">
              <div className="bg-[#201f1f] p-3 rounded-2xl border border-stone-800 flex flex-col items-center">
                <div className="flex items-center gap-1 text-amber-400 font-extrabold text-base">
                  <Star className="size-4 fill-amber-400" /> 4.9
                </div>
                <span className="text-[10px] text-[#ab8a7d] font-bold uppercase mt-1">Avaliação</span>
              </div>
              <div className="bg-[#201f1f] p-3 rounded-2xl border border-stone-800 flex flex-col items-center">
                <div className="flex items-center gap-1 text-[#ffb599] font-extrabold text-base">
                  <Package className="size-4 text-[#ff5f00]" /> 1.240
                </div>
                <span className="text-[10px] text-[#ab8a7d] font-bold uppercase mt-1">Entregas</span>
              </div>
              <div className="bg-[#201f1f] p-3 rounded-2xl border border-stone-800 flex flex-col items-center">
                <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-base">
                  <CheckCircle2 className="size-4" /> 100%
                </div>
                <span className="text-[10px] text-[#ab8a7d] font-bold uppercase mt-1">Documentos</span>
              </div>
            </div>
          )}
        </section>

        {isEditing ? (
          /* FORMULÁRIO DE EDIÇÃO DO PERFIL */
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
                <User className="size-4" /> Dados Pessoais
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>
            </div>

            <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#ff5f00] flex items-center gap-2">
                <FileText className="size-4" /> Habilitação & Pagamentos
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Número da CNH</label>
                <input
                  type="text"
                  value={cnh}
                  onChange={(e) => setCnh(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Categoria CNH</label>
                <input
                  type="text"
                  value={cnhCategory}
                  onChange={(e) => setCnhCategory(e.target.value)}
                  className="w-full h-14 px-4 bg-[#201f1f] border-2 border-stone-800 focus:border-[#ff5f00] rounded-2xl text-[#e5e2e1] font-semibold text-base outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#ab8a7d] mb-1.5">Chave PIX para Recebimentos</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
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
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </form>
        ) : (
          /* RESUMO DO PERFIL DO MOTORISTA */
          <div className="space-y-4">
            {/* Card Veículo Cadastrado */}
            <div 
              onClick={() => navigate('/cadastro-veiculo')}
              className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] hover:border-[#ff5f00]/50 transition cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#ff5f00] text-black rounded-2xl font-black">
                    <Bike className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#e5e2e1] group-hover:text-[#ffb599] transition">
                      Veículo em Uso
                    </h3>
                    <p className="text-xs text-[#ab8a7d] font-semibold">{vehicleModel}</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-[#ff5f00] group-hover:translate-x-1 transition-transform" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2a2a2a] text-xs">
                <div className="bg-[#201f1f] p-2.5 rounded-xl">
                  <span className="block text-[10px] text-[#ab8a7d] uppercase font-bold">Placa</span>
                  <span className="font-extrabold text-[#e5e2e1]">{vehiclePlate}</span>
                </div>
                <div className="bg-[#201f1f] p-2.5 rounded-xl">
                  <span className="block text-[10px] text-[#ab8a7d] uppercase font-bold">Cor</span>
                  <span className="font-extrabold text-[#e5e2e1]">{vehicleColor}</span>
                </div>
              </div>
            </div>

            {/* Metas e Rendimento Resumo */}
            <div 
              onClick={() => navigate('/metas-financeiras')}
              className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] hover:border-[#ff5f00]/50 transition cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#ff5f00]/20 text-[#ff5f00] rounded-2xl font-black">
                    <Target className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#e5e2e1] group-hover:text-[#ffb599] transition">
                      Metas Financeiras
                    </h3>
                    <p className="text-xs text-[#ab8a7d] font-semibold">Meta Mensal: R$ 12.000,00</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-[#ff5f00] group-hover:translate-x-1 transition-transform" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#ab8a7d]">Acumulado Mês</span>
                  <span className="text-[#ff5f00]">R$ 8.450,00 (70%)</span>
                </div>
                <div className="h-3 bg-[#0e0e0e] rounded-full overflow-hidden p-0.5 border border-stone-800">
                  <div className="h-full bg-[#ff5f00] rounded-full w-[70%]" />
                </div>
              </div>
            </div>

            {/* Informações de Contato e Documentos */}
            <div className="bg-[#1c1b1b] p-5 rounded-3xl border border-[#2a2a2a] space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#ab8a7d] mb-2">
                Informações de Registro
              </h3>

              <div className="flex items-center gap-3 p-3 bg-[#201f1f] rounded-2xl">
                <Phone className="size-5 text-[#ff5f00] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-[#ab8a7d] uppercase font-bold">Telefone</span>
                  <span className="font-bold text-sm text-[#e5e2e1] truncate">{phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#201f1f] rounded-2xl">
                <Mail className="size-5 text-[#ff5f00] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-[#ab8a7d] uppercase font-bold">E-mail</span>
                  <span className="font-bold text-sm text-[#e5e2e1] truncate">{email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#201f1f] rounded-2xl">
                <CreditCard className="size-5 text-[#ff5f00] shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-[#ab8a7d] uppercase font-bold">Chave PIX</span>
                  <span className="font-bold text-sm text-[#e5e2e1] truncate">{pixKey}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PerfilMotorista;