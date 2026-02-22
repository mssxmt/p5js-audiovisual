/**
 * Barcode3DPattern - 3D Barcode Data Visualization
 *
 * Data visualization aesthetics:
 * - 3D barcode layers floating in space
 * - Floating numeric data (frequency values)
 * - XYZ axis waveforms
 * - Pure black/white with red accents for peaks
 * - Camera orbits through the data space
 * - Audio-reactive: Bass→layer expansion, Mid→noise/jitter, Treble→red scanline
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
 * Barcode 3D pattern parameters
 */
interface Barcode3DParams {
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
  redThreshold: number;       // Value threshold for red accent (0-5-1.0)

  // Camera
  camRadius: number;          // Camera orbit radius (200-800)
  camSpeed: number;           // Auto-orbit speed (0-0.02)
  camAngleX: number;          // Manual horizontal angle (-PI to PI)
  camAngleY: number;          // Manual vertical angle (-PI/2 to PI/2)
  camHeight: number;          // Camera height offset (-200 to 200)

  // Red scanline
  scanlineEnabled: boolean;   // Enable red scanline effect
  scanlineSpeed: number;      // Scanline movement speed (1-20)
  scanlineThreshold: number;  // Audio level to trigger scanline (0-1)

  // Audio reactivity
  bassLayerExpand: number;    // Bass→layer spacing multiplier (0-3)
  midNoiseAmount: number;     // Mid→noise/jitter amount (0-10)

  // Background
  backgroundAlpha: number;    // Trail fade (0.02-0.3)
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'Barcode3DPattern',
  description: '3D barcode data visualization',
  version: '1.1.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: Barcode3DParams = {
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
  camAngleX: 0,
  camAngleY: 0.3,
  camHeight: 100,
  scanlineEnabled: true,
  scanlineSpeed: 8,
  scanlineThreshold: 0.4,
  bassLayerExpand: 1.5,
  midNoiseAmount: 3.0,
  backgroundAlpha: 0.1,
};

/**
 * Ikeda3DPattern - Ryoji Ikeda style 3D visualization
 */
export class Barcode3DPattern extends BasePattern {
  protected params: Barcode3DParams;

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
  private scanlineY = 0;          // Current scanline Y position
  private currentTrebleLevel = 0; // Store treble for scanline

  // Time
  private time = 0;

  // Red flash from treble (for compatibility)
  private redFlash = 0;

  private needsReinit = false;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  getParams(): Barcode3DParams {
    return { ...this.params };
  }

  setParams(params: Partial<Barcode3DParams>): void {
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
      redThreshold: { min: 0.05, max: 1.0, step: 0.05 },
      camRadius: { min: 200, max: 800, step: 25 },
      camSpeed: { min: 0, max: 0.02, step: 0.001 },
      camAngleX: { min: -Math.PI, max: Math.PI, step: 0.05 },
      camAngleY: { min: -Math.PI / 2, max: Math.PI / 2, step: 0.05 },
      camHeight: { min: -200, max: 200, step: 25 },
      scanlineEnabled: { min: 0, max: 1, step: 1 },
      scanlineSpeed: { min: 1, max: 20, step: 1 },
      scanlineThreshold: { min: 0, max: 1, step: 0.05 },
      bassLayerExpand: { min: 0, max: 3, step: 0.1 },
      midNoiseAmount: { min: 0, max: 10, step: 0.5 },
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

    // Store treble level for scanline
    this.currentTrebleLevel = trebleLevel;

    // Update time
    this.time += 0.016;

    // Update camera (auto-orbit + manual offset)
    this.camAngle += this.params.camSpeed;

    // Update scanline position
    if (this.params.scanlineEnabled) {
      this.scanlineY += this.params.scanlineSpeed;
      if (this.scanlineY > p.height) {
        this.scanlineY = -p.height / 2;
      }
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

    // Camera setup with manual angle offsets
    const autoAngleX = this.camAngle;
    const autoAngleZ = this.camAngle * 0.5;
    const camX = Math.sin(autoAngleX + this.params.camAngleX) * this.params.camRadius;
    const camY = Math.sin(this.params.camAngleY) * this.params.camRadius * 0.3 - this.params.camHeight;
    const camZ = Math.cos(autoAngleZ + this.params.camAngleX) * this.params.camRadius;
    p.camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);

    // Draw barcodes
    this.drawBarcodes(p);

    // Draw waveforms
    this.drawWaveforms(p);

    // Draw data numbers
    this.drawDataNumbers(p);

    // Draw red scanline
    if (this.params.scanlineEnabled) {
      this.drawScanline(p);
    }

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
   * Draw red scanline effect
   */
  private drawScanline(p: p5): void {
    // Use stored treble level for scanline intensity
    const trebleLevel = this.currentTrebleLevel;

    // Only draw scanline if treble is above threshold
    if (trebleLevel < this.params.scanlineThreshold) return;

    const intensity = trebleLevel;
    const alpha = Math.floor(intensity * 200);

    p.push();
    p.resetMatrix(); // Reset transforms to draw in screen space

    // Draw horizontal red line
    p.stroke(255, 0, 0, alpha);
    p.strokeWeight(2);
    p.line(-p.width / 2, this.scanlineY - p.height / 2, p.width / 2, this.scanlineY - p.height / 2);

    // Add glow effect with multiple lines
    if (intensity > 0.6) {
      p.stroke(255, 0, 0, alpha * 0.5);
      p.strokeWeight(4);
      p.line(-p.width / 2, this.scanlineY - p.height / 2, p.width / 2, this.scanlineY - p.height / 2);

      p.stroke(255, 0, 0, alpha * 0.3);
      p.strokeWeight(6);
      p.line(-p.width / 2, this.scanlineY - p.height / 2, p.width / 2, this.scanlineY - p.height / 2);
    }

    p.pop();
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
