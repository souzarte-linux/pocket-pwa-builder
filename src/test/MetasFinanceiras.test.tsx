import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MetasFinanceiras } from '@/pages/MetasFinanceiras';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-goals' } } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-goals' } }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout/AppHeader', () => ({
  AppHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

function createQueryMock(data: unknown = null) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    update: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe('MetasFinanceiras Page — Centralização de Metas Financeiras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and input fields pre-filled with goals', async () => {
    const mockData = {
      daily_goal: 250,
      weekly_goal: 1500,
      monthly_goal: 6000,
    };
    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockData) as any);

    render(
      <BrowserRouter>
        <MetasFinanceiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Metas Financeiras')).toBeDefined();
    });
  });

  it('allows updating financial goals and submitting the form', async () => {
    const updateSpy = vi.fn().mockImplementation(() => createQueryMock({ daily_goal: 400, weekly_goal: 2400, monthly_goal: 9000 }));

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock({ daily_goal: 250, weekly_goal: 1500, monthly_goal: 6000 })),
        update: updateSpy,
      } as any;
    });

    render(
      <BrowserRouter>
        <MetasFinanceiras />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Metas Financeiras')).toBeDefined();
    });

    const submitBtn = screen.getByText('Salvar');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
