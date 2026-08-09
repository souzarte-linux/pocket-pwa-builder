import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NovaRota from '@/pages/NovaRota';
import { supabase } from '@/integrations/supabase/client';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'sonner';

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
  { id: 'plat-1', name: 'Loggi', segment: 'logistica', payment_model: 'producao' },
  { id: 'plat-2', name: 'iFood', segment: 'delivery', payment_model: 'producao' },
  { id: 'plat-3', name: 'Mercado Livre', segment: 'logistica', payment_model: 'diaria' },
];

describe('NovaRota - Critical Flow & Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-route-123' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ end_km: 15400 }])),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  });

  it('renders form and loads fallback start KM from last recorded route', async () => {
    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('COURIER PRO')).toBeDefined();
    });

    // Check that startKm was pre-filled with 15400
    const startKmInput = screen.getByDisplayValue('15400') as HTMLInputElement;
    expect(startKmInput).toBeDefined();
  });

  it('automatically calculates distance when startKm and endKm are entered', async () => {
    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByDisplayValue('15400'));

    const numberInputs = document.querySelectorAll('input[type="number"]');
    if (numberInputs.length >= 3) {
      fireEvent.change(numberInputs[1], { target: { value: '100' } });
      fireEvent.change(numberInputs[2], { target: { value: '150' } });
    }

    // Distance should be formatted with MaskedInput as "50,0 KM"
    await waitFor(() => {
      expect(screen.getByDisplayValue('50,0 KM')).toBeDefined();
    });
  });

  it('validates that end time cannot be before start time', async () => {
    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('COURIER PRO'));

    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    if (datetimeInputs.length >= 3) {
      // Set startAt to 14:00 and endAt to 12:00
      fireEvent.change(datetimeInputs[1], { target: { value: '2026-08-08T14:00' } });
      fireEvent.change(datetimeInputs[2], { target: { value: '2026-08-08T12:00' } });
    }

    const submitBtn = screen.getByText(/FINALIZAR E REGISTRAR ROTA/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A hora final deve ser maior que a inicial.');
    });
  });

  it('validates that endKm cannot be smaller than startKm', async () => {
    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('COURIER PRO'));

    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    if (datetimeInputs.length >= 3) {
      fireEvent.change(datetimeInputs[1], { target: { value: '2026-08-08T08:00' } });
      fireEvent.change(datetimeInputs[2], { target: { value: '2026-08-08T12:00' } });
    }

    const numberInputs = document.querySelectorAll('input[type="number"]');
    // numberInputs[0] is breakMin, numberInputs[1] is startKm, numberInputs[2] is endKm
    if (numberInputs.length >= 3) {
      fireEvent.change(numberInputs[1], { target: { value: '200' } });
      fireEvent.change(numberInputs[2], { target: { value: '150' } });
    }

    const submitBtn = screen.getByText(/FINALIZAR E REGISTRAR ROTA/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('KM final deve ser ≥ KM inicial.');
    });
  });

  it('submits a complete production route and persists to routes table', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ end_km: 100 }])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('COURIER PRO'));

    // Fill valid start and end times
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    if (datetimeInputs.length >= 3) {
      fireEvent.change(datetimeInputs[1], { target: { value: '2026-08-08T08:00' } });
      fireEvent.change(datetimeInputs[2], { target: { value: '2026-08-08T12:00' } });
    }

    const submitBtn = screen.getByText(/FINALIZAR E REGISTRAR ROTA/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-route-123',
          platform_id: 'plat-1',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Rota registrada!');
    });
  });

  it('handles Supabase insertion error gracefully', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: { message: 'Database failure' } });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
        } as any;
      }
      if (table === 'routes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ end_km: 100 }])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <NovaRota />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('COURIER PRO'));

    const submitBtn = screen.getByText(/FINALIZAR E REGISTRAR ROTA/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao salvar. Tente novamente.');
    });
  });
});
