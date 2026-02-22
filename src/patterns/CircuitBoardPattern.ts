/**
 * CircuitBoardPattern - Circuit Board Audio Visualization
 *
 * Inspired by PCB/circuit board aesthetics:
 * - Grid-aligned nodes (CPU, RAM, IO, POWER types)
 * - Orthogonal circuit traces (Manhattan routing)
 * - Growing traces animation
 * - Data flow along traces
 * - Audio-reactive spawning, flow speed, and pulsing
 * - MIDI Learn for all parameters
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Circuit node types with different visual styles
 */
type NodeType = 'CPU' | 'RAM' | 'IO' | 'POWER';

/**
 * Circuit node on the grid
 */
interface CircuitNode {
  id: string;
  gridX: number;        // Grid X position
  gridY: number;        // Grid Y position
  x: number;            // Actual X position (centered)
  y: number;            // Actual Y position (centered)
  type: NodeType;
  size: number;
  pulsePhase: number;
  connections: string[]; // IDs of connected nodes
}

/**
 * Circuit trace (wire connecting nodes)
 */
interface CircuitTrace {
  id: string;
  fromNode: string;     // Source node ID
  toNode: string;       // Target node ID
  path: p5.Vector[];    // Manhattan path points
  progress: number;     // Growth progress (0-1)
  dataFlow: number;     // Data flow position (0-1)
  layer: number;        // Visual layer (0-2) for depth/color
  colorOffset: number;  // Hue offset for this trace
}

/**
 * Circuit board pattern parameters
 */
interface CircuitBoardParams {
  // Grid configuration
  nodeCount: number;         // Number of nodes (10-100)
  gridSpacing: number;       // Grid cell size (20-100)
  connectionDensity: number; // Connection probability (0.1-0.9)

  // Trace animation
  growthSpeed: number;       // Trace growth speed (0.001-0.1)
  dataFlowSpeed: number;     // Data flow speed (0-1)
  maxTraces: number;         // Maximum active traces (10-500)

  // Visual style
  baseHue: number;           // Base hue (0-360)
  layerHueShift: number;     // Hue shift per layer (0-60)
  glowIntensity: number;     // Glow effect intensity (0-1)
  traceWidth: number;        // Trace line width (1-5)

  // Audio reactivity
  bassSpawnRate: number;     // Bass -> spawn chance (0-1)
  midFlowMult: number;       // Mid -> flow multiplier (0-5)
  treblePulseMult: number;   // Treble -> pulse multiplier (0-2)

  // Background
  backgroundAlpha: number;   // Trail fade (0.01-1)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'CircuitBoardPattern',
  description: 'Circuit board visualization with growing traces and data flow',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: CircuitBoardParams = {
  nodeCount: 40,
  gridSpacing: 60,
  connectionDensity: 0.4,
  growthSpeed: 0.01,
  dataFlowSpeed: 0.3,
  maxTraces: 150,
  baseHue: 180,             // Cyan base
  layerHueShift: 30,
  glowIntensity: 0.6,
  traceWidth: 2,
  bassSpawnRate: 0.3,
  midFlowMult: 2.0,
  treblePulseMult: 1.0,
  backgroundAlpha: 0.15,
};

/**
 * CircuitBoardPattern - Circuit board visualization
 */
export class CircuitBoardPattern extends BasePattern {
  protected params: CircuitBoardParams;
  protected nodes: CircuitNode[] = [];
  protected traces: CircuitTrace[] = [];
  protected gridCols = 0;
  protected gridRows = 0;
  protected time = 0;
  protected isSetup = false;
  private needsReinit = false;

  // Node type colors (hue offsets) - used in Task 5 (draw method)
  // @ts-ignore: Used in Task 5
  private readonly NODE_TYPE_COLORS: Record<NodeType, number> = {
    CPU: 0,    // Base hue
    RAM: 30,   // +30°
    IO: 60,    // +60°
    POWER: 180, // +180° (complementary)
  };

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  getParams(): CircuitBoardParams {
    return { ...this.params };
  }

  setParams(params: Partial<CircuitBoardParams>): void {
    const oldNodeCount = this.params.nodeCount;
    const oldGridSpacing = this.params.gridSpacing;
    const oldMaxTraces = this.params.maxTraces;

    this.params = { ...this.params, ...params };

    if (
      params.nodeCount !== undefined && params.nodeCount !== oldNodeCount ||
      params.gridSpacing !== undefined && params.gridSpacing !== oldGridSpacing ||
      params.maxTraces !== undefined && params.maxTraces !== oldMaxTraces
    ) {
      this.needsReinit = true;
    }
  }

  /**
   * Update pattern state with audio reactivity
   * Implemented in Task 4
   */
  override update(_p: p5, _context: PatternContext): void {
    // Check if reinitialization is needed
    if (this.needsReinit) {
      // Will be implemented in Task 2
      this.needsReinit = false;
    }

    // Placeholder - Task 4 will implement audio-reactive updates
    this.time += 0.01;
  }

  /**
   * Draw pattern
   * Implemented in Task 5
   */
  override draw(_p: p5, _options: PatternRenderOptions): void {
    // Placeholder - Task 5 will implement rendering
  }

  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      nodeCount: { min: 10, max: 100, step: 1 },
      gridSpacing: { min: 20, max: 100, step: 5 },
      connectionDensity: { min: 0.1, max: 0.9, step: 0.05 },
      growthSpeed: { min: 0.001, max: 0.1, step: 0.001 },
      dataFlowSpeed: { min: 0, max: 1, step: 0.01 },
      maxTraces: { min: 10, max: 500, step: 10 },
      baseHue: { min: 0, max: 360, step: 1 },
      layerHueShift: { min: 0, max: 60, step: 1 },
      glowIntensity: { min: 0, max: 1, step: 0.05 },
      traceWidth: { min: 1, max: 5, step: 0.5 },
      bassSpawnRate: { min: 0, max: 1, step: 0.05 },
      midFlowMult: { min: 0, max: 5, step: 0.1 },
      treblePulseMult: { min: 0, max: 2, step: 0.1 },
      backgroundAlpha: { min: 0.01, max: 1, step: 0.01 },
    };
  }

  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  override setup(p: p5): void {
    this.initializeGrid(p);
    this.initializeNodes(p);
    this.isSetup = true;
  }

  override cleanup(_p: p5): void {
    this.nodes = [];
    this.traces = [];
    this.isSetup = false;
  }

  override resize(p: p5): void {
    this.initializeGrid(p);
    this.initializeNodes(p);
  }

  // Placeholder methods to be implemented in later tasks
  private initializeGrid(_p: p5): void { /* Task 2 */ }
  private initializeNodes(_p: p5): void { /* Task 2 */ }
}
