/**
 * BloodVesselPattern - Blood Vessel Visualization
 *
 * Inspired by Akira movie transformation scene:
 * - Organic branching vessels growing across screen
 * - Pulsating animation (Bass-reactive)
 * - Red/blood color scheme
 * - Recursive branching structure
 * - Vessels grow from center outward
 * - Audio-reactive pulse, growth, and brightness
 * - MIDI Learn for all parameters
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Blood vessel configuration parameters
 */
interface BloodVesselParams {
  // Vessel generation
  vesselCount: number;         // Number of initial main vessels (1-50)
  branchProbability: number;   // Probability of branching (0.1-0.9)
  maxBranchDepth: number;      // Maximum branch depth (2-6)
  maxVessels: number;          // Maximum total vessels (beat-spawned) (10-200)

  // Vessel appearance
  baseThickness: number;       // Base thickness (2-30)
  growthSpeed: number;         // Growth speed (0.001-0.1)

  // Pulse animation
  pulseIntensity: number;      // Pulse intensity (0-1)
  pulseSpeed: number;          // Pulse speed (0.01-0.2)

  // Color
  baseHue: number;             // Base hue (0-360, full color spectrum)
  saturation: number;          // Color saturation (0-100)
  brightness: number;          // Color brightness (0-100)

  // Audio reactivity
  chaosFactor: number;         // Chaos factor (Mid-reactive) (0-1)
  beatThreshold: number;       // Bass level threshold for beat detection (0-1)
  beatCooldown: number;        // Minimum frames between beats (1-30)

  // Background
  backgroundAlpha: number;     // Trail fade speed (0.01-0.5)
}

/**
 * Blood vessel node
 */
interface BloodVessel {
  startPoint: p5.Vector;
  endPoint: p5.Vector;
  controlPoint1: p5.Vector;    // Bezier control point 1
  controlPoint2: p5.Vector;    // Bezier control point 2
  thickness: number;
  growthProgress: number;      // 0-1
  pulsePhase: number;
  branches: BloodVessel[];
  level: number;
  maxAge: number;
  age: number;
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'BloodVesselPattern',
  description: 'Blood vessel visualization inspired by Akira transformation scene',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: BloodVesselParams = {
  vesselCount: 15,
  branchProbability: 0.4,
  maxBranchDepth: 4,
  maxVessels: 100,
  baseThickness: 8,
  growthSpeed: 0.01,
  pulseIntensity: 0.5,
  pulseSpeed: 0.05,
  baseHue: 0,                  // Pure red
  saturation: 100,             // Full saturation
  brightness: 60,              // Bright
  chaosFactor: 0.3,
  beatThreshold: 0.5,          // Bass level to trigger beat
  beatCooldown: 10,            // Minimum frames between beats
  backgroundAlpha: 0.05,
};

/**
 * BloodVesselPattern - Blood vessel visualization
 */
export class BloodVesselPattern extends BasePattern {
  protected params: BloodVesselParams;
  protected vessels: BloodVessel[] = [];
  protected time = 0;
  protected isSetup = false;

  // Beat detection
  private bassHistory: number[] = [];
  private readonly bassHistorySize = 5;
  private lastBeatFrame = 0;
  private frameCount = 0;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Get pattern parameters
   */
  getParams(): BloodVesselParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<BloodVesselParams>): void {
    const oldVesselCount = this.params.vesselCount;
    const oldMaxBranchDepth = this.params.maxBranchDepth;

    this.params = { ...this.params, ...params };

    // Reinitialize vessels if count or depth changed
    if (
      params.vesselCount !== undefined && params.vesselCount !== oldVesselCount ||
      params.maxBranchDepth !== undefined && params.maxBranchDepth !== oldMaxBranchDepth
    ) {
      this.needsReinit = true;
    }
  }

  private needsReinit = false;

