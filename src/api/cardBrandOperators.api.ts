import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Service Layer for public.card_brand_operators (Relacionamento Bidirecional Bandeira <-> Emissor)
 */

export interface CardBrandOperatorRelation extends Tables<"card_brand_operators"> {
  card_operators?: Tables<"card_operators"> | null;
}

/**
 * Fetches all card brand <-> operator relations for a user.
 */
export async function getCardBrandOperators(
  userId?: string
): Promise<CardBrandOperatorRelation[]> {
  try {
    const fromRel = supabase.from("card_brand_operators");
    if (!fromRel || typeof fromRel.select !== "function") return [];

    let q = (fromRel as any).select("*, card_operators(*)");
    if (userId && typeof (q as any)?.eq === "function") {
      q = (q as any).eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching card brand operators:", err);
    return [];
  }
}

/**
 * Adds a brand association to a card operator.
 */
export async function addBrandToOperator(
  payload: TablesInsert<"card_brand_operators">
): Promise<Tables<"card_brand_operators">> {
  const { data, error } = await (supabase.from("card_brand_operators") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Removes a brand association from a card operator.
 */
export async function removeBrandFromOperator(
  operatorId: string,
  brandName: string,
  userId: string
): Promise<void> {
  const { error } = await (supabase.from("card_brand_operators") as any)
    .delete()
    .eq("operator_id", operatorId)
    .eq("brand_name", brandName)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Syncs/sets the entire list of supported brand names for a given operator.
 */
export async function setOperatorBrands(
  operatorId: string,
  brandNames: string[],
  userId: string
): Promise<void> {
  // 1. Delete existing relations for this operator and user
  const { error: delError } = await (supabase.from("card_brand_operators") as any)
    .delete()
    .eq("operator_id", operatorId)
    .eq("user_id", userId);

  if (delError) throw delError;

  if (brandNames.length === 0) return;

  // 2. Insert new relations
  const payload = brandNames.map((brand_name) => ({
    user_id: userId,
    operator_id: operatorId,
    brand_name,
  }));

  const { error: insError } = await (supabase.from("card_brand_operators") as any).insert(
    payload
  );
  if (insError) throw insError;
}
