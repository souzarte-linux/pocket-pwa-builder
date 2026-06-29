import { describe, expect, it } from 'vitest';
import { getDaysInRange, startOfWeek } from './format';

describe('startOfWeek', () => {
  it('returns the Monday of the current week when the date is Sunday', () => {
    const sunday = new Date('2026-06-28T12:00:00');
    const weekStart = startOfWeek(sunday);

    expect(new Date(weekStart).getDay()).toBe(1);
    expect(new Date(weekStart).getHours()).toBe(0);
    expect(new Date(weekStart).getMinutes()).toBe(0);
  });
});

describe('getDaysInRange', () => {
  it('counts the days between the selected range inclusively', () => {
    const since = new Date('2026-06-22T00:00:00');
    const until = new Date('2026-06-24T23:59:59');

    expect(getDaysInRange(since, until)).toBe(3);
  });
});
