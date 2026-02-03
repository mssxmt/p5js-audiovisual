/**
 * FlowFieldPattern - Flow Field Visualization
 *
 * A fluid, silk-like visualization using thin lines flowing through
 * a Perlin noise vector field:
 * - Particles follow noise-generated flow vectors
 * - Creates organic, water-like movement patterns
 * - Audio-reactive speed, complexity, and color
 * - MIDI control for parameters
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Flow field pattern configuration parameters
 */
interface FlowFieldParams {
  // Particle system
  particleCount: number;      // Number of particles (500-5000)
  lineWidth: number;          // Line width (0.5-5.0)

  // Flow field
  noiseScale: number;         // Perlin noise scale (0.001-0.05)
  timeSpeed: number;          // Time evolution speed (0-0.02)
  flowStrength: number;       // Flow vector strength (0.1-5.0)

  // Visual
  trailFade: number;          // Trail fade speed (0.01-0.5, lower = longer trails)
  baseHue: number;            // Base hue for color (0-360)

  // Audio reactivity multipliers
  bassSpeedMult: number;      // Bass -> speed multiplier (0-10)
  midNoiseMult: number;       // Mid -> noise complexity multiplier (0-10)
  trebleColorMult: number;    // Treble -> color shift multiplier (0-5)

  // Background
  backgroundColor: {
    r: number;
    g: number;
    b: number;
  };
  backgroundAlpha: number;
}

/**
 * Flow field particle
 */
interface FlowParticle {
  pos: p5.Vector;
  prevPos: p5.Vector;
  vel: p5.Vector;
  speed: number;
  age: number;
  maxAge: number;
  hueOffset: number;
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'FlowFieldPattern',
  description: 'Flow field visualization with fluid, silk-like movement',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: FlowFieldParams = {
  particleCount: 2000,
  lineWidth: 1.5,
  noiseScale: 0.008,
  timeSpeed: 0.002,
  flowStrength: 1.0,
  trailFade: 0.08,
  baseHue: 200,
  bassSpeedMult: 5.0,
  midNoiseMult: 5.0,
  trebleColorMult: 2.0,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 1,
};

/**
 * Maximum particle speed
 */
const MAX_SPEED = 8;

/**
 * FlowFieldPattern - Flow field visualization
 */
export class FlowFieldPattern extends BasePattern {
  protected params: FlowFieldParams;
  protected particles: FlowParticle[] = [];
  protected flowField: p5.Vector[][] = [];
  protected cols = 0;
  protected rows = 0;
  protected resolution = 20; // Grid cell size
  protected time = 0;
  protected isSetup = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Get pattern parameters for Leva controls
   */
  getParams(): FlowFieldParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<FlowFieldParams>): void {
    const oldParticleCount = this.params.particleCount;

    this.params = { ...this.params, ...params };

    // Reinitialize particles if count changed
    if (params.particleCount !== undefined && params.particleCount !== oldParticleCount) {
      this.needsReinit = true;
    }
  }

  private needsReinit = false;

