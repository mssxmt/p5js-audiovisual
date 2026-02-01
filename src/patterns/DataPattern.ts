/**
 * DataPattern - Minimal data visualization inspired by test pattern aesthetics
 *
 * Features:
 * - Monochrome color scheme (black/white/gray)
 * - Grid-based geometric patterns
 * - Data stream visualization
 * - Rhythmic pulses and scanning lines
 * - Text/number displays
 * - Audio-reactive elements
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Data pattern configuration parameters
 */
interface DataParams {
  gridRows: number;           // Grid row count (1-20)
  gridCols: number;           // Grid column count (1-20)
  lineDensity: number;        // Line density (0-1)
  pulseSpeed: number;         // Pulse animation speed (0-2)
  dataDensity: number;        // Data display density (0-1)
  scanlineIntensity: number;  // Scanline effect intensity (0-1)
  backgroundColor: { r: number; g: number; b: number };
  backgroundAlpha: number;    // Background alpha (0-1)
}

/**
 * Data point for visualization
 */
interface DataPoint {
  value: number;              // 0 or 1
  x: number;
  y: number;
  lastChange: number;         // Frame when last changed
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'DataPattern',
  description: 'Minimal data visualization with geometric patterns',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: DataParams = {
  gridRows: 8,
  gridCols: 12,
  lineDensity: 0.5,
  pulseSpeed: 0.5,
  dataDensity: 0.3,
  scanlineIntensity: 0.2,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 0.95,
};

/**
 * DataPattern - Minimal geometric data visualization
 */
export class DataPattern extends BasePattern {
  protected params: DataParams;
  protected dataPoints: DataPoint[] = [];
  protected scanlineY: number = 0;
  protected pulsePhase: number = 0;

  // Grid cell size
  private cellWidth: number = 0;
  private cellHeight: number = 0;

  // Random binary data stream
  private dataStream: number[] = [];

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Setup pattern resources
   */
  override setup(p: p5): void {
    this.resize(p, p.width, p.height);
    this.initializeDataPoints();
    this.initializeDataStream();
  }

  /**
   * Resize handler
   */
  override resize(_p: p5, width: number, height: number): void {
    this.cellWidth = width / this.params.gridCols;
    this.cellHeight = height / this.params.gridRows;
  }

  /**
   * Initialize data points grid
   */
  private initializeDataPoints(): void {
    this.dataPoints = [];
    for (let row = 0; row < this.params.gridRows; row++) {
      for (let col = 0; col < this.params.gridCols; col++) {
        this.dataPoints.push({
          value: Math.random() > 0.5 ? 1 : 0,
          x: col,
          y: row,
          lastChange: 0,
        });
      }
    }
  }

  /**
   * Initialize random data stream (binary)
   */
  private initializeDataStream(): void {
    this.dataStream = [];
    const streamLength = 100;
    for (let i = 0; i < streamLength; i++) {
      this.dataStream.push(Math.random() > 0.5 ? 1 : 0);
    }
  }

  /**
   * Update pattern state
   */
  override update(_p: p5, context: PatternContext): void {
    const bassLevel = this.getAudioBand(context.audio, 'bass');
    const midLevel = this.getAudioBand(context.audio, 'mid');

    // Update pulse phase
    this.pulsePhase += 0.02 * this.params.pulseSpeed * (1 + bassLevel);

    // Update scanline position
    this.scanlineY = (this.scanlineY + 2 + this.params.pulseSpeed * 3) % _p.height;

    // Update data points randomly
    const changeProbability = 0.02 * this.params.dataDensity * (1 + midLevel);
    for (const point of this.dataPoints) {
      if (Math.random() < changeProbability) {
        point.value = Math.random() > 0.5 ? 1 : 0;
        point.lastChange = _p.frameCount;
      }
    }

    // Update data stream
    if (_p.frameCount % 10 === 0) {
      // Shift and add new bit
      this.dataStream.shift();
      this.dataStream.push(Math.random() > 0.5 ? 1 : 0);
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Get audio-reactive values
    const pulseIntensity = (Math.sin(this.pulsePhase) + 1) / 2;

    // Draw grid lines
    this.drawGridLines(p);

    // Draw data points
    this.drawDataPoints(p, pulseIntensity);

    // Draw data stream text
    this.drawDataStream(p);

    // Draw scanline
    this.drawScanline(p);

    // Draw border frame
    this.drawBorderFrame(p);

    p.pop();
  }

  /**
   * Draw background
   */
  protected drawBackground(p: p5, options: PatternRenderOptions): void {
    if (options.clearBackground) {
      p.clear();
    } else if (options.trails) {
      p.background(0, options.trailAlpha * 255);
    } else {
      p.background(0);
    }
  }

  /**
   * Draw grid lines
   */
  private drawGridLines(p: p5): void {
    const cols = Math.floor(this.params.lineDensity * 10) + 1;

    p.stroke(255, 255, 255, 30);
    p.strokeWeight(1);

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = (i / cols) * p.width;
      p.line(x, 0, x, p.height);
    }

    // Horizontal lines
    for (let i = 0; i <= cols; i++) {
      const y = (i / cols) * p.height;
      p.line(0, y, p.width, y);
    }
  }

