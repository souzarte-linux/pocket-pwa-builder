import { describe, it, expect } from 'vitest';
import {
  formatCurrencyMask,
  parseCurrencyToNumber,
  formatDistanceMask,
  parseDistanceToNumber,
  formatPackageMask,
  formatVolumeMask,
  parsePackageToNumber,
  getCleanUnmaskedValue,
} from '@/lib/format';

describe('format.ts - Visual Masks and Parsing Logic', () => {
  describe('formatCurrencyMask & parseCurrencyToNumber', () => {
    it('formats numbers and decimal strings into BRL currency mask', () => {
      expect(formatCurrencyMask('125.50')).toContain('125,50');
      expect(formatCurrencyMask(125.5)).toContain('125,50');
      expect(formatCurrencyMask('')).toBe('');
    });

    it('parses both plain numbers, decimal texts and formatted currency strings into JS numbers', () => {
      expect(parseCurrencyToNumber('125.5')).toBe(125.5);
      expect(parseCurrencyToNumber('125,50')).toBe(125.5);
      expect(parseCurrencyToNumber('R$ 125,50')).toBe(125.5);
      expect(parseCurrencyToNumber(125.5)).toBe(125.5);
      expect(parseCurrencyToNumber('')).toBe(0);
    });
  });

  describe('formatDistanceMask & parseDistanceToNumber', () => {
    it('formats numbers and strings into KM visual mask', () => {
      expect(formatDistanceMask('5')).toBe('5,0 KM');
      expect(formatDistanceMask('5.5')).toBe('5,5 KM');
      expect(formatDistanceMask(10)).toBe('10,0 KM');
      expect(formatDistanceMask('')).toBe('');
    });

    it('parses masked distance strings back to clean JS numbers', () => {
      expect(parseDistanceToNumber('5,5 KM')).toBe(5.5);
      expect(parseDistanceToNumber('10,0 KM')).toBe(10);
      expect(parseDistanceToNumber(5.5)).toBe(5.5);
    });
  });

  describe('formatPackageMask & parsePackageToNumber', () => {
    it('formats singular and plural package counts correctly', () => {
      expect(formatPackageMask('1')).toBe('1 Pacotinho');
      expect(formatPackageMask('5')).toBe('5 Pacotinhos');
      expect(formatPackageMask(1)).toBe('1 Pacotinho');
      expect(formatPackageMask('')).toBe('');
    });

    it('parses package string back to pure integer', () => {
      expect(parsePackageToNumber('5 Pacotinhos')).toBe(5);
      expect(parsePackageToNumber('1 Pacotinho')).toBe(1);
    });
  });

  describe('formatVolumeMask', () => {
    it('formats singular and plural volume counts correctly', () => {
      expect(formatVolumeMask('1')).toBe('1 Volume');
      expect(formatVolumeMask('2')).toBe('2 Volumes');
      expect(formatVolumeMask(2)).toBe('2 Volumes');
      expect(formatVolumeMask('')).toBe('');
    });
  });

  describe('getCleanUnmaskedValue', () => {
    it('strips visual masks back to clean raw values', () => {
      expect(getCleanUnmaskedValue('R$ 125,50', 'currency')).toBe('125,50');
      expect(getCleanUnmaskedValue('5,5 KM', 'distance')).toBe('5,5');
      expect(getCleanUnmaskedValue('5 Pacotinhos', 'package')).toBe('5');
      expect(getCleanUnmaskedValue('2 Volumes', 'volume')).toBe('2');
    });
  });
});
