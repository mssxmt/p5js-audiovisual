/**
 * Ikeda3DPattern - Ryoji Ikeda-style 3D Data Visualization
 *
 * Inspired by Ryoji Ikeda's data visualization aesthetics:
 * - 3D barcode layers floating in space
 * - Floating numeric data (frequency values)
 * - XYZ axis waveforms
 * - Pure black/white with red accents for peaks
 * - Camera orbits through the data space
 * - Audio-reactive: Bass→layer expansion, Mid→noise/jitter, Treble→red flash
 */

import p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * 3D barcode layer
 */
interface BarcodeLayer {
  z: number;              // Z position
  bars: number[];         // Barcode pattern (0-1 values)
  offset: number;         // Horizontal offset
  speed: number;          // Scroll speed
}

/**
 * Floating data number
 */
interface DataNumber {
  x: number;
  y: number;
  z: number;
  value: number;          // Display value (frequency)
  targetValue: number;
  brightness: number;
}

/**
 * Ikeda 3D pattern parameters
 */
interface Ikeda3DParams {
  // Barcode layers
  layerCount: number;         // Number of barcode layers (5-20)
  layerSpacing: number;       // Distance between layers (50-300)
  barDensity: number;         // Barcode density (10-100)
  scrollSpeed: number;        // Scroll speed (0-5)

  // Data numbers
  dataCount: number;          // Number of floating numbers (10-100)
  dataSpread: number;         // 3D spread of numbers (100-500)

  // Waveforms
  waveformScale: number;      // Waveform amplitude (10-100)
  waveformDensity: number;    // Number of waveform points (50-500)

  // Colors
  redThreshold: number;       // Value threshold for red accent (0.5-1.0)

  // Camera
  camRadius: number;          // Camera orbit radius (200-800)
  camSpeed: number;           // Orbit speed (0-0.02)
  camHeight: number;          // Camera height offset (-200 to 200)

  // Audio reactivity
  bassLayerExpand: number;    // Bass→layer spacing multiplier (0-3)
  midNoiseAmount: number;     // Mid→noise/jitter amount (0-10)
  trebleRedFlash: number;     // Treble→red flash intensity (0-1)

  // Background
  backgroundAlpha: number;    // Trail fade (0.02-0.3)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'Ikeda3DPattern',
  description: 'Ryoji Ikeda-style 3D data visualization',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: Ikeda3DParams = {
  layerCount: 10,
  layerSpacing: 150,
  barDensity: 40,
  scrollSpeed: 1.5,
  dataCount: 50,
  dataSpread: 300,
  waveformScale: 50,
  waveformDensity: 200,
  redThreshold: 0.7,
  camRadius: 500,
  camSpeed: 0.005,
  camHeight: 100,
  bassLayerExpand: 1.5,
  midNoiseAmount: 3.0,
  trebleRedFlash: 0.8,
  backgroundAlpha: 0.1,
};

/**
 * Ikeda3DPattern - Ryoji Ikeda style 3D visualization
 */
export class Ikeda3DPattern extends BasePattern {
  protected params: Ikeda3DParams;

  // Barcode layers
  private barcodeLayers: BarcodeLayer[] = [];

  // Floating numbers
  private dataNumbers: DataNumber[] = [];

  // Waveform points
  private waveformX: p5.Vector[] = [];
  private waveformY: p5.Vector[] = [];
  private waveformZ: p5.Vector[] = [];

  // Camera
  private camAngle = 0;

  // Time
  private time = 0;

  // Red flash from treble
  private redFlash = 0;

  private needsReinit = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  getParams(): Ikeda3DParams {
    return { ...this.params };
  }

