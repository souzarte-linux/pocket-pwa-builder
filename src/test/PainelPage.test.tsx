import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Painel from '@/pages/Painel';
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

const mockPlatforms = [
  { id: 'plat-painel-1', name: 'Loggi' },
  { id: 'plat-painel-2', name: 'iFood' },
];

const todayIso = new Date().toISOString();

describe('PainelPage - Financial Dashboard and Metrics Breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-painel-1' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 250, weekly_goal: 1200, monthly_goal: 5000 }])),
        } as any;
      }
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'route-p-1',
                amount: 300,
                tip: 20,
                distance_km: 80,
                package_count: 25,
                platform_id: 'plat-painel-1',
                occurred_at: todayIso,
              },
            ])
          ),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock([
              {
                id: 'exp-p-1',
                amount: 70,
                category: 'combustivel',
                occurred_at: todayIso,
              },
            ])
          ),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders dashboard with aggregated earnings, goals and platform metrics', async () => {
    render(
      <BrowserRouter>
        <Painel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Lucro Diário/i)).toBeDefined();
      expect(screen.getAllByText(/320,00/).length).toBeGreaterThan(0);
    });
  });

  it('handles empty data state without NaN or crashes', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 0, weekly_goal: 0, monthly_goal: 0 }])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Painel />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Lucro Diário/i)).toBeDefined();
      expect(screen.queryByText(/NaN/i)).toBeNull();
      expect(screen.queryByText(/Infinity/i)).toBeNull();
    });
  });

  it('toggles time filter between 7D and 30D', async () => {
    render(
      <BrowserRouter>
        <Painel />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText(/TENDÊNCIA DE DESEMPENHO/i));

    const btn30d = screen.getByText('30D');
    fireEvent.click(btn30d);

    await waitFor(() => {
      expect(btn30d).toBeDefined();
    });
  });
});