  /**
   * Get parameter metadata for UI controls and MIDI Learn
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      vesselCount: { min: 1, max: 50, step: 1 },
      branchProbability: { min: 0.1, max: 0.9, step: 0.05 },
      maxBranchDepth: { min: 2, max: 6, step: 1 },
      maxVessels: { min: 10, max: 200, step: 5 },
      baseThickness: { min: 2, max: 30, step: 1 },
      growthSpeed: { min: 0.001, max: 0.1, step: 0.001 },
      pulseIntensity: { min: 0, max: 1, step: 0.01 },
      pulseSpeed: { min: 0.01, max: 0.2, step: 0.01 },
      baseHue: { min: 0, max: 360, step: 1 },
      saturation: { min: 0, max: 100, step: 1 },
      brightness: { min: 0, max: 100, step: 1 },
      chaosFactor: { min: 0, max: 1, step: 0.01 },
      beatThreshold: { min: 0, max: 1, step: 0.05 },
      beatCooldown: { min: 1, max: 30, step: 1 },
      backgroundAlpha: { min: 0.01, max: 1, step: 0.01 },
    };
  }

  /**
   * Get MIDI CC mappings (empty - user sets via MIDI Learn)
   */
  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  /**
   * Setup pattern - initialize vessels
   */
  override setup(p: p5): void {
    this.initializeVessels(p);
    this.isSetup = true;
  }

  /**
   * Initialize blood vessels
   */
  private initializeVessels(p: p5): void {
    this.vessels = [];

    for (let i = 0; i < this.params.vesselCount; i++) {
      const vessel = this.createMainVessel(p);
      this.vessels.push(vessel);
    }
  }

  /**
   * Create a main vessel growing from random position
   */
  private createMainVessel(p: p5): BloodVessel {
    // Random start position across the screen (WEBGL coordinates)
    const halfWidth = p.width / 2;
    const halfHeight = p.height / 2;
    const startPoint = p.createVector(
      p.random(-halfWidth, halfWidth),
      p.random(-halfHeight, halfHeight)
    );

    // Random direction
    const angle = p.random(p.TWO_PI);
    const dir = p5.Vector.fromAngle(angle);
    const length = p.random(150, 300);
    const endPoint = p5.Vector.add(startPoint, dir.mult(length));

    // Control points for organic curve
    const controlPoint1 = p5.Vector.lerp(startPoint, endPoint, 0.25)
      .add(p.createVector(p.random(-50, 50), p.random(-50, 50)));
    const controlPoint2 = p5.Vector.lerp(startPoint, endPoint, 0.75)
      .add(p.createVector(p.random(-50, 50), p.random(-50, 50)));

    return {
      startPoint,
      endPoint,
      controlPoint1,
      controlPoint2,
      thickness: this.params.baseThickness,
      growthProgress: 0,
      pulsePhase: p.random(p.TWO_PI),
      branches: [],
      level: 0,
      maxAge: 1000,
      age: 0,
    };
  }

  /**
   * Create a branch vessel
   */
  private createBranchVessel(
    p: p5,
    parent: BloodVessel,
    progress: number
  ): BloodVessel | null {
    if (parent.level >= this.params.maxBranchDepth - 1) {
      return null;
    }

    // Calculate position on parent curve at progress
    const t = progress;
    const invT = 1 - t;
    const pos = p.createVector(
      Math.pow(invT, 3) * parent.startPoint.x +
        3 * Math.pow(invT, 2) * t * parent.controlPoint1.x +
        3 * invT * Math.pow(t, 2) * parent.controlPoint2.x +
        Math.pow(t, 3) * parent.endPoint.x,
      Math.pow(invT, 3) * parent.startPoint.y +
        3 * Math.pow(invT, 2) * t * parent.controlPoint1.y +
        3 * invT * Math.pow(t, 2) * parent.controlPoint2.y +
        Math.pow(t, 3) * parent.endPoint.y
    );

    // Branch direction (perpendicular to parent direction at this point)
    const tangent = p.createVector(
      3 * Math.pow(invT, 2) * (parent.controlPoint1.x - parent.startPoint.x) +
        6 * invT * t * (parent.controlPoint2.x - parent.controlPoint1.x) +
        3 * Math.pow(t, 2) * (parent.endPoint.x - parent.controlPoint2.x),
      3 * Math.pow(invT, 2) * (parent.controlPoint1.y - parent.startPoint.y) +
        6 * invT * t * (parent.controlPoint2.y - parent.controlPoint1.y) +
        3 * Math.pow(t, 2) * (parent.endPoint.y - parent.controlPoint2.y)
    ).normalize();

    // Branch angle (perpendicular with some randomness)
    const angle = Math.atan2(tangent.y, tangent.x) + p.random(-p.HALF_PI * 0.8, p.HALF_PI * 0.8);
    const branchDir = p5.Vector.fromAngle(angle);
    const branchLength = parent.endPoint.dist(parent.startPoint) * p.random(0.4, 0.8);
    const endPoint = p5.Vector.add(pos, branchDir.mult(branchLength));

    // Control points
    const controlPoint1 = p5.Vector.lerp(pos, endPoint, 0.25)
      .add(p.createVector(p.random(-30, 30), p.random(-30, 30)));
    const controlPoint2 = p5.Vector.lerp(pos, endPoint, 0.75)
      .add(p.createVector(p.random(-30, 30), p.random(-30, 30)));

    return {
      startPoint: pos,
      endPoint,
      controlPoint1,
      controlPoint2,
      thickness: parent.thickness * 0.7,
      growthProgress: 0,
      pulsePhase: parent.pulsePhase + p.random(0, p.PI),
      branches: [],
      level: parent.level + 1,
      maxAge: 800,
      age: 0,
    };
  }

