import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OilChangeAlert } from "@/components/OilChangeAlert";
import { supabase } from "@/integrations/supabase/client";
import { BrowserRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
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
    order: vi.fn().mockImplementation(() => mockObj),
    insert: vi.fn().mockImplementation(() => mockObj),
    update: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
    maybeSingle: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
  };
  return mockObj;
}

describe("OilChangeAlert Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-oil-1" } },
    } as any);
  });

  it("renders nothing when oil threshold is 0 or not configured", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock({ id: "user-oil-1", oil_change_km: 0 }) as any;
      }
      return createQueryMock([]) as any;
    });

    const { container } = render(
      <BrowserRouter>
        <OilChangeAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders warning alert when driven KM reaches 80% of threshold", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock({
          id: "user-oil-1",
          oil_change_km: 3000,
          last_oil_change_at: "2026-08-01T00:00:00Z",
        }) as any;
      }
      if (table === "routes") {
        return createQueryMock([
          { distance_km: 2600, occurred_at: "2026-08-05T00:00:00Z" },
        ]) as any;
      }
      return createQueryMock([]) as any;
    });

    render(
      <BrowserRouter>
        <OilChangeAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/TROCA DE ÓLEO PRÓXIMA/i)).toBeInTheDocument();
      expect(screen.getByText(/Faltam 400 KM para os 3000 KM recomendados/i)).toBeInTheDocument();
    });
  });

  it("renders overdue alert and allows marking oil change completed", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return createQueryMock({
          id: "user-oil-1",
          oil_change_km: 3000,
          last_oil_change_at: "2026-08-01T00:00:00Z",
        }) as any;
      }
      if (table === "routes") {
        return createQueryMock([
          { distance_km: 3500, occurred_at: "2026-08-05T00:00:00Z" },
        ]) as any;
      }
      if (table === "oil_changes") {
        return createQueryMock({ id: "oc-new", km_at_change: 3500 }) as any;
      }
      return createQueryMock([]) as any;
    });

    render(
      <BrowserRouter>
        <OilChangeAlert />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/TROCA DE ÓLEO ATRASADA/i)).toBeInTheDocument();
      expect(screen.getByText(/Você ultrapassou em 500 KM o limite de 3000 KM/i)).toBeInTheDocument();
    });

    const markButton = screen.getByRole("button", { name: /Marquei a troca/i });
    fireEvent.click(markButton);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("oil_changes");
    });
  });
});
