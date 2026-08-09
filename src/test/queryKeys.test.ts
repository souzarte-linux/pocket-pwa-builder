import { describe, it, expect } from "vitest";
import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys Factory", () => {
  it("generates predictable profile query keys", () => {
    expect(queryKeys.profile("user-1")).toEqual(["profile", "user-1"]);
    expect(queryKeys.profile(null)).toEqual(["profile", null]);
    expect(queryKeys.profile(undefined)).toEqual(["profile", null]);
  });

  it("generates platforms query keys with active filters", () => {
    expect(queryKeys.platforms(true)).toEqual(["platforms", { activeOnly: true }]);
    expect(queryKeys.platforms(false)).toEqual(["platforms", { activeOnly: false }]);
  });

  it("generates billing cycles query keys", () => {
    expect(queryKeys.billingCycles()).toEqual(["billing_cycles", { status: "all" }]);
    expect(queryKeys.billingCycles("open")).toEqual(["billing_cycles", { status: "open" }]);
    expect(queryKeys.billingCycleDetail("cycle-123")).toEqual(["billing_cycles", "detail", "cycle-123"]);
  });

  it("generates transactional keys (routes, expenses, daily totals)", () => {
    expect(queryKeys.routes({ period: "7D" })).toEqual(["routes", { period: "7D" }]);
    expect(queryKeys.expenses({ category: "combustivel" })).toEqual([
      "expenses",
      { category: "combustivel" },
    ]);
    expect(queryKeys.dailyTotals({ since: "2026-08-01" })).toEqual([
      "daily_totals",
      { since: "2026-08-01" },
    ]);
  });

  it("generates maintenance, odometer and auxiliary keys", () => {
    expect(queryKeys.odometer.current()).toEqual(["odometer", "current"]);
    expect(queryKeys.maintenance.oil()).toEqual(["maintenance", "oil"]);
    expect(queryKeys.maintenance.parts("user-1")).toEqual(["maintenance", "parts", "user-1"]);
    expect(queryKeys.financialAdjustments("cycle-1")).toEqual([
      "financial_adjustments",
      { cycleId: "cycle-1" },
    ]);
    expect(queryKeys.auxiliary("companies")).toEqual(["auxiliary", "companies"]);
  });
});
