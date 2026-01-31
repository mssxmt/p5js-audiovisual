/**
 * BlackHolePattern - 3D Black Hole Visualization
 *
 * A physics-based particle simulation featuring:
 * - Gravitational attraction towards a central black hole
 * - Event horizon visualization
 * - Perlin noise-based spatial distortion
 * - Beautiful light trails
 * - Audio-reactive gravity and particle behavior
 * - MIDI control for parameters
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Black hole pattern configuration parameters
 */
interface BlackHoleParams {
  gravity: number;        // Gravitational constant (0-1)
  noiseIntensity: number; // Perlin noise intensity (0-1)
  particleCount: number;  // Number of particles (50-500)
  trailAlpha: number;     // Trail opacity (0-1)
  trailLength: number;    // Particle trail length (0-50)
  backgroundColor: {      // Background color (RGB)
    r: number;            // Red (0-255)
    g: number;            // Green (0-255)
    b: number;            // Blue (0-255)
  };
  backgroundAlpha: number; // Background fade opacity (0.02-1, lower = longer trails)
}

/**
 * Particle data structure
 */
interface Particle {
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  mass: number;
  color: p5.Color;
  history: p5.Vector[];    // Position history for trail effect
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'BlackHolePattern',
  description: '3D black hole visualization with gravitational physics',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: BlackHoleParams = {
  gravity: 0.5,
  noiseIntensity: 0.3,
  particleCount: 200,
  trailAlpha: 0.15,
  trailLength: 20,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 0.8,
};

/**
 * Black hole event horizon radius
 */
const EVENT_HORIZON_RADIUS = 25;

/**
 * Black hole core radius (visible dark center)
 */
const BLACK_HOLE_CORE_RADIUS = 8;

/**
 * Maximum particle velocity
 */
const MAX_VELOCITY = 8;

/**
 * Spawn radius for new particles
 */
const SPAWN_RADIUS = 200;

/**
 * Minimum spawn radius (to avoid spawning inside black hole)
 */
const MIN_SPAWN_RADIUS = 50;

/**
 * BlackHolePattern - 3D gravitational visualization
 */
export class BlackHolePattern extends BasePattern {
  protected params: BlackHoleParams;
  protected particles: Particle[] = [];
  protected center: p5.Vector | null = null;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Get pattern parameters for Leva controls
   */
  getParams(): BlackHoleParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<BlackHoleParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Get MIDI CC mappings for this pattern
   * Returns array of mappings defining which CC controls which parameters
   */
  getMidiMappings(): MidiCCMapping[] {
    return [
      {
        channel: 0,
        ccNumber: 1,
        parameterPath: 'gravity',
        min: 0,
        max: 1,
        currentValue: this.params.gravity,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'noiseIntensity',
        min: 0,
        max: 1,
        currentValue: this.params.noiseIntensity,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'particleCount',
        min: 50,
        max: 500,
        currentValue: this.params.particleCount,
      },
    ];
  }

  /**
   * Setup pattern - initialize particles and 3D environment
   */
  override setup(p: p5): void {
    this.center = p.createVector(0, 0, 0); // Black hole at origin (relative to canvas center)
    this.initializeParticles(p);
    this.isSetup = true;
  }

  /**
   * Generate a random 3D unit vector (uniform distribution on sphere)
   */
  private random3D(p: p5): p5.Vector {
    const theta = p.random(Math.PI * 2);
    const phi = Math.acos(p.random(-1, 1));
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    return p.createVector(x, y, z);
  }

  /**
   * Initialize particles with random positions and velocities
   */
  private initializeParticles(p: p5): void {
    this.particles = [];

    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push(this.createParticle(p));
    }
  }

