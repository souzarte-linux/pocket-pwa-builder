import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Home, Grid3X3, TrendingUp, Truck, Edit, ChevronRight, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PerfilMotorista = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-lg border-b border-zinc-700 fixed top-0 w-full border-b-2 border-primary-container/20 flex justify-between items-center px-5 h-20 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
            className="hover:bg-primary-container/20 transition-colors active:scale-95 p-2 rounded-full text-on-primary-container"
          >
            <ArrowLeft className="text-2xl" />
          </Button>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
            <img
              alt="Driver profile photo"
              className="w-full h-full object-cover"
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face"
            />
          </div>
          <h1 className="text-xl font-headline-xl text-primary-container uppercase tracking-tighter">PERFIL MOTORISTA</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-white/5 transition-colors p-2 rounded-full text-white"
        >
          <Bell className="text-xl" />
        </Button>
      </header>

      <main className="pt-24 pb-32 px-margin-main max-w-2xl mx-auto space-y-8">
        {/* Profile Hero Section */}
        <section className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-container shadow-xl shadow-orange-900/20">
              <img
                alt="Driver profile photo"
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face"
              />
            </div>
            <div className="absolute bottom-0 right-0 bg-primary-container p-2 rounded-full border-4 border-black">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="font-headline-md text-headline-md text-white">Fernando Souza</h1>
            <p className="font-body-md text-gray-400">fernando.souza@sigmalog.com.br</p>
          </div>
        </section>

        {/* Bento Grid Sections */}
        <div className="grid grid-cols-1 gap-6">
          {/* Section: Metas Financeiras */}
          <div className="bg-surface-container-low rounded-lg border p-6 hover:border-primary-container/40 transition-all group border-zinc-700">
            <div className="flex justify-between items-start mb-6 relative">
              <div className="space-y-1 flex-grow text-center flex flex-col items-center justify-center">
                <h2 className="font-headline-md text-headline-md text-white flex items-center gap-2">
                  <TrendingUp className="text-primary-container" size={24} />
                  Metas Financeiras
                </h2>
                <p className="text-sm text-gray-400">Progresso mensal atualizado</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-highest hover:bg-primary-container text-white transition-all absolute right-6"
              >
                <Edit size={20} />
              </Button>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold uppercase tracking-widest text-gray-500">Rendimento Mensal</span>
                  <span className="text-xl font-bold text-primary-container">R$ 8.450 / <span className="text-gray-600 text-sm">R$ 12.000</span></span>
                </div>
                <div className="h-3 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary-container w-[70%] rounded-full relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Média Diária</span>
                  <span className="text-lg font-semibold text-white">R$ 380,00</span>
                </div>
                <div className="bg-black/40 p-4 rounded-lg border border-white/5">
                  <span className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Dias Ativos</span>
                  <span className="text-lg font-semibold text-white">22 Dias</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Dados do Veículo */}
          <button
            onClick={() => navigate('/configuracoes')}
            className="bg-surface-container-low rounded-lg border p-6 text-left hover:border-primary-container/40 transition-all flex items-center gap-6 group border-zinc-700"
          >
            <div className="w-24 h-24 rounded-lg bg-surface-container-highest flex items-center justify-center relative overflow-hidden shrink-0">
              <img
                className="w-full h-full object-cover"
                alt="Vehicle"
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=96&h=96&fit=crop"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div className="flex-grow space-y-1">
              <h2 className="font-headline-md text-headline-md text-white flex items-center gap-2">
                <Truck className="text-primary-container" size={24} />
                Dados do Veículo
              </h2>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-on-background">Mercedes-Benz Sprinter 415</span>
                <span className="text-sm text-gray-500 font-medium">Placa: VEL-2024 • Prata Ártico</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary-container group-hover:border-primary-container transition-all text-white">
              <ChevronRight size={24} />
            </div>
          </button>

          {/* Quick Actions */}
          <div className="grid gap-4 grid-cols-1">
            <button
              onClick={() => navigate('/historico')}
              className="bg-surface-container-low p-5 rounded-lg border border-white/5 flex flex-col items-center justify-center text-center space-y-3 hover:border-primary-container/40 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-container">
                <History size={24} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Histórico</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-6 left-0 w-full z-50 flex justify-center items-center px-4">
        <div className="bg-surface-container-low/90 backdrop-blur-2xl border border-white/10 rounded-full flex items-center justify-between px-6 py-2 w-full max-w-md shadow-2xl shadow-orange-900/20">
          <button
            onClick={() => navigate('/home')}
            className="flex flex-col items-center justify-center text-gray-500 px-5 py-2 hover:text-white transition-all active:scale-90 duration-200"
          >
            <Home size={20} />
            <span className="font-label-sm text-[10px] font-semibold uppercase tracking-widest mt-1">Home</span>
          </button>
          <button
            onClick={() => navigate('/painel')}
            className="flex flex-col items-center justify-center text-gray-500 px-5 py-2 hover:text-white transition-all active:scale-90 duration-200"
          >
            <TrendingUp size={20} />
            <span className="font-label-sm text-[10px] font-semibold uppercase tracking-widest mt-1">Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/apps')}
            className="flex flex-col items-center justify-center text-gray-500 px-5 py-2 hover:text-white transition-all active:scale-90 duration-200"
          >
            <Grid3X3 size={20} />
            <span className="font-label-sm text-[10px] font-semibold uppercase tracking-widest mt-1">Apps</span>
          </button>
          <button className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-5 py-2 active:scale-90 duration-200">
            <History size={20} />
            <span className="font-label-sm text-[10px] font-semibold uppercase tracking-widest mt-1">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default PerfilMotorista;