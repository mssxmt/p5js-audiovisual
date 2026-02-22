/**
 * VoronoiPattern - Dynamic Voronoi Diagram Visualization
 *
 * Real-time Voronoi diagram with moving seed points:
 * - Seed points move organically through the space
 * - Cell boundaries change dynamically as seeds move
 * - Optional Delaunay triangulation overlay
 * - Audio-reactive colors and movement
 * - Sharp geometric aesthetic with modern feel
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Seed point for Voronoi cell
 */
interface SeedPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;      // For organic movement (Lissajous)
  speed: number;
  radiusX: number;
  radiusY: number;
  hue: number;
}

/**
 * Voronoi pattern parameters
 */
interface VoronoiParams {
  // Seeds
  seedCount: number;        // Number of seed points (10-100)
  movementSpeed: number;    // Seed movement speed (0-2)
  movementType: number;     // 0=Brownian, 1=Lissajous, 2=Perlin

  // Visual
  boundaryWidth: number;    // Boundary line width (1-5)
  baseHue: number;          // Base color hue (0-360)
  hueVariation: number;     // Hue variation between cells (0-180)
  saturation: number;       // Color saturation (0-100)
  brightness: number;       // Color brightness (0-100)

  // Display options
  showBoundaries: boolean;  // Show cell boundaries
  showDelaunay: boolean;    // Show Delaunay triangulation
  fillCells: boolean;       // Fill cells with color

  // Audio reactivity
  bassSpeedMult: number;    // Bass → movement speed multiplier (0-3)
  midSpawnRate: number;     // Mid → spawn new seeds (0-0.1)
  trebleHueShift: number;   // Treble → hue shift (0-180)

  // Background
  backgroundAlpha: number;  // Trail fade effect (0-0.5)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'VoronoiPattern',
  description: 'Dynamic Voronoi diagram visualization',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: VoronoiParams = {
  seedCount: 30,
  movementSpeed: 0.5,
  movementType: 1,  // Lissajous
  boundaryWidth: 2,
  baseHue: 200,
  hueVariation: 60,
  saturation: 70,
  brightness: 50,
  showBoundaries: true,
  showDelaunay: false,
  fillCells: true,
  bassSpeedMult: 1.5,
  midSpawnRate: 0.02,
  trebleHueShift: 45,
  backgroundAlpha: 0.05,
};

/**
 * VoronoiPattern - Dynamic Voronoi diagram visualization
 */
export class VoronoiPattern extends BasePattern {
  protected params: VoronoiParams;

  // Seed points
  private seeds: SeedPoint[] = [];

  // Offscreen graphics for Voronoi rendering (performance)
  private voronoiBuffer: p5.Graphics | null = null;

  // Time for animation
  private time = 0;

  // Audio values for reactivity
  private hueShift = 0;

  // Reinitialization flag
  private needsReinit = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  getParams(): VoronoiParams {
    return { ...this.params };
  }

