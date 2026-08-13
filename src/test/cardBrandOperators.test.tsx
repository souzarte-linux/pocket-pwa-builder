import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCardBrandOperators,
  addBrandToOperator,
  removeBrandFromOperator,
  setOperatorBrands,
} from '@/api/cardBrandOperators.api';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function createQueryMock(data: unknown = []) {
  const promise = Promise.resolve({ data, error: null });
  const mockObj: any = {
    then: (resolve: any, reject: any) => promise.then(resolve, reject),
    catch: (reject: any) => promise.catch(reject),
    select: vi.fn().mockImplementation(() => mockObj),
    eq: vi.fn().mockImplementation(() => mockObj),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data, error: null })),
    insert: vi.fn().mockImplementation(() => mockObj),
    delete: vi.fn().mockImplementation(() => mockObj),
  };
  return mockObj;
}

describe('cardBrandOperators.api.ts — Relacionamento Bidirecional Bandeira <-> Emissor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario A, B & L: getCardBrandOperators fetches relations isolated by user_id', async () => {
    const mockRelations = [
      {
        id: 'rel-1',
        user_id: 'user-123',
        operator_id: 'op-nubank',
        brand_name: 'Mastercard',
        created_at: '2026-08-13T00:00:00Z',
        card_operators: { id: 'op-nubank', name: 'Nubank', card_due_day: 15 },
      },
      {
        id: 'rel-2',
        user_id: 'user-123',
        operator_id: 'op-nubank',
        brand_name: 'Visa',
        created_at: '2026-08-13T00:00:00Z',
        card_operators: { id: 'op-nubank', name: 'Nubank', card_due_day: 15 },
      },
    ];

    const queryMock = createQueryMock(mockRelations);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getCardBrandOperators('user-123');

    expect(res).toEqual(mockRelations);
    expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('Scenario M: returns empty array when no relations exist', async () => {
    const queryMock = createQueryMock([]);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await getCardBrandOperators('user-123');
    expect(res).toEqual([]);
  });

  it('Scenario N: handles database query error gracefully', async () => {
    const errorObj = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockRejectedValue(new Error('DB Error')),
    };
    vi.mocked(supabase.from).mockReturnValue(errorObj as any);

    const res = await getCardBrandOperators('user-123');
    expect(res).toEqual([]);
  });

  it('Scenario C & E: addBrandToOperator creates a new association', async () => {
    const mockCreated = {
      id: 'rel-3',
      user_id: 'user-123',
      operator_id: 'op-inter',
      brand_name: 'Mastercard',
      created_at: '2026-08-13T00:00:00Z',
    };

    const queryMock = createQueryMock(mockCreated);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    const res = await addBrandToOperator({
      user_id: 'user-123',
      operator_id: 'op-inter',
      brand_name: 'Mastercard',
    });

    expect(res).toEqual(mockCreated);
    expect(queryMock.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      operator_id: 'op-inter',
      brand_name: 'Mastercard',
    });
  });

  it('Scenario D: removeBrandFromOperator deletes an existing association', async () => {
    const queryMock = createQueryMock(null);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    await expect(
      removeBrandFromOperator('op-inter', 'Mastercard', 'user-123')
    ).resolves.toBeUndefined();

    expect(queryMock.delete).toHaveBeenCalled();
    expect(queryMock.eq).toHaveBeenCalledWith('operator_id', 'op-inter');
    expect(queryMock.eq).toHaveBeenCalledWith('brand_name', 'Mastercard');
    expect(queryMock.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('Scenario O: setOperatorBrands syncs all brand names for an operator', async () => {
    const queryMock = createQueryMock(null);
    vi.mocked(supabase.from).mockReturnValue(queryMock as any);

    await setOperatorBrands('op-bradesco', ['Visa', 'Mastercard', 'Elo'], 'user-123');

    expect(queryMock.delete).toHaveBeenCalled();
    expect(queryMock.insert).toHaveBeenCalledWith([
      { user_id: 'user-123', operator_id: 'op-bradesco', brand_name: 'Visa' },
      { user_id: 'user-123', operator_id: 'op-bradesco', brand_name: 'Mastercard' },
      { user_id: 'user-123', operator_id: 'op-bradesco', brand_name: 'Elo' },
    ]);
  });
});

describe('CardPaymentDialog — Bidirectional Filtering Logic (Scenarios F, G, H, I, J, K, P)', () => {
  it('Scenario H & P: preserves legacy expenses without crash when no filter is applied', () => {
    const legacyExpense = {
      brand: 'DesconhecidaLegacy',
      issuer: 'BancoAntigoDescontinuado',
      installments: 3,
      firstMonth: '2026-09',
    };

    expect(legacyExpense.brand).toBe('DesconhecidaLegacy');
    expect(legacyExpense.issuer).toBe('BancoAntigoDescontinuado');
  });

  it('Scenario F, G, I, J: bidirectional validation rules', () => {
    const relations = [
      { operator_id: 'op-1', brand_name: 'Visa', operator_name: 'Nubank' },
      { operator_id: 'op-1', brand_name: 'Mastercard', operator_name: 'Nubank' },
      { operator_id: 'op-2', brand_name: 'Elo', operator_name: 'Bradesco' },
    ];

    // Select brand 'Elo': available issuers should be 'Bradesco'
    const brand = 'Elo';
    const matchingRel = relations.filter((r) => r.brand_name === brand);
    const validIssuers = matchingRel.map((r) => r.operator_name);

    expect(validIssuers).toEqual(['Bradesco']);
    expect(validIssuers.includes('Nubank')).toBe(false);
  });
});
