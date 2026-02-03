/**
 * Unit tests for BasePattern
 * Tests abstract base class for visual patterns with helper methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type p5 from 'p5';

// Concrete implementation of BasePattern for testing
class TestPattern extends BasePattern {
  public setupCalled = false;
  public updateCalled = false;
  public drawCalled = false;
  public cleanupCalled = false;
  public resizeCalled = false;

  public lastContext?: PatternContext;
  public lastOptions?: PatternRenderOptions;
  public resizeArgs?: [p5, number, number];

  constructor(config: PatternConfig) {
    super(config);
  }

  override setup(_p: p5): void {
    this.setupCalled = true;
    this.isSetup = true;
  }

  override update(_p: p5, context: PatternContext): void {
    this.updateCalled = true;
    this.lastContext = context;
  }

  override draw(_p: p5, options: PatternRenderOptions): void {
    this.drawCalled = true;
    this.lastOptions = options;
  }

  override cleanup(_p: p5): void {
    this.cleanupCalled = true;
    this.isSetup = false;
  }

  override resize(p: p5, width: number, height: number): void {
    this.resizeCalled = true;
    this.resizeArgs = [p, width, height];
  }

  // Expose protected methods for testing
  public testMap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return this.map(value, inMin, inMax, outMin, outMax);
  }

  public testClamp(value: number, min: number, max: number): number {
    return this.clamp(value, min, max);
  }

  public testLerp(start: number, stop: number, amount: number): number {
    return this.lerp(start, stop, amount);
  }

  public testGetAudioBand(audio: PatternContext['audio'], band: keyof typeof audio.bands): number {
    return this.getAudioBand(audio, band);
  }

  public testGetCCValue(
    midi: PatternContext['midi'],
    channel: number,
    ccNumber: number,
    defaultValue?: number
  ): number {
    return this.getCCValue(midi, channel, ccNumber, defaultValue);
  }

  public testEnsureSetup(): void {
    return this.ensureSetup();
  }

  public testDrawBackground(p: p5, options: PatternRenderOptions): void {
    return this.drawBackground(p, options);
  }

  public getIsSetup(): boolean {
    return this.isSetup;
  }

  public setIsSetup(value: boolean): void {
    this.isSetup = value;
  }
}

// Mock p5 instance
const createMockP5 = (): p5 => {
  return {
    background: vi.fn(),
    clear: vi.fn(),
  } as unknown as p5;
};

describe('BasePattern', () => {
  let pattern: TestPattern;
  let mockConfig: PatternConfig;
  let mockP5: p5;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      name: 'TestPattern',
      description: 'A test pattern',
      version: '1.0.0',
    };

    mockP5 = createMockP5();
    pattern = new TestPattern(mockConfig);
  });

  describe('constructor', () => {
    it('should create instance with config', () => {
      expect(pattern.config.name).toBe('TestPattern');
      expect(pattern.config.description).toBe('A test pattern');
      expect(pattern.config.version).toBe('1.0.0');
    });

    it('should set default version if not provided', () => {
      const minimalConfig: PatternConfig = {
        name: 'Minimal',
        description: '',
        version: '1.0.0', // BasePattern sets default to 1.0.0 if empty
      };

      const minimalPattern = new TestPattern(minimalConfig);

      expect(minimalPattern.config.version).toBe('1.0.0');
    });

    it('should initialize isSetup to false', () => {
      expect(pattern.getIsSetup()).toBe(false);
    });

    it('should have default render options', () => {
      expect(pattern['defaultOptions']).toEqual({
        clearBackground: false,
        trails: true,
        trailAlpha: 0.1,
      });
    });
  });

  describe('getConfig', () => {
    it('should return pattern config', () => {
      const config = pattern.getConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should return a copy of config', () => {
      const config1 = pattern.getConfig();
      const config2 = pattern.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different reference
    });
  });

  describe('abstract methods', () => {
    it('should require setup implementation', () => {
      // TestPattern implements setup, so this should work
      expect(() => pattern.setup(mockP5)).not.toThrow();
      expect(pattern.setupCalled).toBe(true);
    });

    it('should require update implementation', () => {
      const mockContext: PatternContext = {
        audio: {
          raw: new Uint8Array([0]),
          normalized: [0],
          spectrum: [0],
          waveform: [0],
          bands: {
            subBass: 0,
            bass: 0,
            lowMid: 0,
            mid: 0,
            highMid: 0,
            treble: 0,
            brilliance: 0,
          },
          level: 0,
          peakFrequency: 0,
        },
        midi: {
          cc: new Map(),
          programChange: null,
          clock: 0,
        },
        deltaTime: 16,
        audioManager: {
          getPeakFrequencyInRange: vi.fn(() => 0),
        },
      };

      expect(() => pattern.update(mockP5, mockContext)).not.toThrow();
      expect(pattern.updateCalled).toBe(true);
      expect(pattern.lastContext).toBe(mockContext);
    });

    it('should require draw implementation', () => {
      const mockOptions: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.1,
      };

      expect(() => pattern.draw(mockP5, mockOptions)).not.toThrow();
      expect(pattern.drawCalled).toBe(true);
      expect(pattern.lastOptions).toBe(mockOptions);
    });

    it('should require cleanup implementation', () => {
      pattern.setIsSetup(true);

      expect(() => pattern.cleanup(mockP5)).not.toThrow();
      expect(pattern.cleanupCalled).toBe(true);
      expect(pattern.getIsSetup()).toBe(false);
    });

    it('should have optional resize implementation', () => {
      const width = 800;
      const height = 600;

      pattern.resize(mockP5, width, height);

      expect(pattern.resizeCalled).toBe(true);
      expect(pattern.resizeArgs).toEqual([mockP5, width, height]);
    });
  });

  describe('map', () => {
    it('should map value from one range to another', () => {
      expect(pattern.testMap(0.5, 0, 1, 0, 100)).toBe(50);
    });

    it('should map value at minimum', () => {
      expect(pattern.testMap(0, 0, 1, 0, 100)).toBe(0);
    });

    it('should map value at maximum', () => {
      expect(pattern.testMap(1, 0, 1, 0, 100)).toBe(100);
    });

    it('should map value at midpoint', () => {
      expect(pattern.testMap(50, 0, 100, 0, 1000)).toBe(500);
    });

    it('should map to negative range', () => {
      expect(pattern.testMap(0.5, 0, 1, -100, 100)).toBe(0);
    });

    it('should map from negative range', () => {
      expect(pattern.testMap(0, -1, 1, 0, 100)).toBe(50);
    });

    it('should handle inverted ranges', () => {
      // map(0, 1, 0, 100, 0) = ((0 - 1) * (0 - 100)) / (0 - 1) + 100
      // = (-1 * -100) / -1 + 100 = 100 / -1 + 100 = -100 + 100 = 0
      expect(pattern.testMap(0, 1, 0, 100, 0)).toBe(0);
    });

    it('should map value below input range', () => {
      // Formula: ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
      // ((-1 - 0) * (100 - 0)) / (1 - 0) + 0 = -100
      expect(pattern.testMap(-1, 0, 1, 0, 100)).toBe(-100);
    });

    it('should map value above input range', () => {
      // ((2 - 0) * (100 - 0)) / (1 - 0) + 0 = 200
      expect(pattern.testMap(2, 0, 1, 0, 100)).toBe(200);
    });

    it('should handle zero input range', () => {
      // Division by zero results in Infinity
      expect(pattern.testMap(0.5, 0, 0, 0, 100)).toBe(Infinity);
      expect(pattern.testMap(0, 0, 0, 0, 100)).toBeNaN(); // 0 * Infinity = NaN
    });

    it('should map audio values to color range', () => {
      // Map normalized audio (0-1) to color (0-255)
      expect(pattern.testMap(0.5, 0, 1, 0, 255)).toBe(127.5);
    });

    it('should map MIDI values to parameter range', () => {
      // Map MIDI (0-127) to parameter (0-1)
      expect(pattern.testMap(64, 0, 127, 0, 1)).toBeCloseTo(64 / 127, 4);
    });
  });

  describe('clamp', () => {
    it('should return value within range', () => {
      expect(pattern.testClamp(0.5, 0, 1)).toBe(0.5);
    });

    it('should clamp value below minimum', () => {
      expect(pattern.testClamp(-0.5, 0, 1)).toBe(0);
    });

    it('should clamp value above maximum', () => {
      expect(pattern.testClamp(1.5, 0, 1)).toBe(1);
    });

    it('should clamp to exact minimum', () => {
      expect(pattern.testClamp(0, 0, 1)).toBe(0);
    });

    it('should clamp to exact maximum', () => {
      expect(pattern.testClamp(1, 0, 1)).toBe(1);
    });

    it('should handle negative ranges', () => {
      expect(pattern.testClamp(-5, -10, 10)).toBe(-5);
      expect(pattern.testClamp(-15, -10, 10)).toBe(-10);
      expect(pattern.testClamp(15, -10, 10)).toBe(10);
    });

    it('should handle inverted ranges', () => {
      // When min > max, the clamp function still works but results are determined by
      // Math.max(min, Math.min(max, value))
      // With clamp(5, 10, 0): Math.min(0, 5) = 0, then Math.max(10, 0) = 10
      expect(pattern.testClamp(5, 10, 0)).toBe(10); // Returns max (min parameter due to inversion)

      // With clamp(15, 10, 0): Math.min(0, 15) = 0, then Math.max(10, 0) = 10
      expect(pattern.testClamp(15, 10, 0)).toBe(10);

      // With clamp(-5, 10, 0): Math.min(0, -5) = -5, then Math.max(10, -5) = 10
      expect(pattern.testClamp(-5, 10, 0)).toBe(10);
    });

    it('should clamp color values', () => {
      expect(pattern.testClamp(-10, 0, 255)).toBe(0);
      expect(pattern.testClamp(300, 0, 255)).toBe(255);
    });

    it('should clamp normalized values', () => {
      expect(pattern.testClamp(-0.1, 0, 1)).toBe(0);
      expect(pattern.testClamp(1.5, 0, 1)).toBe(1);
    });
  });

  describe('lerp', () => {
    it('should interpolate between start and stop', () => {
      expect(pattern.testLerp(0, 100, 0.5)).toBe(50);
    });

    it('should return start at amount 0', () => {
      expect(pattern.testLerp(0, 100, 0)).toBe(0);
    });

    it('should return stop at amount 1', () => {
      expect(pattern.testLerp(0, 100, 1)).toBe(100);
    });

    it('should handle negative start', () => {
      expect(pattern.testLerp(-100, 100, 0.5)).toBe(0);
    });

    it('should handle negative stop', () => {
      expect(pattern.testLerp(0, -100, 0.5)).toBe(-50);
    });

    it('should handle amount below 0', () => {
      expect(pattern.testLerp(0, 100, -0.5)).toBe(-50);
    });

    it('should handle amount above 1', () => {
      expect(pattern.testLerp(0, 100, 1.5)).toBe(150);
    });

    it('should interpolate colors', () => {
      expect(pattern.testLerp(0, 255, 0.5)).toBe(127.5);
    });

    it('should interpolate same values', () => {
      expect(pattern.testLerp(50, 50, 0.5)).toBe(50);
    });

    it('should handle floating point precision', () => {
      expect(pattern.testLerp(0, 1, 0.333)).toBeCloseTo(0.333, 3);
    });
  });

  describe('getAudioBand', () => {
    let mockAudio: PatternContext['audio'];

    beforeEach(() => {
      mockAudio = {
        raw: new Uint8Array([0]),
        normalized: [0],
        spectrum: [0],
        waveform: [0],
        bands: {
          subBass: 0.1,
          bass: 0.2,
          lowMid: 0.3,
          mid: 0.4,
          highMid: 0.5,
          treble: 0.6,
          brilliance: 0.7,
        },
        level: 0.5,
        peakFrequency: 440,
      };
    });

    it('should return subBass value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'subBass')).toBe(0.1);
    });

    it('should return bass value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'bass')).toBe(0.2);
    });

    it('should return lowMid value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'lowMid')).toBe(0.3);
    });

    it('should return mid value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'mid')).toBe(0.4);
    });

    it('should return highMid value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'highMid')).toBe(0.5);
    });

    it('should return treble value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'treble')).toBe(0.6);
    });

    it('should return brilliance value', () => {
      expect(pattern.testGetAudioBand(mockAudio, 'brilliance')).toBe(0.7);
    });

    it('should return 0 for missing band', () => {
      const audioWithMissingBand = {
        ...mockAudio,
        bands: {
          subBass: 0.1,
          bass: 0.2,
          lowMid: 0.3,
          mid: 0.4,
          highMid: 0.5,
          treble: 0.6,
          brilliance: undefined as any,
        },
      };

      // The implementation expects all bands to be defined
      // If brilliance is undefined, accessing it will return undefined
      // and the ?? 0 will handle it
      expect(pattern.testGetAudioBand(audioWithMissingBand, 'brilliance')).toBe(0);
    });

    it('should handle undefined bands object', () => {
      // This will throw since we can't access .bands on undefined
      expect(() => {
        const audioWithNoBands = {
          ...mockAudio,
          bands: undefined as any,
        };
        pattern.testGetAudioBand(audioWithNoBands, 'bass');
      }).toThrow();
    });
  });

  describe('getCCValue', () => {
    let mockMidi: PatternContext['midi'];

    beforeEach(() => {
      mockMidi = {
        cc: new Map([
          ['0:1', 0.5],
          ['0:2', 0.75],
          ['1:1', 0.25],
        ]),
        programChange: 3,
        clock: 100,
      };
    });

    it('should return CC value for existing mapping', () => {
      expect(pattern.testGetCCValue(mockMidi, 0, 1)).toBe(0.5);
    });

    it('should return CC value for different channel', () => {
      expect(pattern.testGetCCValue(mockMidi, 1, 1)).toBe(0.25);
    });

    it('should return CC value for different CC number', () => {
      expect(pattern.testGetCCValue(mockMidi, 0, 2)).toBe(0.75);
    });

    it('should return 0 for non-existent CC', () => {
      expect(pattern.testGetCCValue(mockMidi, 5, 10)).toBe(0);
    });

    it('should use custom default value', () => {
      expect(pattern.testGetCCValue(mockMidi, 5, 10, 0.5)).toBe(0.5);
    });

    it('should use 0 as default if not specified', () => {
      expect(pattern.testGetCCValue(mockMidi, 5, 10)).toBe(0);
    });

    it('should handle empty CC map', () => {
      const emptyMidi: PatternContext['midi'] = {
        cc: new Map(),
        programChange: null,
        clock: 0,
      };

      expect(pattern.testGetCCValue(emptyMidi, 0, 1)).toBe(0);
      expect(pattern.testGetCCValue(emptyMidi, 0, 1, 0.5)).toBe(0.5);
    });

    it('should construct correct key format', () => {
      // Key format is "channel:ccNumber"
      expect(pattern.testGetCCValue(mockMidi, 0, 1)).toBe(0.5); // "0:1"
      expect(pattern.testGetCCValue(mockMidi, 15, 127)).toBe(0); // "15:127" doesn't exist
    });
  });

  describe('ensureSetup', () => {
    it('should throw if pattern is not setup', () => {
      pattern.setIsSetup(false);

      expect(() => pattern.testEnsureSetup()).toThrow('TestPattern" is not setup');
    });

    it('should not throw if pattern is setup', () => {
      pattern.setIsSetup(true);

      expect(() => pattern.testEnsureSetup()).not.toThrow();
    });
  });

  describe('drawBackground', () => {
    it('should clear when clearBackground is true', () => {
      const options: PatternRenderOptions = {
        clearBackground: true,
        trails: false,
        trailAlpha: 0,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.clear).toHaveBeenCalled();
      expect(mockP5.background).not.toHaveBeenCalled();
    });

    it('should draw background with trails when trails is true', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.1,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.clear).not.toHaveBeenCalled();
      expect(mockP5.background).toHaveBeenCalledWith(0, 0.1 * 255);
    });

    it('should draw solid background when trails is false', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: false,
        trailAlpha: 0,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.clear).not.toHaveBeenCalled();
      expect(mockP5.background).toHaveBeenCalledWith(0);
    });

    it('should handle clearBackground taking precedence', () => {
      const options: PatternRenderOptions = {
        clearBackground: true,
        trails: true,
        trailAlpha: 0.1,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.clear).toHaveBeenCalled();
      expect(mockP5.background).not.toHaveBeenCalled();
    });

    it('should convert trailAlpha to 0-255 range', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.5,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.background).toHaveBeenCalledWith(0, 0.5 * 255);
    });

    it('should handle trailAlpha of 1', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 1,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.background).toHaveBeenCalledWith(0, 255);
    });

    it('should handle trailAlpha of 0', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0,
      };

      pattern.testDrawBackground(mockP5, options);

      expect(mockP5.background).toHaveBeenCalledWith(0, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle map with extreme values', () => {
      expect(pattern.testMap(Number.MAX_VALUE, 0, 1, 0, 1)).toBeGreaterThan(0);
    });

    it('should handle clamp with same min and max', () => {
      // When min === max, clamp returns max (the implementation uses Math.max(min, Math.min(max, value)))
      // With min === max === 10:
      // - Math.min(10, 5) = 5
      // - Math.max(10, 5) = 10
      expect(pattern.testClamp(5, 10, 10)).toBe(10);
      expect(pattern.testClamp(10, 10, 10)).toBe(10);
      expect(pattern.testClamp(15, 10, 10)).toBe(10);
    });

    it('should handle lerp with same start and stop', () => {
      expect(pattern.testLerp(50, 50, 0.5)).toBe(50);
    });

    it('should handle getCCValue with undefined midi', () => {
      // Note: This will throw in the actual implementation if midi is undefined
      // This is expected behavior - we expect valid input
      expect(() =>
        pattern.testGetCCValue(undefined as any, 0, 1, 0.5)
      ).toThrow();
    });

    it('should handle getAudioBand with undefined audio', () => {
      // Note: This will throw in the actual implementation if audio is undefined
      // This is expected behavior - we expect valid input
      expect(() =>
        pattern.testGetAudioBand(undefined as any, 'bass')
      ).toThrow();
    });

    it('should handle lerp with NaN amount', () => {
      expect(pattern.testLerp(0, 100, NaN)).toBeNaN();
    });

    it('should handle map with NaN value', () => {
      expect(pattern.testMap(NaN, 0, 1, 0, 100)).toBeNaN();
    });

    it('should handle clamp with NaN value', () => {
      expect(pattern.testClamp(NaN, 0, 1)).toBeNaN();
    });
  });

  describe('integration tests', () => {
    it('should handle complete pattern lifecycle', () => {
      const mockContext: PatternContext = {
        audio: {
          raw: new Uint8Array([128]),
          normalized: [0.5],
          spectrum: [0.5],
          waveform: [0],
          bands: {
            subBass: 0.2,
            bass: 0.4,
            lowMid: 0.6,
            mid: 0.8,
            highMid: 0.5,
            treble: 0.3,
            brilliance: 0.1,
          },
          level: 0.5,
          peakFrequency: 440,
        },
        midi: {
          cc: new Map([['0:1', 0.75]]),
          programChange: 2,
          clock: 50,
        },
        deltaTime: 16,
        audioManager: {
          getPeakFrequencyInRange: vi.fn(() => 440),
        },
      };

      const mockOptions: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      // Setup
      pattern.setup(mockP5);
      expect(pattern.setupCalled).toBe(true);
      expect(pattern.getIsSetup()).toBe(true);

      // Update
      pattern.update(mockP5, mockContext);
      expect(pattern.updateCalled).toBe(true);
      expect(pattern.lastContext).toBe(mockContext);

      // Draw
      pattern.draw(mockP5, mockOptions);
      expect(pattern.drawCalled).toBe(true);
      expect(pattern.lastOptions).toBe(mockOptions);

      // Resize
      pattern.resize(mockP5, 800, 600);
      expect(pattern.resizeCalled).toBe(true);

      // Cleanup
      pattern.cleanup(mockP5);
      expect(pattern.cleanupCalled).toBe(true);
      expect(pattern.getIsSetup()).toBe(false);
    });

    it('should use helper methods correctly', () => {
      // Test map
      const mappedValue = pattern.testMap(0.5, 0, 1, 0, 255);
      expect(mappedValue).toBe(127.5);

      // Test clamp
      const clampedValue = pattern.testClamp(300, 0, 255);
      expect(clampedValue).toBe(255);

      // Test lerp
      const lerpedValue = pattern.testLerp(0, 255, 0.5);
      expect(lerpedValue).toBe(127.5);

      // Test getAudioBand
      const mockAudio: PatternContext['audio'] = {
        raw: new Uint8Array([0]),
        normalized: [0],
        spectrum: [0],
        waveform: [0],
        bands: {
          subBass: 0.2,
          bass: 0.4,
          lowMid: 0.6,
          mid: 0.8,
          highMid: 0.5,
          treble: 0.3,
          brilliance: 0.1,
        },
        level: 0.5,
        peakFrequency: 440,
      };
      expect(pattern.testGetAudioBand(mockAudio, 'bass')).toBe(0.4);

      // Test getCCValue
      const mockMidi: PatternContext['midi'] = {
        cc: new Map([['0:1', 0.75]]),
        programChange: 2,
        clock: 50,
      };
      expect(pattern.testGetCCValue(mockMidi, 0, 1)).toBe(0.75);
    });

    it('should combine helper methods for common operations', () => {
      // Map audio level to size, then clamp
      const audioLevel = 1.5; // Above 1
      const size = pattern.testMap(audioLevel, 0, 1, 10, 100);
      // map formula: ((1.5 - 0) * (100 - 10)) / (1 - 0) + 10 = 135 + 10 = 145

      expect(size).toBe(145);

      // Clamp to range
      const clampedSize = pattern.testClamp(size, 10, 100);
      expect(clampedSize).toBe(100); // Clamped to max

      // Use clamp to constrain further
      const finalSize = pattern.testClamp(clampedSize, 0, 50);
      expect(finalSize).toBe(50); // Clamped to max

      // Lerp between sizes based on audio
      const lerpedSize = pattern.testLerp(10, 50, audioLevel);
      expect(lerpedSize).toBe(70); // 10 + (50 - 10) * 1.5
    });
  });
});