  /**
   * Update pattern with audio reactivity
   */
  override update(p: p5, context: PatternContext): void {
    // Reinitialize if needed
    if (this.needsReinit) {
      this.initializeVessels(p);
      this.needsReinit = false;
    }

    this.frameCount++;

    // Get audio bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time
    this.time += this.params.pulseSpeed;

    // Beat detection - spawn new vessels on bass peaks
    this.detectBeatAndSpawn(p, bassLevel);

    // Update all vessels
    this.updateVessels(p, bassLevel, midLevel, trebleLevel);
  }

  /**
   * Detect bass peaks and spawn new vessels on beats
   */
  private detectBeatAndSpawn(p: p5, bassLevel: number): void {
    // Update bass history
    this.bassHistory.push(bassLevel);
    if (this.bassHistory.length > this.bassHistorySize) {
      this.bassHistory.shift();
    }

    // Check cooldown
    const framesSinceLastBeat = this.frameCount - this.lastBeatFrame;
    if (framesSinceLastBeat < this.params.beatCooldown) {
      return;
    }

    // Check for beat: bass above threshold AND it's a local peak
    if (bassLevel >= this.params.beatThreshold) {
      const isPeak = this.bassHistory.every(level => level <= bassLevel);
      if (isPeak && this.bassHistory.length >= this.bassHistorySize) {
        // Beat detected!
        this.lastBeatFrame = this.frameCount;
        this.spawnVesselOnBeat(p);
      }
    }
  }

  /**
   * Spawn a new vessel on beat
   */
  private spawnVesselOnBeat(p: p5): void {
    // Count total vessels (including branches)
    const totalVessels = this.countVessels(this.vessels);

    if (totalVessels < this.params.maxVessels) {
      const newVessel = this.createMainVessel(p);
      this.vessels.push(newVessel);
    } else {
      // Remove oldest main vessel and replace it
      this.vessels.shift();
      const newVessel = this.createMainVessel(p);
      this.vessels.push(newVessel);
    }
  }

  /**
   * Recursively count all vessels
   */
  private countVessels(vessels: BloodVessel[]): number {
    let count = vessels.length;
    for (const vessel of vessels) {
      count += this.countVessels(vessel.branches);
    }
    return count;
  }

  /**
   * Update vessels with growth and branching
   */
  private updateVessels(
    p: p5,
    bassLevel: number,
    midLevel: number,
    trebleLevel: number
  ): void {
    const growthMult = 1 + midLevel * 3; // Mid affects growth speed
    const chaosMult = 1 + midLevel * this.params.chaosFactor * 2;

    for (const vessel of this.vessels) {
      this.updateVesselRecursive(p, vessel, bassLevel, midLevel, trebleLevel, growthMult, chaosMult);
    }
  }

