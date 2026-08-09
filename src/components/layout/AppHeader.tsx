import { Bell, ChevronLeft, Menu, FileCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/format';
import { SideDrawer } from './SideDrawer';
import { ConfirmCycleModal } from '@/components/faturas/ConfirmCycleModal';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/queries/useProfile';

interface Props {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  created_at: string;
  billing_cycle_id: string;
  cycle?: {
    id: string;
    platform_name: string;
    period_start: string;
    period_end: string;
    expected_payment_date: string;
    status: string;
    total_amount?: number;
  };
}

export const AppHeader = ({ title = 'CENTRAL DO\nMOTORISTA', subtitle, back, right }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const avatar = profile?.avatar_url || null;
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || '';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeNotif, setActiveNotif] = useState<NotificationItem | null>(null);

  const fmtDateStr = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const fetchNotifications = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;

    const { data: notifRows } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        read,
        created_at,
        billing_cycle_id,
        billing_cycles (
          id,
          platform_id,
          period_start,
          period_end,
          expected_payment_date,
          status,
          platforms ( name )
        )
      `)
      .eq('user_id', u.user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (!notifRows || notifRows.length === 0) {
      setNotifications([]);
      return;
    }

    const cycleIds = notifRows.map((n) => n.billing_cycle_id).filter(Boolean) as string[];

    let routeMap: Record<string, number> = {};
    let dailyMap: Record<string, number> = {};
    let adjMap: Record<string, number> = {};

    if (cycleIds.length > 0) {
      const [rRes, dRes, aRes] = await Promise.all([
        supabase.from('routes').select('amount, tip, billing_cycle_id').in('billing_cycle_id', cycleIds),
        supabase.from('daily_totals').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds),
        supabase.from('financial_adjustments').select('amount, billing_cycle_id').in('billing_cycle_id', cycleIds),
      ]);

      routeMap = (rRes.data || []).reduce((acc: any, r: any) => {
        acc[r.billing_cycle_id] = (acc[r.billing_cycle_id] || 0) + Number(r.amount) + Number(r.tip);
        return acc;
      }, {});
      dailyMap = (dRes.data || []).reduce((acc: any, d: any) => {
        acc[d.billing_cycle_id] = (acc[d.billing_cycle_id] || 0) + Number(d.amount);
        return acc;
      }, {});
      adjMap = (aRes.data || []).reduce((acc: any, a: any) => {
        acc[a.billing_cycle_id] = (acc[a.billing_cycle_id] || 0) + Number(a.amount);
        return acc;
      }, {});
    }

    const items: NotificationItem[] = notifRows.map((n) => {
      const bc = n.billing_cycles as any;
      const cycleId = bc?.id || n.billing_cycle_id;
      const totalAmount = (routeMap[cycleId] || 0) + (dailyMap[cycleId] || 0) + (adjMap[cycleId] || 0);

      return {
        id: n.id,
        type: n.type,
        read: n.read,
        created_at: n.created_at,
        billing_cycle_id: n.billing_cycle_id || '',
        cycle: bc
          ? {
              id: bc.id,
              platform_name: bc.platforms?.name || 'Plataforma',
              period_start: bc.period_start,
              period_end: bc.period_end,
              expected_payment_date: bc.expected_payment_date,
              status: bc.status,
              total_amount: totalAmount,
            }
          : undefined,
      };
    });

    setNotifications(items);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#131313]/90 backdrop-blur-xl border-b border-[#ff5f00]/30 safe-top">
        <div className="flex items-center justify-between gap-3 px-4 py-3 relative">
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

          <div className="flex items-center gap-2 shrink-0">
            {right}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  fetchNotifications();
                }}
                className="size-11 min-h-[44px] min-w-[44px] grid place-items-center rounded-xl bg-[#201f1f] text-[#e5e2e1] hover:bg-[#2a2a2a] transition border border-stone-800 relative"
                aria-label="Notificações"
              >
                <Bell className="size-5 text-[#ffb599]" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff5f00] text-black font-extrabold text-[10px] size-5 rounded-full flex items-center justify-center border-2 border-[#131313] animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificações */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-[#1c1b1b] border-2 border-stone-800 rounded-3xl p-4 space-y-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 font-lexend">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Bell className="size-4 text-[#ff5f00]" />
                      NOTIFICAÇÕES
                    </h3>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="p-1 text-stone-400 hover:text-white rounded-lg"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#ab8a7d] text-center py-4 font-medium">
                      Nenhuma notificação não lida.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifOpen(false);
                            if (n.cycle) setActiveNotif(n);
                          }}
                          className="p-3 bg-[#201f1f] hover:bg-[#2a2a2a] border border-amber-500/30 rounded-2xl cursor-pointer transition space-y-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-[#ffb599] group-hover:text-[#ff5f00]">
                              {n.cycle?.platform_name || 'Nova Fatura Gerada'}
                            </span>
                            <span className="text-[10px] bg-amber-950/80 text-amber-400 font-extrabold px-2 py-0.5 rounded-full border border-amber-800/60">
                              PENDENTE
                            </span>
                          </div>
                          {n.cycle && (
                            <p className="text-[11px] text-[#ab8a7d] font-medium">
                              Período: {fmtDateStr(n.cycle.period_start)} → {fmtDateStr(n.cycle.period_end)}
                            </p>
                          )}
                          {n.cycle?.total_amount !== undefined && (
                            <p className="text-xs font-black text-white text-right">
                              {formatBRL(n.cycle.total_amount)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <SideDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      {/* Modal de Confirmação quando clicado via Notificação */}
      {activeNotif && activeNotif.cycle && (
        <ConfirmCycleModal
          cycle={activeNotif.cycle}
          notificationId={activeNotif.id}
          onClose={() => setActiveNotif(null)}
          onSuccess={() => fetchNotifications()}
        />
      )}
    </>
  );
};


