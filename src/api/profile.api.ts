import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

/**
 * Pure API service for driver profile, vehicle specs, and financial goals.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Updates profile settings for a given user.
 */
export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Upserts profile settings for a given user.
 */
export async function upsertProfile(userId: string, payload: ProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...payload, id: userId })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
