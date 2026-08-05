import { describe, it, expect } from 'vitest';

interface Adjustment {
  amount: number;
  type: string;
  platform_id: string;
  occurred_at: string;
}

interface Platform {
  id: string;
  name: string;
  active?: boolean;
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  previdenciario: 'Previdenciário',
  extravio: 'Extravios',
  multa: 'Multas',
  pnr: 'Outros descontos (legado)',
  bonus_fatura: 'Bônus',
  gratificacao: 'Gratificação',
  incentivo: 'Incentivo',
  premiacao: 'Premiação',
  bonus: 'Outros acréscimos (legado)',
};

// Pure function mirroring bonificacoesByPlatform useMemo logic in Relatorios.tsx
function computeBonificacoesByPlatform(
  adjustments: Adjustment[],
  platforms: Platform[],
  selectedPlatform: string = 'all'
) {
  const activePlatformIds = new Set(
    platforms.filter((p) => p.active !== false).map((p) => p.id)
  );

  const filteredAdjustments = adjustments.filter((a) => {
    if (!a.platform_id || !activePlatformIds.has(a.platform_id)) return false;
    if (selectedPlatform !== 'all' && a.platform_id !== selectedPlatform) return false;
    return true;
  });

  const map = new Map<
    string,
    {
      name: string;
      descontosTotal: number;
      acrescimosTotal: number;
      typeSums: Record<string, number>;
    }
  >();

  const discountTypes = ['previdenciario', 'extravio', 'multa', 'pnr'];

  filteredAdjustments.forEach((a) => {
    const pId = a.platform_id;
    const platform = platforms.find((p) => p.id === pId);
    const cur = map.get(pId) ?? {
      name: platform?.name || 'Sem plataforma',
      descontosTotal: 0,
      acrescimosTotal: 0,
      typeSums: {},
    };

    const amt = Number(a.amount || 0);
    const isDiscount = discountTypes.includes(a.type) || amt < 0;

    if (isDiscount) {
      cur.descontosTotal += Math.abs(amt);
    } else {
      cur.acrescimosTotal += Math.abs(amt);
    }

    cur.typeSums[a.type] = (cur.typeSums[a.type] || 0) + Math.abs(amt);
    map.set(pId, cur);
  });

  const result: {
    platformId: string;
    name: string;
    descontosTotal: number;
    acrescimosTotal: number;
    details: { type: string; label: string; amount: number; isDiscount: boolean }[];
  }[] = [];

  map.forEach((val, platformId) => {
    if (val.descontosTotal === 0 && val.acrescimosTotal === 0) return;

    const details = Object.entries(val.typeSums)
      .filter(([, sum]) => sum > 0)
      .map(([typeKey, sum]) => ({
        type: typeKey,
        label: ADJUSTMENT_LABELS[typeKey] ?? typeKey,
        amount: sum,
        isDiscount: discountTypes.includes(typeKey),
      }));

    result.push({
      platformId,
      name: val.name,
      descontosTotal: val.descontosTotal,
      acrescimosTotal: val.acrescimosTotal,
      details,
    });
  });

  return result.sort(
    (a, b) => b.acrescimosTotal + b.descontosTotal - (a.acrescimosTotal + a.descontosTotal)
  );
}

describe('Relatorios.tsx - bonificacoesByPlatform calculation', () => {
  const mockPlatforms: Platform[] = [
    { id: 'p-1', name: 'Loggi', active: true },
    { id: 'p-2', name: 'Lalamove', active: true },
    { id: 'p-inactive', name: 'Inativa Express', active: false },
  ];

  it('aggregates discounts and additions correctly including legacy types pnr and bonus', () => {
    const adjustments: Adjustment[] = [
      { platform_id: 'p-1', type: 'previdenciario', amount: -50, occurred_at: '2026-08-01' },
      { platform_id: 'p-1', type: 'pnr', amount: -25, occurred_at: '2026-08-02' },
      { platform_id: 'p-1', type: 'bonus_fatura', amount: 100, occurred_at: '2026-08-03' },
      { platform_id: 'p-1', type: 'bonus', amount: 30, occurred_at: '2026-08-04' },
    ];

    const res = computeBonificacoesByPlatform(adjustments, mockPlatforms, 'all');

    expect(res).toHaveLength(1);
    expect(res[0].platformId).toBe('p-1');
    expect(res[0].descontosTotal).toBe(75); // 50 + 25
    expect(res[0].acrescimosTotal).toBe(130); // 100 + 30
    expect(res[0].details).toHaveLength(4);
  });

  it('excludes inactive platforms and platforms with zero adjustments', () => {
    const adjustments: Adjustment[] = [
      { platform_id: 'p-inactive', type: 'multa', amount: -100, occurred_at: '2026-08-01' },
    ];

    const res = computeBonificacoesByPlatform(adjustments, mockPlatforms, 'all');
    expect(res).toHaveLength(0);
  });

  it('filters by selected platform correctly', () => {
    const adjustments: Adjustment[] = [
      { platform_id: 'p-1', type: 'multa', amount: -30, occurred_at: '2026-08-01' },
      { platform_id: 'p-2', type: 'incentivo', amount: 80, occurred_at: '2026-08-02' },
    ];

    const res = computeBonificacoesByPlatform(adjustments, mockPlatforms, 'p-2');
    expect(res).toHaveLength(1);
    expect(res[0].platformId).toBe('p-2');
    expect(res[0].acrescimosTotal).toBe(80);
  });
});
