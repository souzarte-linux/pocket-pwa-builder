import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRoutes,
  getRouteById,
  getLatestRoute,
  createRoute,
  updateRoute,
  deleteRoute,
} from "@/api/routes.api";
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
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
    insert: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe("routes.api - Routes Service Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getRoutes returns filtered routes list", async () => {
    const mockList = [{ id: "r1", user_id: "u1", distance_km: 25, amount: 80 }];
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockList) as any);

    const res = await getRoutes({ userId: "u1", platformId: "plat-1" });
    expect(res).toEqual(mockList);
  });

  it("getRouteById returns single route record", async () => {
    const mockRoute = { id: "r1", user_id: "u1", start_km: 100, end_km: 150 };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockRoute) as any);

    const res = await getRouteById("r1");
    expect(res).toEqual(mockRoute);
  });

  it("getLatestRoute returns latest route reading for starting KM", async () => {
    const mockLatest = { end_km: 22400 };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockLatest) as any);

    const res = await getLatestRoute("u1");
    expect(res).toEqual(mockLatest);
  });

  it("createRoute inserts and returns new route", async () => {
    const mockPayload: any = { user_id: "u1", distance_km: 30, amount: 90 };
    const mockCreated = { id: "r-new", ...mockPayload };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockCreated) as any);

    const res = await createRoute(mockPayload);
    expect(res).toEqual(mockCreated);
  });

  it("updateRoute updates existing route by id", async () => {
    const mockUpdates: any = { distance_km: 35, amount: 105 };
    const mockUpdated = { id: "r1", user_id: "u1", ...mockUpdates };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockUpdated) as any);

    const res = await updateRoute("r1", mockUpdates);
    expect(res).toEqual(mockUpdated);
  });

  it("deleteRoute removes route by id", async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(null) as any);

    await expect(deleteRoute("r1")).resolves.toBeUndefined();
  });
});
