import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Configuracoes } from '@/pages/Configuracoes';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-config-123' } } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-config-123' } }),
}));

vi.mock('@/components/layout/AppHeader', () => ({
  AppHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

describe('Configuracoes Page — System Settings & Profile Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title and form pre-filled with profile data', async () => {
    const mockProfile = {
      id: 'user-config-123',
      full_name: 'Carlos Oliveira',
      gender: 'masculino',
      daily_goal: 300,
      weekly_goal: 1800,
      monthly_goal: 7000,
      vehicle: 'moto',
      vehicle_brand: 'Yamaha',
      vehicle_model: 'Factor 150',
      vehicle_year: 2023,
      plate: 'XYZ9876',
    };

    vi.mocked(supabase.from).mockReturnValue(createQueryMock(mockProfile) as any);

    render(
      <BrowserRouter>
        <Configuracoes />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CONFIGURAÇÕES')).toBeDefined();
      expect(screen.getByDisplayValue('Carlos Oliveira')).toBeDefined();
    });
  });

  it('submits updated profile settings safely via TanStack Query mutation', async () => {
    const updateSpy = vi.fn().mockImplementation(() => createQueryMock({ id: 'user-config-123' }));

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock({ id: 'user-config-123', full_name: 'Carlos Oliveira' })),
        update: updateSpy,
      } as any;
    });

    render(
      <BrowserRouter>
        <Configuracoes />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Carlos Oliveira')).toBeDefined();
    });

    const submitBtn = screen.getByText('SALVAR');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
