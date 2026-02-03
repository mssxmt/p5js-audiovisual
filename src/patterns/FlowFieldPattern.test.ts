/**
 * Unit tests for FlowFieldPattern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowFieldPattern } from './FlowFieldPattern';
import type { PatternContext } from '../types/pattern';
import type p5 from 'p5';

// Mock p5
function createMockP5(): p5 {
  const mockP5 = {
    width: 800,
    height: 600,
    createVector: vi.fn((x?: number, y?: number, z?: number) => {
      const vector = {
        x: x ?? 0,
        y: y ?? 0,
        z: z ?? 0,
        copy: vi.fn(function(this: any) { return { x: this.x, y: this.y, z: this.z }; }),
        add: vi.fn(function(this: any, v: any) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }),
        mult: vi.fn(function(this: any, s: any) { this.x *= s; this.y *= s; this.z *= s; return this; }),
        limit: vi.fn(function(this: any, max: number) {
          const mag = Math.sqrt(this.x * this.x + this.y * this.y);
          if (mag > max) {
            const ratio = max / mag;
            this.x *= ratio;
            this.y *= ratio;
          }
          return this;
        }),
      };
      return vector as any;
    }),
    random: vi.fn((min?: number, max?: number) => {
      if (min !== undefined && max !== undefined) {
        return Math.random() * (max - min) + min;
      }
      return Math.random();
    }),
    noise: vi.fn(() => Math.random() * 0.5),
    TWO_PI: Math.PI * 2,
    colorMode: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    line: vi.fn(),
    background: vi.fn(),
    clear: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
    ceil: Math.ceil,
    floor: Math.floor,
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    HSL: 'hsl' as any,
  } as unknown as p5;

  // Add p5.Vector.fromAngle mock
  (mockP5 as any).p5 = {
    Vector: {
      fromAngle: vi.fn((angle: number) => {
        const vector = {
          x: Math.cos(angle),
          y: Math.sin(angle),
          mult: vi.fn(function(this: any, s: number) {
            this.x *= s;
            this.y *= s;
            return this;
          }),
        };
        return vector;
      }),
    },
  };

  return mockP5;
}

// Mock pattern context
function createMockContext(
  bassLevel = 0,
  midLevel = 0,
  trebleLevel = 0,
  volumeLevel = 0
): PatternContext {
  return {
    audio: {
      raw: new Uint8Array([128]),
      normalized: [volumeLevel],
      spectrum: [bassLevel, midLevel, trebleLevel],
      waveform: [0],
      bands: {
        subBass: bassLevel * 0.8,
        bass: bassLevel,
        lowMid: midLevel * 0.7,
        mid: midLevel,
        highMid: trebleLevel * 0.6,
        treble: trebleLevel,
        brilliance: trebleLevel * 0.5,
      },
      level: volumeLevel,
      peakFrequency: bassLevel > 0 ? 80 : 0,
    },
    midi: {
      cc: new Map(),
      programChange: null,
      clock: 0,
    },
    deltaTime: 16,
    audioManager: {
      getPeakFrequencyInRange: vi.fn(() => bassLevel > 0 ? 80 : 0),
    },
  };
}

describe('FlowFieldPattern', () => {
  let pattern: FlowFieldPattern;
  let mockP5: p5;

  beforeEach(() => {
    vi.clearAllMocks();
    mockP5 = createMockP5();
    pattern = new FlowFieldPattern();
  });

  describe('constructor', () => {
    it('should create instance with correct config', () => {
      const config = pattern.getConfig();

      expect(config.name).toBe('FlowFieldPattern');
      expect(config.description).toBeTruthy();
      expect(config.version).toBe('1.0.0');
    });

    it('should initialize with default parameters', () => {
      const params = pattern.getParams();

      expect(params.particleCount).toBe(2000);
      expect(params.lineWidth).toBe(1.5);
      expect(params.noiseScale).toBe(0.008);
      expect(params.baseHue).toBe(200);
    });
  });

  describe('getParams and setParams', () => {
    it('should return independent copy of params', () => {
      const params1 = pattern.getParams();
      const params2 = pattern.getParams();

      params1.particleCount = 5000;

      expect(params2.particleCount).toBe(2000);
    });

    it('should update parameters partially', () => {
      pattern.setParams({ particleCount: 3000, lineWidth: 2.5 });

      const params = pattern.getParams();

      expect(params.particleCount).toBe(3000);
      expect(params.lineWidth).toBe(2.5);
      expect(params.noiseScale).toBe(0.008); // Unchanged
    });
  });

  describe('getParamMeta', () => {
    it('should return parameter metadata', () => {
      const meta = pattern.getParamMeta();

      expect(meta.particleCount).toEqual({ min: 500, max: 5000, step: 100 });
      expect(meta.lineWidth).toEqual({ min: 0.5, max: 5.0, step: 0.1 });
      expect(meta.baseHue).toEqual({ min: 0, max: 360, step: 1 });
    });
  });

  describe('getMidiMappings', () => {
    it('should return MIDI CC mappings', () => {
      const mappings = pattern.getMidiMappings();

      expect(mappings).toHaveLength(10);
      expect(mappings[0]).toMatchObject({
        channel: 0,
        ccNumber: 1,
        parameterPath: 'particleCount',
        min: 500,
        max: 5000,
      });
    });
  });

  describe('setup', () => {
    it('should initialize flow field and particles', async () => {
      await pattern.setup(mockP5);

      expect(pattern['isSetup']).toBe(true);
      expect(pattern['particles']).toHaveLength(2000);
      expect(pattern['cols']).toBeGreaterThan(0);
      expect(pattern['rows']).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should update particles without errors', () => {
      const context = createMockContext(0.5, 0.4, 0.3, 0.6);

      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should reinitialize particles when count changes', () => {
      pattern.setParams({ particleCount: 2500 });
      const context = createMockContext();
      pattern.update(mockP5, context);

      expect(pattern['particles'].length).toBe(2500);
    });

    it('should update time on each frame', () => {
      const context = createMockContext();

      const initialTime = pattern['time'];
      pattern.update(mockP5, context);
      const newTime = pattern['time'];

      expect(newTime).toBeGreaterThan(initialTime);
    });
  });

  describe('draw', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should draw without errors', () => {
      const options = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.1,
      };

      expect(() => pattern.draw(mockP5, options)).not.toThrow();
    });

    it('should clear background when requested', () => {
      const options = {
        clearBackground: true,
        trails: false,
        trailAlpha: 0,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.clear).toHaveBeenCalled();
    });

    it('should draw background with fade when not clearing', () => {
      const options = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.1,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.background).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', async () => {
      await pattern.setup(mockP5);

      pattern.cleanup(mockP5);

      expect(pattern['particles']).toHaveLength(0);
      expect(pattern['isSetup']).toBe(false);
    });
  });

  describe('resize', () => {
    it('should reinitialize flow field on resize', async () => {
      await pattern.setup(mockP5);

      const initialCols = pattern['cols'];
      const initialRows = pattern['rows'];

      mockP5.width = 1000;
      mockP5.height = 800;

      pattern.resize(mockP5);

      expect(pattern['cols']).not.toBe(initialCols);
      expect(pattern['rows']).not.toBe(initialRows);
    });
  });
});
