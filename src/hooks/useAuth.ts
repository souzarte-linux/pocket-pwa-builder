import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};

    if (typeof supabase?.auth?.onAuthStateChange === 'function') {
      const res = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      });
      if (res?.data?.subscription?.unsubscribe) {
        unsubscribe = () => res.data.subscription.unsubscribe();
      }
    }

    if (typeof supabase?.auth?.getSession === 'function') {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(data?.session ?? null);
          setUser(data?.session?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else if (typeof supabase?.auth?.getUser === 'function') {
      supabase.auth
        .getUser()
        .then(({ data }) => {
          setUser(data?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