  setParams(params: Partial<Ikeda3DParams>): void {
    const oldLayerCount = this.params.layerCount;
    const oldDataCount = this.params.dataCount;
    const oldWaveformDensity = this.params.waveformDensity;

    this.params = { ...this.params, ...params };

    if (
      params.layerCount !== undefined && params.layerCount !== oldLayerCount ||
      params.dataCount !== undefined && params.dataCount !== oldDataCount ||
      params.waveformDensity !== undefined && params.waveformDensity !== oldWaveformDensity
    ) {
      this.needsReinit = true;
    }
  }

  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      layerCount: { min: 5, max: 20, step: 1 },
      layerSpacing: { min: 50, max: 300, step: 10 },
      barDensity: { min: 10, max: 100, step: 5 },
      scrollSpeed: { min: 0, max: 5, step: 0.1 },
      dataCount: { min: 10, max: 100, step: 5 },
      dataSpread: { min: 100, max: 500, step: 25 },
      waveformScale: { min: 10, max: 100, step: 5 },
      waveformDensity: { min: 50, max: 500, step: 25 },
      redThreshold: { min: 0.5, max: 1.0, step: 0.05 },
      camRadius: { min: 200, max: 800, step: 25 },
      camSpeed: { min: 0, max: 0.02, step: 0.001 },
      camHeight: { min: -200, max: 200, step: 25 },
      bassLayerExpand: { min: 0, max: 3, step: 0.1 },
      midNoiseAmount: { min: 0, max: 10, step: 0.5 },
      trebleRedFlash: { min: 0, max: 1, step: 0.1 },
      backgroundAlpha: { min: 0.02, max: 0.3, step: 0.01 },
    };
  }

  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  override setup(p: p5): void {
    this.initializeBarcodes(p);
    this.initializeDataNumbers(p);
    this.initializeWaveforms(p);
    this.isSetup = true;
  }

  /**
   * Initialize barcode layers
   */
  private initializeBarcodes(p: p5): void {
    this.barcodeLayers = [];
    const baseSpacing = this.params.layerSpacing;

    for (let i = 0; i < this.params.layerCount; i++) {
      const z = (i - this.params.layerCount / 2) * baseSpacing;
      const bars: number[] = [];

      // Generate barcode pattern
      for (let j = 0; j < this.params.barDensity; j++) {
        bars.push(p.random() > 0.5 ? 1 : 0);
      }

      this.barcodeLayers.push({
        z,
        bars,
        offset: p.random(p.width),
        speed: p.random(0.5, 2),
      });
    }
  }

  /**
   * Initialize floating data numbers
   */
  private initializeDataNumbers(p: p5): void {
    this.dataNumbers = [];
    const spread = this.params.dataSpread;

    for (let i = 0; i < this.params.dataCount; i++) {
      this.dataNumbers.push({
        x: p.random(-spread, spread),
        y: p.random(-spread * 0.5, spread * 0.5),
        z: p.random(-spread, spread),
        value: 0,
        targetValue: 0,
        brightness: p.random(0.3, 0.7),
      });
    }
  }

  /**
   * Initialize waveform points
   */
  private initializeWaveforms(_p: p5): void {
    this.waveformX = [];
    this.waveformY = [];
    this.waveformZ = [];

    const count = this.params.waveformDensity;
    const spread = this.params.dataSpread;

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const x = (t - 0.5) * spread * 2;

      this.waveformX.push({ x, y: 0, z: 0 } as p5.Vector);
      this.waveformY.push({ x: 0, y: (t - 0.5) * spread, z: 0 } as p5.Vector);
      this.waveformZ.push({ x: 0, y: 0, z: (t - 0.5) * spread } as p5.Vector);
    }
  }

  override update(p: p5, context: PatternContext): void {
    // Reinitialize if needed
    if (this.needsReinit) {
      this.initializeBarcodes(p);
      this.initializeDataNumbers(p);
      this.initializeWaveforms(p);
      this.needsReinit = false;
    }

    // Get audio bands
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');
    const trebleLevel = this.getAudioBand(context.audio, 'treble');

    // Update time
    this.time += 0.016;

    // Update camera
    this.camAngle += this.params.camSpeed;

    // Red flash decay
    this.redFlash *= 0.9;

    // Add red flash on treble
    if (trebleLevel > this.params.redThreshold) {
      this.redFlash = trebleLevel * this.params.trebleRedFlash;
    }

    // Update barcodes with bass expansion
    this.updateBarcodes(p, bassLevel);

    // Update data numbers with audio values
    this.updateDataNumbers(p, context, midLevel);

    // Update waveforms
    this.updateWaveforms(p, context, midLevel);
  }

  /**
   * Update barcode layers
   */
  private updateBarcodes(p: p5, bassLevel: number): void {
    const spacingMult = 1 + bassLevel * this.params.bassLayerExpand;

    for (let i = 0; i < this.barcodeLayers.length; i++) {
      const layer = this.barcodeLayers[i];
      const baseSpacing = this.params.layerSpacing;

      // Update Z position with bass expansion
      layer.z = (i - this.barcodeLayers.length / 2) * baseSpacing * spacingMult;

      // Scroll offset
      layer.offset += layer.speed * this.params.scrollSpeed;
      if (layer.offset > p.width) {
        layer.offset = 0;
      }
    }
  }

  /**
   * Update floating data numbers
   */
  private updateDataNumbers(p: p5, context: PatternContext, midLevel: number): void {
    const noiseAmount = midLevel * this.params.midNoiseAmount;

    for (let i = 0; i < this.dataNumbers.length; i++) {
      const num = this.dataNumbers[i];

      // Get audio value for this position (use index as frequency band proxy)
      const audioValue = this.getAudioBand(context.audio, 'bass'); // Simplified

      // Target value is frequency-based
      num.targetValue = audioValue * 10000;

      // Smooth transition
      num.value += (num.targetValue - num.value) * 0.1;

      // Add noise/jitter on mid
      if (noiseAmount > 0.1) {
        num.x += p.random(-noiseAmount, noiseAmount);
        num.y += p.random(-noiseAmount, noiseAmount);
        num.z += p.random(-noiseAmount, noiseAmount);
      }

      // Keep within bounds
      const spread = this.params.dataSpread;
      num.x = Math.max(-spread, Math.min(spread, num.x));
      num.y = Math.max(-spread * 0.5, Math.min(spread * 0.5, num.y));
      num.z = Math.max(-spread, Math.min(spread, num.z));

      // Brightness based on value
      num.brightness = 0.3 + audioValue * 0.5;
    }
  }

  /**
   * Update waveforms
   */
  private updateWaveforms(p: p5, context: PatternContext, midLevel: number): void {
    const waveform = context.audio.waveform;
    if (!waveform || waveform.length === 0) return;

    const scale = this.params.waveformScale;
    const noiseAmount = midLevel * this.params.midNoiseAmount;

    for (let i = 0; i < this.waveformX.length && i < waveform.length; i++) {
      const sample = waveform[i];
      const amp = (sample - 128) / 128; // -1 to 1

      // Update X waveform (on XZ plane)
      this.waveformX[i].y = amp * scale;
      this.waveformX[i].z += p.random(-noiseAmount * 0.5, noiseAmount * 0.5);

      // Update Y waveform (on XY plane)
      this.waveformY[i].x = amp * scale;
      this.waveformY[i].z += p.random(-noiseAmount * 0.5, noiseAmount * 0.5);

      // Update Z waveform (on YZ plane)
      this.waveformZ[i].x = amp * scale;
      this.waveformZ[i].y += p.random(-noiseAmount * 0.5, noiseAmount * 0.5);
    }
  }

  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Camera setup
    const camX = Math.sin(this.camAngle) * this.params.camRadius;
    const camZ = Math.cos(this.camAngle) * this.params.camRadius;
    p.camera(camX, -this.params.camHeight, camZ, 0, 0, 0, 0, 1, 0);

    // Draw barcodes
    this.drawBarcodes(p);

    // Draw waveforms
    this.drawWaveforms(p);

    // Draw data numbers
    this.drawDataNumbers(p);

    p.pop();
  }

  /**
   * Draw barcode layers
   */
  private drawBarcodes(p: p5): void {
    const barWidth = p.width / this.params.barDensity;

    p.noStroke();

    for (const layer of this.barcodeLayers) {
      for (let i = 0; i < layer.bars.length; i++) {
        const bar = layer.bars[i];
        if (bar === 0) continue;

        const x = (i * barWidth - layer.offset + p.width) % p.width - p.width / 2;

        // Color based on red flash
        if (this.redFlash > 0.1) {
          p.fill(255, 0, 0, this.redFlash * 255);
        } else {
          p.fill(255);
        }

        p.push();
        p.translate(x, 0, layer.z);
        p.box(barWidth * 0.8, p.height * 0.8, 2);
        p.pop();
      }
    }
  }

  /**
   * Draw XYZ waveforms
   */
  private drawWaveforms(p: p5): void {
    const scale = this.params.waveformScale;

    // Red flash effect
    const waveformColor = this.redFlash > 0.1 ?
      { r: 255, g: 0, b: 0 } :
      { r: 255, g: 255, b: 255 };

    p.stroke(waveformColor.r, waveformColor.g, waveformColor.b, 200);
    p.strokeWeight(1);
    p.noFill();

    // X waveform (on XZ plane)
    p.beginShape();
    for (const pt of this.waveformX) {
      p.vertex(pt.x, pt.y, pt.z);
    }
    p.endShape();

    // Y waveform (on XY plane)
    p.beginShape();
    for (const pt of this.waveformY) {
      p.vertex(pt.x, pt.y, pt.z);
    }
    p.endShape();

    // Z waveform (on YZ plane)
    p.beginShape();
    for (const pt of this.waveformZ) {
      p.vertex(pt.x, pt.y, pt.z);
    }
    p.endShape();

    // Draw axis lines
    p.stroke(100);
    p.strokeWeight(0.5);

    // X axis
    p.line(-scale, 0, 0, scale, 0, 0);
    // Y axis
    p.line(0, -scale, 0, 0, scale, 0);
    // Z axis
    p.line(0, 0, -scale, 0, 0, scale);
  }

  /**
   * Draw floating data numbers
   */
  private drawDataNumbers(p: p5): void {
    p.textFont('Courier New');
    p.textSize(12);
    p.textAlign(p.CENTER, p.CENTER);

    for (const num of this.dataNumbers) {
      const brightness = Math.floor(num.brightness * 255);

      // Red if above threshold or red flash active
      if (num.value / 10000 > this.params.redThreshold || this.redFlash > 0.1) {
        p.fill(255, 0, 0, brightness);
      } else {
        p.fill(255, brightness);
      }

      p.text(num.value.toFixed(0), num.x, num.y, num.z);
    }
  }

  /**
   * Draw background
   */
  protected override drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else {
      // Pure black background
      p.background(0, this.params.backgroundAlpha * 255);
    }
  }

  override cleanup(_p: p5): void {
    this.barcodeLayers = [];
    this.dataNumbers = [];
    this.waveformX = [];
    this.waveformY = [];
    this.waveformZ = [];
    this.isSetup = false;
  }

  override resize(p: p5): void {
    this.initializeBarcodes(p);
    this.initializeDataNumbers(p);
    this.initializeWaveforms(p);
  }
}
