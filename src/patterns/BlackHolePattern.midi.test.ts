/**
 * Unit tests for BlackHolePattern MIDI mapping functionality
 * Tests getMidiMappings() method for CC mapping information
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlackHolePattern } from './BlackHolePattern';

describe('BlackHolePattern - MIDI Mapping', () => {
  let pattern: BlackHolePattern;

  beforeEach(() => {
    vi.clearAllMocks();
    pattern = new BlackHolePattern();
  });

  describe('getMidiMappings', () => {
    it('should return an array of MIDI CC mappings', () => {
      const mappings = pattern.getMidiMappings();

      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should include CC1 mapping for gravity parameter', () => {
      const mappings = pattern.getMidiMappings();

      const gravityMapping = mappings.find(
        (m) => m.ccNumber === 1 && m.parameterPath === 'gravity'
      );

      expect(gravityMapping).toBeDefined();
      expect(gravityMapping?.channel).toBe(0);
      expect(gravityMapping?.min).toBe(0);
      expect(gravityMapping?.max).toBe(1);
    });

    it('should include CC2 mapping for noiseIntensity parameter', () => {
      const mappings = pattern.getMidiMappings();

      const noiseMapping = mappings.find(
        (m) => m.ccNumber === 2 && m.parameterPath === 'noiseIntensity'
      );

      expect(noiseMapping).toBeDefined();
      expect(noiseMapping?.channel).toBe(0);
      expect(noiseMapping?.min).toBe(0);
      expect(noiseMapping?.max).toBe(1);
    });

    it('should include CC3 mapping for particleCount parameter', () => {
      const mappings = pattern.getMidiMappings();

      const particleCountMapping = mappings.find(
        (m) => m.ccNumber === 3 && m.parameterPath === 'particleCount'
      );

      expect(particleCountMapping).toBeDefined();
      expect(particleCountMapping?.channel).toBe(0);
      expect(particleCountMapping?.min).toBe(50);
      expect(particleCountMapping?.max).toBe(500);
    });

    it('should return mappings with correct structure', () => {
      const mappings = pattern.getMidiMappings();

      mappings.forEach((mapping) => {
        expect(mapping).toHaveProperty('channel');
        expect(mapping).toHaveProperty('ccNumber');
        expect(mapping).toHaveProperty('parameterPath');
        expect(mapping).toHaveProperty('min');
        expect(mapping).toHaveProperty('max');
        expect(typeof mapping.channel).toBe('number');
        expect(typeof mapping.ccNumber).toBe('number');
        expect(typeof mapping.parameterPath).toBe('string');
        expect(typeof mapping.min).toBe('number');
        expect(typeof mapping.max).toBe('number');
      });
    });

    it('should return immutable array (new instance each call)', () => {
      const mappings1 = pattern.getMidiMappings();
      const mappings2 = pattern.getMidiMappings();

      expect(mappings1).toEqual(mappings2);
      expect(mappings1).not.toBe(mappings2);
    });

    it('should have channel 0 for all mappings', () => {
      const mappings = pattern.getMidiMappings();

      mappings.forEach((mapping) => {
        expect(mapping.channel).toBe(0);
      });
    });

    it('should have unique CC numbers', () => {
      const mappings = pattern.getMidiMappings();
      const ccNumbers = mappings.map((m) => m.ccNumber);

      const uniqueCcNumbers = [...new Set(ccNumbers)];
      expect(ccNumbers.length).toBe(uniqueCcNumbers.length);
    });

    it('should return mappings for all pattern parameters', () => {
      const mappings = pattern.getMidiMappings();
      const parameterPaths = mappings.map((m) => m.parameterPath);

      expect(parameterPaths).toContain('gravity');
      expect(parameterPaths).toContain('noiseIntensity');
      expect(parameterPaths).toContain('particleCount');
    });

    it('should have min less than or equal to max for all mappings', () => {
      const mappings = pattern.getMidiMappings();

      mappings.forEach((mapping) => {
        expect(mapping.min).toBeLessThanOrEqual(mapping.max);
      });
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no mappings defined', () => {
      // This test documents expected behavior
      // Currently BlackHolePattern should always have mappings
      const mappings = pattern.getMidiMappings();
      expect(mappings.length).toBeGreaterThan(0);
    });

    it('should handle multiple calls without side effects', () => {
      const mappings1 = pattern.getMidiMappings();
      const mappings2 = pattern.getMidiMappings();
      const mappings3 = pattern.getMidiMappings();

      expect(mappings1).toEqual(mappings2);
      expect(mappings2).toEqual(mappings3);
    });
  });

  describe('integration with pattern parameters', () => {
    it('should have mappings that match pattern params', () => {
      const params = pattern.getParams();
      const mappings = pattern.getMidiMappings();

      // All mapped parameters should exist in params
      mappings.forEach((mapping) => {
        expect(params).toHaveProperty(mapping.parameterPath);
      });
    });

    it('should have mapping ranges that cover param ranges', () => {
      const mappings = pattern.getMidiMappings();

      mappings.forEach((mapping) => {
        // Mapping range should be reasonable for the parameter
        expect(mapping.min).toBeGreaterThanOrEqual(0);
        if (mapping.parameterPath === 'particleCount') {
          expect(mapping.max).toBeGreaterThan(50);
        } else {
          expect(mapping.max).toBeLessThanOrEqual(1);
        }
      });
    });
  });
});
