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

  it("calculates MAX correctly between expenses, oil_changes and routes", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
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

  it("never returns fake 45.000 KM on error or empty data", async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error("DB crash");
    });

    const odo = await getCurrentOdometer("user-1");
    expect(odo).toBeNull();
  });
});
