import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Companies API
 */
export async function getCompanies(userId?: string): Promise<Tables<"companies">[]> {
  try {
    const fromComp = supabase.from("companies");
    if (!fromComp || typeof fromComp.select !== "function") return [];
    let q = fromComp.select("*");
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
    console.error("Error fetching companies:", err);
    return [];
  }
}

export async function createCompany(
  payload: TablesInsert<"companies">
): Promise<Tables<"companies">> {
  const { data, error } = await (supabase.from("companies") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Card Operators / Brands API
 */
export async function getCardOperators(userId?: string): Promise<Tables<"card_operators">[]> {
  try {
    const fromCard = supabase.from("card_operators");
    if (!fromCard || typeof fromCard.select !== "function") return [];
    let q = fromCard.select("*");
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
    console.error("Error fetching card operators:", err);
    return [];
  }
}

export async function createCardOperator(
  payload: TablesInsert<"card_operators">
): Promise<Tables<"card_operators">> {
  const { data, error } = await (supabase.from("card_operators") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCardOperator(
  id: string,
  payload: TablesUpdate<"card_operators">
): Promise<Tables<"card_operators">> {
  const { data, error } = await (supabase.from("card_operators") as any)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCardOperator(id: string): Promise<void> {
  const { error } = await supabase.from("card_operators").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Gas Stations API
 */
export async function getGasStations(userId?: string): Promise<Tables<"gas_stations">[]> {
  try {
    const fromGas = supabase.from("gas_stations");
    if (!fromGas || typeof fromGas.select !== "function") return [];
    let q = fromGas.select("*");
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
    console.error("Error fetching gas stations:", err);
    return [];
  }
}

export async function createGasStation(
  payload: TablesInsert<"gas_stations">
): Promise<Tables<"gas_stations">> {
  const { data, error } = await (supabase.from("gas_stations") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGasStation(
  id: string,
  payload: TablesUpdate<"gas_stations">
): Promise<Tables<"gas_stations">> {
  const { data, error } = await (supabase.from("gas_stations") as any)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGasStation(id: string): Promise<void> {
  const { error } = await supabase.from("gas_stations").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Parts Catalog API
 */
export async function getPartsCatalog(): Promise<Tables<"parts_catalog">[]> {
  try {
    const fromParts = supabase.from("parts_catalog");
    if (!fromParts || typeof fromParts.select !== "function") return [];
    const { data, error } = await fromParts.select("*").order("name");
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error("Error fetching parts catalog:", err);
    return [];
  }
}
