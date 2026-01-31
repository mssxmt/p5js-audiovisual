import type p5 from 'p5';
import type {
  IBasePattern,
  PatternConfig,
  PatternContext,
  PatternRenderOptions,
} from '../types/pattern';

/**
 * Abstract base class for all visual patterns
 * Implements the IBasePattern interface and provides common functionality
 */
export abstract class BasePattern implements IBasePattern {
  public readonly config: PatternConfig;
  protected isSetup: boolean = false;

  // Default render options
  protected defaultOptions: PatternRenderOptions = {
    clearBackground: false,
    trails: true,
    trailAlpha: 0.1,
  };

  constructor(config: PatternConfig) {
    this.config = {
      version: config.version ?? '1.0.0',
      description: config.description ?? '',
      name: config.name,
    };
  }

  /**
   * Get pattern configuration
   */
  getConfig(): PatternConfig {
    return { ...this.config };
  }

  /**
   * Setup pattern resources (called once when pattern is activated)
   * Override this method to initialize pattern-specific resources
   */
  abstract setup(p: p5): void | Promise<void>;

  /**
   * Update pattern state (called every frame before draw)
   * Override this method to update pattern state based on audio/MIDI data
   */
  abstract update(p: p5, context: PatternContext): void;

  /**
   * Draw pattern (called every frame after update)
   * Override this method to render the pattern
   */
  abstract draw(p: p5, options: PatternRenderOptions): void;

  /**
   * Cleanup pattern resources (called when switching to another pattern)
   * Override this method to release pattern-specific resources
   */
  abstract cleanup(p: p5): void | Promise<void>;

  /**
   * Optional: Handle canvas resize
   * Override if pattern needs to respond to resize events
   */
  resize?(p: p5, width: number, height: number): void;

  /**
   * Helper: Draw background with trail effect
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
   * Helper: Get normalized audio value (0-1) for a frequency band
   */
  protected getAudioBand(
    audio: PatternContext['audio'],
    band: keyof typeof audio.bands
  ): number {
    return audio.bands[band] ?? 0;
  }

  /**
   * Helper: Get CC value with default fallback
   */
  protected getCCValue(
    midi: PatternContext['midi'],
    channel: number,
    ccNumber: number,
    defaultValue: number = 0
  ): number {
    const key = `${channel}:${ccNumber}`;
    return midi.cc.get(key) ?? defaultValue;
  }

  /**
   * Helper: Map value from one range to another
   */
  protected map(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ): number {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  /**
   * Helper: Clamp value between min and max
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Helper: Linear interpolation
   */
  protected lerp(start: number, stop: number, amount: number): number {
    return start + (stop - start) * amount;
  }

  /**
   * Check if pattern is properly initialized
   */
  protected ensureSetup(): void {
    if (!this.isSetup) {
      throw new Error(`Pattern "${this.config.name}" is not setup. Call setup() first.`);
    }
  }
}
