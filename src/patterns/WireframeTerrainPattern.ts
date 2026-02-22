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
   * Will be implemented in Task 3
   */
  override update(p: p5, _context: PatternContext): void {
    // Reinitialize if parameters changed
    if (this.needsReinit) {
      this.initializeTerrain(p);
      this.needsReinit = false;
    }
    // Placeholder - will implement audio reactive updates in Task 3
  }

  /**
   * Draw pattern
   * Will be implemented in Task 4
   */
  override draw(_p: p5, _options: PatternRenderOptions): void {
    // Placeholder - will implement rendering in Task 4
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
  private initializeTerrain(_p: p5): void {
    const { gridSize, cellSize } = this.params;

    // Clear existing terrain
    this.terrain = [];

    // Calculate offset to center terrain
    const offset = (gridSize * cellSize) / 2;

    // Create 2D array of TerrainPoint with flat terrain (y=0 initially)
    for (let i = 0; i <= gridSize; i++) {
      const row: TerrainPoint[] = [];
      for (let j = 0; j <= gridSize; j++) {
        row.push({
          x: i * cellSize - offset,
          y: 0,
          z: j * cellSize - offset,
          baseY: 0,
          targetY: 0,
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
   *
   * Note: Used in Task 3 for audio-reactive terrain updates
   */
  // @ts-expect-error - Method will be used in Task 3
  private calculateTargetHeight(p: p5, x: number, z: number, chaosMult: number): number {
    const scale = this.params.terrainScale * chaosMult;
    return p.noise(x * scale, z * scale, this.time) * this.params.maxHeight;
  }
}
