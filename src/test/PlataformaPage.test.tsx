import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Plataforma from '@/pages/Plataforma';
import Apps from '@/pages/Apps';
import { supabase } from '@/integrations/supabase/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
  { id: 'plat-app-1', name: 'Loggi SP', segment: 'logistica', payment_model: 'producao', cycle: 'semanal', active: true },
  { id: 'plat-app-2', name: 'Rappi Express', segment: 'delivery', payment_model: 'diaria', cycle: 'quinzenal', active: false },
];

describe('Plataforma and Apps Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-plat-1' } },
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
        return {
          select: vi.fn().mockReturnValue(createQueryMock(mockPlatforms)),
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

  it('renders Apps page with platforms list and active toggles', async () => {
    render(
      <MemoryRouter initialEntries={['/apps']}>
        <Apps />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Loggi SP')).toBeDefined();
      expect(screen.getByText('Rappi Express')).toBeDefined();
    });
  });

  it('creates a new platform and persists to platforms table', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'platforms') {
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
      <MemoryRouter initialEntries={['/plataforma/nova']}>
        <Routes>
          <Route path="/plataforma/nova" element={<Plataforma />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('NOVA PLATAFORMA'));

    const nameInput = screen.getByPlaceholderText('Digite o nome da plataforma');
    fireEvent.change(nameInput, { target: { value: 'Shopee Entregas' } });

    const submitBtn = screen.getByText('VINCULAR PLATAFORMA');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-plat-1',
          name: 'Shopee Entregas',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Plataforma vinculada!');
    });
  });

  it('validates that platform name is required', async () => {
    render(
      <MemoryRouter initialEntries={['/plataforma/nova']}>
        <Routes>
          <Route path="/plataforma/nova" element={<Plataforma />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText('NOVA PLATAFORMA'));

    // The form has no JS validation on name — we test the submit event on the form element
    const form = screen.getByText('NOVA PLATAFORMA').closest('div[class*="app-shell"]')?.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Informe o nome da plataforma.');
    });
  });
});
