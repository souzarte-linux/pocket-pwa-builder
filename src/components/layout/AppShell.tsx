import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { AppHeader } from './AppHeader';

interface Props {
  children: ReactNode;
  hideNav?: boolean;
  hideHeader?: boolean;
  title?: string;
  subtitle?: string;
  back?: boolean;
  headerRight?: ReactNode;
}

export const AppShell = ({
  children,
  hideNav,
  hideHeader,
  title,
  subtitle,
  back,
  headerRight,
}: Props) => (
  <div className="app-shell pb-24">
    {!hideHeader && (
      <AppHeader title={title} subtitle={subtitle} back={back} right={headerRight} />
    )}
    <main className="px-5 pt-4 pb-6 animate-fade-in">{children}</main>
    {!hideNav && <BottomNav />}
  </div>
);
