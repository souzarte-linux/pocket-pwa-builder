import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Manutencao } from '@/pages/Manutencao';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-maint' } } }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-maint' } }),
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
    update: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
    upsert: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })
    ),
  };
  return mockObj;
}

describe('Manutencao Page — Módulo Unificado de Manutenção & Trocas de Óleo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, odometer summary, and form tabs correctly', async () => {
    vi.mocked(supabase.from).mockReturnValue(createQueryMock([]) as any);

    render(
      <BrowserRouter>
        <Manutencao />
      </BrowserRouter>
    );

    expect(screen.getByText('MANUTENÇÃO & TROCAS DE ÓLEO')).toBeDefined();
    expect(screen.getByText('Novo Lançamento de Manutenção')).toBeDefined();
  });

  it('allows registering a new oil change / part maintenance', async () => {
    const insertOilSpy = vi.fn().mockReturnValue(createQueryMock({ id: 'oc-new-1' }));
    const upsertPartSpy = vi.fn().mockReturnValue(createQueryMock({ id: 'pm-new-1' }));

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'oil_changes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertOilSpy,
        } as any;
      }
      if (table === 'part_maintenance') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          upsert: upsertPartSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Manutencao />
      </BrowserRouter>
    );

    const kmInput = screen.getByPlaceholderText('Ex: 45200');
    fireEvent.change(kmInput, { target: { value: '50000' } });

    const submitBtn = screen.getByText('Registrar Manutenção');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertOilSpy).toHaveBeenCalled();
      expect(upsertPartSpy).toHaveBeenCalled();
    });
  });

  it('renders history tab and allows viewing past records', async () => {
    const mockHistory = [
      { id: 'h-1', km_at_change: 45000, changed_at: '2026-08-10T12:00:00Z', notes: 'Troca de Óleo Mobil 20w50' },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'oil_changes') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockHistory)),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Manutencao />
      </BrowserRouter>
    );

    const historyTab = screen.getByText(/Histórico/i);
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Troca de Óleo Mobil 20w50')).toBeDefined();
    });
  });
});
