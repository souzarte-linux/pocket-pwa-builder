import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VidaUtilPecas } from '@/pages/VidaUtilPecas';
import { TrocasOleo } from '@/pages/TrocasOleo';
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

describe('Hodometro - No Fake 45.000 KM Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-odo-123' } },
    } as any);
  });

  it('VidaUtilPecas displays "Não informado" when database has no odometer readings', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <VidaUtilPecas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Não informado')).toBeDefined();
    });

    expect(screen.queryByText('45.000 km')).toBeNull();
    expect(screen.queryByText('45000 km')).toBeNull();
  });

  it('VidaUtilPecas displays real maximum reading when readings exist in DB', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ odometer_km: 12500 }])),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <VidaUtilPecas />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /12\.500/ })).toBeDefined();
    });

    expect(screen.queryByText('45.000 km')).toBeNull();
  });

  it('TrocasOleo does not pre-fill fake 45000 km when database is empty', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <TrocasOleo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Registrar Nova Troca / Manutenção')).toBeDefined();
    });

    expect(screen.queryByText('45.000 km')).toBeNull();
  });
});