  /**
   * Get parameter metadata for UI controls
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      particleCount: { min: 500, max: 5000, step: 100 },
      lineWidth: { min: 0.5, max: 5.0, step: 0.1 },
      noiseScale: { min: 0.001, max: 0.05, step: 0.001 },
      timeSpeed: { min: 0, max: 0.02, step: 0.001 },
      flowStrength: { min: 0.1, max: 5.0, step: 0.1 },
      trailFade: { min: 0.01, max: 0.5, step: 0.01 },
      baseHue: { min: 0, max: 360, step: 1 },
      bassSpeedMult: { min: 0, max: 10, step: 0.1 },
      midNoiseMult: { min: 0, max: 10, step: 0.1 },
      trebleColorMult: { min: 0, max: 5, step: 0.1 },
      backgroundAlpha: { min: 0, max: 1, step: 0.01 },
    };
  }

  /**
   * Get MIDI CC mappings for this pattern
   */
  getMidiMappings(): MidiCCMapping[] {
    return [
      {
        channel: 0,
        ccNumber: 1,
        parameterPath: 'particleCount',
        min: 500,
        max: 5000,
        currentValue: this.params.particleCount,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'lineWidth',
        min: 0.5,
        max: 5.0,
        currentValue: this.params.lineWidth,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'noiseScale',
        min: 0.001,
        max: 0.05,
        currentValue: this.params.noiseScale,
      },
      {
        channel: 0,
        ccNumber: 4,
        parameterPath: 'timeSpeed',
        min: 0,
        max: 0.02,
        currentValue: this.params.timeSpeed,
      },
      {
        channel: 0,
        ccNumber: 5,
        parameterPath: 'flowStrength',
        min: 0.1,
        max: 5.0,
        currentValue: this.params.flowStrength,
      },
      {
        channel: 0,
        ccNumber: 6,
        parameterPath: 'trailFade',
        min: 0.01,
        max: 0.5,
        currentValue: this.params.trailFade,
      },
      {
        channel: 0,
        ccNumber: 7,
        parameterPath: 'baseHue',
        min: 0,
        max: 360,
        currentValue: this.params.baseHue,
      },
      {
        channel: 0,
        ccNumber: 8,
        parameterPath: 'bassSpeedMult',
        min: 0,
        max: 10,
        currentValue: this.params.bassSpeedMult,
      },
      {
        channel: 0,
        ccNumber: 9,
        parameterPath: 'midNoiseMult',
        min: 0,
        max: 10,
        currentValue: this.params.midNoiseMult,
      },
      {
        channel: 0,
        ccNumber: 10,
        parameterPath: 'trebleColorMult',
        min: 0,
        max: 5,
        currentValue: this.params.trebleColorMult,
      },
    ];
  }

  /**
   * Setup pattern - initialize particles and flow field
   */
  override setup(p: p5): void {
    this.initializeFlowField(p);
    this.initializeParticles(p);
    this.isSetup = true;
  }

  /**
   * Initialize flow field grid
   */
  private initializeFlowField(p: p5): void {
    this.cols = Math.ceil(p.width / this.resolution) + 1;
    this.rows = Math.ceil(p.height / this.resolution) + 1;
    this.flowField = [];

    for (let i = 0; i < this.cols; i++) {
      this.flowField[i] = [];
      for (let j = 0; j < this.rows; j++) {
        this.flowField[i][j] = p.createVector(0, 0);
      }
    }
  }

