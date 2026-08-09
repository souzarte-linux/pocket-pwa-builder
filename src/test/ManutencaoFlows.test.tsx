import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VidaUtilPecas } from '@/pages/VidaUtilPecas';
import { TrocasOleo } from '@/pages/TrocasOleo';
import { supabase } from '@/integrations/supabase/client';
import { MemoryRouter } from 'react-router-dom';

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
    select: () => mockObj,
    maybeSingle: () =>
      Promise.resolve({ data: Array.isArray(data) ? (data[0] ?? null) : data ?? null, error: null }),
  };
  return mockObj;
}

const mockParts = [
  {
    id: 'part-1',
    user_id: 'user-maint-1',
    part_name: 'Pneu Dianteiro',
    life_km: 20000,
    last_change_km: 10000,
    last_change_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'part-2',
    user_id: 'user-maint-1',
    part_name: 'Pastilha de Freio',
    life_km: 5000,
    last_change_km: 40000,
    last_change_at: '2026-01-01T00:00:00Z',
  },
];

function setupDefaultMocks() {
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'part_maintenance') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock(mockParts)),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      } as any;
    }
    if (table === 'routes') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([{ end_km: 46000 }])),
      } as any;
    }
    if (table === 'expenses') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      } as any;
    }
    if (table === 'oil_changes') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      } as any;
    }
    // AppHeader dependencies
    if (table === 'notifications') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    }
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    }
    // All other tables
    return {
      select: vi.fn().mockReturnValue(createQueryMock([])),
    } as any;
  });
}

describe('ManutencaoFlows - Vehicle Parts Life and Maintenance Cycles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-maint-1' } },
    } as any);
    setupDefaultMocks();
  });

  it('VidaUtilPecas: renders title, parts list, and shows "Vencida" badge for overdue part', async () => {
    // Odometer = 46000 km (from routes end_km).
    // Pastilha de Freio: last_change_km=40000, life_km=5000 → kmDriven=6000, kmRemaining=-1000 → overdue
    render(
      <MemoryRouter>
        <VidaUtilPecas />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Header title always visible
      expect(screen.getByText(/Odômetro Atual Estimado/i)).toBeDefined();
      // Parts list shows after data loads
      expect(screen.queryByText('Carregando pe')).toBeNull();
    }, { timeout: 3000 });

    // Parts should now be in DOM
    expect(screen.getByText('Pastilha de Freio')).toBeDefined();
    expect(screen.getByText('Pneu Dianteiro')).toBeDefined();
    // Both parts are overdue (odo=46000): Pastilha (last=40000, life=5000) and Pneu (last=10000, life=20000)
    expect(screen.getAllByText(/Vencida/i).length).toBeGreaterThanOrEqual(1);
  });

  it('VidaUtilPecas: renders current odometer from most recent route end_km', async () => {
    render(
      <MemoryRouter>
        <VidaUtilPecas />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Current odometer should show 46.000 km
      expect(screen.getByText(/46/)).toBeDefined();
      expect(screen.getByText('Odômetro Atual Estimado')).toBeDefined();
    });
  });

  it('TrocasOleo: renders page header with part monitoring title', async () => {
    render(
      <MemoryRouter>
        <TrocasOleo />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('MONITORAMENTO DE PEÇAS')).toBeDefined();
    });
  });
});