  /**
   * Draw data points (grid cells)
   */
  private drawDataPoints(p: p5, pulseIntensity: number): void {
    const pointSize = Math.min(this.cellWidth, this.cellHeight) * 0.6;

    for (const point of this.dataPoints) {
      const x = point.x * this.cellWidth + this.cellWidth / 2;
      const y = point.y * this.cellHeight + this.cellHeight / 2;

      // Pulse effect for active points
      const size = point.value === 1
        ? pointSize * (0.8 + pulseIntensity * 0.4)
        : pointSize * 0.3;

      // Alpha based on value and recency
      const timeSinceChange = p.frameCount - point.lastChange;
      const alpha = point.value === 1
        ? 255 - Math.min(timeSinceChange * 5, 150)
        : 50 + Math.sin(p.frameCount * 0.05 + point.x + point.y) * 30;

      if (point.value === 1) {
        p.fill(255, 255, 255, alpha);
        p.noStroke();
        p.rectMode(p.CENTER);
        p.rect(x, y, size, size);
      } else {
        p.stroke(255, 255, 255, alpha);
        p.strokeWeight(1);
        p.point(x, y);
      }
    }
  }

  /**
   * Draw data stream as binary text
   */
  private drawDataStream(p: p5): void {
    const displayLength = Math.floor(20 + this.params.dataDensity * 80);
    const startY = 30;
    const lineHeight = 14;

    p.fill(255, 255, 255, 150);
    p.noStroke();
    p.textFont('monospace');
    p.textSize(10);

    for (let i = 0; i < displayLength && i < this.dataStream.length; i++) {
      const bit = this.dataStream[this.dataStream.length - 1 - i];
      const x = 20 + (i % 40) * 12;
      const y = startY + Math.floor(i / 40) * lineHeight;

      // Highlight recent changes
      const highlight = i < 10 ? 255 : 150;
      p.fill(255, 255, 255, highlight);
      p.text(bit.toString(), x, y);
    }
  }

  /**
   * Draw scanning line
   */
  private drawScanline(p: p5): void {
    if (this.params.scanlineIntensity < 0.1) return;

    const alpha = this.params.scanlineIntensity * 100;
    p.stroke(255, 255, 255, alpha);
    p.strokeWeight(2);
    p.line(0, this.scanlineY, p.width, this.scanlineY);
  }

  /**
   * Draw border frame
   */
  private drawBorderFrame(p: p5): void {
    const margin = 20;
    p.stroke(255, 255, 255, 100);
    p.strokeWeight(2);
    p.noFill();
    p.rect(margin, margin, p.width - margin * 2, p.height - margin * 2);
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
    const oldRows = this.params.gridRows;
    const oldCols = this.params.gridCols;

    this.params = { ...this.params, ...params };

    // Recalculate grid if dimensions changed
    if (this.params.gridRows !== oldRows || this.params.gridCols !== oldCols) {
      this.initializeDataPoints();
    }
  }

  /**
   * Get parameter metadata for UI controls
   */
  getParamMeta(): Record<string, { min: number; max: number; step: number }> {
    return {
      gridRows: { min: 1, max: 20, step: 1 },
      gridCols: { min: 1, max: 20, step: 1 },
      lineDensity: { min: 0, max: 1, step: 0.01 },
      pulseSpeed: { min: 0, max: 2, step: 0.01 },
      dataDensity: { min: 0, max: 1, step: 0.01 },
      scanlineIntensity: { min: 0, max: 1, step: 0.01 },
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
        parameterPath: 'lineDensity',
        min: 0,
        max: 1,
        currentValue: this.params.lineDensity,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'pulseSpeed',
        min: 0,
        max: 2,
        currentValue: this.params.pulseSpeed,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'dataDensity',
        min: 0,
        max: 1,
        currentValue: this.params.dataDensity,
      },
    ];
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.dataPoints = [];
    this.dataStream = [];
  }
}
