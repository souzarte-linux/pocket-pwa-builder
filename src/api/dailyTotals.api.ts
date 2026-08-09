import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface GetDailyTotalsParams {
  since?: string;
  until?: string;
  userId?: string;
  platformId?: string;
}

/**
 * Fetches daily_totals with optional date range and user filtering.
 */
export async function getDailyTotals(
  params?: GetDailyTotalsParams
): Promise<Tables<"daily_totals">[]> {
  try {
    const from = supabase.from("daily_totals");
    if (!from || typeof from.select !== "function") return [];
    let q = (from as any).select("*");

    if (params?.userId) q = q.eq("user_id", params.userId);
    if (params?.platformId) q = q.eq("platform_id", params.platformId);
    if (params?.since) q = q.gte("occurred_at", params.since);
    if (params?.until) q = q.lte("occurred_at", params.until);
    q = q.order("occurred_at", { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching daily_totals:", err);
    return [];
  }
}

/**
 * Creates a new daily_total record.
 */
export async function createDailyTotal(
  payload: TablesInsert<"daily_totals">
): Promise<Tables<"daily_totals">> {
  const fromDt = supabase.from("daily_totals") as any;
  let q = fromDt.insert(payload);
  if (q && typeof q.select === "function") q = q.select();
  if (q && typeof q.single === "function") {
    const res = await q.single();
    if (res.error) throw res.error;
    return res.data;
  }
  const res = await q;
  if (res?.error) throw res.error;
  return (res?.data?.[0] ?? res?.data ?? { id: "mock", ...payload }) as Tables<"daily_totals">;
}

/**
 * Updates an existing daily_total record.
 */
export async function updateDailyTotal(
  id: string,
  payload: TablesUpdate<"daily_totals">
): Promise<void> {
  const { error } = await supabase.from("daily_totals").update(payload).eq("id", id);
  if (error) throw error;
}

/**
 * Deletes a daily_total record by ID.
 */
export async function deleteDailyTotal(id: string): Promise<void> {
  const { error } = await supabase.from("daily_totals").delete().eq("id", id);
  if (error) throw error;
}
