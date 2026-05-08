import { Bell, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export const AppHeader = ({ title = 'CENTRAL DO\nMOTORISTA', subtitle, back, right }: Props) => {
  const navigate = useNavigate();
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
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 safe-top">
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {back ? (
            <button
              onClick={() => navigate(-1)}
              className="size-10 grid place-items-center rounded-full text-primary hover:bg-surface-high active:scale-95 transition"
              aria-label="Voltar"
            >
              <ChevronLeft className="size-6" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/configuracoes')}
              className="relative size-11 shrink-0"
              aria-label="Configurações"
            >
              <div className="size-11 rounded-full border-2 border-primary p-[2px] bg-surface">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <div className="size-full rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-bold text-sm">
                    {name?.[0]?.toUpperCase() || 'D'}
                  </div>
                )}
              </div>
            </button>
          )}
          <div className="min-w-0">
            <h1 className="display text-primary text-lg leading-[1.05] whitespace-pre-line">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {right ?? (
          <button
            className="size-10 grid place-items-center rounded-xl bg-surface-high text-foreground hover:bg-surface-highest transition"
            aria-label="Notificações"
          >
            <Bell className="size-5" />
          </button>
        )}
      </div>
    </header>
  );
};