  /**
   * Create a single particle with random properties
   */
  private createParticle(p: p5): Particle {
    // Random position in spherical shell (using random3D helper)
    // Position is relative to black hole center (0, 0, 0)
    const pos = this.random3D(p).mult(
      p.random(MIN_SPAWN_RADIUS, SPAWN_RADIUS)
    );

    // Initial velocity (tangential for orbit-like motion)
    const vel = p.createVector(
      p.random(-1, 1),
      p.random(-1, 1),
      p.random(-1, 1)
    ).normalize().mult(p.random(0.5, 2));

    // Acceleration
    const acc = p.createVector(0, 0, 0);

    // Mass (random variation)
    const mass = p.random(0.5, 2);

    // Color based on mass (lighter = hotter = more massive)
    const hue = p.map(mass, 0.5, 2, 200, 280); // Blue to purple
    const color = p.color(
      p.map(hue, 200, 280, 100, 180),  // R
      p.map(hue, 200, 280, 150, 50),   // G
      255,                              // B
      200                               // A
    );

    const particle = { pos, vel, acc, mass, color, history: [] };
    // Initialize audio levels for new particles
    (particle as any).audioLevels = {
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
      volumeLevel: 0,
    };

    return particle;
  }

  /**
   * Update particle physics based on audio and MIDI data
   */
  override update(p: p5, context: PatternContext): void {
    if (!this.center) {
      return;
    }

    // Get audio-reactive parameters
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');
    const volumeLevel = context.audio.level;

    // Get MIDI overrides (if available)
    const midiGravity = this.getCCValue(context.midi, 0, 1, this.params.gravity);
    const midiNoise = this.getCCValue(context.midi, 0, 2, this.params.noiseIntensity);
    const midiParticleCount = this.getCCValue(context.midi, 0, 3, -1);

    // Apply audio reactivity to gravity (bass strongly increases gravity)
    // Bass causes particles to be sucked into black hole more aggressively
    const audioGravity = midiGravity * (0.3 + bassLevel * 4);

    // Apply audio reactivity to noise (all bands increase chaos)
    // Audio makes particles more chaotic and unpredictable
    const audioNoise = midiNoise * (0.5 + volumeLevel * 5);

    // Apply audio reactivity to particle speed (treble increases speed)
    const speedMultiplier = 0.5 + trebleLevel * 5;

    // Apply audio reactivity to particle count (volume increases count)
    const targetParticleCount = midiParticleCount >= 0
      ? Math.floor(this.map(midiParticleCount, 0, 1, 50, 500))
      : Math.floor(this.params.particleCount * (0.3 + volumeLevel * 3));

    // Adjust particle count
    this.adjustParticleCount(p, targetParticleCount);

    // Update each particle with audio data
    for (const particle of this.particles) {
      this.updateParticle(p, particle, audioGravity, audioNoise, speedMultiplier, context, {
        bassLevel,
        midLevel,
        trebleLevel,
        volumeLevel,
      });
    }
  }

  /**
   * Adjust particle count to match target
   */
  private adjustParticleCount(p: p5, targetCount: number): void {
    const currentCount = this.particles.length;

    if (currentCount < targetCount) {
      // Add particles
      for (let i = 0; i < targetCount - currentCount; i++) {
        this.particles.push(this.createParticle(p));
      }
    } else if (currentCount > targetCount) {
      // Remove particles
      this.particles.splice(targetCount);
    }
  }

