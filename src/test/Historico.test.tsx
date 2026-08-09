import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Historico from '@/pages/Historico';
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

const todayIso = new Date().toISOString();

const mockRoutes = [
  {
    id: 'route-h-1',
    user_id: 'user-hist-1',
    amount: 120.5,
    tip: 5.0,
    distance_km: 30,
    package_count: 15,
    product_type: 'pacote',
    occurred_at: todayIso,
    platform_id: 'plat-h-1',
    origin: 'Galpão A',
    destination: 'Zona Sul',
  },
];

const mockExpenses = [
  {
    id: 'exp-h-1',
    user_id: 'user-hist-1',
    title: 'Abastecimento Shell',
    amount: 50.0,
    category: 'combustivel',
    liters: 8.5,
    occurred_at: todayIso,
    payment_method: 'pix',
  },
];

const mockPlatforms = [
  { id: 'plat-h-1', name: 'Mercado Livre' },
];

describe('Historico - Transactions Aggregation and Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-hist-1' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockRoutes)),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockExpenses)),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'daily_totals') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ daily_goal: 300 }])),
        } as any;
      }
      if (table === 'billing_cycles') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders combined history list with routes and expenses', async () => {
    render(
      <BrowserRouter>
        <Historico />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/HISTÓRICO/i)).toBeDefined();
    });

    // Verify route item and expense item are displayed
    await waitFor(() => {
      expect(screen.getByText(/MERCADO LIVRE/i)).toBeDefined();
      expect(screen.getByText(/Abastecimento Shell/i)).toBeDefined();
    });
  });

  it('filters history by "Ganhos" and "Despesas" tabs', async () => {
    render(
      <BrowserRouter>
        <Historico />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText(/MERCADO LIVRE/i));

    // Click "Ganhos" tab
    const ganhosTab = screen.getByText(/^ganhos$/i);
    fireEvent.click(ganhosTab);

    // Routes should be present, expense should be hidden
    await waitFor(() => {
      expect(screen.getByText(/MERCADO LIVRE/i)).toBeDefined();
      expect(screen.queryByText(/Abastecimento Shell/i)).toBeNull();
    });

    // Click "Despesas" tab
    const despesasTab = screen.getByText(/^despesas$/i);
    fireEvent.click(despesasTab);

    // Expenses should be present, route should be hidden
    await waitFor(() => {
      expect(screen.getByText(/Abastecimento Shell/i)).toBeDefined();
      expect(screen.queryByText(/MERCADO LIVRE/i)).toBeNull();
    });
  });

  it('displays empty state when no transactions exist in the selected filter', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Historico />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nenhuma transação encontrada.')).toBeDefined();
    });
  });
});
