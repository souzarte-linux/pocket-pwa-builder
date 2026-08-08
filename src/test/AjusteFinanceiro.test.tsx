import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AjusteFinanceiro from '@/pages/AjusteFinanceiro';
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

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: Record<string, unknown> = {
    then: (resolve: (v: { data: unknown; error: null }) => unknown, reject?: (r: unknown) => unknown) => promise.then(resolve, reject),
    catch: (reject: (r: unknown) => unknown) => promise.catch(reject),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data ?? null, error: null })),
  };
  return mockObj;
}

describe('AjusteFinanceiro.tsx - Category signs for discounts and additions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as any);
  });

  const setupMockSupabase = (insertSpy: ReturnType<typeof vi.fn>) => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([{ id: 'p-1', name: 'Loggi', active: true }])),
        } as any;
      }
      if (table === 'financial_adjustments') {
        return { insert: insertSpy } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });
  };

  it('saves amount as negative for discount types (previdenciario, extravio, multa)', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    setupMockSupabase(insertSpy);

    render(
      <BrowserRouter>
        <AjusteFinanceiro />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('REGISTRAR AJUSTE ›'));

    const typeLabel = screen.getByText('Tipo de Ajuste');
    const typeSelect = typeLabel.parentElement?.querySelector('select');
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'previdenciario' } });
    }

    const amtInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(amtInput, { target: { value: '50,00' } });

    const submitBtn = screen.getByText('REGISTRAR AJUSTE ›');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'previdenciario',
          amount: -50,
        })
      );
    });
  });

  it('saves amount as positive for addition types (bonus_fatura, gratificacao, etc.)', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    setupMockSupabase(insertSpy);

    render(
      <BrowserRouter>
        <AjusteFinanceiro />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('REGISTRAR AJUSTE ›'));

    const typeLabel = screen.getByText('Tipo de Ajuste');
    const typeSelect = typeLabel.parentElement?.querySelector('select');
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'bonus_fatura' } });
    }

    const amtInput = screen.getByPlaceholderText('0,00');
    fireEvent.change(amtInput, { target: { value: '100,00' } });

    const submitBtn = screen.getByText('REGISTRAR AJUSTE ›');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bonus_fatura',
          amount: 100,
        })
      );
    });
  });
});
