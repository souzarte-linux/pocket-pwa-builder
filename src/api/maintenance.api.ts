import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type OilChange = Tables<"oil_changes">;
export type OilChangeInsert = TablesInsert<"oil_changes">;
export type OilChangeUpdate = TablesUpdate<"oil_changes">;

export type PartMaintenance = Tables<"part_maintenance">;
export type PartMaintenanceInsert = TablesInsert<"part_maintenance">;
export type PartMaintenanceUpdate = TablesUpdate<"part_maintenance">;

/**
 * Fetches all oil changes ordered by changed_at descending.
 */
export async function getOilChanges(userId?: string): Promise<OilChange[]> {
  try {
    const fromOil = supabase.from("oil_changes");
    if (!fromOil || typeof fromOil.select !== "function") return [];
    let q = fromOil.select("*").order("changed_at", { ascending: false });

    if (userId) {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching oil changes:", err);
    return [];
  }
}

/**
 * Records a new oil change.
 */
export async function createOilChange(payload: OilChangeInsert): Promise<OilChange> {
  const { data, error } = await supabase
    .from("oil_changes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing oil change record.
 */
export async function updateOilChange(
  id: string,
  payload: OilChangeUpdate
): Promise<OilChange> {
  const { data, error } = await supabase
    .from("oil_changes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes an oil change record.
 */
export async function deleteOilChange(id: string): Promise<void> {
  const { error } = await supabase
    .from("oil_changes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Fetches vehicle parts maintenance list.
 */
export async function getPartMaintenance(userId?: string): Promise<PartMaintenance[]> {
  try {
    const fromParts = supabase.from("part_maintenance");
    if (!fromParts || typeof fromParts.select !== "function") return [];
    let q = fromParts.select("*");

    if (userId) {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching part maintenance:", err);
    return [];
  }
}

/**
 * Upserts a part maintenance record.
 */
export async function upsertPartMaintenanceRecord(
  payload: PartMaintenanceInsert
): Promise<PartMaintenance> {
  const { data, error } = await supabase
    .from("part_maintenance")
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing part maintenance record.
 */
export async function updatePartMaintenanceRecord(
  id: string,
  payload: PartMaintenanceUpdate
): Promise<PartMaintenance> {
  const { data, error } = await supabase
    .from("part_maintenance")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a part maintenance record.
 */
export async function deletePartMaintenanceRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("part_maintenance")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
