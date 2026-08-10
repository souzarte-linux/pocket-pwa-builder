import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '@/App';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    }),
  },
}));

describe('App Routing with React.lazy and Suspense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
  });

  it('renders auth page on /auth route', async () => {
    window.history.pushState({}, 'Auth', '/auth');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /DRIVER HUB/i })).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated user from protected route to /auth', async () => {
    window.history.pushState({}, 'Home', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /DRIVER HUB/i })).toBeInTheDocument();
    });
  });

  it('renders 404 NotFound page on unknown route', async () => {
    window.history.pushState({}, 'Unknown', '/rota-inexistente-12345');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/404/i)).toBeInTheDocument();
    });
  });
});
