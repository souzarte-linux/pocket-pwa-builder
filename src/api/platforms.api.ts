import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Platform = Tables<"platforms">;
export type PlatformInsert = TablesInsert<"platforms">;
export type PlatformUpdate = TablesUpdate<"platforms">;

/**
 * Pure API service for delivery platforms (iFood, Rappi, Loggi, etc.).
 */
export async function getPlatforms(activeOnly: boolean = true): Promise<Platform[]> {
  let query = supabase
    .from("platforms")
    .select("*")
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Fetches a single platform by ID.
 */
export async function getPlatformById(id: string): Promise<Platform | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Creates a new delivery platform.
 */
export async function createPlatform(payload: PlatformInsert): Promise<Platform> {
  const { data, error } = await supabase
    .from("platforms")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates an existing delivery platform.
 */
export async function updatePlatform(id: string, payload: PlatformUpdate): Promise<Platform> {
  const { data, error } = await supabase
    .from("platforms")
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
 * Deletes a delivery platform by ID.
 */
export async function deletePlatform(id: string): Promise<void> {
  const { error } = await supabase
    .from("platforms")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}
