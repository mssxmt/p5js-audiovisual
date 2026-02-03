/**
 * ThreeDPattern - 3D audio visualizer
 *
 * Massive particle system + numeric data visualization
 * - Layer 1: 3D particle field (bass reactive)
 * - Layer 2: Numeric displays represented as geometric shapes (mid/treble reactive)
 * - Controlled via parameters and MIDI
 *
 * Pure black/white aesthetic with depth perception.
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * 3D particle data structure
 */
interface Particle3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  brightness: number;
}

/**
 * Number display as geometric segments (7-segment style)
 */
interface NumberDisplay {
  x: number;
  y: number;
  z: number;
  value: number;
  digitCount: number;         // Number of digits (1-5)
  brightness: number;
  minFreq: number;            // Minimum frequency in Hz for this display
  maxFreq: number;            // Maximum frequency in Hz for this display
  lastValue: number;          // Last displayed value for smoothing
}

/**
 * 3D pattern configuration parameters
 */
interface ThreeDParams {
  // Particle system
  particleCount: number;         // Number of particles (100-5000)
  particleSize: number;          // Base particle size (1-10)
  particleSpread: number;        // 3D spread (100-1000)

  // Number displays
  numberCount: number;           // Number of numeric displays (10-200)
  numberSize: number;            // Size of number displays (5-30)
  numberDigits: number;          // Number of digits per display (1-5)
  numberDepth: number;           // Z-depth spread (0-500)

  // Audio reactivity
  bassReaction: number;          // Bass response (0-2)
  midReaction: number;           // Mid response (0-2)
  trebleReaction: number;        // Treble response (0-2)

  // Camera/View
  rotationX: number;             // Vertical rotation (-PI/2 to PI/2)
  rotationY: number;             // Horizontal rotation (0 to 2PI)
  rotationSpeed: number;         // Auto-rotation speed (0-0.02)
  movementSpeed: number;         // Particle movement speed (0-1)

  // Background
  backgroundColor: { r: number; g: number; b: number };
  backgroundAlpha: number;
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'ThreeDPattern',
  description: '3D interactive audio visualizer - particles and numeric data',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: ThreeDParams = {
  particleCount: 2000,
  particleSize: 2,
  particleSpread: 400,
  numberCount: 100,
  numberSize: 15,
  numberDigits: 3,
  numberDepth: 300,
  bassReaction: 2.0,
  midReaction: 2.0,
  trebleReaction: 2.0,
  rotationX: 0,
  rotationY: 0,
  rotationSpeed: 0.002,
  movementSpeed: 0.3,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 1,
};

/**
 * 7-segment patterns for digits 0-9
 * Segments: [top, top-right, bottom-right, bottom, bottom-left, top-left, middle]
 */
const SEGMENT_PATTERNS: Record<number, number[]> = {
  0: [1, 1, 1, 1, 1, 1, 0], // 0
  1: [0, 1, 1, 0, 0, 0, 0], // 1
  2: [1, 1, 0, 1, 1, 0, 1], // 2
  3: [1, 1, 1, 1, 0, 0, 1], // 3
  4: [0, 1, 1, 0, 0, 1, 1], // 4
  5: [1, 0, 1, 1, 0, 1, 1], // 5
  6: [1, 0, 1, 1, 1, 1, 1], // 6
  7: [1, 1, 1, 0, 0, 0, 0], // 7
  8: [1, 1, 1, 1, 1, 1, 1], // 8
  9: [1, 1, 1, 1, 0, 1, 1], // 9
};

/**
 * ThreeDPattern - 3D interactive audio visualizer
 */
export class ThreeDPattern extends BasePattern {
  protected params: ThreeDParams;

  // Particle system
  private particles: Particle3D[] = [];

  // Number displays
  private numbers: NumberDisplay[] = [];

  // Camera control
  private zoom = 1;

  // Reinit flag
  private needsReinit = false;

  // Time tracking
  private lastUpdateTime = 0;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Setup pattern resources
   */
  override setup(p: p5): void {
    this.initParticles(p);
    this.initNumbers(p);
    this.isSetup = true;
  }

