import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Service Layer for public.parts_catalog (Catálogo Centralizado de Peças & Metadados)
 */

/**
 * Fetches parts from the central catalog for a user.
 */
export async function getPartsCatalog(userId?: string): Promise<Tables<"parts_catalog">[]> {
  try {
    const fromParts = supabase.from("parts_catalog");
    if (!fromParts || typeof fromParts.select !== "function") return [];

    let q = fromParts.select("*");
    if (userId && typeof (q as any)?.eq === "function") {
      q = (q as any).eq("user_id", userId);
    }
    if (typeof (q as any)?.order === "function") {
      q = (q as any).order("name");
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching parts catalog:", err);
    return [];
  }
}

/**
 * Fetches a single part by its ID.
 */
export async function getPartById(id: string): Promise<Tables<"parts_catalog"> | null> {
  try {
    const { data, error } = await (supabase.from("parts_catalog") as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching part by id:", err);
    return null;
  }
}

/**
 * Finds a part by exact or case-insensitive name match.
 */
export async function getPartByName(
  name: string,
  userId?: string
): Promise<Tables<"parts_catalog"> | null> {
  try {
    let q = (supabase.from("parts_catalog") as any)
      .select("*")
      .ilike("name", name.trim());

    if (userId) {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching part by name:", err);
    return null;
  }
}

/**
 * Creates a new part in the catalog.
 */
export async function createPart(
  payload: TablesInsert<"parts_catalog">
): Promise<Tables<"parts_catalog">> {
  const { data, error } = await (supabase.from("parts_catalog") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates an existing part in the catalog.
 */
export async function updatePart(
  id: string,
  payload: TablesUpdate<"parts_catalog">
): Promise<Tables<"parts_catalog">> {
  const { data, error } = await (supabase.from("parts_catalog") as any)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a part from the catalog.
 */
export async function deletePart(id: string): Promise<void> {
  const { error } = await supabase.from("parts_catalog").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Searches parts matching query string across name, category, manufacturer, or SKU.
 */
export async function searchParts(
  query: string,
  userId?: string
): Promise<Tables<"parts_catalog">[]> {
  try {
    const term = query.trim();
    if (!term) return getPartsCatalog(userId);

    let q = (supabase.from("parts_catalog") as any)
      .select("*")
      .or(
        `name.ilike.%${term}%,category.ilike.%${term}%,manufacturer.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`
      );

    if (userId) {
      q = q.eq("user_id", userId);
    }

    if (typeof q?.order === "function") {
      q = q.order("name");
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error searching parts:", err);
    return [];
  }
}
