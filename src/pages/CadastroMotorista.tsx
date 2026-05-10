import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image, User, Smartphone, Mail, User2, Share, Bike, MapPin, Lock, ShieldCheck, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CadastroMotorista = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    celular: '',
    whatsapp: false,
    redeSocial: '',
    veiculo: 'moto',
    placa: '',
    senha: '',
    confirmarSenha: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration data:', formData);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      {/* Header */}
      <header className="bg-zinc-950 text-primary-container font-black uppercase tracking-tighter fixed top-0 w-full border-b-2 border-zinc-800 flex justify-between items-center px-5 h-20 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth')}
            className="hover:bg-zinc-800 transition-colors active:scale-95 p-2 rounded-full"
          >
            <ArrowLeft className="text-2xl" />
          </Button>
          <h1 className="text-xl font-headline-xl">CADASTRO MOTORISTA</h1>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <main className="pt-24 pb-28 px-margin-main max-w-md mx-auto">
        {/* Profile Picture Section */}
        <section className="mb-stack-lg text-center">
          <div className="relative inline-block group">
            <div className="w-32 h-32 rounded-full border-4 border-primary-container overflow-hidden bg-surface-container-high flex items-center justify-center">
              <img
                alt="Avatar"
                className="w-full h-full object-cover opacity-60"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white text-4xl" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-4">
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-transparent group-active:border-primary-container transition-all">
                <Camera className="text-xl text-primary" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-on-surface-variant">Câmera</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-transparent group-active:border-primary-container transition-all">
                <Image className="text-xl text-primary" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-on-surface-variant">Galeria</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-transparent group-active:border-primary-container transition-all">
                <User className="text-xl text-primary" />
              </div>
              <span className="font-label-md text-[10px] uppercase text-on-surface-variant">Avatares</span>
            </button>
          </div>
        </section>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
          {/* Nome Completo */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Nome Completo</label>
            <div className="relative flex items-center">
              <User2 className="absolute left-4 text-on-surface-variant" size={20} />
              <input
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                placeholder="EX: JOÃO DA SILVA"
                type="text"
                required
              />
            </div>
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">E-mail</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-on-surface-variant" size={20} />
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                placeholder="EXEMPLO@EMAIL.COM"
                type="email"
                required
              />
            </div>
          </div>

          {/* Celular + WhatsApp */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Celular</label>
            <div className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <Smartphone className="absolute left-4 text-on-surface-variant" size={20} />
                <input
                  name="celular"
                  value={formData.celular}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                  placeholder="(00) 00000-0000"
                  type="tel"
                  required
                />
              </div>
              <label className="flex items-center gap-2 bg-surface-container border-2 border-surface-variant px-3 cursor-pointer hover:bg-surface-container-high transition-colors rounded">
                <input
                  name="whatsapp"
                  checked={formData.whatsapp}
                  onChange={handleInputChange}
                  className="w-5 h-5 accent-primary-container"
                  type="checkbox"
                />
                <span className="text-green-500 text-lg">📱</span>
              </label>
            </div>
          </div>

          {/* Rede Social */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Rede Social (Opcional)</label>
            <div className="relative flex items-center">
              <Share className="absolute left-4 text-on-surface-variant" size={20} />
              <input
                name="redeSocial"
                value={formData.redeSocial}
                onChange={handleInputChange}
                className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                placeholder="@SEUUSUARIO"
                type="text"
              />
            </div>
          </div>

          {/* Veículo Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Veículo</label>
              <div className="relative flex items-center">
                <Bike className="absolute left-4 text-on-surface-variant" size={20} />
                <select
                  name="veiculo"
                  value={formData.veiculo}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface appearance-none transition-colors"
                >
                  <option value="moto">Moto</option>
                  <option value="carro">Carro</option>
                  <option value="bike">Bike</option>
                </select>
                <div className="absolute right-4 text-on-surface-variant pointer-events-none">
                  ▼
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Placa</label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-4 text-on-surface-variant" size={20} />
                <input
                  name="placa"
                  value={formData.placa}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors uppercase"
                  placeholder="ABC-1234"
                  type="text"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <Button variant="ghost" className="flex items-center gap-2 text-primary hover:text-primary-container transition-colors">
              <span className="font-label-md text-[10px] uppercase tracking-wider">Configurações Detalhadas</span>
              <span className="material-symbols-outlined text-sm">settings</span>
            </Button>
          </div>

          {/* Senhas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Senha</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-on-surface-variant" size={20} />
                <input
                  name="senha"
                  value={formData.senha}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                  placeholder="********"
                  type="password"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface-variant uppercase text-[10px] ml-1">Confirmar Senha</label>
              <div className="relative flex items-center">
                <ShieldCheck className="absolute left-4 text-on-surface-variant" size={20} />
                <input
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleInputChange}
                  className="w-full h-touch-target-min bg-surface-container border-2 border-surface-variant focus:border-primary-container outline-none pl-12 pr-4 font-label-md text-on-surface placeholder:text-on-surface-variant transition-colors"
                  placeholder="********"
                  type="password"
                  required
                />
              </div>
            </div>
          </div>

          {/* Botão Finalizar */}
          <Button
            type="submit"
            className="mt-4 h-16 font-headline-md uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <span>FINALIZAR CADASTRO</span>
            <CheckCircle size={24} />
          </Button>
        </form>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-20 bg-zinc-950 px-4 pb-safe border-t-2 border-zinc-800">
        <button
          onClick={() => navigate('/auth')}
          className="flex flex-col items-center justify-center text-on-surface-variant pt-2 pb-safe hover:text-on-surface transition-all active:bg-zinc-900 group"
        >
          <ArrowLeft className="text-2xl" />
          <span className="font-bold text-[12px] uppercase">Voltar</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant pt-2 pb-safe hover:text-on-surface transition-all active:bg-zinc-900 group">
          <HelpCircle className="text-2xl" />
          <span className="font-bold text-[12px] uppercase">Ajuda</span>
        </button>
      </nav>
    </div>
  );
};

export default CadastroMotorista;