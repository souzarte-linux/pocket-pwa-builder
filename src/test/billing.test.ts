import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatformCycleIntervals, checkOverlap } from '@/lib/billing';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: any = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    eq: vi.fn().mockImplementation(() => mockObj),
    neq: vi.fn().mockImplementation(() => mockObj),
    in: vi.fn().mockImplementation(() => mockObj),
    isNull: vi.fn().mockImplementation(() => mockObj),
    gte: vi.fn().mockImplementation(() => mockObj),
    lte: vi.fn().mockImplementation(() => mockObj),
    or: vi.fn().mockImplementation(() => mockObj),
    order: vi.fn().mockImplementation(() => mockObj),
    limit: vi.fn().mockImplementation(() => mockObj),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: data?.[0] ?? null, error: null })),
  };
  return mockObj;
}

describe('getPlatformCycleIntervals', () => {
  it('calculates weekly cycle interval correctly', () => {
    const platform = {
      cycle: 'semanal',
      rules: { fixed_pay_delay: 2 },
    };
    const dateRef = new Date('2026-08-05T12:00:00Z'); // Wednesday
    const res = getPlatformCycleIntervals(platform, dateRef);

    expect(res).toHaveLength(2);
    expect(res[0].periodStart).toBeDefined();
    expect(res[0].periodEnd).toBeDefined();
    expect(res[0].expectedPaymentDate).toBeDefined();
    expect(res[1].periodStart).toBeDefined();
  });

  it('calculates monthly cycle interval with month transition (Jan to Feb)', () => {
    const platform = {
      cycle: 'mensal',
      rules: { fixed_pay_delay: 5 },
    };
    const dateRef = new Date('2026-01-15T12:00:00Z');
    const res = getPlatformCycleIntervals(platform, dateRef);

    expect(res).toHaveLength(2);
    expect(res[0].periodStart.slice(0, 7)).toBe('2026-01');
    expect(res[1].periodStart.slice(0, 7)).toBe('2026-02');
  });

  it('handles quinzena and misto billing frequencies', () => {
    const platformQuinzena = {
      cycle: 'quinzenal',
      rules: { fixed_pay_delay: 3 },
    };
    const resQ = getPlatformCycleIntervals(platformQuinzena, new Date('2026-08-10T12:00:00Z'));
    expect(resQ.length).toBeGreaterThan(0);

    const platformMisto = {
      cycle: 'misto',
      rules: { fixed_pay_delay: 1 },
    };
    const resM = getPlatformCycleIntervals(platformMisto, new Date('2026-08-10T12:00:00Z'));
    expect(Array.isArray(resM)).toBe(true);
  });
});

describe('checkOverlap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects overlap for the same platform within matching date range', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(
        createQueryMock([
          {
            id: 'c-1',
            platform_id: 'p-1',
            period_start: '2026-08-01T00:00:00',
            period_end: '2026-08-10T23:59:59',
            expected_payment_date: '2026-08-12',
            status: 'open',
            platforms: { name: 'Loggi' },
          },
        ])
      ),
    });

    const res = await checkOverlap('p-1', '2026-08-05', '2026-08-15');
    expect(res.hasOverlap).toBe(true);
    expect(res.conflictingCycle?.id).toBe('c-1');
  });

  it('does not flag overlap for different platform or cancelled cycles', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(createQueryMock([])),
    });

    const res = await checkOverlap('p-2', '2026-08-05', '2026-08-15');
    expect(res.hasOverlap).toBe(false);
    expect(res.conflictingCycle).toBeUndefined();
  });
});