  /**
   * Initialize 3D particle field
   */
  private initParticles(p: p5): void {
    this.particles = [];
    const count = Math.max(100, Math.min(5000, this.params.particleCount));
    const spread = this.params.particleSpread;

    for (let i = 0; i < count; i++) {
      const baseX = p.random(-spread, spread);
      const baseY = p.random(-spread, spread);
      const baseZ = p.random(-spread, spread);
      const size = p.random(1, this.params.particleSize * 2);

      this.particles.push({
        x: baseX,
        y: baseY,
        z: baseZ,
        baseX,
        baseY,
        baseZ,
        size,
        brightness: p.random(0.1, 0.5),
      });
    }
  }

  /**
   * Initialize number displays
   */
  private initNumbers(p: p5): void {
    this.numbers = [];
    const count = Math.max(10, Math.min(200, this.params.numberCount));
    const depth = this.params.numberDepth;
    const size = this.params.numberSize;
    const digits = Math.max(1, Math.min(5, this.params.numberDigits));

    // Divide frequency range (20Hz - 20kHz) among all numbers
    const minFreq = 20;
    const maxFreq = 20000;
    const freqRangePerNumber = (maxFreq - minFreq) / count;

    for (let i = 0; i < count; i++) {
      const x = p.random(-p.width / 2 + size, p.width / 2 - size);
      const y = p.random(-p.height / 2 + size, p.height / 2 - size);
      const z = p.random(-depth, depth);
      const value = 0; // Will be updated by audio data

      // Assign unique frequency range to each number
      const numMinFreq = minFreq + i * freqRangePerNumber;
      const numMaxFreq = numMinFreq + freqRangePerNumber;

      this.numbers.push({
        x,
        y,
        z,
        value,
        digitCount: digits,
        brightness: p.random(0.2, 0.8),
        minFreq: numMinFreq,
        maxFreq: numMaxFreq,
        lastValue: value,
      });
    }
  }

  /**
   * Update pattern state
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if parameters changed
    if (this.needsReinit) {
      this.initParticles(p);
      this.initNumbers(p);
      this.needsReinit = false;
    }

    const currentTime = p.millis();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Get frequency band values
    const bass = this.getAudioBand(context.audio, 'bass');
    const mid = this.getAudioBand(context.audio, 'mid');
    const treble = this.getAudioBand(context.audio, 'treble');

    // Update particles with bass reaction
    this.updateParticles(p, bass, deltaTime, currentTime);

    // Update numbers with peak frequency data
    this.updateNumbers(p, context, mid, treble, currentTime);

    // Auto-rotation
    this.params.rotationY += this.params.rotationSpeed;
  }

  /**
   * Update particle system with bass reactivity
   */
  private updateParticles(_p: p5, bass: number, _deltaTime: number, currentTime: number): void {
    const bassLevel = bass * this.params.bassReaction;

    for (const particle of this.particles) {
      // Movement based on audio level
      const time = currentTime * 0.001;

      // Orbital motion around center
      particle.x = particle.baseX + Math.sin(time + particle.baseZ * 0.01) * bassLevel * 50;
      particle.y = particle.baseY + Math.cos(time + particle.baseX * 0.01) * bassLevel * 50;
      particle.z = particle.baseZ + Math.sin(time * 0.5 + particle.baseY * 0.01) * bassLevel * 30;

      // Brightness pulses with bass
      const baseBrightness = 0.2;
      const bassPulse = bassLevel * 0.8;
      particle.brightness = this.clamp(baseBrightness + bassPulse, 0, 1);
    }
  }

