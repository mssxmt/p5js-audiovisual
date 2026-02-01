/**
 * DataPattern - Complex data visualization with flowing information streams
 *
 * Features:
 * - Monochrome color scheme (black/white/gray)
 * - Flowing coordinate data streams
 * - Frequency spectrum visualization
 * - Numerical cascades
 * - Multiple data layers
 * - Fine-grained details
 * - Audio-reactive intensity
 */

import type p5 from 'p5';
import { BasePattern } from './BasePattern';
import type { PatternConfig, PatternContext, PatternRenderOptions } from '../types/pattern';
import type { MidiCCMapping } from '../types/midi';

/**
 * Data pattern configuration parameters
 */
interface DataParams {
  dataSpeed: number;          // Data flow speed (0-2)
  dataDensity: number;        // Amount of data elements (0-1)
  spectrumIntensity: number;   // Frequency spectrum intensity (0-1)
  coordinateFlow: number;      // Coordinate data flow (0-1)
  numericalDensity: number;   // Number display density (0-1)
  lineGranularity: number;    // Line detail level (0-1)
  backgroundColor: { r: number; g: number; b: number };
  backgroundAlpha: number;
}

/**
 * Binary data stream element
 */
interface BinaryElement {
  value: number;
  position: number;
  speed: number;
}

/**
 * Floating number data
 */
interface NumberElement {
  value: number;
  target: number;
  x: number;
  y: number;
  speed: number;
  digits: number;
}

/**
 * Frequency bar data
 */
interface FreqBar {
  x: number;
  height: number;
  targetHeight: number;
}

/**
 * Pattern configuration
 */
const PATTERN_CONFIG: PatternConfig = {
  name: 'DataPattern',
  description: 'Complex data visualization with flowing information',
  version: '1.0.0',
};

/**
 * Default parameters
 */
const DEFAULT_PARAMS: DataParams = {
  dataSpeed: 0.5,
  dataDensity: 0.5,
  spectrumIntensity: 0.7,
  coordinateFlow: 0.5,
  numericalDensity: 0.4,
  lineGranularity: 0.6,
  backgroundColor: { r: 0, g: 0, b: 0 },
  backgroundAlpha: 0.9,
};

/**
 * DataPattern - Complex flowing data visualization
 */
export class DataPattern extends BasePattern {
  protected params: DataParams;

  // Data streams
  private binaryStreams: BinaryElement[][] = [];
  private numberElements: NumberElement[] = [];
  private freqBars: FreqBar[] = [];

  // Layout
  private readonly spectrumBars = 64;
  private readonly streamCount = 8;

  constructor() {
    super(PATTERN_CONFIG);
    this.params = { ...DEFAULT_PARAMS };
  }

  /**
   * Setup pattern resources
   */
  override setup(_p: p5): void {
    this.initializeBinaryStreams();
    this.initializeNumberElements();
    this.initializeFreqBars();
  }

  /**
   * Initialize binary data streams
   */
  private initializeBinaryStreams(): void {
    this.binaryStreams = [];
    for (let i = 0; i < this.streamCount; i++) {
      const stream: BinaryElement[] = [];
      const elements = Math.floor(20 + Math.random() * 40);
      for (let j = 0; j < elements; j++) {
        stream.push({
          value: Math.random() > 0.5 ? 1 : 0,
          position: j,
          speed: 0.2 + Math.random() * 0.5,
        });
      }
      this.binaryStreams.push(stream);
    }
  }

