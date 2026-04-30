import { NavLink } from 'react-router-dom';
import { Home, BarChart3, Briefcase, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Início', Icon: Home, end: true },
  { to: '/painel', label: 'Painel', Icon: BarChart3 },
  { to: '/apps', label: 'Apps', Icon: Briefcase },
  { to: '/historico', label: 'Histórico', Icon: History },
];

export const BottomNav = () => (
  <nav
    className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 border-t border-border/60 bg-surface-low/95 backdrop-blur-xl safe-bottom px-2 pt-2"
    aria-label="Navegação principal"
  >
    <ul className="grid grid-cols-4 gap-1">
      {items.map(({ to, label, Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-semibold tracking-wide transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-fab'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="size-5" strokeWidth={2.2} aria-hidden />
            <span className="uppercase">{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
