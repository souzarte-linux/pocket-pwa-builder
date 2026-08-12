import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '@/App';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
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

describe('Configuracoes Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users from /configuracoes to /auth', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as any);

    window.history.pushState({}, 'Configurações', '/configuracoes');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ENTRAR/i })).toBeInTheDocument();
    });
  });

  it('renders Configuracoes page when user is authenticated', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-auth-cfg' },
        },
      },
      error: null,
    } as any);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'user-auth-cfg', email: 'motorista@logica.com' },
      },
      error: null,
    } as any);

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue(
            createQueryMock({
              id: 'user-auth-cfg',
              full_name: 'Motorista Teste',
              email: 'motorista@logica.com',
            })
          ),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    window.history.pushState({}, 'Configurações', '/configuracoes');

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getAllByText(/Configurações/i).length).toBeGreaterThan(0);
      },
      { timeout: 6000 }
    );
  });
});