  /**
   * Update single particle physics
   */
  private updateParticle(
    p: p5,
    particle: Particle,
    gravity: number,
    noiseIntensity: number,
    speedMultiplier: number,
    context: PatternContext,
    audioLevels: {
      bassLevel: number;
      midLevel: number;
      trebleLevel: number;
      volumeLevel: number;
    }
  ): void {
    // Reset acceleration
    particle.acc.set(0, 0, 0);

    // Calculate gravitational force towards center
    const force = this.calculateGravity(p, particle.pos, gravity);

    // Apply Perlin noise for spatial distortion
    const noise = this.calculateNoise(p, particle.pos, noiseIntensity, context);

    // Apply forces
    particle.acc.add(force);
    particle.acc.add(noise);

    // Update velocity
    particle.vel.add(particle.acc);
    particle.vel.mult(speedMultiplier);
    particle.vel.limit(MAX_VELOCITY * 2); // Increase max velocity with audio

    // Store current position in history before updating
    particle.history.push(particle.pos.copy());

    // Limit history length based on trailLength parameter
    const maxHistory = Math.max(0, Math.floor(this.params.trailLength));
    if (particle.history.length > maxHistory) {
      particle.history.shift(); // Remove oldest position
    }

    // Update position
    particle.pos.add(particle.vel);

    // Store audio data on particle for drawing
    (particle as any).audioLevels = audioLevels;

    // Check if particle crossed event horizon
    if (particle.pos.mag() < EVENT_HORIZON_RADIUS) {
      this.respawnParticle(p, particle);
    }

    // Check if particle escaped too far
    if (particle.pos.mag() > SPAWN_RADIUS * 2) {
      this.respawnParticle(p, particle);
    }
  }

  /**
   * Calculate gravitational force towards center
   * F = G * m1 * m2 / r^2
   */
  private calculateGravity(_p: p5, pos: p5.Vector, gravityConstant: number): p5.Vector {
    const G = gravityConstant * 0.5; // Scale down for reasonable values
    const blackHoleMass = 1000;

    // Direction towards center (negative of position)
    const dir = pos.copy().normalize().mult(-1);

    // Distance squared
    const distSq = pos.magSq();

    // Avoid division by zero and limit minimum distance
    const safeDistSq = Math.max(distSq, EVENT_HORIZON_RADIUS * EVENT_HORIZON_RADIUS);

    // Calculate force magnitude
    const forceMag = (G * blackHoleMass * 1) / safeDistSq;

    // Apply force
    return dir.mult(forceMag);
  }

  /**
   * Calculate Perlin noise-based force
   */
  private calculateNoise(
    p: p5,
    pos: p5.Vector,
    intensity: number,
    context: PatternContext
  ): p5.Vector {
    const noiseScale = 0.01;
    const timeOffset = context.midi.clock * 0.001;

    const nX = p.noise(pos.x * noiseScale, pos.y * noiseScale, pos.z * noiseScale + timeOffset);
    const nY = p.noise(pos.y * noiseScale, pos.z * noiseScale, pos.x * noiseScale + timeOffset);
    const nZ = p.noise(pos.z * noiseScale, pos.x * noiseScale, pos.y * noiseScale + timeOffset);

    return p.createVector(
      (nX - 0.5) * 2 * intensity,
      (nY - 0.5) * 2 * intensity,
      (nZ - 0.5) * 2 * intensity
    );
  }

  /**
   * Respawn particle at random position
   */
  private respawnParticle(p: p5, particle: Particle): void {
    const newPos = this.random3D(p).mult(
      p.random(MIN_SPAWN_RADIUS, SPAWN_RADIUS)
    );
    particle.pos.set(newPos.x, newPos.y, newPos.z);

    // Reset velocity
    const newVel = p.createVector(
      p.random(-1, 1),
      p.random(-1, 1),
      p.random(-1, 1)
    ).normalize().mult(p.random(0.5, 2));
    particle.vel.set(newVel.x, newVel.y, newVel.z);

    // Reset acceleration
    particle.acc.set(0, 0, 0);

    // Reset history
    particle.history = [];

    // Reset audio levels
    (particle as any).audioLevels = {
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
      volumeLevel: 0,
    };
  }

