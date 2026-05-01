import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WorkSession {
  id: string;
  started_at: string;
  ended_at: string | null;
}

export function useWorkSession() {
  const [active, setActive] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setActive(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('work_sessions')
      .select('id, started_at, ended_at')
      .eq('user_id', u.user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Live timer tick when active
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from('work_sessions')
      .insert({ user_id: u.user.id })
      .select('id, started_at, ended_at')
      .single();
    if (!error && data) setActive(data);
  }, []);

  const stop = useCallback(async () => {
    if (!active) return;
    await supabase
      .from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', active.id);
    setActive(null);
  }, [active]);

  const elapsedMs = active ? Date.now() - new Date(active.started_at).getTime() : 0;

  return { active, loading, start, stop, refresh, elapsedMs, tick };
}

export const formatDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatHours = (ms: number) => {
  const h = ms / 3600000;
  return `${h.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h`;
};
