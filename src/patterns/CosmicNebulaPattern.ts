/**
 * CosmicNebulaPattern - Cosmic Nebula Visualization
 *
 * Deep space visualization with:
 * - Multi-layered star field (background, mid, foreground)
 * - Flowing gas nebula with spiral patterns
 * - Audio-reactive star spawning and color shifts
 * - Additive blending for ethereal glow effect
 * - Camera slowly rotates through space
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Star particle
 */
interface Star {
  pos: p5.Vector;
  vel: p5.Vector;
  size: number;
  brightness: number;
  hue: number;
  twinklePhase: number;
  age: number;
  maxAge: number;
}

/**
 * Gas nebula particle
 */
interface GasParticle {
  pos: p5.Vector;
  vel: p5.Vector;
  size: number;
  alpha: number;
  hue: number;
}

/**
 * Cosmic nebula parameters
 */
interface CosmicNebulaParams {
  // Stars
  starCount: number;        // Star count (100-5000)
  starSize: number;         // Star size (1-5)
  twinkleSpeed: number;     // Twinkle speed (0.01-0.2)

  // Gas nebula
  gasCount: number;         // Gas particles (500-5000)
  gasSize: number;          // Gas particle size (5-30)
  gasFlowSpeed: number;     // Gas flow speed (0.1-5)
  nebulaHue: number;        // Base nebula hue (0-360)

  // Colors
  bgHue: number;            // Background hue (200-280)
  bgSaturation: number;    // Background saturation (0-50)
  bgBrightness: number;    // Background brightness (0-20)

  // Audio reactivity
  bassStarSpawn: number;   // Bass→star spawn rate (0-5)
  midGasFlow: number;      // Mid→gas flow multiplier (0-3)
  trebleColorShift: number;// Treble→color shift (0-180)

  // Camera
  camSpeed: number;         // Camera rotation speed (0-0.01)
  camZoom: number;          // Camera zoom (0.5-2)

  // Background
  backgroundAlpha: number;  // Trail fade (0.01-0.2)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'CosmicNebulaPattern',
  description: 'Cosmic nebula visualization with stars and gas clouds',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: CosmicNebulaParams = {
  starCount: 2000,
  starSize: 2,
  twinkleSpeed: 0.05,
  gasCount: 2000,
  gasSize: 15,
  gasFlowSpeed: 1.5,
  nebulaHue: 280,           // Purple/blue
  bgHue: 240,
  bgSaturation: 30,
  bgBrightness: 5,
  bassStarSpawn: 2.0,
  midGasFlow: 1.5,
  trebleColorShift: 60,
  camSpeed: 0.002,
  camZoom: 1.0,
  backgroundAlpha: 0.1,
};

/**
 * CosmicNebulaPattern - Cosmic nebula visualization
 */
export class CosmicNebulaPattern extends BasePattern {
  protected params: CosmicNebulaParams;

  // Star system
  private _stars: Star[] = [];

  // Gas nebula
  private _gasParticles: GasParticle[] = [];

  // Camera
  private _camAngle = 0;

  // Color shift for treble
  private _colorShift = 0;

  // Time for gas pulsation
  private _time = 0;

  // Reinitialization flag
  private _needsReinit = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  getParams(): CosmicNebulaParams {
    return { ...this.params };
  }

