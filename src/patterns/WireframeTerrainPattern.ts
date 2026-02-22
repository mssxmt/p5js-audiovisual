/**
 * WireframeTerrainPattern - 3D wireframe terrain audio visualizer
 *
 * Procedurally generated wireframe terrain that responds to audio frequencies:
 * - Bass affects terrain height
 * - Mid frequencies add chaos/noise
 * - Treble shifts colors
 * - Camera rotation for dynamic viewing
 *
 * Task 1: Basic class structure and type definitions
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Terrain point data structure
 */
interface TerrainPoint {
  x: number;
  y: number;
  z: number;
  baseY: number;      // Base Y position (calculated from noise)
  targetY: number;    // Target Y position (for smooth transitions)
}

/**
 * Wireframe terrain parameters
 */
interface WireframeTerrainParams {
  // Grid configuration
  gridSize: number;        // Number of grid cells (10-50)
  cellSize: number;        // Size of each cell (10-50)
  terrainScale: number;    // Perlin noise scale (0.01-0.1)
  buildSpeed: number;      // Speed of terrain morphing (0.001-0.05)
  maxHeight: number;       // Maximum terrain height (50-300)

  // Wireframe appearance
  wireThickness: number;   // Line thickness (0.5-5)
  wireDensity: number;     // Density of wireframe lines (1-10)
  baseHue: number;         // Base color hue (0-360)
  saturation: number;      // Color saturation (0-100)
  brightness: number;      // Color brightness (0-100)

  // Audio reactivity
  bassHeightMult: number;  // Bass height multiplier (0-5)
  midChaosMult: number;    // Mid chaos multiplier (0-3)
  trebleColorShift: number;// Treble color shift (0-180)

  // Camera/View
  rotationX: number;       // Vertical rotation (-PI/2 to PI/2)
  rotationY: number;       // Horizontal rotation (0 to 2PI)
  rotationSpeed: number;   // Auto-rotation speed (0-0.01)
  cameraHeight: number;    // Camera height offset (-200 to 200)

  // Background
  backgroundAlpha: number; // Background trail effect (0-1)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'WireframeTerrainPattern',
  description: '3D wireframe terrain audio visualizer',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: WireframeTerrainParams = {
  gridSize: 30,
  cellSize: 20,
  terrainScale: 0.03,
  buildSpeed: 0.01,
  maxHeight: 200,
  wireThickness: 1.5,
  wireDensity: 3,
  baseHue: 180,
  saturation: 80,
  brightness: 60,
  bassHeightMult: 2.0,
  midChaosMult: 1.0,
  trebleColorShift: 60,
  rotationX: 0.3,
  rotationY: 0,
  rotationSpeed: 0.003,
  cameraHeight: 0,
  backgroundAlpha: 0.3,
};

/**
 * WireframeTerrainPattern - 3D wireframe terrain audio visualizer
 */
export class WireframeTerrainPattern extends BasePattern {
  protected params: WireframeTerrainParams;

  // Terrain grid (2D array of TerrainPoint)
  protected terrain: TerrainPoint[][] = [];

  // Time tracking (used for Perlin noise animation)
  protected time = 0;

  // Treble shift for color modulation
  private trebleShift = 0;

  // Reinitialization flag
  private needsReinit = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Get pattern parameters
   */
  getParams(): WireframeTerrainParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<WireframeTerrainParams>): void {
    const oldGridSize = this.params.gridSize;

    this.params = { ...this.params, ...params };

    // Check if grid size changed - requires reinitialization
    if (params.gridSize !== undefined && params.gridSize !== oldGridSize) {
      this.needsReinit = true;
    }
  }

  /**
   * Get parameter metadata
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      gridSize: { min: 10, max: 50, step: 1 },
      cellSize: { min: 10, max: 50, step: 1 },
      terrainScale: { min: 0.01, max: 0.1, step: 0.001 },
      buildSpeed: { min: 0.001, max: 0.05, step: 0.001 },
      maxHeight: { min: 50, max: 300, step: 10 },
      wireThickness: { min: 0.5, max: 5, step: 0.1 },
      wireDensity: { min: 1, max: 10, step: 1 },
      baseHue: { min: 0, max: 360, step: 1 },
      saturation: { min: 0, max: 100, step: 1 },
      brightness: { min: 0, max: 100, step: 1 },
      bassHeightMult: { min: 0, max: 5, step: 0.1 },
      midChaosMult: { min: 0, max: 3, step: 0.1 },
      trebleColorShift: { min: 0, max: 180, step: 1 },
      rotationX: { min: -Math.PI / 2, max: Math.PI / 2, step: 0.01 },
      rotationY: { min: 0, max: Math.PI * 2, step: 0.01 },
      rotationSpeed: { min: 0, max: 0.01, step: 0.0001 },
      cameraHeight: { min: -200, max: 200, step: 10 },
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
   * Setup pattern resources
   */
  override setup(p: p5): void {
    this.initializeTerrain(p);
    this.isSetup = true;
  }

