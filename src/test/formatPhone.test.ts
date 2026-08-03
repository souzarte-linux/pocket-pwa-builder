import { describe, it, expect } from 'vitest';
import { formatPhoneMask, unformatPhone } from '@/lib/format';

describe('Phone Masking and Unmasking Utilities', () => {
  it('formats phone numbers visually with mask (00) 0.0000-0000', () => {
    expect(formatPhoneMask('11987654321')).toBe('(11) 9.8765-4321');
    expect(formatPhoneMask('(11) 98765-4321')).toBe('(11) 9.8765-4321');
    expect(formatPhoneMask('(11) 9.8765-4321')).toBe('(11) 9.8765-4321');
    expect(formatPhoneMask('11')).toBe('(11');
    expect(formatPhoneMask('119')).toBe('(11) 9');
    expect(formatPhoneMask('1198765')).toBe('(11) 9.8765');
  });

  it('unformats phone numbers to store numeric digits only (SEM a máscara)', () => {
    expect(unformatPhone('(11) 9.8765-4321')).toBe('11987654321');
    expect(unformatPhone('(11) 98765-4321')).toBe('11987654321');
    expect(unformatPhone('11987654321')).toBe('11987654321');
    expect(unformatPhone('')).toBe('');
  });
});
