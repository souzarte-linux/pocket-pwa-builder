import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '@/pages/Home';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    eq: () => mockObj,
    neq: () => mockObj,
    not: () => mockObj,
    in: () => mockObj,
    isNull: () => mockObj,
    gte: () => mockObj,
    lte: () => mockObj,
    or: () => mockObj,
    order: () => mockObj,
    limit: () => mockObj,
    maybeSingle: () => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null }),
  };
  return mockObj;
}

describe('HomePage - Dashboard Metrics and Daily Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-home-1' } },
    } as any);
  });

  it('renders daily financial summary with positive net profit and goal progress', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 200, full_name: 'Motorista Piloto' }])),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { amount: 150, tip: 10, distance_km: 40, product_type: 'pacote', package_count: 20 },
            ])
          ),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              { amount: 40, category: 'combustivel' },
            ])
          ),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Earnings: 160, Expenses: 40, Net profit: 120 (60% of 200 goal)
    await waitFor(() => {
      expect(screen.getByText(/Lucro líquido hoje/i)).toBeDefined();
      expect(screen.getByText(/120,00/)).toBeDefined();
      expect(screen.getByText(/60/)).toBeDefined();
    });
  });

  it('renders correctly when user has no data today (zero state without NaN)', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 0 }])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Lucro líquido hoje/i)).toBeDefined();
      expect(screen.getByText(/0,00/)).toBeDefined();
      expect(screen.queryByText(/NaN/i)).toBeNull();
      expect(screen.queryByText(/Infinity/i)).toBeNull();
    });
  });

  it('handles negative net profit when expenses exceed earnings', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 100 }])),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ amount: 50, tip: 0, distance_km: 10 }])),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ amount: 120, category: 'manutencao' }])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Earnings: 50, Expenses: 120, Net: -70
    await waitFor(() => {
      expect(screen.getByText(/-.*70,00/)).toBeDefined();
    });
  });
});
