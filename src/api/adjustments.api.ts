import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type FinancialAdjustment = Tables<"financial_adjustments">;
export type FinancialAdjustmentInsert = TablesInsert<"financial_adjustments">;
export type FinancialAdjustmentUpdate = TablesUpdate<"financial_adjustments">;

export interface GetFinancialAdjustmentsParams {
  cycleId?: string;
  since?: string;
  until?: string;
  userId?: string;
  platformId?: string;
}

/**
 * Pure API service for financial adjustments (bonuses, discounts, penalties).
 */
export async function getFinancialAdjustments(
  params?: GetFinancialAdjustmentsParams
): Promise<FinancialAdjustment[]> {
  try {
    const fromAdj = supabase.from("financial_adjustments");
    if (!fromAdj || typeof fromAdj.select !== "function") return [];
    let q = fromAdj.select("*");

    if (params?.cycleId && params.cycleId !== "all") {
      q = q.eq("billing_cycle_id", params.cycleId);
    }
    if (params?.platformId) {
      q = q.eq("platform_id", params.platformId);
    }
    if (params?.userId) {
      q = q.eq("user_id", params.userId);
    }
    if (params?.since) {
      q = q.gte("occurred_at", params.since);
    }
    if (params?.until) {
      q = q.lte("occurred_at", params.until);
    }

    const { data, error } = await q.order("occurred_at", { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (err) {
    console.error("Error fetching financial adjustments:", err);
    return [];
  }
}

/**
 * Creates a new financial adjustment.
 */
export async function createFinancialAdjustment(
  payload: FinancialAdjustmentInsert
): Promise<FinancialAdjustment> {
  const { data, error } = await supabase
    .from("financial_adjustments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Inserts multiple financial adjustments in batch.
 */
export async function createFinancialAdjustmentsBatch(
  payloads: FinancialAdjustmentInsert[]
): Promise<FinancialAdjustment[]> {
  if (!payloads || payloads.length === 0) return [];

  const { data, error } = await supabase
    .from("financial_adjustments")
    .insert(payloads)
    .select();

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Updates an existing financial adjustment.
 */
export async function updateFinancialAdjustment(
  id: string,
  payload: FinancialAdjustmentUpdate
): Promise<FinancialAdjustment> {
  const { data, error } = await supabase
    .from("financial_adjustments")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Deletes a financial adjustment by ID.
 */
export async function deleteFinancialAdjustment(id: string): Promise<void> {
  const { error } = await supabase
    .from("financial_adjustments")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Deletes adjustments linked to a billing cycle by types.
 */
export async function deleteCycleAdjustmentsByType(
  cycleId: string,
  types: string[]
): Promise<void> {
  const { error } = await supabase
    .from("financial_adjustments")
    .delete()
    .eq("billing_cycle_id", cycleId)
    .in("type", types);

  if (error) {
    throw error;
  }
}
