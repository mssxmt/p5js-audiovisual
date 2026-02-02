/**
 * DataPattern - Ryoji Ikeda style data visualization
 *
 * Multi-layer composition:
 * - Background: Pure black
 * - Layer 1: Barcode stripes (bass reactive)
 * - Layer 2: Binary matrix (mid reactive)
 * - Layer 3: Waveform (treble reactive)
 *
 * Pure black/white aesthetic with geometric precision.
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Data pattern configuration parameters
 */
interface DataParams {
  // Barcode (background layer)
  barcodeSpeed: number;        // Scroll speed (0-10)
  barcodeIntensity: number;    // Contrast (0-1)

  // Binary matrix (middle layer)
  binaryGridSize: number;      // Cell size (4-16)
  binaryDensity: number;       // Density of 1s (0-1)
  binarySpeed: number;         // Update speed (0-1)

  // Frequency-specific reactions
  bassReaction: number;        // Bass response (0-1)
  midReaction: number;         // Mid response (0-1)

  // Bass trigger for barcode scan
  bassThreshold: number;       // Bass threshold to trigger scan (0-1)

  // Background
  backgroundColor: { r: number; g: number; b: number };
  backgroundAlpha: number;
}

/**
 * Barcode stripe data structure
 */
interface BarcodeStripe {
  x: number;        // X position
  width: number;    // Width
  value: number;    // Brightness (0-1)
}

/**
 * Binary cell data structure
 */
interface BinaryCell {
  col: number;
  row: number;
  value: 0 | 1;
  lastUpdate: number;
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'DataPattern',
  description: 'Ryoji Ikeda style data visualization - barcode and binary matrix layers',
  version: '5.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: DataParams = {
  barcodeSpeed: 0.3,
  barcodeIntensity: 0.8,
  binaryGridSize: 10,
  binaryDensity: 0.5,
  binarySpeed: 0.2,
  bassReaction: 1.0,
  midReaction: 1.0,
  bassThreshold: 0.5,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 1,
};

/**
 * DataPattern - Ryoji Ikeda style multi-layer visualization
 */
export class DataPattern extends BasePattern {
  protected params: DataParams;

  // Barcode layer data
  private barcodes: BarcodeStripe[] = [];
  private barcodeOffset = 0;
  private bassTriggered = false;
  private lastBassLevel = 0;

  // Binary matrix layer data
  private binaryGrid: BinaryCell[] = [];
  private gridCols = 0;
  private gridRows = 0;

  // Time tracking for animations
  private lastUpdateTime = 0;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Setup pattern resources
   */
  override setup(p: p5): void {
    this.initBarcodes(p);
    this.initBinaryGrid(p);
    this.isSetup = true;
  }

  /**
   * Initialize barcode stripes to cover full screen width
   */
  private initBarcodes(p: p5): void {
    this.barcodes = [];

    // Fixed stripe width range
    const minWidth = 10;
    const maxWidth = 30;

    // Create stripes that cover the full width
    let x = 0;
    while (x < p.width) {
      const width = p.random(minWidth, maxWidth);
      // Initialize with dim value - brightness will be controlled by audio
      this.barcodes.push({
        x,
        width,
        value: 0.05,
      });
      x += width;
    }

    this.barcodeOffset = 0;
  }

  /**
   * Initialize binary grid to cover full screen
   */
  private initBinaryGrid(p: p5): void {
    this.binaryGrid = [];
    const cellSize = Math.max(4, Math.min(16, this.params.binaryGridSize));

    this.gridCols = Math.ceil(p.width / cellSize);
    this.gridRows = Math.ceil(p.height / cellSize);

    for (let col = 0; col < this.gridCols; col++) {
      for (let row = 0; row < this.gridRows; row++) {
        this.binaryGrid.push({
          col,
          row,
          value: Math.random() < this.params.binaryDensity ? 1 : 0,
          lastUpdate: 0,
        });
      }
    }
  }

  /**
   * Update pattern state
   */
  override update(p: p5, context: PatternContext): void {
    const currentTime = p.millis();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Get frequency band values
    const bass = this.getAudioBand(context.audio, 'bass');
    const mid = this.getAudioBand(context.audio, 'mid');

    // Update barcode layer (scroll + bass reaction)
    this.updateBarcodes(p, bass, deltaTime);

    // Update binary layer (mid reaction)
    this.updateBinaryGrid(p, mid, currentTime);
  }

  /**
   * Update barcode layer with scrolling and bass reaction
   */
  private updateBarcodes(_p: p5, bass: number, deltaTime: number): void {
    const bassLevel = bass * this.params.bassReaction;
    const threshold = this.params.bassThreshold;

    // Detect bass beat (rising edge crossing threshold)
    const bassBeat = bassLevel >= threshold && this.lastBassLevel < threshold;

    if (bassBeat) {
      // Reset scan on new bass beat
      this.barcodeOffset = 0;
      this.bassTriggered = true;
    }

    this.lastBassLevel = bassLevel;

    // Only scroll when bass has been triggered and level is above minimum
    const minScrollLevel = 0.1;
    if (this.bassTriggered && bassLevel > minScrollLevel) {
      // Speed is now controlled by bass level, with higher maximum
      const scrollSpeed = this.params.barcodeSpeed * bassLevel * 20;
      this.barcodeOffset += scrollSpeed * (deltaTime / 16);
    }

    // Update stripe brightness based on bass
    for (let i = 0; i < this.barcodes.length; i++) {
      const stripe = this.barcodes[i];

      // Base brightness - always visible even without audio
      const baseBrightness = 0.15;
      const maxBrightness = 1.0;

      // Create variation across screen for more interesting visual
      const positionVariation = (i / this.barcodes.length) * 0.15;

      // Brightness is directly controlled by bass level
      const bassBoost = bassLevel * (1.2 + positionVariation) * this.params.barcodeIntensity;
      stripe.value = this.clamp(baseBrightness + bassBoost, 0, maxBrightness);
    }
  }