  /**
   * Update number displays with peak frequency data
   */
  private updateNumbers(p: p5, context: PatternContext, mid: number, treble: number, _currentTime: number): void {
    const midLevel = mid * this.params.midReaction;
    const trebleLevel = treble * this.params.trebleReaction;
    const maxValue = Math.pow(10, this.params.numberDigits) - 1;

    for (let i = 0; i < this.numbers.length; i++) {
      const num = this.numbers[i];

      // Get peak frequency in this number's assigned range
      const peakFreq = context.audioManager.getPeakFrequencyInRange(num.minFreq, num.maxFreq);

      // Update value with peak frequency (rounded to nearest integer)
      // Add some randomness for visual variety while keeping base value tied to audio
      let newValue: number;
      if (peakFreq > 0) {
        // Map frequency to a value that fits in the digit count
        // For 3 digits: 0-999 Hz maps to 0-999, higher frequencies wrap around
        const freqValue = Math.floor(peakFreq) % (maxValue + 1);

        // Add small random variation for "garagara" effect
        const jitter = Math.floor(p.random(-10, 11));
        newValue = this.clamp(freqValue + jitter, 0, maxValue);
      } else {
        // No audio in this range - create "idle animation" effect
        // Use index-based offset to create rolling/cascading effect
        const timeOffset = _currentTime * 0.05;
        const indexOffset = i * 13; // Prime number for non-repeating pattern
        const baseValue = (timeOffset + indexOffset) % (maxValue + 1);

        // Add randomness for "garagara" feel
        const jitter = Math.floor(p.random(-20, 21));
        newValue = this.clamp(Math.floor(baseValue) + jitter, 0, maxValue);
      }

      // Smooth transition from previous value
      const diff = newValue - num.lastValue;
      const maxChange = maxValue * 0.15; // Max 15% change per frame
      if (Math.abs(diff) > maxChange) {
        num.value = num.lastValue + Math.sign(diff) * maxChange;
      } else {
        num.value = newValue;
      }
      num.lastValue = num.value;

      // Brightness reacts to mid/treble frequencies
      const baseBrightness = 0.15;
      const midBoost = midLevel * 0.5;
      const trebleBoost = trebleLevel * 0.3;

      // Numbers with higher peak frequencies get brighter
      const freqBoost = peakFreq > 0 ? Math.min(peakFreq / 10000, 0.3) : 0;

      // Idle animation brightness pulse
      const idlePulse = peakFreq <= 0 ? Math.sin(_currentTime * 0.003 + i * 0.5) * 0.1 + 0.1 : 0;
      num.brightness = this.clamp(baseBrightness + midBoost + trebleBoost + freqBoost + idlePulse, 0, 1);
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Apply camera rotation from params
    p.rotateX(this.params.rotationX);
    p.rotateY(this.params.rotationY);
    p.scale(this.zoom);

    // Draw particles
    this.drawParticles(p);

    // Draw numbers
    this.drawNumbers(p);

    p.pop();
  }

  /**
   * Draw background - pure black
   */
  protected drawBackground(p: p5, _options: PatternRenderOptions): void {
    p.clear();
    const { r, g, b } = this.params.backgroundColor;
    const alpha = Math.floor(this.params.backgroundAlpha * 255);
    p.background(r, g, b, alpha);
  }

  /**
   * Draw particle system
   */
  private drawParticles(p: p5): void {
    p.noStroke();

    for (const particle of this.particles) {
      const gray = Math.floor(particle.brightness * 255);
      p.fill(gray);
      p.push();
      p.translate(particle.x, particle.y, particle.z);
      p.box(particle.size);
      p.pop();
    }
  }

  /**
   * Draw number displays as geometric shapes
   */
  private drawNumbers(p: p5): void {
    const size = this.params.numberSize;
    const thickness = size / 8;
    const digitSpacing = size * 0.3; // Space between digits

    p.noStroke();

    for (const num of this.numbers) {
      const gray = Math.floor(num.brightness * 255);
      p.fill(gray);

      p.push();
      p.translate(num.x, num.y, num.z);

      // Calculate total width for centering
      const totalWidth = size * num.digitCount + digitSpacing * (num.digitCount - 1);
      const startX = -totalWidth / 2 + size / 2;

      // Extract digits from value (right to left)
      const digits: number[] = [];
      let tempValue = num.value;
      for (let d = 0; d < num.digitCount; d++) {
        digits.unshift(tempValue % 10);
        tempValue = Math.floor(tempValue / 10);
      }

      // Draw each digit
      for (let d = 0; d < num.digitCount; d++) {
        const digit = digits[d];
        const segments = SEGMENT_PATTERNS[digit];
        const digitX = startX + d * (size + digitSpacing);

        p.push();
        p.translate(digitX, 0, 0);

        const halfSize = size / 2;
        const quarterSize = size / 4;

        // Top segment (horizontal)
        if (segments[0]) {
          p.push();
          p.translate(0, -halfSize, 0);
          p.box(size, thickness, thickness);
          p.pop();
        }

        // Top-right segment (vertical)
        if (segments[1]) {
          p.push();
          p.translate(halfSize, -quarterSize, 0);
          p.rotateZ(Math.PI / 2);
          p.box(size / 2, thickness, thickness);
          p.pop();
        }

        // Bottom-right segment (vertical)
        if (segments[2]) {
          p.push();
          p.translate(halfSize, quarterSize, 0);
          p.rotateZ(Math.PI / 2);
          p.box(size / 2, thickness, thickness);
          p.pop();
        }

        // Bottom segment (horizontal)
        if (segments[3]) {
          p.push();
          p.translate(0, halfSize, 0);
          p.box(size, thickness, thickness);
          p.pop();
        }

        // Bottom-left segment (vertical)
        if (segments[4]) {
          p.push();
          p.translate(-halfSize, quarterSize, 0);
          p.rotateZ(Math.PI / 2);
          p.box(size / 2, thickness, thickness);
          p.pop();
        }

        // Top-left segment (vertical)
        if (segments[5]) {
          p.push();
          p.translate(-halfSize, -quarterSize, 0);
          p.rotateZ(Math.PI / 2);
          p.box(size / 2, thickness, thickness);
          p.pop();
        }

        // Middle segment (horizontal)
        if (segments[6]) {
          p.push();
          p.translate(0, 0, 0);
          p.box(size, thickness, thickness);
          p.pop();
        }

        p.pop();
      }

      p.pop();
    }
  }

  /**
   * Handle canvas resize
   */
  override resize(p: p5): void {
    this.initParticles(p);
    this.initNumbers(p);
  }

  /**
   * Get pattern parameters
   */
  getParams(): ThreeDParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<ThreeDParams>): void {
    const oldParticleCount = this.params.particleCount;
    const oldNumberCount = this.params.numberCount;
    const oldNumberDigits = this.params.numberDigits;
    const oldParticleSize = this.params.particleSize;
    const oldSpread = this.params.particleSpread;
    const oldDepth = this.params.numberDepth;

    this.params = { ...this.params, ...params };

    // Check if parameters that require reinitialization changed
    const particleNeedReinit =
      params.particleCount !== undefined && params.particleCount !== oldParticleCount;
    const spreadNeedReinit =
      params.particleSpread !== undefined && params.particleSpread !== oldSpread;
    const numberNeedReinit =
      params.numberCount !== undefined && params.numberCount !== oldNumberCount;
    const depthNeedReinit =
      params.numberDepth !== undefined && params.numberDepth !== oldDepth;
    const digitsNeedReinit =
      params.numberDigits !== undefined && params.numberDigits !== oldNumberDigits;

    if (particleNeedReinit || spreadNeedReinit || numberNeedReinit || depthNeedReinit || digitsNeedReinit) {
      this.needsReinit = true;
    }

    // particleSize can be updated without full reinit - just update existing particles
    if (params.particleSize !== undefined && params.particleSize !== oldParticleSize) {
      for (const particle of this.particles) {
        particle.size = Math.max(1, Math.random() * this.params.particleSize * 2);
      }
    }
  }

