import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfWeek, lastDayOfMonth } from 'date-fns';

export interface CycleInterval {
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  expectedPaymentDate: string; // YYYY-MM-DD
}

export interface BillingCycleRecord {
  id: string;
  platform_id: string;
  period_start: string;
  period_end: string;
  expected_payment_date: string;
  status: string;
  platform_name?: string;
}

const formatDateISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Retorna os intervalos do ciclo ATUAL (c0) e do PRÓXIMO ciclo (c1) para uma plataforma.
 */
export const getPlatformCycleIntervals = (
  platform: {
    cycle: string;
    rules?: any;
  },
  refDate: Date = new Date()
): CycleInterval[] => {
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  const rules = platform.rules || {};
  const payDelay = Number(rules?.fixed_pay_delay) || 7;
  const intervals: CycleInterval[] = [];

  if (platform.cycle === 'semanal') {
    const c0Start = startOfWeek(today, { weekStartsOn: 1 });
    const c0End = addDays(c0Start, 6);
    const c0Pay = addDays(c0End, payDelay);

    const c1Start = addDays(c0Start, 7);
    const c1End = addDays(c1Start, 6);
    const c1Pay = addDays(c1End, payDelay);

    intervals.push({
      periodStart: formatDateISO(c0Start),
      periodEnd: formatDateISO(c0End),
      expectedPaymentDate: formatDateISO(c0Pay),
    });
    intervals.push({
      periodStart: formatDateISO(c1Start),
      periodEnd: formatDateISO(c1End),
      expectedPaymentDate: formatDateISO(c1Pay),
    });
  } else if (platform.cycle === 'quinzenal') {
    const y = today.getFullYear();
    const m = today.getMonth();
    const dom = today.getDate();

    let c0Start: Date;
    let c0End: Date;
    let c1Start: Date;
    let c1End: Date;

    if (dom <= 15) {
      c0Start = new Date(y, m, 1);
      c0End = new Date(y, m, 15);
      c1Start = new Date(y, m, 16);
      c1End = lastDayOfMonth(new Date(y, m, 1));
    } else {
      c0Start = new Date(y, m, 16);
      c0End = lastDayOfMonth(new Date(y, m, 1));
      c1Start = new Date(y, m + 1, 1);
      c1End = new Date(y, m + 1, 15);
    }

    const c0Pay = addDays(c0End, payDelay);
    const c1Pay = addDays(c1End, payDelay);

    intervals.push({
      periodStart: formatDateISO(c0Start),
      periodEnd: formatDateISO(c0End),
      expectedPaymentDate: formatDateISO(c0Pay),
    });
    intervals.push({
      periodStart: formatDateISO(c1Start),
      periodEnd: formatDateISO(c1End),
      expectedPaymentDate: formatDateISO(c1Pay),
    });
  } else if (platform.cycle === 'mensal') {
    const y = today.getFullYear();
    const m = today.getMonth();

    const c0Start = new Date(y, m, 1);
    const c0End = lastDayOfMonth(c0Start);
    const c0Pay = addDays(c0End, payDelay);

    const c1Start = new Date(y, m + 1, 1);
    const c1End = lastDayOfMonth(c1Start);
    const c1Pay = addDays(c1End, payDelay);

    intervals.push({
      periodStart: formatDateISO(c0Start),
      periodEnd: formatDateISO(c0End),
      expectedPaymentDate: formatDateISO(c0Pay),
    });
    intervals.push({
      periodStart: formatDateISO(c1Start),
      periodEnd: formatDateISO(c1End),
      expectedPaymentDate: formatDateISO(c1Pay),
    });
  } else if (platform.cycle === 'misto') {
    const entries: { cut: number; payDelay: number }[] = Array.isArray(rules?.cycle_entries)
      ? rules.cycle_entries
      : (Array.isArray(rules?.cycle_days)
          ? rules.cycle_days.map((d: number) => ({ cut: d, payDelay: rules?.fixed_pay_delay ?? 7 }))
          : []);

    if (entries.length > 0) {
      const sorted = [...entries].sort((a, b) => a.cut - b.cut);
      const baseYear = today.getFullYear();
      const baseMonth = today.getMonth();
      const cutEvents: { date: Date; payDelay: number }[] = [];

      for (let offset = -1; offset <= 3; offset++) {
        const yearMonthDate = new Date(baseYear, baseMonth + offset, 1);
        const curY = yearMonthDate.getFullYear();
        const curM = yearMonthDate.getMonth();
        const daysInM = lastDayOfMonth(yearMonthDate).getDate();

        for (const e of sorted) {
          const cutDay = Math.min(e.cut, daysInM);
          cutEvents.push({
            date: new Date(curY, curM, cutDay),
            payDelay: e.payDelay ?? payDelay,
          });
        }
      }

      cutEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      let currentIdx = -1;
      for (let i = 0; i < cutEvents.length - 1; i++) {
        const start = cutEvents[i].date;
        const nextCut = cutEvents[i + 1].date;
        const end = addDays(nextCut, -1);

        if (today >= start && today <= end) {
          currentIdx = i;
          break;
        }
      }

      if (currentIdx === -1) {
        currentIdx = cutEvents.findIndex((ev) => ev.date > today) - 1;
        if (currentIdx < 0) currentIdx = 0;
      }

      for (let offsetIdx = 0; offsetIdx <= 1; offsetIdx++) {
        const idx = currentIdx + offsetIdx;
        if (idx < cutEvents.length - 1) {
          const ev = cutEvents[idx];
          const nextEv = cutEvents[idx + 1];
          const start = ev.date;
          const end = addDays(nextEv.date, -1);
          const payDate = addDays(end, ev.payDelay);

          intervals.push({
            periodStart: formatDateISO(start),
            periodEnd: formatDateISO(end),
            expectedPaymentDate: formatDateISO(payDate),
          });
        }
      }
    }
  }

  return intervals;
};

/**
 * Consulta o banco por faturas ATIVAS (status <> 'cancelado') da mesma plataforma que se sobreponham
 * ao intervalo [periodStart, periodEnd]. Opcionalmente ignora um ID de fatura (ao editar).
 */
export const checkOverlap = async (
  platformId: string,
  periodStart: string,
  periodEnd: string,
  excludeCycleId?: string
): Promise<{ hasOverlap: boolean; conflictingCycle?: BillingCycleRecord }> => {
  let query = supabase
    .from('billing_cycles')
    .select('id, platform_id, period_start, period_end, expected_payment_date, status, platforms(name)')
    .eq('platform_id', platformId)
    .neq('status', 'cancelado')
    .lte('period_start', periodEnd)
    .gte('period_end', periodStart);

  if (excludeCycleId) {
    query = query.neq('id', excludeCycleId);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return { hasOverlap: false };
  }

  const conflict = data[0];
  return {
    hasOverlap: true,
    conflictingCycle: {
      ...conflict,
      platform_name: (conflict.platforms as { name?: string } | null)?.name,
    },
  };
};