  /**
   * Update pattern state
   * Audio-reactive terrain updates with frequency band influences
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if parameters changed
    if (this.needsReinit) {
      this.initializeTerrain(p);
      this.needsReinit = false;
    }

    // Get audio frequency bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time for Perlin noise animation
    this.time += 0.01;

    // Update camera rotation
    this.params.rotationY += this.params.rotationSpeed;

    // Store treble shift for color modulation
    this.trebleShift = trebleLevel * this.params.trebleColorShift;

    // Update terrain with audio reactivity
    this.updateTerrain(p, bassLevel, midLevel, trebleLevel);
  }

  /**
   * Draw pattern
   * Renders the wireframe terrain with 3D transforms and audio-reactive coloring
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    // Draw background
    this.drawBackground(p, options);

    // Set up 3D rendering
    p.push();

    // Apply camera transforms
    p.rotateX(this.params.rotationX);
    p.rotateY(this.params.rotationY);
    p.translate(0, this.params.cameraHeight, 0);

    // Set wireframe style
    p.colorMode(p.HSL);
    const hue = (this.params.baseHue + this.trebleShift) % 360;
    p.stroke(hue, this.params.saturation, this.params.brightness, 0.8);
    p.strokeWeight(this.params.wireThickness);
    p.noFill();

    // Draw wireframe terrain
    this.drawWireframe(p);

    p.pop();
  }

  /**
   * Draw background with optional trail effect
   * @param p - p5 instance
   * @param options - Render options containing clearBackground flag
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else {
      // Use HSL mode for consistency with wireframe
      p.push();
      p.colorMode(p.HSL);
      p.background(0, this.params.backgroundAlpha * 255);
      p.pop();
    }
  }

  /**
   * Draw wireframe grid lines
   * Draws both horizontal (along X) and vertical (along Z) lines
   * @param p - p5 instance
   */
  private drawWireframe(p: p5): void {
    const { wireDensity } = this.params;
    const gridSize = this.terrain.length;

    // Calculate step from wireDensity (higher density = smaller step)
    const step = Math.max(1, Math.floor(6 - wireDensity));

    // Draw horizontal lines (along X axis)
    for (let j = 0; j <= gridSize; j += step) {
      p.beginShape();
      for (let i = 0; i <= gridSize; i++) {
        const point = this.terrain[i][j];
        p.vertex(point.x, point.y, point.z);
      }
      p.endShape();
    }

    // Draw vertical lines (along Z axis)
    for (let i = 0; i <= gridSize; i += step) {
      p.beginShape();
      for (let j = 0; j <= gridSize; j++) {
        const point = this.terrain[i][j];
        p.vertex(point.x, point.y, point.z);
      }
      p.endShape();
    }
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.terrain = [];
    this.isSetup = false;
  }

  /**
   * Handle canvas resize
   */
  override resize(p: p5, _width: number, _height: number): void {
    this.initializeTerrain(p);
  }

  /**
   * Initialize terrain grid
   * Creates a 2D grid of terrain points centered around origin
   */
  private initializeTerrain(p: p5): void {
    const { gridSize, cellSize } = this.params;

    // Clear existing terrain
    this.terrain = [];

    // Calculate offset to center terrain
    const offset = (gridSize * cellSize) / 2;

    // Create 2D array of TerrainPoint with initial Perlin noise heights
    for (let i = 0; i <= gridSize; i++) {
      const row: TerrainPoint[] = [];
      for (let j = 0; j <= gridSize; j++) {
        const x = i * cellSize - offset;
        const z = j * cellSize - offset;

        // Calculate initial height from Perlin noise
        const initialHeight = p.noise(x * this.params.terrainScale, z * this.params.terrainScale) * this.params.maxHeight;

        row.push({
          x,
          y: initialHeight,
          z,
          baseY: initialHeight,
          targetY: initialHeight,
        });
      }
      this.terrain.push(row);
    }
  }

  /**
   * Calculate target height for a terrain point using Perlin noise
   * @param p - p5 instance
   * @param x - X position in terrain space
   * @param z - Z position in terrain space
   * @param chaosMult - Chaos multiplier for audio reactivity
   * @returns Target Y height based on Perlin noise
   */
  private calculateTargetHeight(p: p5, x: number, z: number, chaosMult: number): number {
    const scale = this.params.terrainScale * chaosMult;
    return p.noise(x * scale, z * scale, this.time) * this.params.maxHeight;
  }

  /**
   * Update terrain with audio-reactive height modifications
   * @param p - p5 instance
   * @param bassLevel - Bass frequency level (0-1)
   * @param midLevel - Mid frequency level (0-1)
   * @param _trebleLevel - Treble frequency level (0-1) - reserved for color shifts
   *
   * Audio reactivity:
   * - Bass increases terrain height amplitude
   * - Mid increases noise chaos (terrain detail)
   * - Treble reserved for color shifts (handled in draw)
   */
  private updateTerrain(
    p: p5,
    bassLevel: number,
    midLevel: number,
    _trebleLevel: number
  ): void {
    // Calculate audio-reactive multipliers
    const chaosMult = 1 + midLevel * this.params.midChaosMult;
    const heightMult = 1 + bassLevel * this.params.bassHeightMult;
    const buildSpeed = this.params.buildSpeed;

    // Update all terrain points
    for (let i = 0; i < this.terrain.length; i++) {
      const row = this.terrain[i];
      for (let j = 0; j < row.length; j++) {
        const point = row[j];

        // Calculate target height based on Perlin noise
        const targetHeight = this.calculateTargetHeight(p, point.x, point.z, chaosMult);

        // Apply audio height multiplier
        point.targetY = targetHeight * heightMult;

        // Smoothly interpolate current height to target (lerp)
        point.y = p.lerp(point.y, point.targetY, buildSpeed);
      }
    }
  }
}