  /**
   * Initialize floating number elements
   */
  private initializeNumberElements(): void {
    this.numberElements = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.numberElements.push({
        value: Math.random() * 1000,
        target: Math.random() * 1000,
        x: Math.random(),
        y: Math.random(),
        speed: 0.01 + Math.random() * 0.03,
        digits: 4 + Math.floor(Math.random() * 4),
      });
    }
  }

  /**
   * Initialize frequency bars
   */
  private initializeFreqBars(): void {
    this.freqBars = [];
    for (let i = 0; i < this.spectrumBars; i++) {
      this.freqBars.push({
        x: (i / this.spectrumBars),
        height: 0,
        targetHeight: 0,
      });
    }
  }

  /**
   * Update pattern state
   */
  override update(p: p5, context: PatternContext): void {
    const bassLevel = this.getAudioBand(context.audio, 'bass');

    // Update binary streams
    const streamSpeed = this.params.dataSpeed * (1 + bassLevel * 0.5);
    for (let s = 0; s < this.binaryStreams.length; s++) {
      const stream = this.binaryStreams[s];
      for (let i = 0; i < stream.length; i++) {
        const element = stream[i];
        element.position -= element.speed * streamSpeed;

        // Reset when off screen
        if (element.position < -1) {
          element.position = stream.length + Math.random() * 5;
          element.value = Math.random() > 0.7 ? 1 : 0;
        }
      }
    }

    // Update number elements
    for (const elem of this.numberElements) {
      // Move toward target
      elem.value += (elem.target - elem.value) * 0.05;
      elem.x += Math.sin(p.frameCount * 0.01 + elem.y * 10) * 0.002;
      elem.y += 0.001;

      if (elem.y > 1) elem.y -= 1;

      // Change target randomly
      if (Math.random() < 0.02 * this.params.dataDensity) {
        elem.target = Math.random() * 9999;
      }
    }

    // Update frequency bars based on audio
    const spectrumData = context.audio.spectrum || new Uint8Array(128);
    for (let i = 0; i < this.freqBars.length; i++) {
      const spectrumIndex = Math.floor((i / this.freqBars.length) * spectrumData.length);
      const spectrumValue = spectrumData[spectrumIndex] / 255;
      this.freqBars[i].targetHeight = spectrumValue * this.params.spectrumIntensity;
      this.freqBars[i].height += (this.freqBars[i].targetHeight - this.freqBars[i].height) * 0.3;
    }
  }

  /**
   * Draw pattern
   */
  override draw(p: p5, options: PatternRenderOptions): void {
    this.drawBackground(p, options);

    p.push();

    // Draw frequency spectrum at bottom
    this.drawFrequencySpectrum(p);

    // Draw coordinate data streams
    this.drawCoordinateStreams(p);

    // Draw numerical cascades
    this.drawNumericalCascades(p);

    // Draw fine horizontal lines
    this.drawFineLines(p);

    // Draw corner markers
    this.drawCornerMarkers(p);

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
   * Draw frequency spectrum
   */
  private drawFrequencySpectrum(p: p5): void {
    const barWidth = p.width / this.spectrumBars;
    const maxHeight = p.height * 0.3;

    p.noStroke();
    for (let i = 0; i < this.freqBars.length; i++) {
      const bar = this.freqBars[i];
      const barHeight = bar.height * maxHeight;
      const x = bar.x * p.width;
      const y = p.height - barHeight;

      // Gradient from white to gray
      const brightness = 200 + bar.height * 55;
      p.fill(brightness, barHeight * 100, barHeight * 100);
      p.rect(x, y, barWidth - 1, barHeight);
    }
  }

  /**
   * Draw coordinate data streams
   */
  private drawCoordinateStreams(p: p5): void {
    const streamCount = Math.floor(this.streamCount * this.params.coordinateFlow);

    for (let s = 0; s < streamCount; s++) {
      const stream = this.binaryStreams[s];
      const baseX = (s / this.streamCount) * p.width;

      for (let i = 0; i < stream.length; i++) {
        const element = stream[i];
        const y = 20 + (i % 20) * 12;
        const alpha = element.value === 1 ? 255 : 50;
        const size = element.value === 1 ? 4 : 2;

        p.noStroke();
        p.fill(255, 255, 255, alpha);
        p.rectMode(p.CENTER);
        p.rect(baseX + element.position * 8, y, size, size);
      }
    }
  }

  /**
   * Draw numerical cascades as binary bars
   */
  private drawNumericalCascades(p: p5): void {
    const count = Math.floor(this.numberElements.length * this.params.numericalDensity);

    for (let i = 0; i < count; i++) {
      const elem = this.numberElements[i];
      const x = elem.x * p.width;
      const y = p.height * 0.7 + elem.y * p.height * 0.25;
      const value = Math.floor(elem.value);

      // Draw as binary bits (8 bars per number)
      const barWidth = 3;
      const barGap = 1;

      for (let bit = 0; bit < 8; bit++) {
        const bitValue = (value >> bit) & 1;
        const alpha = bitValue ? 200 : 50;
        p.noStroke();
        p.fill(200, 200, 200, alpha);
        p.rect(x + bit * (barWidth + barGap), y, barWidth, 4);
      }
    }
  }

  /**
   * Draw fine horizontal lines
   */
  private drawFineLines(p: p5): void {
    const lineCount = Math.floor(30 * this.params.lineGranularity);
    const spacing = p.height / lineCount;

    p.stroke(255, 255, 255, 30);
    p.strokeWeight(1);

    for (let i = 0; i < lineCount; i++) {
      const y = i * spacing;
      // Random gaps in lines
      if (Math.random() > 0.1) {
        p.line(0, y, p.width, y);
      }
    }
  }

  /**
   * Draw corner coordinate markers as bars
   */
  private drawCornerMarkers(p: p5): void {
    const margin = 15;
    const barWidth = 2;
    const barGap = 1;
    const bits = 10; // Show 10 bits

    // Generate 10-bit values from frameCount
    const frameValue = p.frameCount % 1024;
    const timeValue = Math.floor(p.frameCount / 60) % 1024;
    const xValue = (p.frameCount * 0.5) % p.width;
    const yValue = (p.frameCount * 0.3) % p.height;

    const drawBits = (value: number, x: number, y: number, color: number) => {
      for (let i = 0; i < bits; i++) {
        const bitValue = (value >> i) & 1;
        const alpha = bitValue ? color : 30;
        p.fill(255, 255, 255, alpha);
        p.noStroke();
        p.rect(x + i * (barWidth + barGap), y, barWidth, 6);
      }
    };

    // Top-left: Frame
    drawBits(frameValue, margin, margin, 200);

    // Top-right: X coordinate
    const xBits = Math.floor(xValue / 100) % 1024;
    p.push();
    p.translate(p.width - margin - bits * (barWidth + barGap), margin);
    drawBits(xBits, 0, 0, 180);
    p.pop();

    // Bottom-left: Time
    drawBits(timeValue, margin, p.height - margin - 8, 150);

    // Bottom-right: Y coordinate
    const yBits = Math.floor(yValue / 10) % 1024;
    p.push();
    p.translate(p.width - margin - bits * (barWidth + barGap), p.height - margin - 8);
    drawBits(yBits, 0, 0, 150);
    p.pop();
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
      dataSpeed: { min: 0, max: 2, step: 0.01 },
      dataDensity: { min: 0, max: 1, step: 0.01 },
      spectrumIntensity: { min: 0, max: 1, step: 0.01 },
      coordinateFlow: { min: 0, max: 1, step: 0.01 },
      numericalDensity: { min: 0, max: 1, step: 0.01 },
      lineGranularity: { min: 0, max: 1, step: 0.01 },
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
        parameterPath: 'dataSpeed',
        min: 0,
        max: 2,
        currentValue: this.params.dataSpeed,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'dataDensity',
        min: 0,
        max: 1,
        currentValue: this.params.dataDensity,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'spectrumIntensity',
        min: 0,
        max: 1,
        currentValue: this.params.spectrumIntensity,
      },
    ];
  }

  /**
   * Cleanup pattern resources
   */
  override cleanup(_p: p5): void {
    this.binaryStreams = [];
    this.numberElements = [];
    this.freqBars = [];
  }
}
