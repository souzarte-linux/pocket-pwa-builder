import { describe, expect, it } from 'vitest';
import { startOfWeek } from './format';

describe('startOfWeek', () => {
  it('returns the Monday of the current week when the date is Sunday', () => {
    const sunday = new Date('2026-06-28T12:00:00');
    const weekStart = startOfWeek(sunday);

    expect(new Date(weekStart).getDay()).toBe(1);
    expect(new Date(weekStart).getHours()).toBe(0);
    expect(new Date(weekStart).getMinutes()).toBe(0);
  });
});
