/**
 * GargantuaPattern - Interstellar-style Black Hole Visualization
 *
 * Inspired by the Gargantua black hole from the movie Interstellar:
 * - Accretion disk with rotating plasma
 * - Photon ring (bright thin ring)
 * - Gravitational lensing effect
 * - Orange/gold/red color spectrum
 * - Doppler beaming (one side brighter)
 * - Audio-reactive parameters
 * - MIDI control for parameters
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Gargantua pattern configuration parameters
 */
interface GargantuaParams {
  diskRadius: number;         // Accretion disk radius (50-200)
  diskThickness: number;      // Accretion disk thickness (1-10)
  diskRotationSpeed: number;  // Disk rotation speed (0-1)
  colorTemperature: number;   // Color temperature (0-1, cool to hot)
  lensingIntensity: number;   // Gravitational lensing intensity (0-1)
  photonRingIntensity: number;// Photon ring brightness (0-1)
  dopplerRatio: number;       // Doppler beaming ratio (0-1, asymmetry)
  particleCount: number;      // Number of particles (50-500)
  backgroundColor: {
    r: number;
    g: number;
    b: number;
  };
  backgroundAlpha: number;
}

/**
 * Particle data structure for plasma flow
 */
interface PlasmaParticle {
  angle: number;              // Angle in disk (0-2PI)
  radius: number;             // Distance from center
  y: number;                  // Fixed Y position (thickness offset)
  speed: number;              // Orbital speed
  brightness: number;         // Particle brightness
  size: number;               // Particle size
  color: p5.Color;            // Particle color
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'GargantuaPattern',
  description: 'Interstellar-style black hole with accretion disk',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: GargantuaParams = {
  diskRadius: 120,
  diskThickness: 3,
  diskRotationSpeed: 0.3,
  colorTemperature: 0.5,
  lensingIntensity: 0.6,
  photonRingIntensity: 0.8,
  dopplerRatio: 0.4,
  particleCount: 200,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 0.9,
};

/**
 * Black hole core radius
 */
const BLACK_HOLE_CORE_RADIUS = 8;

/**
 * Photon ring radius (slightly larger than event horizon)
 */
const PHOTON_RING_RADIUS = 30;

/**
 * Minimum accretion disk radius (starts outside photon ring)
 */
const MIN_DISK_RADIUS = 40;

/**
 * GargantuaPattern - Interstellar-style visualization
 */
export class GargantuaPattern extends BasePattern {
  protected params: GargantuaParams;
  protected particles: PlasmaParticle[] = [];
  protected diskRotation: number = 0;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Get pattern parameters for Leva controls
   */
  getParams(): GargantuaParams {
    return {
      diskRadius: this.params.diskRadius,
      diskThickness: this.params.diskThickness,
      diskRotationSpeed: this.params.diskRotationSpeed,
      colorTemperature: this.params.colorTemperature,
      lensingIntensity: this.params.lensingIntensity,
      photonRingIntensity: this.params.photonRingIntensity,
      dopplerRatio: this.params.dopplerRatio,
      particleCount: this.params.particleCount,
      backgroundColor: this.params.backgroundColor,
      backgroundAlpha: this.params.backgroundAlpha,
    };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<GargantuaParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Get parameter metadata for UI controls
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      diskRadius: { min: 10, max: 500, step: 1 },
      diskThickness: { min: 1, max: 1000, step: 1 },
      diskRotationSpeed: { min: -1, max: 1, step: 0.01 },
      colorTemperature: { min: 0, max: 1, step: 0.01 },
      lensingIntensity: { min: 0, max: 10, step: 0.01 },
      photonRingIntensity: { min: 0, max: 1, step: 0.01 },
      dopplerRatio: { min: 0, max: 1, step: 0.01 },
      particleCount: { min: 1, max: 2000, step: 1 },
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
        parameterPath: 'diskRadius',
        min: 50,
        max: 200,
        currentValue: this.params.diskRadius,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'diskThickness',
        min: 1,
        max: 10,
        currentValue: this.params.diskThickness,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'colorTemperature',
        min: 0,
        max: 1,
        currentValue: this.params.colorTemperature,
      },
      {
        channel: 0,
        ccNumber: 4,
        parameterPath: 'lensingIntensity',
        min: 0,
        max: 1,
        currentValue: this.params.lensingIntensity,
      },
      {
        channel: 0,
        ccNumber: 5,
        parameterPath: 'photonRingIntensity',
        min: 0,
        max: 1,
        currentValue: this.params.photonRingIntensity,
      },
    ];
  }

  /**
   * Setup pattern - initialize particles and 3D environment
   */
  override setup(p: p5): void {
    this.initializeParticles(p);
    this.isSetup = true;
  }

  /**
   * Initialize plasma particles
   */
  private initializeParticles(p: p5): void {
    this.particles = [];

    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push(this.createPlasmaParticle(p));
    }
  }

  /**
   * Create a single plasma particle
   */
  private createPlasmaParticle(p: p5): PlasmaParticle {
    // Random angle
    const angle = p.random(Math.PI * 2);

    // Random radius in accretion disk (with concentration near inner edge)
    const radiusBias = Math.pow(p.random(), 2); // Bias toward inner edge
    const radius = MIN_DISK_RADIUS + radiusBias * (this.params.diskRadius - MIN_DISK_RADIUS);

    // Fixed Y position for thickness (distributed evenly across disk thickness)
    const y = (p.random() - 0.5) * this.params.diskThickness * 2;

    // Orbital speed (faster near center, Keplerian-ish)
    const speed = 0.5 + (1 - radiusBias) * 1.5;

    // Brightness varies
    const brightness = p.random(0.5, 1);

    // Size varies - made larger for visibility
    const size = p.random(3, 8);

    // Color will be calculated during draw
    const color = p.color(255, 150, 50);

    return { angle, radius, y, speed, brightness, size, color };
  }

  /**
   * Update particle physics based on audio and MIDI data
   */
  override update(p: p5, context: PatternContext): void {
    // Get audio-reactive parameters
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');
    const volumeLevel = context.audio.level;

    // Get MIDI overrides
    const midiDiskRadius = this.getCCValue(context.midi, 0, 1, this.params.diskRadius);
    const midiThickness = this.getCCValue(context.midi, 0, 2, this.params.diskThickness);
    const midiTemperature = this.getCCValue(context.midi, 0, 3, this.params.colorTemperature);
    const midiLensing = this.getCCValue(context.midi, 0, 4, this.params.lensingIntensity);
    const midiPhotonRing = this.getCCValue(context.midi, 0, 5, this.params.photonRingIntensity);

    // Audio reactivity: Bass slightly increases rotation speed (smooth) and thickness
    // Reduced rotation variation for smoothness: 0.8x to 1.2x instead of 0.5x to 3.5x
    const audioRotationSpeed = this.params.diskRotationSpeed * (0.8 + bassLevel * 0.4);
    const audioThickness = midiThickness * (0.5 + bassLevel * 2);

    // Audio reactivity: Volume affects disk radius
    const audioDiskRadius = midiDiskRadius * (0.8 + volumeLevel * 0.5);

    // Audio reactivity: Mid affects color temperature
    const audioTemperature = midiTemperature * (0.5 + midLevel);

    // Audio reactivity: Treble affects photon ring
    const audioPhotonRing = midiPhotonRing * (0.5 + trebleLevel * 2);

    // Update disk rotation
    this.diskRotation += audioRotationSpeed * 0.02;

    // Update particle count based on volume
    const targetParticleCount = Math.floor(this.params.particleCount * (0.5 + volumeLevel * 2));
    this.adjustParticleCount(p, targetParticleCount);

    // Update particles
    for (const particle of this.particles) {
      this.updatePlasmaParticle(p, particle, audioRotationSpeed);
    }

    // Store audio-reactive values for drawing
    (this as any).audioValues = {
      diskRadius: audioDiskRadius,
      thickness: audioThickness,
      temperature: audioTemperature,
      lensing: midiLensing,
      photonRing: audioPhotonRing,
      bassLevel,
      midLevel,
      trebleLevel,
      volumeLevel,
    };
  }

  /**
   * Adjust particle count
   */
  private adjustParticleCount(p: p5, targetCount: number): void {
    const currentCount = this.particles.length;

    if (currentCount < targetCount) {
      for (let i = 0; i < targetCount - currentCount; i++) {
        this.particles.push(this.createPlasmaParticle(p));
      }
    } else if (currentCount > targetCount) {
      this.particles.splice(targetCount);
    }
  }

  /**
   * Update single plasma particle
   */
  private updatePlasmaParticle(_p: p5, particle: PlasmaParticle, rotationSpeed: number): void {
    // Update angle (orbital motion)
    particle.angle += particle.speed * rotationSpeed * 0.01;

    // Keep angle in 0-2PI range
    if (particle.angle > Math.PI * 2) {
      particle.angle -= Math.PI * 2;
    }
  }

  /**
   * Get color based on temperature and position
   */
  private getAccretionColor(p: p5, radius: number, temperature: number, dopplerFactor: number): p5.Color {
    // Normalize radius (0 at inner edge, 1 at outer edge)
    const normalizedRadius = (radius - MIN_DISK_RADIUS) / (this.params.diskRadius - MIN_DISK_RADIUS);

    // Base color from temperature (0 = cool/red, 1 = hot/white-yellow)
    const tempR = this.map(temperature, 0, 1, 200, 255);
    const tempG = this.map(temperature, 0, 1, 50, 255);
    const tempB = this.map(temperature, 0, 1, 0, 200);

    // Hotter near inner edge (gravitational potential energy)
    const heatFactor = 1 - normalizedRadius; // 1 at inner, 0 at outer
    const heatR = heatFactor * 55;
    const heatG = heatFactor * 205;
    const heatB = heatFactor * 200;

    // Doppler beaming effect (one side brighter/bluer)
    const dopplerR = dopplerFactor * 30;
    const dopplerG = dopplerFactor * 50;
    const dopplerB = dopplerFactor * 100;

    // Combine all color components
    const r = this.clamp(tempR + heatR + dopplerR, 0, 255);
    const g = this.clamp(tempG + heatG + dopplerG, 0, 255);
    const b = this.clamp(tempB + heatB + dopplerB, 0, 255);

    return p.color(r, g, b, 200);
  }

  /**
   * Draw the Gargantua pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    // Debug log (once per 100 frames)
    if (Math.random() < 0.01) {
      console.log('[GargantuaPattern] Drawing', {
        particleCount: this.particles.length,
        diskRadius: this.params.diskRadius,
        config: this.config.name,
      });
    }

    // Draw background
    this.drawBackground(p, options);

    const audioValues = (this as any).audioValues || {
      diskRadius: this.params.diskRadius,
      thickness: this.params.diskThickness,
      temperature: this.params.colorTemperature,
      lensing: this.params.lensingIntensity,
      photonRing: this.params.photonRingIntensity,
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
      volumeLevel: 0,
    };

    p.push();

    // Set up camera angle (tilted to see disk from side)
    p.rotateX(Math.PI * 0.35); // Tilt about 63 degrees for better disk visibility

    // Draw in back-to-front order for proper layering
    // 1. Gravitational lensing (back of disk bent over/under)
    this.drawGravitationalLensing(p, audioValues);

    // 2. Accretion disk (back half)
    this.drawAccretionDiskHalf(p, audioValues, false); // Back

    // 3. Photon ring
    this.drawPhotonRing(p, audioValues);

    // 4. Event horizon (black sphere)
    this.drawEventHorizon(p);

    // 5. Accretion disk (front half)
    this.drawAccretionDiskHalf(p, audioValues, true); // Front

    p.pop();
  }

  /**
   * Draw gravitational lensing effect
   * Uses actual disk particles to create the bent "Einstein ring" effect
   */
  private drawGravitationalLensing(p: p5, audioValues: any): void {
    if (audioValues.lensing < 0.1) return;

    const intensity = audioValues.lensing;

    p.push();
    p.noStroke();

    // Use actual disk particles to create lensed effect
    // Only particles on the "back" side (z < 0) get lensed
    for (const particle of this.particles) {
      const zPos = Math.cos(particle.angle + this.diskRotation) * particle.radius;

      // Only lens the back side of the disk
      if (zPos >= 0) continue;

      // Calculate how far from center (for distortion amount)
      const distFromCenter = Math.sqrt(particle.radius * particle.radius + particle.y * particle.y);
      const normalizedDist = distFromCenter / this.params.diskRadius; // 0 to 1

      // Lensing distortion: particles further from center get bent more
      const distortionAmount = intensity * Math.pow(normalizedDist, 1.5);

      // Determine which way to bend (up or down) based on Y position
      const bendDirection = particle.y >= 0 ? 1 : -1;
      const yOffset = bendDirection * distortionAmount * 50 * intensity;

      // Calculate position with rotation
      const x = Math.sin(particle.angle + this.diskRotation) * particle.radius;
      const y = particle.y + yOffset;
      const z = zPos;

      // Get color (slightly dimmed for lensed version)
      const color = this.getAccretionColor(p, particle.radius, audioValues.temperature, 0.2);

      // Draw lensed particle
      const alpha = particle.brightness * 120 * intensity;
      p.fill(p.red(color), p.green(color), p.blue(color), alpha);
      p.push();
      p.translate(x, y, z);
      p.sphere(particle.size * 0.8); // Slightly smaller
      p.pop();
    }

    p.pop();
  }

  /**
   * Draw accretion disk (one half at a time for proper layering)
   */
  private drawAccretionDiskHalf(p: p5, audioValues: any, front: boolean): void {
    p.push();
    p.noStroke();

    // Draw plasma particles
    for (const particle of this.particles) {
      // Check if this particle is in front or back
      const zPos = Math.cos(particle.angle) * particle.radius;
      const isParticleInFront = zPos > 0;

      if (isParticleInFront !== front) continue;

      // Doppler beaming: approaching side is brighter
      const dopplerFactor = (Math.sin(particle.angle + this.diskRotation) + 1) / 2; // 0 to 1
      const dopplerBrightness = 0.7 + dopplerFactor * this.params.dopplerRatio;

      // Calculate position
      const x = Math.sin(particle.angle + this.diskRotation) * particle.radius;
      const y = particle.y; // Use fixed Y position (no flickering)
      const z = zPos;

      // Get color
      const color = this.getAccretionColor(p, particle.radius, audioValues.temperature, dopplerFactor * this.params.dopplerRatio);

      // Draw particle
      const alpha = particle.brightness * dopplerBrightness * 180;
      p.fill(p.red(color), p.green(color), p.blue(color), alpha);
      p.push();
      p.translate(x, y, z);
      p.sphere(particle.size);
      p.pop();
    }

    p.pop();
  }

  /**
   * Draw photon ring (bright thin ring around event horizon)
   */
  private drawPhotonRing(p: p5, audioValues: any): void {
    const intensity = audioValues.photonRing;

    p.push();
    p.noStroke();
    p.rotateX(Math.PI / 2); // Lay flat

    // Multiple thin rings for glow effect
    for (let i = 0; i < 3; i++) {
      const ringRadius = PHOTON_RING_RADIUS + i * 0.5;
      const ringAlpha = intensity * (1 - i * 0.3) * 200;

      // Bright white-yellow color
      p.fill(255, 240, 200, ringAlpha);
      p.torus(ringRadius, 0.5 + i * 0.3);
    }

    p.pop();
  }

  /**
   * Draw event horizon (black sphere)
   */
  private drawEventHorizon(p: p5): void {
    p.push();
    p.noStroke();
    p.noLights();
    p.emissiveMaterial(0); // Pure black
    p.sphere(BLACK_HOLE_CORE_RADIUS);
    p.lights();
    p.pop();
  }

  /**
   * Draw background
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    const { r, g, b } = this.params.backgroundColor;

    if (options.clearBackground) {
      p.clear();
    } else {
      const alpha = this.params.backgroundAlpha;

      if (alpha >= 1.0) {
        p.background(r, g, b);
      } else {
        p.background(r, g, b, alpha * 255);
      }
    }
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.particles = [];
    this.diskRotation = 0;
    this.isSetup = false;
  }

  /**
   * Handle canvas resize
   */
  override resize(_p: p5, _width: number, _height: number): void {
    // No resize handling needed for this pattern
  }
}