  /**
   * Recursively update a vessel and its branches
   */
  private updateVesselRecursive(
    p: p5,
    vessel: BloodVessel,
    bassLevel: number,
    midLevel: number,
    trebleLevel: number,
    growthMult: number,
    chaosMult: number
  ): void {
    // Grow vessel
    if (vessel.growthProgress < 1) {
      vessel.growthProgress += this.params.growthSpeed * growthMult;
      if (vessel.growthProgress > 1) vessel.growthProgress = 1;
    }

    // Age vessel
    vessel.age++;

    // Create branches as vessel grows
    if (vessel.growthProgress > 0.3 && vessel.branches.length === 0 && p.random() < this.params.branchProbability * chaosMult) {
      const numBranches = Math.floor(p.random(1, 4));
      for (let i = 0; i < numBranches; i++) {
        const branchProgress = p.random(0.3, 0.8);
        const branch = this.createBranchVessel(p, vessel, branchProgress);
        if (branch) {
          vessel.branches.push(branch);
        }
      }
    }

    // Update branches
    for (const branch of vessel.branches) {
      this.updateVesselRecursive(p, branch, bassLevel, midLevel, trebleLevel, growthMult, chaosMult);
    }

    // Respawn old vessels (recursive cleanup)
    if (vessel.age > vessel.maxAge) {
      vessel.growthProgress = 0;
      vessel.age = 0;
      vessel.branches = [];
      // Randomize direction
      const angle = p.random(p.TWO_PI);
      const dir = p5.Vector.fromAngle(angle);
      const length = p.random(200, 400);
      vessel.endPoint = dir.mult(length);
      vessel.controlPoint1 = p5.Vector.lerp(vessel.startPoint, vessel.endPoint, 0.25)
        .add(p.createVector(p.random(-50, 50), p.random(-50, 50)));
      vessel.controlPoint2 = p5.Vector.lerp(vessel.startPoint, vessel.endPoint, 0.75)
        .add(p.createVector(p.random(-50, 50), p.random(-50, 50)));
      vessel.pulsePhase = p.random(p.TWO_PI);
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Additive blending for glowing effect
    p.blendMode(p.ADD);

    // Draw all vessels
    this.drawVessels(p);

    p.pop();
  }

  /**
   * Draw background with trail fade
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else {
      // Dark background with trail fade
      p.background(0, this.params.backgroundAlpha * 255);
    }
  }

  /**
   * Draw all vessels
   */
  private drawVessels(p: p5): void {
    for (const vessel of this.vessels) {
      this.drawVesselRecursive(p, vessel);
    }
  }

  /**
   * Recursively draw a vessel and its branches
   */
  private drawVesselRecursive(p: p5, vessel: BloodVessel): void {
    if (vessel.growthProgress <= 0) return;

    // Calculate current end point based on growth
    const t = vessel.growthProgress;
    const currentEndPoint = p.createVector(
      this.bezierPoint(vessel.startPoint.x, vessel.controlPoint1.x, vessel.controlPoint2.x, vessel.endPoint.x, t),
      this.bezierPoint(vessel.startPoint.y, vessel.controlPoint1.y, vessel.controlPoint2.y, vessel.endPoint.y, t)
    );

    // Pulse effect on thickness
    const pulse = Math.sin(this.time * 2 + vessel.pulsePhase);
    const pulseThickness = vessel.thickness * (1 + pulse * this.params.pulseIntensity);

    // Color based on level and baseHue (use params for saturation/brightness)
    const hue = (this.params.baseHue + vessel.level * 5) % 360;
    const saturation = this.params.saturation;
    // Brightness decreases slightly for deeper branches
    const brightnessDimming = this.map(vessel.level, 0, this.params.maxBranchDepth, 0, 20);
    const brightness = Math.max(10, this.params.brightness - brightnessDimming);

    p.colorMode(p.HSL);
    p.stroke(hue, saturation, brightness, 0.95);
    p.colorMode(p.RGB);
    p.noFill();

    // Draw vessel with multiple layers for thickness effect
    const layers = Math.max(1, Math.floor(pulseThickness / 2));
    for (let i = 0; i < layers; i++) {
      const layerThickness = pulseThickness / layers;
      p.strokeWeight(layerThickness);

      // Slightly offset each layer
      const offset = (i - layers / 2) * 0.5;
      p.stroke(
        hue + offset * 5,
        saturation,
        brightness - offset * 2,
        0.95
      );
      p.colorMode(p.HSL);
      p.bezier(
        vessel.startPoint.x, vessel.startPoint.y,
        vessel.controlPoint1.x + offset, vessel.controlPoint1.y + offset,
        vessel.controlPoint2.x + offset, vessel.controlPoint2.y + offset,
        currentEndPoint.x, currentEndPoint.y
      );
      p.colorMode(p.RGB);
    }

    // Draw branches
    for (const branch of vessel.branches) {
      this.drawVesselRecursive(p, branch);
    }
  }

  /**
   * Helper: Calculate point on cubic bezier curve
   */
  private bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const invT = 1 - t;
    return (
      Math.pow(invT, 3) * p0 +
      3 * Math.pow(invT, 2) * t * p1 +
      3 * invT * Math.pow(t, 2) * p2 +
      Math.pow(t, 3) * p3
    );
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.vessels = [];
    this.isSetup = false;
  }

  /**
   * Handle canvas resize
   */
  override resize(p: p5): void {
    this.initializeVessels(p);
  }
}
