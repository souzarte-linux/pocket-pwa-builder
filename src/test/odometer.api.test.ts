import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentOdometer } from "@/api/odometer.api";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: () => mockObj,
    eq: () => mockObj,
    not: () => mockObj,
    order: () => mockObj,
    limit: () => mockObj,
  };
  return mockObj;
}

describe("odometer.api - Vehicle Odometer Calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no odometer readings exist across tables", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBeNull();
  });

  // Cenário A — Veículo novo com apenas initial_odometer_km
  it("Cenário A: returns initial_odometer_km for new vehicle with no other readings", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: 10000 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(10000);
  });

  // Cenário B — Rotas superiores ao odômetro inicial
  it("Cenário B: returns routes.end_km when it is greater than initial_odometer_km", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: 10000 }]) as any;
      }
      if (table === "routes") {
        return createQueryMock([{ end_km: 12000 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(12000);
  });

  // Cenário C — Despesa superior ao odômetro inicial
  it("Cenário C: returns expenses.odometer_km when it is greater than initial_odometer_km", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: 10000 }]) as any;
      }
      if (table === "expenses") {
        return createQueryMock([{ odometer_km: 13000 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(13000);
  });

  // Cenário D — Troca de óleo superior ao odômetro inicial
  it("Cenário D: returns oil_changes.km_at_change when it is greater than initial_odometer_km", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: 10000 }]) as any;
      }
      if (table === "oil_changes") {
        return createQueryMock([{ km_at_change: 14000 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(14000);
  });

  // Cenário E — Mistura de fontes: calcula o MAX correto entre todas as 4 fontes
  it("Cenário E: calculates MAX correctly across initial_odometer_km, expenses, oil_changes and routes", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: 10000 }]) as any;
      }
      if (table === "expenses") {
        return createQueryMock([{ odometer_km: 15000 }]) as any;
      }
      if (table === "oil_changes") {
        return createQueryMock([{ km_at_change: 18500 }]) as any;
      }
      if (table === "routes") {
        return createQueryMock([{ end_km: 17200 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(18500);
  });

  // Cenário F — Veículo legado (initial_odometer_km = null)
  it("Cenário F: works properly for legacy vehicles where initial_odometer_km is null", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock([{ initial_odometer_km: null }]) as any;
      }
      if (table === "routes") {
        return createQueryMock([{ end_km: 8450 }]) as any;
      }
      return createQueryMock([]) as any;
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBe(8450);
  });

  it("never returns fake 45.000 KM on error or empty data", async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error("DB crash");
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBeNull();
  });
});
