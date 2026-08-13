import { supabase } from "@/integrations/supabase/client";

export interface FinancialGoals {
  daily_goal: number | null;
  weekly_goal: number | null;
  monthly_goal: number | null;
}

/**
 * Service Layer for Financial Goals (Metas Financeiras: Diária, Semanal, Mensal)
 * Persisted in public.profiles table (columns: daily_goal, weekly_goal, monthly_goal)
 */

/**
 * Fetches financial goals for a given user.
 */
export async function getFinancialGoals(userId?: string | null): Promise<FinancialGoals | null> {
  let uid = userId;
  if (!uid) {
    try {
      const { data } = await supabase.auth.getUser();
      uid = data?.user?.id;
    } catch {
      return null;
    }
  }
  if (!uid) return null;

  try {
    const fromProf = supabase.from("profiles");
    if (!fromProf || typeof fromProf.select !== "function") return null;

    const { data, error } = await fromProf
      .select("daily_goal, weekly_goal, monthly_goal")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      daily_goal: data.daily_goal !== null ? Number(data.daily_goal) : null,
      weekly_goal: data.weekly_goal !== null ? Number(data.weekly_goal) : null,
      monthly_goal: data.monthly_goal !== null ? Number(data.monthly_goal) : null,
    };
  } catch (err) {
    console.error("Error fetching financial goals:", err);
    return null;
  }
}

/**
 * Updates financial goals for a given user.
 */
export async function updateFinancialGoals(
  userId: string,
  goals: Partial<FinancialGoals>
): Promise<FinancialGoals> {
  const payload: Record<string, unknown> = {};
  if (goals.daily_goal !== undefined) payload.daily_goal = goals.daily_goal;
  if (goals.weekly_goal !== undefined) payload.weekly_goal = goals.weekly_goal;
  if (goals.monthly_goal !== undefined) payload.monthly_goal = goals.monthly_goal;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload as any)
    .eq("id", userId)
    .select("daily_goal, weekly_goal, monthly_goal")
    .single();

  if (error) throw error;

  return {
    daily_goal: data.daily_goal !== null ? Number(data.daily_goal) : null,
    weekly_goal: data.weekly_goal !== null ? Number(data.weekly_goal) : null,
    monthly_goal: data.monthly_goal !== null ? Number(data.monthly_goal) : null,
  };
}
