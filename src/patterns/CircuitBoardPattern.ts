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

  // Node type colors (hue offsets)
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
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if needed
    if (this.needsReinit) {
      this.initializeGrid(p);
      this.initializeNodes(p);
      this.needsReinit = false;
    }

    // Get audio bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time
    this.time += 0.016; // ~60fps

    // Calculate audio-reactive parameters
    const spawnChance = bassLevel * this.params.bassSpawnRate * 0.1;
    const flowMult = 1 + midLevel * this.params.midFlowMult;
    const pulseMult = 1 + trebleLevel * this.params.treblePulseMult;

    // Spawn new traces on bass
    if (spawnChance > 0.01) {
      this.spawnNewTraces(p, spawnChance);
    }

    // Update traces
    this.updateTraces(p, flowMult);

    // Update nodes
    this.updateNodes(p, pulseMult);
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Draw traces (bottom layer)
    this.drawTraces(p);

    // Draw nodes (top layer)
    this.drawNodes(p);

    p.pop();
  }

  /**
   * Draw circuit traces
   */
  private drawTraces(p: p5): void {
    const baseHue = this.params.baseHue;
    const layerHueShift = this.params.layerHueShift;
    const traceWidth = this.params.traceWidth;

    p.colorMode(p.HSL);

    for (const trace of this.traces) {
      if (trace.progress <= 0) continue;

      // Calculate color based on layer
      const hue = (baseHue + trace.layer * layerHueShift + trace.colorOffset) % 360;
      const saturation = 80;
      const brightness = 60;

      p.stroke(hue, saturation, brightness, 0.9);
      p.strokeWeight(traceWidth);
      p.noFill();

      // Draw trace path up to progress
      p.beginShape();
      const totalSegments = trace.path.length - 1;
      const currentSegment = trace.progress * totalSegments;
      const segmentIndex = Math.floor(currentSegment);
      const segmentT = currentSegment - segmentIndex;

      for (let i = 0; i <= segmentIndex && i < trace.path.length; i++) {
        const point = trace.path[i];
        p.vertex(point.x, point.y);
      }

      // Add partial segment
      if (segmentIndex < totalSegments) {
        const p1 = trace.path[segmentIndex];
        const p2 = trace.path[segmentIndex + 1];
        const x = p.lerp(p1.x, p2.x, segmentT);
        const y = p.lerp(p1.y, p2.y, segmentT);
        p.vertex(x, y);
      }

      p.endShape();

      // Draw data flow if trace is complete
      if (trace.progress >= 1 && trace.dataFlow > 0) {
        this.drawDataFlow(p, trace, hue);
      }
    }

    p.colorMode(p.RGB);
  }

  /**
   * Draw data flow animation along trace
   */
  private drawDataFlow(p: p5, trace: CircuitTrace, hue: number): void {
    const totalLength = this.getPathLength(p, trace.path);
    const flowPos = trace.dataFlow * totalLength;

    // Find position along path
    let distance = 0;
    for (let i = 0; i < trace.path.length - 1; i++) {
      const p1 = trace.path[i];
      const p2 = trace.path[i + 1];
      const segmentLength = p.dist(p1.x, p1.y, p2.x, p2.y);

      if (distance + segmentLength >= flowPos) {
        // Data packet is on this segment
        const t = (flowPos - distance) / segmentLength;
        const x = p.lerp(p1.x, p2.x, t);
        const y = p.lerp(p1.y, p2.y, t);

        // Draw glowing data packet
        p.colorMode(p.HSL);
        p.noStroke();
        p.fill(hue, 100, 90, 1);
        p.circle(x, y, this.params.traceWidth * 2.5);
        p.colorMode(p.RGB);
        break;
      }

      distance += segmentLength;
    }
  }

  /**
   * Calculate total path length
   */
  private getPathLength(p: p5, path: p5.Vector[]): number {
    let length = 0;
    for (let i = 0; i < path.length - 1; i++) {
      length += p.dist(path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
    }
    return length;
  }

  /**
   * Draw circuit nodes
   */
  private drawNodes(p: p5): void {
    const baseHue = this.params.baseHue;
    const glowIntensity = this.params.glowIntensity;

    p.colorMode(p.HSL);

    for (const node of this.nodes) {
      const typeColorOffset = this.NODE_TYPE_COLORS[node.type];
      const hue = (baseHue + typeColorOffset) % 360;

      // Pulse effect
      const pulse = (Math.sin(node.pulsePhase) + 1) / 2; // 0-1
      const brightness = 50 + pulse * 30;

      // Draw node body
      p.stroke(hue, 70, brightness, 0.9);
      p.strokeWeight(1.5);
      p.fill(hue, 50, brightness * 0.5, 0.7);

      // Shape based on node type
      if (node.type === 'CPU') {
        // Square for CPU
        p.rectMode(p.CENTER);
        p.rect(node.x, node.y, node.size, node.size);
      } else if (node.type === 'RAM') {
        // Rectangle for RAM
        p.rectMode(p.CENTER);
        p.rect(node.x, node.y, node.size * 1.2, node.size * 0.6);
      } else if (node.type === 'POWER') {
        // Circle for POWER
        p.circle(node.x, node.y, node.size);
      } else {
        // Small square for IO
        p.rectMode(p.CENTER);
        p.rect(node.x, node.y, node.size, node.size);
      }

      // Draw glow effect
      if (glowIntensity > 0) {
        p.noStroke();
        p.fill(hue, 70, 80, glowIntensity * 0.3);
        if (node.type === 'POWER') {
          p.circle(node.x, node.y, node.size * 1.5);
        } else {
          p.rectMode(p.CENTER);
          p.rect(node.x, node.y, node.size * 1.3, node.size * 1.3);
        }
      }
    }

    p.colorMode(p.RGB);
  }

  /**
   * Draw background with trail fade
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else {
      // Dark PCB background (dark green/black)
      p.background(5, 15, 10, this.params.backgroundAlpha * 255);
    }
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

  /**
   * Initialize grid dimensions
   */
  private initializeGrid(p: p5): void {
    const spacing = this.params.gridSpacing;
    this.gridCols = Math.floor(p.width / spacing);
    this.gridRows = Math.floor(p.height / spacing);
  }

  /**
   * Initialize circuit nodes on grid
   */
  private initializeNodes(p: p5): void {
    this.nodes = [];
    this.traces = [];

    const nodeCount = this.params.nodeCount;
    const spacing = this.params.gridSpacing;

    // Calculate offset to center grid
    const offsetX = (this.gridCols * spacing) / 2 - spacing / 2;
    const offsetY = (this.gridRows * spacing) / 2 - spacing / 2;

    // Track occupied grid positions
    const occupied = new Set<string>();

    // Node type distribution
    const typeDistribution: NodeType[] = [];
    const cpuCount = Math.floor(nodeCount * 0.1);  // 10% CPU
    const ramCount = Math.floor(nodeCount * 0.3);  // 30% RAM
    const ioCount = Math.floor(nodeCount * 0.3);   // 30% IO
    const powerCount = nodeCount - cpuCount - ramCount - ioCount; // Rest POWER

    for (let i = 0; i < cpuCount; i++) typeDistribution.push('CPU');
    for (let i = 0; i < ramCount; i++) typeDistribution.push('RAM');
    for (let i = 0; i < ioCount; i++) typeDistribution.push('IO');
    for (let i = 0; i < powerCount; i++) typeDistribution.push('POWER');

    // Shuffle types
    for (let i = typeDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(p.random(i + 1));
      [typeDistribution[i], typeDistribution[j]] = [typeDistribution[j], typeDistribution[i]];
    }

    // Place nodes on random grid positions
    for (let i = 0; i < nodeCount; i++) {
      let gridX: number;
      let gridY: number;
      let key: string;
      let attempts = 0;

      // Find unoccupied grid position
      do {
        gridX = Math.floor(p.random(this.gridCols));
        gridY = Math.floor(p.random(this.gridRows));
        key = `${gridX},${gridY}`;
        attempts++;
      } while (occupied.has(key) && attempts < 100);

      if (attempts >= 100) continue; // Skip if can't find position

      occupied.add(key);

      const x = gridX * spacing - offsetX;
      const y = gridY * spacing - offsetY;
      const type = typeDistribution[i] || 'IO';

      // Node size based on type
      const size = type === 'CPU' ? spacing * 0.4 :
                   type === 'POWER' ? spacing * 0.35 :
                   type === 'RAM' ? spacing * 0.3 : spacing * 0.25;

      this.nodes.push({
        id: `node-${i}`,
        gridX,
        gridY,
        x,
        y,
        type,
        size,
        pulsePhase: p.random(p.TWO_PI),
        connections: [],
      });
    }

    // Create initial connections
    this.createInitialConnections(p);
  }

  /**
   * Generate Manhattan routing path between two nodes
   * Uses orthogonal routing with horizontal-first preference
   */
  private generateManhattanPath(from: CircuitNode, to: CircuitNode): p5.Vector[] {
    // Create control points for orthogonal routing
    const path: p5.Vector[] = [];

    // Start point (from node)
    path.push({ x: from.x, y: from.y } as p5.Vector);

    // Determine routing direction
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Single axis aligned
    if (Math.abs(dx) < 1) {
      // Vertical only
      path.push({ x: to.x, y: to.y } as p5.Vector);
      return path;
    }
    if (Math.abs(dy) < 1) {
      // Horizontal only
      path.push({ x: to.x, y: to.y } as p5.Vector);
      return path;
    }

    // Two-segment Manhattan routing
    // Choose intermediate point based on grid alignment
    const midX = from.x + dx / 2;

    // Add intermediate points for L-shaped routing
    path.push({ x: midX, y: from.y } as p5.Vector);
    path.push({ x: midX, y: to.y } as p5.Vector);

    // End point (to node)
    path.push({ x: to.x, y: to.y } as p5.Vector);

    return path;
  }

  /**
   * Create a new trace between two nodes
   */
  private createTrace(fromNode: CircuitNode, toNode: CircuitNode): void {
    const path = this.generateManhattanPath(fromNode, toNode);
    const layer = Math.floor(Math.random() * 3); // 3 visual layers
    const colorOffset = Math.random() * 30 - 15; // +/- 15° hue variation

    this.traces.push({
      id: `trace-${fromNode.id}-${toNode.id}-${Date.now()}`,
      fromNode: fromNode.id,
      toNode: toNode.id,
      path,
      progress: 0,
      dataFlow: 0,
      layer,
      colorOffset,
    });
  }

  /**
   * Spawn new traces on beat/audio peaks
   */
  private spawnNewTraces(p: p5, spawnChance: number): void {
    if (this.traces.length >= this.params.maxTraces) return;

    // Find unconnected or under-connected nodes
    const availableNodes = this.nodes.filter(n => n.connections.length < 6);

    if (availableNodes.length < 2) return;

    // Try to spawn new connection
    if (p.random() < spawnChance) {
      const fromNode = p.random(availableNodes);
      const candidates = availableNodes.filter(n =>
        n.id !== fromNode.id &&
        !fromNode.connections.includes(n.id) &&
        !n.connections.includes(fromNode.id)
      );

      if (candidates.length > 0) {
        // Prefer closer nodes
        candidates.sort((a, b) => {
          const distA = Math.abs(a.gridX - fromNode.gridX) + Math.abs(a.gridY - fromNode.gridY);
          const distB = Math.abs(b.gridX - fromNode.gridX) + Math.abs(b.gridY - fromNode.gridY);
          return distA - distB;
        });

        // Pick from top 3 closest
        const topCount = Math.min(3, candidates.length);
        const toNode = candidates[Math.floor(p.random(topCount))];

        this.createTrace(fromNode, toNode);
        fromNode.connections.push(toNode.id);
        toNode.connections.push(fromNode.id);
      }
    }
  }

  /**
   * Update trace growth and data flow
   */
  private updateTraces(_p: p5, flowMult: number): void {
    const growthSpeed = this.params.growthSpeed;
    const dataFlowBase = this.params.dataFlowSpeed;

    for (const trace of this.traces) {
      // Grow trace
      if (trace.progress < 1) {
        trace.progress += growthSpeed;
        if (trace.progress > 1) trace.progress = 1;
      }

      // Update data flow
      trace.dataFlow += dataFlowBase * flowMult * 0.05;
      if (trace.dataFlow > 1) trace.dataFlow = 0;
    }

    // Remove old traces if over limit
    if (this.traces.length > this.params.maxTraces) {
      // Remove oldest completed traces
      const completed = this.traces.filter(t => t.progress >= 1);
      if (completed.length > 0) {
        const toRemove = this.traces.indexOf(completed[0]);
        if (toRemove !== -1) {
          const removed = this.traces.splice(toRemove, 1)[0];

          // Remove from node connections
          const fromNode = this.nodes.find(n => n.id === removed.fromNode);
          const toNode = this.nodes.find(n => n.id === removed.toNode);
          if (fromNode) {
            fromNode.connections = fromNode.connections.filter(id => id !== removed.toNode);
          }
          if (toNode) {
            toNode.connections = toNode.connections.filter(id => id !== removed.fromNode);
          }
        }
      }
    }
  }

  /**
   * Update node pulse animation
   */
  private updateNodes(_p: p5, pulseMult: number): void {
    for (const node of this.nodes) {
      // Pulse phase increases with time
      node.pulsePhase += 0.05 * pulseMult;
      if (node.pulsePhase > _p.TWO_PI) {
        node.pulsePhase -= _p.TWO_PI;
      }
    }
  }

  /**
   * Create initial connections between nearby nodes
   */
  private createInitialConnections(p: p5): void {
    const density = this.params.connectionDensity;

    for (const node of this.nodes) {
      // Find nearby nodes
      const nearby = this.nodes.filter(n => {
        if (n.id === node.id) return false;
        const dist = Math.abs(n.gridX - node.gridX) + Math.abs(n.gridY - node.gridY);
        return dist <= 4 && dist >= 2; // 2-4 grid units away
      });

      // Sort by distance and connect to closest nodes
      nearby.sort((a, b) => {
        const distA = Math.abs(a.gridX - node.gridX) + Math.abs(a.gridY - node.gridY);
        const distB = Math.abs(b.gridX - node.gridX) + Math.abs(b.gridY - node.gridY);
        return distA - distB;
      });

      for (const target of nearby) {
        if (p.random() > density) continue;

        // Check if connection already exists
        if (node.connections.includes(target.id)) continue;
        if (target.connections.includes(node.id)) continue;

        // Create trace using Manhattan routing
        this.createTrace(node, target);
        node.connections.push(target.id);
        target.connections.push(node.id);

        // Set initial traces to fully grown
        const trace = this.traces[this.traces.length - 1];
        if (trace) {
          trace.progress = 1;
          trace.dataFlow = Math.random();
        }

        // Limit connections per node
        if (node.connections.length >= 4) break;
      }
    }
  }
}
