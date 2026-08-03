import { Bell, ChevronLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SideDrawer } from './SideDrawer';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export const AppHeader = ({ title = 'CENTRAL DO\nMOTORISTA', subtitle, back, right }: Props) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setName(u.user_metadata?.full_name || u.email || '');
      supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', u.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p?.avatar_url) setAvatar(p.avatar_url);
          if (p?.full_name) setName(p.full_name);
        });
    });
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#131313]/90 backdrop-blur-xl border-b border-[#ff5f00]/30 safe-top">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {back ? (
              <button
                onClick={() => navigate('/')}
                className="size-11 min-h-[44px] min-w-[44px] grid place-items-center rounded-xl bg-[#201f1f] text-[#ff5f00] hover:bg-[#2a2a2a] active:scale-95 transition border border-[#ff5f00]/30 shadow-lg"
                aria-label="Voltar para a página principal"
                title="Voltar para a página principal"
              >
                <ChevronLeft className="size-6 stroke-[3]" />
              </button>
            ) : (
              <button
                onClick={() => setDrawerOpen(true)}
                className="size-11 min-h-[44px] min-w-[44px] shrink-0 grid place-items-center rounded-xl bg-[#201f1f] text-[#ff5f00] hover:bg-[#2a2a2a] border-2 border-[#ff5f00]/40 active:scale-95 transition shadow-lg"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="size-6" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="font-lexend font-extrabold text-[#ffb599] text-lg leading-[1.1] whitespace-pre-line uppercase tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[#ab8a7d] mt-0.5 truncate font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          {right ?? (
            <button
              onClick={() => navigate('/configuracoes')}
              className="size-11 min-h-[44px] min-w-[44px] grid place-items-center rounded-xl bg-[#201f1f] text-[#e5e2e1] hover:bg-[#2a2a2a] transition border border-stone-800"
              aria-label="Notificações"
            >
              <Bell className="size-5 text-[#ffb599]" />
            </button>
          )}
        </div>
      </header>

      <SideDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
};