  /**
   * Update binary grid with mid-frequency reaction
   */
  private updateBinaryGrid(p: p5, mid: number, currentTime: number): void {
    // Only update when mid frequency is above threshold
    const midLevel = mid * this.params.midReaction;
    const activationThreshold = 0.15;

    if (midLevel < activationThreshold) {
      // No audio = mostly static, rare random flicker
      if (p.random() < 0.001) {
        const randomCell = this.binaryGrid[Math.floor(p.random() * this.binaryGrid.length)];
        if (randomCell) {
          randomCell.value = randomCell.value === 1 ? 0 : 1;
          randomCell.lastUpdate = currentTime;
        }
      }
      return;
    }

    // Mid frequency is active - update more cells
    const updateCount = Math.floor(midLevel * this.binaryGrid.length * 0.1);
    const densityTarget = this.params.binaryDensity;

    for (let i = 0; i < updateCount; i++) {
      const randomIndex = Math.floor(p.random() * this.binaryGrid.length);
      const cell = this.binaryGrid[randomIndex];

      // Set cell value based on density and mid level
      const prob = densityTarget + midLevel * 0.3;
      cell.value = p.random() < prob ? 1 : 0;
      cell.lastUpdate = currentTime;
    }

    // Regenerate grid if cell size changed
    const cellSize = this.params.binaryGridSize;
    const expectedCols = Math.ceil(p.width / cellSize);
    const expectedRows = Math.ceil(p.height / cellSize);

    if (this.gridCols !== expectedCols || this.gridRows !== expectedRows) {
      this.initBinaryGrid(p);
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();
    // Translate to make (0,0) top-left for easier drawing
    p.translate(-p.width / 2, -p.height / 2);

    this.drawBarcodeLayer(p);
    this.drawBinaryLayer(p);

    p.pop();
  }

  /**
   * Draw background - pure black
   */
  protected drawBackground(p: p5, _options: PatternRenderOptions): void {
    p.clear();
    const { r, g, b } = this.params.backgroundColor;
    const alpha = Math.floor(this.params.backgroundAlpha * 255);
    p.background(r, g, b, alpha);
  }

  /**
   * Draw barcode layer (background layer)
   */
  private drawBarcodeLayer(p: p5): void {
    p.noStroke();

    for (const stripe of this.barcodes) {
      // Calculate x position with scroll offset
      const x = (stripe.x + this.barcodeOffset) % p.width;
      const wrappedX = x < 0 ? x + p.width : x;

      // Brightness based on stripe value
      const gray = Math.floor(stripe.value * 255);

      p.fill(gray);
      p.rect(wrappedX, 0, stripe.width, p.height);

      // Draw wrap-around stripe if needed
      if (wrappedX + stripe.width > p.width) {
        p.rect(0, 0, (wrappedX + stripe.width) - p.width, p.height);
      }
    }
  }

  /**
   * Draw binary matrix layer (middle layer)
   */
  private drawBinaryLayer(p: p5): void {
    const cellSize = this.params.binaryGridSize;

    p.noStroke();

    for (const cell of this.binaryGrid) {
      if (cell.value === 1) {
        const x = cell.col * cellSize;
        const y = cell.row * cellSize;

        // Pure white for active cells
        p.fill(255);
        p.rect(x, y, cellSize - 1, cellSize - 1);
      }
    }
  }

  /**
   * Handle canvas resize
   */
  override resize(p: p5): void {
    this.initBarcodes(p);
    this.initBinaryGrid(p);
  }

  /**
   * Get pattern parameters
   */
  getParams(): DataParams {
    return { ...this.params };
  }

  /**
   * Update pattern parameters
   */
  setParams(params: Partial<DataParams>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * Get parameter metadata
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      barcodeSpeed: { min: 0, max: 10, step: 0.1 },
      barcodeIntensity: { min: 0, max: 1, step: 0.01 },
      binaryGridSize: { min: 4, max: 16, step: 1 },
      binaryDensity: { min: 0, max: 1, step: 0.01 },
      binarySpeed: { min: 0, max: 1, step: 0.01 },
      bassReaction: { min: 0, max: 1, step: 0.01 },
      midReaction: { min: 0, max: 1, step: 0.01 },
      bassThreshold: { min: 0, max: 1, step: 0.01 },
      backgroundAlpha: { min: 0, max: 1, step: 0.01 },
    };
  }

  /**
   * Get MIDI CC mappings
   */
  getMidiMappings(): MidiCCMapping[] {
    return [
      {
        channel: 0,
        ccNumber: 1,
        parameterPath: 'barcodeSpeed',
        min: 0,
        max: 10,
        currentValue: this.params.barcodeSpeed,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'binaryGridSize',
        min: 4,
        max: 16,
        currentValue: this.params.binaryGridSize,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'bassReaction',
        min: 0,
        max: 1,
        currentValue: this.params.bassReaction,
      },
      {
        channel: 0,
        ccNumber: 4,
        parameterPath: 'midReaction',
        min: 0,
        max: 1,
        currentValue: this.params.midReaction,
      },
      {
        channel: 0,
        ccNumber: 5,
        parameterPath: 'bassThreshold',
        min: 0,
        max: 1,
        currentValue: this.params.bassThreshold,
      },
    ];
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.barcodes = [];
    this.binaryGrid = [];
    this.gridCols = 0;
    this.gridRows = 0;
    this.barcodeOffset = 0;
    this.bassTriggered = false;
    this.lastBassLevel = 0;
    this.isSetup = false;
  }
}
