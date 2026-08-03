import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  History, 
  Receipt, 
  Settings, 
  LogOut, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState<string>('Motorista');
  const [email, setEmail] = useState<string>('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<string>('Moto Courier');

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email || '');
      setName(u.user_metadata?.full_name || u.email?.split('@')[0] || 'Motorista');

      supabase
        .from('profiles')
        .select('avatar_url, full_name, vehicle_model')
        .eq('id', u.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p?.avatar_url) setAvatar(p.avatar_url);
          if (p?.full_name) setName(p.full_name);
          if (p?.vehicle_model) setVehicle(p.vehicle_model);
        });
    });
  }, [open]);

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

  // Menu items (Excluídas opções duplicadas: Perfil, Veículo e Metas)
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
    {
      title: 'Configurações',
      subtitle: 'Preferências do aplicativo',
      path: '/configuracoes',
      icon: Settings,
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

        {/* Top Profile Banner Header - Clicar no usuário navega para o Perfil */}
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
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
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
