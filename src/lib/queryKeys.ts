/**
 * Centralized Query Keys Factory for TanStack Query.
 * Guarantees predictable, type-safe cache keys and seamless invalidation across the app.
 */
export const queryKeys = {
  /** Driver Profile & Vehicle / Goals */
  profile: (userId?: string | null) => ["profile", userId ?? null] as const,

  /** Delivery Platforms */
  platforms: (activeOnly: boolean = true) => ["platforms", { activeOnly }] as const,

  /** Platform Detail */
  platformDetail: (id: string) => ["platforms", "detail", id] as const,

  /** Invoices & Billing Cycles */
  billingCycles: (status?: string) => ["billing_cycles", { status: status ?? "all" }] as const,
  billingCycleDetail: (id: string) => ["billing_cycles", "detail", id] as const,

  /** Delivery Routes */
  routes: (params?: { period?: string; platformId?: string; since?: string; until?: string }) =>
    ["routes", params ?? {}] as const,

  /** Operating & Personal Expenses */
  expenses: (params?: { period?: string; category?: string; since?: string; until?: string }) =>
    ["expenses", params ?? {}] as const,

  /** Daily Totals (Lançamento Consolidado) */
  dailyTotals: (params?: { since?: string; until?: string }) =>
    ["daily_totals", params ?? {}] as const,

  /** Vehicle Odometer (KM Atual) */
  odometer: {
    current: () => ["odometer", "current"] as const,
  },

  /** Preventive & Corrective Maintenance */
  maintenance: {
    oil: () => ["maintenance", "oil"] as const,
    parts: (userId?: string | null) => ["maintenance", "parts", userId ?? null] as const,
  },

  /** Invoice Financial Adjustments (Descontos / Bonificações) */
  financialAdjustments: (cycleId?: string) =>
    ["financial_adjustments", { cycleId: cycleId ?? "all" }] as const,

  /** Auxiliary Master Tables */
  auxiliary: (entity: "companies" | "card_brands" | "card_issuers" | "gas_stations") =>
    ["auxiliary", entity] as const,
} as const;

export type QueryKeys = typeof queryKeys;