  /**
   * Initialize particles
   */
  private initializeParticles(p: p5): void {
    this.particles = [];

    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push(this.createParticle(p));
    }
  }

  /**
   * Create a single particle
   */
  private createParticle(p: p5): FlowParticle {
    const pos = p.createVector(
      p.random(p.width),
      p.random(p.height)
    );
    const prevPos = pos.copy();
    const vel = p.createVector(0, 0);
    const speed = p.random(1, 3);
    const maxAge = p.random(100, 300);
    const age = p.random(0, maxAge);
    const hueOffset = p.random(-30, 30);

    return { pos, prevPos, vel, speed, age, maxAge, hueOffset };
  }

  /**
   * Update pattern state with audio reactivity
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if needed
    if (this.needsReinit) {
      this.initializeParticles(p);
      this.needsReinit = false;
    }

    // Get audio bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Calculate audio-reactive parameters
    const speedMult = 1 + bassLevel * this.params.bassSpeedMult;
    const noiseMult = 1 + midLevel * this.params.midNoiseMult;
    const colorShift = trebleLevel * 120 * this.params.trebleColorMult;

    // Update time
    this.time += this.params.timeSpeed;

    // Update flow field
    this.updateFlowField(p, noiseMult);

    // Update particles
    this.updateParticles(p, speedMult, colorShift);
  }

  /**
   * Update flow field with Perlin noise
   */
  private updateFlowField(p: p5, noiseMult: number): void {
    const scale = this.params.noiseScale * noiseMult;

    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const x = i * this.resolution;
        const y = j * this.resolution;

        // Get noise value for this position
        const angle = p.noise(x * scale, y * scale, this.time) * p.TWO_PI * 2;

        // Create vector from angle
        const v = p5.Vector.fromAngle(angle);
        v.mult(this.params.flowStrength);

        this.flowField[i][j] = v;
      }
    }
  }

  /**
   * Update particles
   */
  private updateParticles(p: p5, speedMult: number, colorShift: number): void {
    for (const particle of this.particles) {
      // Store previous position
      particle.prevPos = particle.pos.copy();

      // Update hue offset based on treble
      particle.hueOffset = colorShift;

      // Get flow field vector at current position
      const x = Math.floor(particle.pos.x / this.resolution);
      const y = Math.floor(particle.pos.y / this.resolution);

      // Constrain to grid bounds
      const col = Math.max(0, Math.min(x, this.cols - 1));
      const row = Math.max(0, Math.min(y, this.rows - 1));

      // Get force from flow field
      const force = this.flowField[col]?.[row] ?? { x: 0, y: 0, add: function() {}, mult: function() {} };

      // Apply force to velocity
      particle.vel.add(force);

      // Limit speed
      const maxSpeed = MAX_SPEED * speedMult;
      particle.vel.limit(maxSpeed);

      // Move particle
      const movement = particle.vel.copy().mult(particle.speed * speedMult * 0.1);
      particle.pos.add(movement);

      // Wrap around edges
      if (particle.pos.x < 0) particle.pos.x = p.width;
      if (particle.pos.x > p.width) particle.pos.x = 0;
      if (particle.pos.y < 0) particle.pos.y = p.height;
      if (particle.pos.y > p.height) particle.pos.y = 0;

      // Wrap prevPos if wrapped
      if (particle.pos.x !== particle.prevPos.x && Math.abs(particle.pos.x - particle.prevPos.x) > p.width / 2) {
        particle.prevPos = particle.pos.copy();
      }
      if (particle.pos.y !== particle.prevPos.y && Math.abs(particle.pos.y - particle.prevPos.y) > p.height / 2) {
        particle.prevPos = particle.pos.copy();
      }

      // Age particle
      particle.age++;
      if (particle.age >= particle.maxAge) {
        // Respawn particle
        particle.pos = p.createVector(p.random(p.width), p.random(p.height));
        particle.prevPos = particle.pos.copy();
        particle.vel = p.createVector(0, 0);
        particle.age = 0;
        particle.maxAge = p.random(100, 300);
      }
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Draw particles as lines
    this.drawParticles(p);

    p.pop();
  }

  /**
   * Draw background with trail fade effect
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    const { r, g, b } = this.params.backgroundColor;

    if (options.clearBackground) {
      p.clear();
    } else {
      // Fade effect for trails
      const alpha = this.params.trailFade * 255;
      p.background(r, g, b, alpha);
    }
  }

  /**
   * Draw particles as lines
   */
  private drawParticles(p: p5): void {
    const baseHue = this.params.baseHue;

    for (const particle of this.particles) {
      // Calculate color based on position, age, and hue offset
      const hue = (baseHue + particle.hueOffset) % 360;
      const saturation = 70;
      const brightness = this.map(particle.age, 0, particle.maxAge, 80, 30);

      p.colorMode(p.HSL);
      p.stroke(hue, saturation, brightness, 0.8);
      p.colorMode(p.RGB);

      p.strokeWeight(this.params.lineWidth);
      p.line(particle.pos.x, particle.pos.y, particle.prevPos.x, particle.prevPos.y);
    }
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.particles = [];
    this.flowField = [];
    this.isSetup = false;
  }

  /**
   * Handle canvas resize
   */
  override resize(p: p5): void {
    this.initializeFlowField(p);
  }
}
