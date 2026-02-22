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
  // @ts-expect-error - Used in Task 2 (initializeStars, update)
  private _stars: Star[] = [];

  // Gas nebula
  // @ts-expect-error - Used in Task 3 (initializeGas, update)
  private _gasParticles: GasParticle[] = [];

  // Camera
  // @ts-expect-error - Used in Task 4 (update, draw)
  private _camAngle = 0;

  // Color shift for treble
  // @ts-expect-error - Used in Task 4 (update)
  private _colorShift = 0;

  // @ts-expect-error - Used in Task 4 (update)
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
  private initializeStars(_p: p5): void { /* Task 2 */ }
  private initializeGas(_p: p5): void { /* Task 3 */ }

  override cleanup(_p: p5): void {
    this._stars = [];
    this._gasParticles = [];
    this.isSetup = false;
  }

  override resize(p: p5): void {
    this.initializeStars(p);
    this.initializeGas(p);
  }

  // Override update/draw in later tasks
  override update(_p: p5, _context: PatternContext): void { /* Task 4 */ }
  override draw(_p: p5, _options: PatternRenderOptions): void { /* Task 5 */ }
}
