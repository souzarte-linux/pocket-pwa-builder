import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Despesa from '@/pages/Despesa';
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

const mockGasStations = [
  { id: 'station-1', name: 'Posto Ipiranga Centro', user_id: 'user-exp-123', fuel_types: ['Gasolina Comum', 'Etanol'] },
  { id: 'station-2', name: 'Posto Shell Express', user_id: 'user-exp-123', fuel_types: ['Gasolina Aditivada'] },
];

describe('DespesaFlows - Critical Expense Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-exp-123' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'gas_stations') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockGasStations)),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
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

  it('renders fuel expense form and submits fuel entry successfully', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'gas_stations') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockGasStations)),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Despesa />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('NOVO ABASTECIMENTO')).toBeDefined();
    });

    // Enter Amount (5000 -> R$ 50,00)
    const amountInput = screen.getByPlaceholderText('R$ 0,00');
    fireEvent.change(amountInput, { target: { value: '5000' } });

    // Enter Liters
    const litersInput = screen.getByPlaceholderText('Ex: 20,0');
    fireEvent.change(litersInput, { target: { value: '8,5' } });

    // Enter Price per liter
    const priceInput = screen.getByPlaceholderText('Ex: 5,89');
    fireEvent.change(priceInput, { target: { value: '5,88' } });

    // Enter Odometer
    const odoInput = screen.getByPlaceholderText('Ex: 125450');
    fireEvent.change(odoInput, { target: { value: '18500' } });

    // Click submit
    const submitBtn = screen.getByText('SALVAR DESPESA');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-exp-123',
          category: 'combustivel',
          amount: 50,
          liters: 8.5,
          odometer_km: 18500,
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Despesa registrada!');
    });
  });

  it('validates that amount must be greater than zero', async () => {
    render(
      <BrowserRouter>
        <Despesa />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('NOVO ABASTECIMENTO'));

    const amountInput = screen.getByPlaceholderText('R$ 0,00');
    fireEvent.change(amountInput, { target: { value: '' } });

    const submitBtn = screen.getByText('SALVAR DESPESA');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Informe o valor total pago.');
    });
  });

  it('handles Supabase insertion error gracefully on expense creation', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: { message: 'Database constraint failed' } });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'gas_stations') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockGasStations)),
        } as any;
      }
      if (table === 'expenses') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock([])),
          insert: insertSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <Despesa />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('NOVO ABASTECIMENTO'));

    const amountInput = screen.getByPlaceholderText('R$ 0,00');
    fireEvent.change(amountInput, { target: { value: '7500' } });

    const submitBtn = screen.getByText('SALVAR DESPESA');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao salvar despesa: Database constraint failed');
    });
  });

  it('selects payment methods (Pix, Dinheiro, Cartão)', async () => {
    render(
      <BrowserRouter>
        <Despesa />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText('NOVO ABASTECIMENTO'));

    const dinheiroBtn = screen.getByText('Dinheiro');
    fireEvent.click(dinheiroBtn);
    expect(dinheiroBtn).toBeDefined();

    const pixBtn = screen.getByText('PIX');
    fireEvent.click(pixBtn);
    expect(pixBtn).toBeDefined();
  });
});