  setParams(params: Partial<CosmicNebulaParams>): void {
    const oldStarCount = this.params.starCount;
    const oldGasCount = this.params.gasCount;

    this.params = { ...this.params, ...params };

    if (
      params.starCount !== undefined && params.starCount !== oldStarCount ||
      params.gasCount !== undefined && params.gasCount !== oldGasCount
    ) {
      this._needsReinit = true;
    }
  }

  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      starCount: { min: 100, max: 5000, step: 100 },
      starSize: { min: 1, max: 5, step: 0.5 },
      twinkleSpeed: { min: 0.01, max: 0.2, step: 0.01 },
      gasCount: { min: 500, max: 5000, step: 100 },
      gasSize: { min: 5, max: 30, step: 1 },
      gasFlowSpeed: { min: 0.1, max: 5, step: 0.1 },
      nebulaHue: { min: 0, max: 360, step: 1 },
      bgHue: { min: 200, max: 280, step: 1 },
      bgSaturation: { min: 0, max: 50, step: 1 },
      bgBrightness: { min: 0, max: 20, step: 1 },
      bassStarSpawn: { min: 0, max: 5, step: 0.1 },
      midGasFlow: { min: 0, max: 3, step: 0.1 },
      trebleColorShift: { min: 0, max: 180, step: 5 },
      camSpeed: { min: 0, max: 0.01, step: 0.001 },
      camZoom: { min: 0.5, max: 2, step: 0.1 },
      backgroundAlpha: { min: 0.01, max: 0.2, step: 0.01 },
    };
  }

  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  override setup(p: p5): void {
    this.initializeStars(p);
    this.initializeGas(p);
    this.isSetup = true;
  }

  // Placeholder methods (implemented in later tasks)

  /**
   * Initialize gas nebula particles
   */
  private initializeGas(p: p5): void {
    this._gasParticles = [];
    const spread = 600;

    for (let i = 0; i < this.params.gasCount; i++) {
      // Create particles in spiral formation
      const angle = (i / this.params.gasCount) * p.TWO_PI * 3; // 3 spiral arms
      const radius = (i / this.params.gasCount) * spread * 0.8;
      const spiralAngle = angle + (i / this.params.gasCount) * p.PI * 2;

      const pos = p.createVector(
        Math.cos(spiralAngle) * radius,
        p.random(-spread * 0.3, spread * 0.3),
        Math.sin(spiralAngle) * radius
      );

      this._gasParticles.push({
        pos,
        vel: p.createVector(0, 0, 0),
        size: p.random(5, 15) * this.params.gasSize * 0.05,
        alpha: p.random(0.02, 0.15),
        hue: this.params.nebulaHue + p.random(-30, 30),
      });
    }
  }

  /**
   * Update gas particles with spiral flow
   */
  private updateGas(p: p5, midLevel: number): void {
    const flowSpeed = this.params.gasFlowSpeed * (1 + midLevel * this.params.midGasFlow);

    for (const gas of this._gasParticles) {
      // Spiral motion around center
      const angle = Math.atan2(gas.pos.z, gas.pos.x);
      const radius = Math.sqrt(gas.pos.x * gas.pos.x + gas.pos.z * gas.pos.z);

      // Angular velocity increases toward center
      const angularVel = flowSpeed * (50 / (radius + 1)) * 0.01;
      const newAngle = angle + angularVel;

      // Move in spiral
      gas.pos.x = Math.cos(newAngle) * radius;
      gas.pos.z = Math.sin(newAngle) * radius;

      // Subtle Y drift
      gas.pos.y += p.random(-0.2, 0.2) * flowSpeed * 0.1;

      // Pulsate alpha
      const pulse = (this._time || 0) * 0.001 + gas.pos.x * 0.001;
      gas.alpha = 0.02 + Math.sin(pulse) * 0.01;
    }
  }

  /**
   * Draw gas nebula
   */
  private drawGas(p: p5): void {
    p.noStroke();

    for (const gas of this._gasParticles) {
      const hue = (gas.hue + this._colorShift) % 360;

      p.fill(hue, 60, 80, gas.alpha * 255);
      p.blendMode(p.ADD);

      p.push();
      p.translate(gas.pos.x, gas.pos.y, gas.pos.z);
      p.circle(0, 0, gas.size);
      p.pop();

      p.blendMode(p.BLEND);
    }
  }

  /**
   * Initialize star field
   */
  private initializeStars(p: p5): void {
    this._stars = [];
    const spread = 1000;

    for (let i = 0; i < this.params.starCount; i++) {
      // Position in 3D space
      const pos = p.createVector(
        p.random(-spread, spread),
        p.random(-spread * 0.5, spread * 0.5),
        p.random(-spread, spread)
      );

      // Categorize by size (affects brightness and speed)
      const sizeCat = Math.random();
      let size: number;
      let brightness: number;
      let twinklePhase: number;

      if (sizeCat < 0.7) {
        // Small stars (70%)
        size = p.random(0.5, 1.5);
        brightness = p.random(0.3, 0.6);
        twinklePhase = p.random(p.TWO_PI);
      } else if (sizeCat < 0.95) {
        // Medium stars (25%)
        size = p.random(1.5, 3);
        brightness = p.random(0.5, 0.8);
        twinklePhase = p.random(p.TWO_PI);
      } else {
        // Large bright stars (5%)
        size = p.random(3, 5);
        brightness = p.random(0.8, 1);
        twinklePhase = p.random(p.TWO_PI);
      }

      this._stars.push({
        pos,
        vel: p.createVector(0, 0, 0),
        size: size * this.params.starSize * 0.5,
        brightness,
        hue: p.random(200, 280), // Blue to purple range
        twinklePhase,
        age: 0,
        maxAge: p.random(500, 2000),
      });
    }
  }

  /**
   * Update star system
   */
  private updateStars(p: p5, bassLevel: number): void {
    // Spawn new stars on bass
    const spawnCount = Math.floor(bassLevel * this.params.bassStarSpawn);
    if (spawnCount > 0 && this._stars.length < this.params.starCount * 1.5) {
      for (let i = 0; i < spawnCount; i++) {
        const spread = 1000;
        const pos = p.createVector(
          p.random(-spread, spread),
          p.random(-spread * 0.5, spread * 0.5),
          p.random(-spread, spread)
        );

        const sizeCat = Math.random();
        const size = sizeCat < 0.9 ? p.random(0.5, 2) : p.random(2, 4);

        this._stars.push({
          pos,
          vel: p.createVector(0, 0, 0),
          size: size * this.params.starSize * 0.5,
          brightness: 1,
          hue: p.random(200, 280),
          twinklePhase: p.random(p.TWO_PI),
          age: 0,
          maxAge: p.random(300, 1000),
        });
      }
    }

    // Update existing stars
    for (const star of this._stars) {
      // Twinkle effect
      star.twinklePhase += this.params.twinkleSpeed;

      // Slow drift
      star.pos.x += p.random(-0.1, 0.1);
      star.pos.y += p.random(-0.1, 0.1);
      star.pos.z += p.random(-0.1, 0.1);

      // Age star
      star.age++;

      // Respawn old stars
      if (star.age > star.maxAge) {
        const spread = 1000;
        star.pos = p.createVector(
          p.random(-spread, spread),
          p.random(-spread * 0.5, spread * 0.5),
          p.random(-spread, spread)
        );
        star.age = 0;
        star.maxAge = p.random(500, 2000);
        star.brightness = Math.random();
      }
    }

    // Remove excess stars
    while (this._stars.length > this.params.starCount * 1.5) {
      this._stars.shift();
    }
  }

  /**
   * Draw stars with additive blending
   */
  private drawStars(p: p5): void {
    const hueShift = this._colorShift;

    for (const star of this._stars) {
      const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
      const brightness = star.brightness * (0.5 + twinkle * 0.5);
      const hue = (star.hue + hueShift) % 360;

      p.noStroke();
      p.fill(hue, 30, brightness * 255, 0.8);

      // Additive blending for glow effect
      p.blendMode(p.ADD);

      p.push();
      p.translate(star.pos.x, star.pos.y, star.pos.z);
      p.circle(0, 0, star.size);
      p.pop();

      p.blendMode(p.BLEND);
    }
  }

  override cleanup(_p: p5): void {
    this._stars = [];
    this._gasParticles = [];
    this.isSetup = false;
  }

  override resize(p: p5): void {
    this.initializeStars(p);
    this.initializeGas(p);
  }

  /**
   * Update pattern state with audio reactivity
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if parameters changed
    if (this._needsReinit) {
      this.initializeStars(p);
      this.initializeGas(p);
      this._needsReinit = false;
    }

    // Get audio frequency bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time for gas pulsation
    this._time += 0.016;

    // Update camera auto-rotation
    this._camAngle += this.params.camSpeed;

    // Calculate color shift from treble
    this._colorShift = trebleLevel * this.params.trebleColorShift;

    // Update stars with bass reactivity
    this.updateStars(p, bassLevel);

    // Update gas with mid reactivity
    this.updateGas(p, midLevel);
  }

  /**
   * Draw pattern with 3D camera setup
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    // Draw background
    this.drawBackground(p, options);

    p.push();

    // Set up camera with rotation
    p.camera(
      0, 0, (p.height / 2) / Math.tan(p.PI / 6) / this.params.camZoom,
      0, 0, 0,
      0, 1, 0
    );

    // Rotate entire scene for orbital effect
    p.rotateY(this._camAngle);

    // Set color mode to HSB for consistent color handling
    p.colorMode(p.HSB, 360, 100, 100, 255);

    // Draw layers in order (background to foreground)
    this.drawGas(p);     // Gas nebula (behind stars)
    this.drawStars(p);   // Stars (on top)

    p.pop();
  }

  /**
   * Draw background with trail effect
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 255);

    if (options.clearBackground) {
      p.clear();
    } else {
      // Dark space background with trail effect
      p.background(
        this.params.bgHue,
        this.params.bgSaturation,
        this.params.bgBrightness,
        this.params.backgroundAlpha * 255
      );
    }

    p.pop();
  }
}