  /**
   * Draw the black hole pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    // Draw background with trail effect
    this.drawBackground(p, options);

    p.push();

    // Enable additive blending for glowing effect
    // Note: p5.js WEBGL mode doesn't have direct blending mode access
    // We simulate it with low alpha colors

    // Draw black hole core (visible dark center) - draw first
    p.noStroke();
    p.noLights();
    p.emissiveMaterial(0);
    p.sphere(BLACK_HOLE_CORE_RADIUS);
    p.lights();

    // Draw event horizon (transparent sphere)
    p.noStroke();
    p.fill(0, 0); // Fully transparent
    p.sphere(EVENT_HORIZON_RADIUS);

    // Draw particles
    for (const particle of this.particles) {
      this.drawParticle(p, particle);
    }

    p.pop();
  }

  /**
   * Draw background with custom color and fade effect
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    const { r, g, b } = this.params.backgroundColor;

    if (options.clearBackground) {
      p.clear();
    } else {
      // Apply background fade using backgroundAlpha
      const alpha = this.params.backgroundAlpha;

      // Debug logging to verify actual color values
      if (Math.random() < 0.01) { // Log once per ~100 frames to avoid spam
        console.log('[Background Debug]', {
          r, g, b,
          alpha,
          rgbString: `rgb(${r}, ${g}, ${b})`,
        });
      }

      if (alpha >= 1.0) {
        // Fully opaque - no alpha parameter needed
        p.background(r, g, b);
      } else {
        // Partial transparency - use alpha parameter
        // In WEBGL mode, this creates a fade effect
        p.background(r, g, b, alpha * 255);
      }
    }
  }

  /**
   * Draw a single particle
   */
  private drawParticle(p: p5, particle: Particle): void {
    const speed = particle.vel.mag();
    const dist = particle.pos.mag();
    const audioLevels = (particle as any).audioLevels || {
      bassLevel: 0,
      midLevel: 0,
      trebleLevel: 0,
      volumeLevel: 0,
    };

    // Audio-reactive color mapping
    // Bass -> Red/Orange shift (warm colors when heavy bass)
    // Mid -> Green/Yellow (energy in midrange)
    // Treble -> Blue/Purple (bright colors with treble)
    const { bassLevel, midLevel, trebleLevel, volumeLevel } = audioLevels;

    // Base color from speed and distance
    const brightness = this.map(speed, 0, MAX_VELOCITY * 2, 50, 255);
    const redShift = this.map(dist, 0, SPAWN_RADIUS, 50, 0);

    // Audio-reactive color shifts
    // Bass adds red (0-100), Treble adds blue (0-150), Mid adds green (0-80)
    const audioRed = bassLevel * 150;
    const audioGreen = midLevel * 100;
    const audioBlue = trebleLevel * 200;

    // Combine all color components
    const r = this.clamp(brightness - redShift + audioRed, 0, 255);
    const g = this.clamp(brightness * 0.3 + audioGreen, 0, 255);
    const b = this.clamp(brightness * 0.8 + audioBlue, 0, 255);

    // Audio-reactive alpha (volume makes particles more opaque)
    const alpha = this.clamp(100 + volumeLevel * 155, 100, 255);

    // Audio-reactive size (volume makes particles larger)
    const baseSize = this.map(particle.mass, 0.5, 2, 1, 3);
    const audioSize = baseSize * (1 + volumeLevel * 4);

    // Draw trail if history exists
    if (particle.history.length > 1) {
      p.noFill();
      const historyLength = particle.history.length;

      // Draw trail as connected line segments with fading opacity
      for (let i = 0; i < historyLength - 1; i++) {
        const t = i / (historyLength - 1); // 0 (oldest) to 1 (newest)
        const trailAlpha = alpha * t * 0.8; // Fade from 0 to 80% of particle alpha

        p.stroke(r, g, b, trailAlpha);
        p.strokeWeight(audioSize * t); // Taper size from oldest to newest

        const p1 = particle.history[i];
        const p2 = particle.history[i + 1];
        p.line(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }
    }

    // Draw particle head
    p.stroke(r, g, b, alpha);
    p.strokeWeight(audioSize);
    p.point(particle.pos.x, particle.pos.y, particle.pos.z);
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.particles = [];
    this.center = null;
    this.isSetup = false;
  }

  /**
   * Handle canvas resize
   */
  override resize(_p: p5, width: number, height: number): void {
    if (this.center) {
      this.center.set(width / 2, height / 2, 0);
    }
  }
}
