import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrocasOleo } from '@/pages/TrocasOleo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

describe('TrocasOleo Page (Maintenance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
    } as any);
  });

  it('renders title and form correctly', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue(createQueryMock([])),
      } as any;
    });

    render(
      <BrowserRouter>
        <TrocasOleo />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('MANUTENÇÃO & TROCAS DE ÓLEO')).toBeInTheDocument();
    });
  });
});