  /**
   * Get parameter metadata
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      particleCount: { min: 100, max: 5000, step: 100 },
      particleSize: { min: 1, max: 10, step: 0.5 },
      particleSpread: { min: 100, max: 1000, step: 50 },
      numberCount: { min: 10, max: 200, step: 10 },
      numberSize: { min: 5, max: 30, step: 1 },
      numberDigits: { min: 1, max: 5, step: 1 },
      numberDepth: { min: 0, max: 500, step: 25 },
      bassReaction: { min: 0, max: 2, step: 0.1 },
      midReaction: { min: 0, max: 2, step: 0.1 },
      trebleReaction: { min: 0, max: 2, step: 0.1 },
      rotationX: { min: -Math.PI / 2, max: Math.PI / 2, step: 0.01 },
      rotationY: { min: 0, max: Math.PI * 2, step: 0.01 },
      rotationSpeed: { min: 0, max: 0.02, step: 0.001 },
      movementSpeed: { min: 0, max: 1, step: 0.05 },
      backgroundAlpha: { min: 0, max: 1, step: 0.01 },
    };
  }

  /**
   * Get MIDI CC mappings
   * Returns empty array - use MIDI Learn to assign mappings dynamically
   */
  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.particles = [];
    this.numbers = [];
    this.zoom = 1;
    this.isSetup = false;
  }
}
