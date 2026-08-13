import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFinancialGoals, updateFinancialGoals } from '@/api/financialGoals.api';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-goals-123' } } }),
    },
  },
}));

function createQueryMock(data: unknown = null) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    update: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe('financialGoals.api.ts — Centralização de Metas Financeiras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario A & B: getFinancialGoals fetches goals isolated by user_id', async () => {
    const mockGoals = {
      daily_goal: 300,
      weekly_goal: 1800,
      monthly_goal: 7000,
    };

    const queryMock = createQueryMock(mockGoals);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getFinancialGoals('user-goals-123');

    expect(res).toEqual(mockGoals);
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'user-goals-123');
  });

  it('Scenario C & I: returns null when profile has no goals set', async () => {
    const queryMock = createQueryMock(null);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getFinancialGoals('user-goals-123');
    expect(res).toBeNull();
  });

  it('Scenario D: handles database error gracefully and returns null', async () => {
    const errorObj = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockRejectedValue(new Error('DB Error')),
      }),
    };
    vi.mocked(supabase.from).mockReturnValue(errorObj as any);

    const res = await getFinancialGoals('user-goals-123');
    expect(res).toBeNull();
  });

  it('Scenario E, F & G: updateFinancialGoals updates daily, weekly, and monthly goals', async () => {
    const mockUpdated = {
      daily_goal: 350,
      weekly_goal: 2100,
      monthly_goal: 8000,
    };

    const queryMock = createQueryMock(mockUpdated);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await updateFinancialGoals('user-goals-123', {
      daily_goal: 350,
      weekly_goal: 2100,
      monthly_goal: 8000,
    });

    expect(res).toEqual(mockUpdated);
    expect(queryMock.update).toHaveBeenCalledWith({
      daily_goal: 350,
      weekly_goal: 2100,
      monthly_goal: 8000,
    });
    expect(queryMock.eq).toHaveBeenCalledWith('id', 'user-goals-123');
  });
});