  setParams(params: Partial<VoronoiParams>): void {
    const oldSeedCount = this.params.seedCount;

    this.params = { ...this.params, ...params };

    if (params.seedCount !== undefined && params.seedCount !== oldSeedCount) {
      this.needsReinit = true;
    }
  }

  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      seedCount: { min: 10, max: 100, step: 1 },
      movementSpeed: { min: 0, max: 2, step: 0.1 },
      movementType: { min: 0, max: 2, step: 1 },
      boundaryWidth: { min: 1, max: 5, step: 0.5 },
      baseHue: { min: 0, max: 360, step: 1 },
      hueVariation: { min: 0, max: 180, step: 5 },
      saturation: { min: 0, max: 100, step: 1 },
      brightness: { min: 0, max: 100, step: 1 },
      showBoundaries: { min: 0, max: 1, step: 1 },
      showDelaunay: { min: 0, max: 1, step: 1 },
      fillCells: { min: 0, max: 1, step: 1 },
      bassSpeedMult: { min: 0, max: 3, step: 0.1 },
      midSpawnRate: { min: 0, max: 0.1, step: 0.005 },
      trebleHueShift: { min: 0, max: 180, step: 5 },
      backgroundAlpha: { min: 0, max: 0.5, step: 0.01 },
    };
  }

  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  override setup(p: p5): void {
    // Create offscreen buffer for Voronoi rendering (lower resolution for performance)
    this.voronoiBuffer = p.createGraphics(p.width, p.height, p.WEBGL);
    this.initializeSeeds(p);
    this.isSetup = true;
  }

  /**
   * Initialize seed points
   */
  private initializeSeeds(p: p5): void {
    this.seeds = [];

    for (let i = 0; i < this.params.seedCount; i++) {
      const hueOffset = (i / this.params.seedCount) * this.params.hueVariation;

      this.seeds.push({
        x: p.random(p.width),
        y: p.random(p.height),
        vx: p.random(-1, 1),
        vy: p.random(-1, 1),
        phase: p.random(p.TWO_PI),
        speed: p.random(0.5, 1.5),
        radiusX: p.random(50, 200),
        radiusY: p.random(50, 200),
        hue: (this.params.baseHue + hueOffset) % 360,
      });
    }
  }

  override update(p: p5, context: PatternContext): void {
    // Reinitialize if needed
    if (this.needsReinit) {
      this.initializeSeeds(p);
      this.needsReinit = false;
    }

    // Get audio bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time
    this.time += 0.016;

    // Store hue shift from treble
    this.hueShift = trebleLevel * this.params.trebleHueShift;

    // Update seed positions
    this.updateSeeds(p, bassLevel);

    // Spawn new seeds on mid (occasionally)
    if (midLevel > 0.6 && Math.random() < this.params.midSpawnRate && this.seeds.length < this.params.seedCount * 1.5) {
      this.spawnSeed(p);
    }

    // Remove excess seeds
    while (this.seeds.length > this.params.seedCount * 1.5) {
      this.seeds.shift();
    }
  }

  /**
   * Update seed positions based on movement type
   */
  private updateSeeds(p: p5, bassLevel: number): void {
    const speedMult = 1 + bassLevel * this.params.bassSpeedMult;

    for (const seed of this.seeds) {
      if (this.params.movementType === 0) {
        // Brownian motion
        seed.vx += p.random(-0.1, 0.1);
        seed.vy += p.random(-0.1, 0.1);
        seed.vx *= 0.99; // Damping
        seed.vy *= 0.99;
        seed.x += seed.vx * this.params.movementSpeed * speedMult;
        seed.y += seed.vy * this.params.movementSpeed * speedMult;
      } else if (this.params.movementType === 1) {
        // Lissajous-like organic movement
        seed.x = p.width / 2 + Math.cos(this.time * seed.speed + seed.phase) * seed.radiusX;
        seed.y = p.height / 2 + Math.sin(this.time * seed.speed * 1.3 + seed.phase * 0.7) * seed.radiusY;
      } else {
        // Perlin noise movement
        const angle = p.noise(seed.x * 0.005, seed.y * 0.005, this.time * 0.1) * p.TWO_PI * 2;
        seed.x += Math.cos(angle) * this.params.movementSpeed * speedMult;
        seed.y += Math.sin(angle) * this.params.movementSpeed * speedMult;
      }

      // Wrap around edges
      if (seed.x < 0) seed.x += p.width;
      if (seed.x > p.width) seed.x -= p.width;
      if (seed.y < 0) seed.y += p.height;
      if (seed.y > p.height) seed.y -= p.height;
    }
  }

  /**
   * Spawn a new seed at random position
   */
  private spawnSeed(p: p5): void {
    const hueOffset = Math.random() * this.params.hueVariation;

    this.seeds.push({
      x: p.random(p.width),
      y: p.random(p.height),
      vx: p.random(-1, 1),
      vy: p.random(-1, 1),
      phase: p.random(p.TWO_PI),
      speed: p.random(0.5, 1.5),
      radiusX: p.random(50, 200),
      radiusY: p.random(50, 200),
      hue: (this.params.baseHue + hueOffset) % 360,
    });
  }

  override draw(p: p5, options: PatternRenderOptions): void {
    // Draw background
    this.drawBackground(p, options);

    // Render Voronoi diagram
    this.drawVoronoi(p);
  }

  /**
   * Draw background with trail effect
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else {
      p.background(0, this.params.backgroundAlpha * 255);
    }
  }

  /**
   * Draw Voronoi diagram using pixel-by-pixel approach
   * For performance, we use a lower resolution and scale up
   */
  private drawVoronoi(p: p5): void {
    // Use a lower resolution for performance
    const scaleFactor = 4;

    p.loadPixels();

    // Direct pixel manipulation for Voronoi
    for (let y = 0; y < p.height; y += scaleFactor) {
      for (let x = 0; x < p.width; x += scaleFactor) {
        let minDist = Infinity;
        let nearestSeed = this.seeds[0];

        // Find nearest seed
        for (const seed of this.seeds) {
          const dx = x - seed.x;
          const dy = y - seed.y;
          const dist = dx * dx + dy * dy;

          if (dist < minDist) {
            minDist = dist;
            nearestSeed = seed;
          }
        }

        // Determine color based on nearest seed
        const hue = (nearestSeed.hue + this.hueShift) % 360;

        // Set pixel color (HSB to RGB conversion simplified)
        const rgb = this.hsbToRgb(hue / 360, this.params.saturation / 100, this.params.brightness / 100);

        // Fill the scaled pixel block
        for (let py = 0; py < scaleFactor && y + py < p.height; py++) {
          for (let px = 0; px < scaleFactor && x + px < p.width; px++) {
            const idx = ((y + py) * p.width + (x + px)) * 4;
            p.pixels[idx] = rgb[0];
            p.pixels[idx + 1] = rgb[1];
            p.pixels[idx + 2] = rgb[2];
            p.pixels[idx + 3] = 255;
          }
        }
      }
    }

    p.updatePixels();

    // Draw boundaries (optional)
    if (this.params.showBoundaries) {
      this.drawBoundaries(p);
    }

    // Draw Delaunay triangulation (optional)
    if (this.params.showDelaunay) {
      this.drawDelaunay(p);
    }
  }

  /**
   * Draw Voronoi cell boundaries
   */
  private drawBoundaries(p: p5): void {
    const scaleFactor = 4;

    p.stroke(255);
    p.strokeWeight(this.params.boundaryWidth);
    p.noFill();

    // Detect boundaries by checking neighbors
    for (let y = 0; y < p.height - scaleFactor; y += scaleFactor) {
      for (let x = 0; x < p.width - scaleFactor; x += scaleFactor) {
        // Get nearest seed for current pixel
        let minDist1 = Infinity;
        let nearest1 = 0;

        for (let i = 0; i < this.seeds.length; i++) {
          const seed = this.seeds[i];
          const dx = x - seed.x;
          const dy = y - seed.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist1) {
            minDist1 = dist;
            nearest1 = i;
          }
        }

        // Check right neighbor
        let minDist2 = Infinity;
        let nearest2 = 0;

        for (let i = 0; i < this.seeds.length; i++) {
          const seed = this.seeds[i];
          const dx = (x + scaleFactor) - seed.x;
          const dy = y - seed.y;
          const dist = dx * dx + dy * dy;
          if (dist < minDist2) {
            minDist2 = dist;
            nearest2 = i;
          }
        }

        if (nearest1 !== nearest2) {
          p.point(x + scaleFactor / 2, y + scaleFactor / 2);
        }
      }
    }
  }

  /**
   * Draw Delaunay triangulation (edges between neighboring seeds)
   */
  private drawDelaunay(p: p5): void {
    p.stroke(255, 100);
    p.strokeWeight(1);

    // Simple approach: connect seeds that are close to each other
    for (let i = 0; i < this.seeds.length; i++) {
      for (let j = i + 1; j < this.seeds.length; j++) {
        const dx = this.seeds[i].x - this.seeds[j].x;
        const dy = this.seeds[i].y - this.seeds[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Connect if within threshold distance
        const threshold = 150;
        if (dist < threshold) {
          const alpha = (1 - dist / threshold) * 100;
          p.stroke(255, alpha);
          p.line(this.seeds[i].x, this.seeds[i].y, this.seeds[j].x, this.seeds[j].y);
        }
      }
    }
  }

  /**
   * Convert HSB to RGB
   */
  private hsbToRgb(h: number, s: number, v: number): [number, number, number] {
    let r = 0, g = 0, b = 0;

    if (s === 0) {
      r = g = b = v;
    } else {
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  override cleanup(_p: p5): void {
    this.seeds = [];
    if (this.voronoiBuffer) {
      this.voronoiBuffer.remove();
      this.voronoiBuffer = null;
    }
    this.isSetup = false;
  }

  override resize(p: p5): void {
    if (this.voronoiBuffer) {
      this.voronoiBuffer.remove();
    }
    this.voronoiBuffer = p.createGraphics(p.width, p.height, p.WEBGL);
    this.initializeSeeds(p);
  }
}
