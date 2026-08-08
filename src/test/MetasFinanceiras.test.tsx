import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MetasFinanceiras from '@/pages/MetasFinanceiras';
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

describe('MetasFinanceiras Page - Persistence & Load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-metas-123' } },
    } as any);
  });

  it('loads existing goals from Supabase profiles table', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock({
              daily_goal: 250.5,
              weekly_goal: 1500,
              monthly_goal: 6000,
            })
          ),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <MetasFinanceiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      const dailyInput = screen.getByLabelText('Meta Diária') as HTMLInputElement;
      expect(dailyInput.value).toContain('250,50');
    });

    const weeklyInput = screen.getByLabelText('Meta Semanal') as HTMLInputElement;
    const monthlyInput = screen.getByLabelText('Meta Mensal') as HTMLInputElement;
    expect(weeklyInput.value).toContain('1.500,00');
    expect(monthlyInput.value).toContain('6.000,00');
  });

  it('saves updated goals to Supabase and displays success toast', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock({
              daily_goal: 100,
              weekly_goal: 600,
              monthly_goal: 2500,
            })
          ),
          update: updateSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <MetasFinanceiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('100,00')).toBeDefined();
    });

    const dailyInput = screen.getByLabelText('Meta Diária');
    fireEvent.change(dailyInput, { target: { value: '300,00' } });

    const weeklyInput = screen.getByLabelText('Meta Semanal');
    fireEvent.change(weeklyInput, { target: { value: '1800,00' } });

    const monthlyInput = screen.getByLabelText('Meta Mensal');
    fireEvent.change(monthlyInput, { target: { value: '7200,00' } });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        daily_goal: 300,
        weekly_goal: 1800,
        monthly_goal: 7200,
      });
      expect(toast.success).toHaveBeenCalledWith('Metas financeiras atualizadas com sucesso!');
    });
  });

  it('handles empty / zero values safely without inventing numbers', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock({
              daily_goal: null,
              weekly_goal: null,
              monthly_goal: null,
            })
          ),
          update: updateSpy,
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <MetasFinanceiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      const dailyInput = screen.getByLabelText('Meta Diária') as HTMLInputElement;
      expect(dailyInput.value).toBe('');
    });

    fireEvent.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        daily_goal: 0,
        weekly_goal: 0,
        monthly_goal: 0,
      });
    });
  });
});
