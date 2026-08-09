import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface GetExpensesParams {
  category?: string;
  since?: string;
  until?: string;
  userId?: string;
  platformId?: string;
}

export type PartHistoryItem = Pick<
  Tables<"expenses">,
  "id" | "title" | "amount" | "odometer_km" | "occurred_at"
>;

/**
 * Fetches expenses with optional filtering.
 */
export async function getExpenses(params?: GetExpensesParams): Promise<Tables<"expenses">[]> {
  try {
    const from = supabase.from("expenses");
    if (!from || typeof from.select !== "function") return [];
    let q = (from as any).select("*");

    if (params?.userId) q = q.eq("user_id", params.userId);
    if (params?.category) q = q.eq("category", params.category);
    if (params?.since) q = q.gte("occurred_at", params.since);
    if (params?.until) q = q.lte("occurred_at", params.until);
    q = q.order("occurred_at", { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching expenses:", err);
    return [];
  }
}

/**
 * Fetches a single expense by ID.
 */
export async function getExpenseById(id: string): Promise<Tables<"expenses"> | null> {
  try {
    const from = supabase.from("expenses");
    if (!from || typeof from.select !== "function") return null;
    const { data, error } = await from.select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error fetching expense ${id}:`, err);
    return null;
  }
}

/**
 * Fetches maintenance history for a specific part title (debounced search).
 */
export async function getPartHistory(
  title: string,
  excludeId?: string
): Promise<PartHistoryItem[]> {
  try {
    const from = supabase.from("expenses");
    if (!from || typeof from.select !== "function") return [];
    const { data, error } = await (from as any)
      .select("id, title, amount, odometer_km, occurred_at")
      .eq("category", "manutencao")
      .ilike("title", title.trim())
      .order("occurred_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return (data ?? []).filter((d: any) => d.id !== excludeId);
  } catch (err) {
    console.error("Error fetching part history:", err);
    return [];
  }
}

/**
 * Fetches installments belonging to a group.
 */
export async function getInstallmentGroup(
  installmentGroupId: string
): Promise<
  Pick<
    Tables<"expenses">,
    "id" | "title" | "amount" | "installment_number" | "installment_total" | "occurred_at"
  >[]
> {
  try {
    const from = supabase.from("expenses");
    if (!from || typeof from.select !== "function") return [];
    const { data, error } = await (from as any)
      .select("id, title, amount, installment_number, installment_total, occurred_at")
      .eq("installment_group_id", installmentGroupId)
      .order("installment_number", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching installment group:", err);
    return [];
  }
}

/**
 * Creates one or more expense records.
 */
export async function createExpense(
  payload: TablesInsert<"expenses"> | TablesInsert<"expenses">[]
): Promise<void> {
  const { error } = await (supabase.from("expenses") as any).insert(payload);
  if (error) throw error;
}

/**
 * Updates a single expense record.
 */
export async function updateExpense(
  id: string,
  payload: TablesUpdate<"expenses">
): Promise<void> {
  const { error } = await supabase.from("expenses").update(payload).eq("id", id);
  if (error) throw error;
}

/**
 * Deletes a single expense by ID.
 */
export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Deletes all installments with a given installment_group_id.
 */
export async function deleteInstallmentGroup(installmentGroupId: string): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("installment_group_id", installmentGroupId);
  if (error) throw error;
}

/**
 * Deletes current and future installments (from installment_number >= fromNumber).
 */
export async function deleteFutureInstallments(
  installmentGroupId: string,
  fromNumber: number | null,
  fromDate?: string
): Promise<void> {
  let query = supabase
    .from("expenses")
    .delete()
    .eq("installment_group_id", installmentGroupId) as any;

  if (fromNumber !== null && fromNumber !== undefined) {
    query = query.gte("installment_number", fromNumber);
  } else if (fromDate) {
    query = query.gte("occurred_at", fromDate);
  }

  const { error } = await query;
  if (error) throw error;
}

/**
 * Upserts a part maintenance lifecycle record.
 */
export async function upsertPartMaintenance(payload: {
  user_id: string;
  part_name: string;
  life_km: number;
  last_change_km: number;
  last_change_at: string;
}): Promise<void> {
  const { error } = await (supabase.from("part_maintenance") as any).upsert(payload, {
    onConflict: "user_id,part_name",
  });
  if (error) throw error;
}
