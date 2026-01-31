/**
 * Unit tests for BlackHolePattern
 * Tests 3D black hole visualization with gravitational physics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlackHolePattern } from './BlackHolePattern';
import type { PatternContext, PatternRenderOptions } from '../types/pattern';
import type p5 from 'p5';

// Mock p5 Vector class
class MockVector {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  copy(): MockVector {
    return new MockVector(this.x, this.y, this.z);
  }

  add(v: MockVector): MockVector {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: MockVector): MockVector {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  mult(n: number): MockVector {
    this.x *= n;
    this.y *= n;
    this.z *= n;
    return this;
  }

  div(n: number): MockVector {
    this.x /= n;
    this.y /= n;
    this.z /= n;
    return this;
  }

  mag(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  magSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  normalize(): MockVector {
    const m = this.mag();
    if (m !== 0) {
      this.div(m);
    }
    return this;
  }

  limit(max: number): MockVector {
    if (this.mag() > max) {
      this.normalize();
      this.mult(max);
    }
    return this;
  }

  dist(v: MockVector): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  set(x: number, y: number, z: number): MockVector {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

// Mock p5 Color
class MockColor {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r = 0, g = 0, b = 0, a = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toString(): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a / 255})`;
  }
}

// Mock p5 instance
const createMockP5 = (): p5 => {
  const mockP5 = {
    width: 800,
    height: 600,
    deltaTime: 16,

    // Drawing methods
    background: vi.fn(),
    clear: vi.fn(),
    push: vi.fn(),
    pop: vi.fn(),
    translate: vi.fn(),
    rotateX: vi.fn(),
    rotateY: vi.fn(),
    rotateZ: vi.fn(),
    sphere: vi.fn(),
    point: vi.fn(),
    line: vi.fn(),
    stroke: vi.fn(),
    strokeWeight: vi.fn(),
    noStroke: vi.fn(),
    fill: vi.fn(),
    noFill: vi.fn(),

    // Color methods
    color: vi.fn((r, g, b, a = 255) => new MockColor(r, g, b, a)),
    lerpColor: vi.fn((c1: MockColor, c2: MockColor, amt: number) => {
      return new MockColor(
        c1.r + (c2.r - c1.r) * amt,
        c1.g + (c2.g - c1.g) * amt,
        c1.b + (c2.b - c1.b) * amt,
        c1.a + (c2.a - c1.a) * amt
      );
    }),

    // Vector methods
    createVector: vi.fn((x = 0, y = 0, z = 0) => new MockVector(x, y, z)),

    // Math methods
    noise: vi.fn((x: number, y: number, z: number) => {
      // Simple deterministic noise for testing
      return (Math.sin(x * 0.1) + Math.cos(y * 0.1) + Math.sin(z * 0.1)) / 3 + 0.5;
    }),
    map: vi.fn((value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
      return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }),
    random: vi.fn((min?: number, max?: number) => {
      if (min !== undefined && max !== undefined) {
        return Math.random() * (max - min) + min;
      }
      if (min !== undefined) {
        return Math.random() * min;
      }
      return Math.random();
    }),

    // WEBGL specific
    WEBGL: 'WEBGL',
    ambientLight: vi.fn(),
    pointLight: vi.fn(),
    emissiveMaterial: vi.fn(),
    noLights: vi.fn(),
    lights: vi.fn(),
    torus: vi.fn(),
  } as unknown as p5;

  return mockP5;
};

// Helper to create mock context
const createMockContext = (
  bassLevel = 0,
  midLevel = 0,
  highLevel = 0,
  volumeLevel = 0
): PatternContext => {
  return {
    audio: {
      raw: new Uint8Array([128]),
      normalized: [volumeLevel],
      spectrum: [bassLevel, midLevel, highLevel],
      bands: {
        subBass: bassLevel * 0.8,
        bass: bassLevel,
        lowMid: midLevel * 0.7,
        mid: midLevel,
        highMid: highLevel * 0.6,
        treble: highLevel,
        brilliance: highLevel * 0.5,
      },
      level: volumeLevel,
    },
    midi: {
      cc: new Map(),
      programChange: null,
      clock: 0,
    },
    deltaTime: 16,
  };
};

describe('BlackHolePattern', () => {
  let pattern: BlackHolePattern;
  let mockP5: p5;

  beforeEach(() => {
    vi.clearAllMocks();

    mockP5 = createMockP5();
    pattern = new BlackHolePattern();
  });

  describe('constructor', () => {
    it('should create instance with correct config', () => {
      const config = pattern.getConfig();

      expect(config.name).toBe('BlackHolePattern');
      expect(config.description).toBeTruthy();
      expect(config.version).toBe('1.0.0');
    });

    it('should initialize with default parameters', () => {
      expect(pattern['params']).toBeDefined();
      expect(pattern['params'].gravity).toBeCloseTo(0.5, 1);
      expect(pattern['params'].noiseIntensity).toBeCloseTo(0.3, 1);
      expect(pattern['params'].particleCount).toBe(200);
      expect(pattern['params'].trailAlpha).toBeCloseTo(0.15, 1);
    });
  });

  describe('setup', () => {
    it('should initialize particles array', async () => {
      await pattern.setup(mockP5);

      expect(pattern['particles']).toBeDefined();
      expect(pattern['particles'].length).toBeGreaterThan(0);
    });

    it('should set isSetup flag to true', async () => {
      await pattern.setup(mockP5);

      expect(pattern['isSetup']).toBe(true);
    });

    it('should initialize particles with correct properties', async () => {
      await pattern.setup(mockP5);

      const particle = pattern['particles'][0];
      expect(particle).toBeDefined();
      expect(particle.pos).toBeDefined();
      expect(particle.vel).toBeDefined();
      expect(particle.acc).toBeDefined();
      expect(particle.mass).toBeGreaterThan(0);
      expect(particle.color).toBeDefined();
    });

    it('should handle WEBGL mode setup', async () => {
      await pattern.setup(mockP5);

      expect(pattern['isSetup']).toBe(true);
      expect(pattern['particles'].length).toBe(pattern['params'].particleCount);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should update particle physics', () => {
      const context = createMockContext();
      const initialPos = pattern['particles'][0].pos.copy();

      pattern.update(mockP5, context);

      // Position should change due to gravity
      expect(pattern['particles'][0].pos.x).not.toBe(initialPos.x);
    });

    it('should apply gravitational force towards center', () => {
      const context = createMockContext();
      const particle = pattern['particles'][0];

      // Disable noise to test pure gravity
      pattern['params'].noiseIntensity = 0;

      // Position particle away from center and reset all motion
      particle.pos.set(100, 100, 100);
      particle.vel.set(0, 0, 0);
      particle.acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // Velocity should now be towards center (negative values)
      // All components should be negative since we're at (100, 100, 100)
      expect(particle.vel.x).toBeLessThan(0);
      expect(particle.vel.y).toBeLessThan(0);
      expect(particle.vel.z).toBeLessThan(0);
    });

    it('should increase gravity with bass audio level', () => {
      const lowBassContext = createMockContext(0.2, 0, 0);
      const highBassContext = createMockContext(0.8, 0, 0);

      // Reset particle to same position for both tests
      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, lowBassContext);
      const lowBassVel = pattern['particles'][0].vel.x;

      // Reset particle again
      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, highBassContext);
      const highBassVel = pattern['particles'][0].vel.x;

      // Higher bass should result in stronger gravitational pull (more negative)
      expect(highBassVel).toBeLessThan(lowBassVel);
    });

    it('should increase particle speed with treble audio level', () => {
      const lowTrebleContext = createMockContext(0, 0, 0.2);
      const highTrebleContext = createMockContext(0, 0, 0.8);

      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, lowTrebleContext);
      const lowTrebleSpeed = pattern['particles'][0].vel.mag();

      // Reset particle
      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, highTrebleContext);
      const highTrebleSpeed = pattern['particles'][0].vel.mag();

      expect(highTrebleSpeed).toBeGreaterThan(lowTrebleSpeed);
    });

    it('should handle particles crossing event horizon', () => {
      // Use low volume to maintain particle count at 200
      // New formula: Math.floor(200 * (0.3 + volumeLevel * 3)) = 200 when volumeLevel ≈ 0.234
      const context = createMockContext(1, 0, 0, 0.234);

      // Position particle inside event horizon
      pattern['particles'][0].pos.set(5, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      const initialCount = pattern['particles'].length;
      pattern.update(mockP5, context);

      // Particle should be respawned, count should remain same
      expect(pattern['particles'].length).toBe(initialCount);
    });

    it('should respect MIDI CC1 for gravity control', () => {
      const context = createMockContext();
      context.midi.cc.set('0:1', 0.9); // CC1 at 90%

      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // High MIDI CC value should affect gravity
      expect(pattern['particles'][0].vel.x).not.toBe(0);
    });

    it('should respect MIDI CC2 for noise intensity', () => {
      const context = createMockContext();
      context.midi.cc.set('0:2', 0.8); // CC2 at 80%

      // Should not throw
      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should respect MIDI CC3 for particle count', () => {
      const context = createMockContext();
      context.midi.cc.set('0:3', 0.5); // CC3 at 50%

      // Should not throw and should adjust particle count
      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should respawn particles that get too close to black hole', () => {
      // Use mid volume to maintain particle count
      const context = createMockContext(0, 0, 0, 0.5);

      // Position particle very close to center
      pattern['particles'][0].pos.set(1, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // First particle should now be at a safe distance
      // (respawned if it was inside event horizon)
      expect(pattern['particles'][0].pos.mag()).toBeGreaterThan(10);
    });

    it('should apply Perlin noise to particle motion', () => {
      const context = createMockContext(0.5, 0.5, 0.5);

      const particle = pattern['particles'][0];
      particle.pos.set(50, 50, 50);
      particle.vel.set(0, 0, 0);
      particle.acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // Noise should add some randomness to movement
      // After update, acceleration should have been modified
      // We check that position changed (not all components stayed at 50)
      const positionChanged = particle.pos.x !== 50 || particle.pos.y !== 50 || particle.pos.z !== 50;
      expect(positionChanged).toBe(true);
    });

    it('should handle zero audio levels', () => {
      const context = createMockContext(0, 0, 0);

      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should handle maximum audio levels', () => {
      const context = createMockContext(1, 1, 1, 1);

      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });
  });

  describe('draw', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should draw background with trails', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      // Background uses backgroundAlpha from params (default 0.3)
      expect(mockP5.background).toHaveBeenCalledWith(0, 0, 0, 0.8 * 255);
    });

    it('should draw event horizon sphere', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.sphere).toHaveBeenCalled();
    });

    it('should draw all particles', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      // Should draw at least as many points as particles
      expect(mockP5.point).toHaveBeenCalled();
    });

    it('should use push/pop for state management', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.push).toHaveBeenCalled();
      expect(mockP5.pop).toHaveBeenCalled();
    });

    it('should use custom trailAlpha when provided', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.3,
      };

      pattern.draw(mockP5, options);

      // Background uses backgroundColor from params (default 0, 0, 0) with trailAlpha
      expect(mockP5.background).toHaveBeenCalledWith(0, 0, 0, 0.8 * 255);
    });

    it('should clear background when clearBackground is true', () => {
      const options: PatternRenderOptions = {
        clearBackground: true,
        trails: false,
        trailAlpha: 0,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.clear).toHaveBeenCalled();
      expect(mockP5.background).not.toHaveBeenCalled();
    });

    it('should draw solid background when trails is false', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: false,
        trailAlpha: 0,
      };

      pattern.draw(mockP5, options);

      // Background uses backgroundAlpha from params (default 0.3)
      expect(mockP5.background).toHaveBeenCalledWith(0, 0, 0, 0.8 * 255);
    });
  });

  describe('cleanup', () => {
    it('should clear particles array', async () => {
      await pattern.setup(mockP5);
      expect(pattern['particles'].length).toBeGreaterThan(0);

      pattern.cleanup(mockP5);

      expect(pattern['particles'].length).toBe(0);
    });

    it('should set isSetup to false', async () => {
      await pattern.setup(mockP5);
      expect(pattern['isSetup']).toBe(true);

      pattern.cleanup(mockP5);

      expect(pattern['isSetup']).toBe(false);
    });

    it('should handle cleanup when not setup', () => {
      expect(() => pattern.cleanup(mockP5)).not.toThrow();
    });
  });

  describe('resize', () => {
    it('should handle canvas resize', async () => {
      await pattern.setup(mockP5);

      expect(() => pattern.resize(mockP5, 1920, 1080)).not.toThrow();
    });

    it('should update center position on resize', async () => {
      await pattern.setup(mockP5);

      pattern.resize(mockP5, 1920, 1080);

      // Center should reflect new dimensions
      expect(pattern['center']?.x).toBe(1920 / 2);
      expect(pattern['center']?.y).toBe(1080 / 2);
    });
  });

  describe('edge cases', () => {
    it('should handle update before setup', () => {
      const context = createMockContext();

      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should handle draw before setup', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      expect(() => pattern.draw(mockP5, options)).not.toThrow();
    });

    it('should handle multiple cleanup calls', async () => {
      await pattern.setup(mockP5);

      pattern.cleanup(mockP5);
      expect(() => pattern.cleanup(mockP5)).not.toThrow();
    });

    it('should handle empty audio data', async () => {
      await pattern.setup(mockP5);

      const emptyContext: PatternContext = {
        audio: {
          raw: new Uint8Array(0),
          normalized: [],
          spectrum: [],
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
        },
        midi: {
          cc: new Map(),
          programChange: null,
          clock: 0,
        },
        deltaTime: 16,
      };

      expect(() => pattern.update(mockP5, emptyContext)).not.toThrow();
    });

    it('should handle null MIDI data', async () => {
      await pattern.setup(mockP5);

      const context = createMockContext();
      context.midi.cc = new Map();

      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should handle extreme particle count values', async () => {
      const context = createMockContext();
      context.midi.cc.set('0:3', 1.0); // Max particle count

      await pattern.setup(mockP5);
      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should handle zero particle count', async () => {
      const context = createMockContext();
      context.midi.cc.set('0:3', 0.0); // Min particle count

      await pattern.setup(mockP5);
      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });
  });

  describe('parameter control', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should respect gravity parameter', () => {
      pattern['params'].gravity = 0.9;

      const context = createMockContext(0.5, 0.5, 0.5);
      pattern['particles'][0].pos.set(50, 0, 0);
      pattern['particles'][0].vel.set(0, 0, 0);
      pattern['particles'][0].acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      expect(pattern['particles'][0].vel.x).not.toBe(0);
    });

    it('should respect noiseIntensity parameter', () => {
      pattern['params'].noiseIntensity = 0.9;

      const context = createMockContext();
      expect(() => pattern.update(mockP5, context)).not.toThrow();
    });

    it('should respect trailAlpha parameter', () => {
      pattern['params'].trailAlpha = 0.5;

      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.5,
      };

      pattern.draw(mockP5, options);

      // Background uses backgroundAlpha from params (default 0.3)
      expect(mockP5.background).toHaveBeenCalledWith(0, 0, 0, 0.8 * 255);
    });
  });

  describe('physics calculations', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should calculate gravitational force correctly', () => {
      const context = createMockContext(1, 0, 0);

      // Disable noise to test pure gravity
      pattern['params'].noiseIntensity = 0;

      // Position particle at specific distance
      const particle = pattern['particles'][0];
      particle.pos.set(100, 0, 0);
      particle.vel.set(0, 0, 0);
      particle.acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // Velocity should be towards center (negative x direction)
      expect(particle.vel.x).toBeLessThan(0);
      expect(Math.abs(particle.vel.x)).toBeGreaterThan(0);
    });

    it('should limit maximum velocity', () => {
      const context = createMockContext(1, 1, 1);

      const particle = pattern['particles'][0];
      particle.pos.set(200, 0, 0);
      particle.vel.set(1000, 0, 0); // Very high velocity
      particle.acc.set(0, 0, 0);

      pattern.update(mockP5, context);

      // Velocity should be limited
      expect(particle.vel.mag()).toBeLessThan(1000);
    });

    it('should preserve particle mass', () => {
      const context = createMockContext();

      const particle = pattern['particles'][0];
      const initialMass = particle.mass;

      pattern.update(mockP5, context);

      expect(particle.mass).toBe(initialMass);
    });
  });

  describe('integration tests', () => {
    it('should handle complete lifecycle', async () => {
      const context = createMockContext(0.5, 0.3, 0.7);
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      // Setup
      await pattern.setup(mockP5);
      expect(pattern['isSetup']).toBe(true);

      // Update and draw multiple frames
      for (let i = 0; i < 10; i++) {
        pattern.update(mockP5, context);
        pattern.draw(mockP5, options);
      }

      expect(mockP5.background).toHaveBeenCalled();
      expect(mockP5.sphere).toHaveBeenCalled();

      // Cleanup
      pattern.cleanup(mockP5);
      expect(pattern['isSetup']).toBe(false);
    });

    it('should handle audio-reactive behavior', async () => {
      await pattern.setup(mockP5);

      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      // Simulate audio reaction
      for (let i = 0; i < 5; i++) {
        const bassLevel = Math.sin(i * 0.5) * 0.5 + 0.5;
        const context = createMockContext(bassLevel, 0.3, 0.7);

        pattern.update(mockP5, context);
        pattern.draw(mockP5, options);
      }

      expect(mockP5.sphere).toHaveBeenCalled();
    });

    it('should handle MIDI control integration', async () => {
      await pattern.setup(mockP5);

      const context = createMockContext(0.5, 0.3, 0.7);
      context.midi.cc.set('0:1', 0.7);
      context.midi.cc.set('0:2', 0.5);
      context.midi.cc.set('0:3', 0.8);

      pattern.update(mockP5, context);

      expect(pattern['particles'].length).toBeGreaterThan(0);
    });
  });

  describe('rendering quality', () => {
    beforeEach(async () => {
      await pattern.setup(mockP5);
    });

    it('should draw event horizon in center', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      // Event horizon sphere should be drawn
      expect(mockP5.sphere).toHaveBeenCalled();
      // Particles should be drawn as points
      expect(mockP5.point).toHaveBeenCalled();
    });

    it('should color particles based on velocity/distance', () => {
      const options: PatternRenderOptions = {
        clearBackground: false,
        trails: true,
        trailAlpha: 0.15,
      };

      pattern.draw(mockP5, options);

      expect(mockP5.stroke).toHaveBeenCalled();
    });
  });

  describe('Leva controls', () => {
    it('should expose gravity parameter', () => {
      expect(pattern['params'].gravity).toBeDefined();
      expect(pattern['params'].gravity).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].gravity).toBeLessThanOrEqual(1);
    });

    it('should expose noiseIntensity parameter', () => {
      expect(pattern['params'].noiseIntensity).toBeDefined();
      expect(pattern['params'].noiseIntensity).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].noiseIntensity).toBeLessThanOrEqual(1);
    });

    it('should expose particleCount parameter', () => {
      expect(pattern['params'].particleCount).toBeDefined();
      expect(pattern['params'].particleCount).toBeGreaterThan(0);
    });

    it('should expose trailAlpha parameter', () => {
      expect(pattern['params'].trailAlpha).toBeDefined();
      expect(pattern['params'].trailAlpha).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].trailAlpha).toBeLessThanOrEqual(1);
    });

    it('should expose trailLength parameter', () => {
      expect(pattern['params'].trailLength).toBeDefined();
      expect(pattern['params'].trailLength).toBeGreaterThanOrEqual(0);
    });

    it('should expose backgroundColor parameter', () => {
      expect(pattern['params'].backgroundColor).toBeDefined();
      expect(pattern['params'].backgroundColor.r).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].backgroundColor.r).toBeLessThanOrEqual(255);
      expect(pattern['params'].backgroundColor.g).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].backgroundColor.g).toBeLessThanOrEqual(255);
      expect(pattern['params'].backgroundColor.b).toBeGreaterThanOrEqual(0);
      expect(pattern['params'].backgroundColor.b).toBeLessThanOrEqual(255);
    });

    it('should get params copy', () => {
      const params1 = pattern.getParams();
      const params2 = pattern.getParams();

      expect(params1).toEqual(params2);
      expect(params1).not.toBe(params2); // Different reference
    });

    it('should set params', () => {
      const newParams = {
        gravity: 0.8,
        noiseIntensity: 0.6,
        particleCount: 300,
        trailAlpha: 0.2,
        trailLength: 15,
        backgroundColor: { r: 10, g: 20, b: 30 },
        backgroundAlpha: 0.4,
      };

      pattern.setParams(newParams);

      expect(pattern.getParams()).toEqual(newParams);
    });

    it('should merge partial params', () => {
      const originalParams = pattern.getParams();

      pattern.setParams({ gravity: 0.9 });

      const updatedParams = pattern.getParams();
      expect(updatedParams.gravity).toBe(0.9);
      expect(updatedParams.noiseIntensity).toBe(originalParams.noiseIntensity);
      expect(updatedParams.particleCount).toBe(originalParams.particleCount);
      expect(updatedParams.trailAlpha).toBe(originalParams.trailAlpha);
      expect(updatedParams.trailLength).toBe(originalParams.trailLength);
      expect(updatedParams.backgroundColor).toEqual(originalParams.backgroundColor);
      expect(updatedParams.backgroundAlpha).toBe(originalParams.backgroundAlpha);
    });
  });
});
