import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FolderPlus,
  Building2,
  Fuel,
  Smartphone,
  CreditCard,
  Wrench,
  LayoutDashboard, 
  BarChart3, 
  History, 
  Receipt, 
  Settings, 
  LogOut, 
  ChevronRight,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/queries/useProfile';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Motorista';
  const email = user?.email || '';
  const avatar = profile?.avatar_url || null;
  const vehicle = profile?.vehicle_model || 'Moto Courier';
  const [cadastroOpen, setCadastroOpen] = useState<boolean>(true);

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair: ' + error.message);
    } else {
      toast.success('Sessão encerrada com sucesso!');
      navigate('/auth');
    }
  };

  // Sub-itens da seção Cadastro
  const cadastroSubItems = [
    {
      title: 'Empresas',
      subtitle: 'Prestadoras de Serviços',
      path: '/empresas',
      icon: Building2,
    },
    {
      title: 'Postos de Gasolina',
      subtitle: 'Postos e abastecimento',
      path: '/posto/novo',
      icon: Fuel,
    },
    {
      title: 'Emissores',
      subtitle: 'Instituições Emissoras dos Cartões',
      path: '/emissores',
      icon: CreditCard,
    },
    {
      title: 'Apps & Plataformas',
      subtitle: 'Plataformas de entrega e repasse',
      path: '/apps',
      icon: Smartphone,
    },
    {
      title: 'Bandeiras',
      subtitle: 'Cartões e formas de pagamento',
      path: '/bandeiras',
      icon: CreditCard,
    },
    {
      title: 'Monitoramento Peças',
      subtitle: 'Controle de trocas e manutenção',
      path: '/trocas-oleo',
      icon: Wrench,
    },
  ];

  // Menu principal
  const menuItems = [
    {
      title: 'Painel Geral',
      subtitle: 'Resumo e indicadores',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      title: 'Relatórios',
      subtitle: 'Desempenho e finanças',
      path: '/relatorios',
      icon: BarChart3,
    },
    {
      title: 'Histórico',
      subtitle: 'Registro de entregas e corridas',
      path: '/historico',
      icon: History,
    },
    {
      title: 'Faturas & Manutenção',
      subtitle: 'Gastos e revisões da frota',
      path: '/faturas',
      icon: Receipt,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-[85vw] max-w-sm p-0 bg-[#131313] border-r-2 border-[#ff5f00]/30 text-on-surface flex flex-col h-full font-lexend overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menu de Navegação</SheetTitle>
        </SheetHeader>

        {/* Top Profile Banner Header */}
        <div className="bg-[#1c1b1b] p-5 pt-8 border-b border-[#2a2a2a] relative">
          <div 
            onClick={() => handleNavigate('/perfil')}
            className="flex items-center gap-3 cursor-pointer group p-2 -m-2 rounded-xl hover:bg-[#252424] transition-all"
            title="Acessar Perfil do Motorista"
          >
            <div className="relative size-14 shrink-0">
              <div className="size-14 rounded-full border-2 border-[#ff5f00] p-0.5 bg-[#0e0e0e] overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt={name} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="size-full rounded-full bg-[#ff5f00] text-black font-extrabold text-xl grid place-items-center uppercase">
                    {name[0] || 'M'}
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 size-4 bg-emerald-500 border-2 border-[#131313] rounded-full" title="Online" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg text-[#e5e2e1] truncate group-hover:text-[#ffb599] transition">
                  {name}
                </h2>
                <ChevronRight className="size-5 text-[#ff5f00] group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-[#ab8a7d] truncate font-medium">{email}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#ffb599] bg-[#ff5f00]/10 px-2 py-0.5 rounded-full w-fit">
                <ShieldCheck className="size-3 text-[#ff5f00]" />
                <span className="truncate">{vehicle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 custom-scrollbar">
          {/* Seção Cadastro (Acima da opção Painel Geral) */}
          <div className="bg-[#1c1b1b] border border-[#ff5f00]/30 rounded-2xl overflow-hidden transition-all">
            <button
              onClick={() => setCadastroOpen(!cadastroOpen)}
              className="w-full min-h-[56px] flex items-center justify-between px-4 py-3 text-left hover:bg-[#252424] transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2 rounded-lg shrink-0 bg-[#ff5f00] text-black">
                  <FolderPlus className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-[#ffb599] tracking-tight">
                    Cadastro
                  </div>
                  <p className="text-[11px] text-[#ab8a7d] truncate leading-tight mt-0.5">
                    Empresas, Postos, Operadoras...
                  </p>
                </div>
              </div>
              {cadastroOpen ? (
                <ChevronDown className="size-4 text-[#ff5f00] shrink-0" />
              ) : (
                <ChevronRight className="size-4 text-[#ab8a7d] shrink-0" />
              )}
            </button>

            {/* Sub-itens expandidos do Cadastro */}
            {cadastroOpen && (
              <div className="px-2 pb-2 space-y-1 bg-[#161515] border-t border-[#2a2a2a] pt-1">
                {cadastroSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = location.pathname === sub.path;

                  return (
                    <button
                      key={sub.title}
                      onClick={() => handleNavigate(sub.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                        isSubActive
                          ? 'bg-[#ff5f00]/20 text-[#ffb599] font-bold border-l-2 border-[#ff5f00]'
                          : 'text-[#e5e2e1] hover:bg-[#201f1f] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon className={`size-4 shrink-0 ${isSubActive ? 'text-[#ff5f00]' : 'text-[#ab8a7d]'}`} />
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{sub.title}</span>
                          <span className="text-[10px] text-[#ab8a7d] block truncate">{sub.subtitle}</span>
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 text-[#ab8a7d] shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Menu Principal (Painel Geral, Relatórios, etc.) */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full min-h-[56px] flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left active:scale-[0.98] ${
                  isActive 
                    ? 'bg-[#ff5f00]/15 text-[#ffb599] border-l-4 border-[#ff5f00] font-bold' 
                    : 'bg-[#1c1b1b] text-[#e5e2e1] hover:bg-[#252424] font-medium'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-[#ff5f00] text-black' : 'bg-[#2a2a2a] text-[#ffb599]'}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm tracking-tight flex items-center gap-1 font-bold">
                      {item.title}
                    </div>
                    <p className="text-[11px] text-[#ab8a7d] truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className={`size-4 shrink-0 transition-transform ${isActive ? 'text-[#ff5f00]' : 'text-[#ab8a7d]'}`} />
              </button>
            );
          })}
        </div>

        {/* Logout Footer Button */}
        <div className="p-4 bg-[#0e0e0e] border-t border-[#2a2a2a]">
          <button
            onClick={handleLogout}
            className="w-full min-h-[56px] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-900/60 border border-red-800/40 transition active:scale-95 font-bold uppercase tracking-wider text-sm"
          >
            <LogOut className="size-5" />
            <span>Sair do Aplicativo</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
