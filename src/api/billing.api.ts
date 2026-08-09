import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BillingCycle = Tables<"billing_cycles">;
export type BillingCycleInsert = TablesInsert<"billing_cycles">;
export type BillingCycleUpdate = TablesUpdate<"billing_cycles">;

export interface GetBillingCyclesOptions {
  status?: string;
  userId?: string;
}

/**
 * Pure API service for billing cycles and invoices management.
 */
export async function getBillingCycles(options?: GetBillingCyclesOptions): Promise<BillingCycle[]> {
  let query = supabase
    .from("billing_cycles")
    .select("*")
    .order("period_start", { ascending: false });

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetches a single billing cycle by ID.
 */
export async function getBillingCycleById(id: string): Promise<BillingCycle | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Creates a new billing cycle.
 */
export async function createBillingCycle(payload: BillingCycleInsert): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates an existing billing cycle (e.g. status 'confirmed' or 'paid').
 */
export async function updateBillingCycle(id: string, payload: BillingCycleUpdate): Promise<BillingCycle> {
  const { data, error } = await supabase
    .from("billing_cycles")
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
 * Deletes a billing cycle by ID.
 */
export async function deleteBillingCycle(id: string): Promise<void> {
  const { error } = await supabase
    .from("billing_cycles")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
