import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOilChanges,
  createOilChange,
  getPartMaintenance,
  upsertPartMaintenanceRecord,
} from "@/api/maintenance.api";
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
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => mockObj),
    upsert: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
  };
  return mockObj;
}

describe("maintenance.api - Maintenance Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getOilChanges returns list of oil changes", async () => {
    const mockList = [{ id: "oc-1", km_at_change: 25000, changed_at: "2026-08-01T10:00:00Z" }];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getOilChanges("user-1");
    expect(res).toEqual(mockList);
  });

  it("getOilChanges returns empty array on error", async () => {
    const errMock: any = {
      select: vi.fn().mockImplementation(() => errMock),
      order: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      ),
    };
    vi.mocked(supabase.from).mockReturnValue(errMock as any);

    const res = await getOilChanges();
    expect(res).toEqual([]);
  });

  it("createOilChange inserts a record", async () => {
    const mockPayload: any = { user_id: "u1", km_at_change: 30000, changed_at: "2026-08-01T10:00:00Z" };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockPayload) as any);

    await expect(createOilChange(mockPayload)).resolves.toEqual(mockPayload);
  });

  it("getPartMaintenance returns part maintenance records", async () => {
    const mockList = [
      { id: "pm-1", part_name: "Pneu Dianteiro", life_km: 15000, last_change_km: 10000 },
    ];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getPartMaintenance("user-1");
    expect(res).toEqual(mockList);
  });

  it("upsertPartMaintenanceRecord upserts a record", async () => {
    const mockPayload: any = {
      id: "pm-1",
      user_id: "u1",
      part_name: "Pastilha de Freio",
      life_km: 8000,
      last_change_km: 12000,
      last_change_at: "2026-08-01T10:00:00Z",
    };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockPayload) as any);

    await expect(upsertPartMaintenanceRecord(mockPayload)).resolves.toEqual(mockPayload);
  });
});
