import type { AudioData } from '../types/audio';
import type { MidiData } from '../types/midi';
import { AudioManager } from './AudioManager';
import { MidiManager } from './MidiManager';

interface StoreConfig {
  audio?: {
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
  };
  midi?: {
    sysexEnabled?: boolean;
  };
}

interface StoreEvents {
  onAudioStateChange?: (state: string) => void;
  onMidiStateChange?: (state: string) => void;
  onPatternChange?: (patternIndex: number) => void;
  onMidiParameterChange?: (parameterName: string, value: number) => void;
}

/**
 * Unified store class managing Audio and MIDI data
 * Intended to be wrapped in useRef for optimal performance
 */
export class Store {
  public readonly audio: AudioManager;
  public readonly midi: MidiManager;

  private currentPatternIndex: number = 0;
  private totalPatterns: number = 0;
  private events: StoreEvents;

  constructor(config: StoreConfig = {}, events: StoreEvents = {}) {
    this.events = events;

    // Initialize managers
    this.audio = new AudioManager(
      config.audio,
      {
        onStateChange: (state) => {
          this.events.onAudioStateChange?.(state);
        },
      }
    );

    this.midi = new MidiManager({
      onStateChange: (state) => {
        this.events.onMidiStateChange?.(state);
      },
      onMidiParameterChange: (parameterName, value) => {
        this.events.onMidiParameterChange?.(parameterName, value);
      },
    });
  }

  /**
   * Get current audio data (immutable snapshot)
   */
  getAudioData(): Readonly<AudioData> {
    return this.audio.getData();
  }

  /**
   * Get current MIDI data (immutable snapshot)
   */
  getMidiData(): Readonly<MidiData> {
    return this.midi.getData();
  }

  /**
   * Get current pattern index
   */
  getPatternIndex(): number {
    return this.currentPatternIndex;
  }

  /**
   * Set current pattern index
   */
  setPatternIndex(index: number): void {
    const clampedIndex = Math.max(0, Math.min(index, this.totalPatterns - 1));

    if (this.currentPatternIndex !== clampedIndex) {
      this.currentPatternIndex = clampedIndex;
      this.events.onPatternChange?.(clampedIndex);
    }
  }

  /**
   * Set total number of available patterns
   */
  setTotalPatterns(count: number): void {
    this.totalPatterns = Math.max(1, count);

    // Clamp current pattern index
    if (this.currentPatternIndex >= this.totalPatterns) {
      this.currentPatternIndex = this.totalPatterns - 1;
    }
  }

  /**
   * Initialize all subsystems
   */
  async initialize(audioDeviceId?: string): Promise<{
    audio: boolean;
    midi: boolean;
  }> {
    const results = await Promise.allSettled([
      this.audio.initialize(audioDeviceId),
      this.midi.initialize(),
    ]);

    const audioSuccess = results[0].status === 'fulfilled' && results[0].value === true;
    const midiSuccess = results[1].status === 'fulfilled' && results[1].value === true;

    // Log initialization results
    console.log('[Store Initialize]', {
      audioSuccess,
      midiSuccess,
      audioState: this.audio.getState(),
      midiState: this.midi.getState(),
    });

    return {
      audio: audioSuccess,
      midi: midiSuccess,
    };
  }

  /**
   * Cleanup all subsystems
   */
  async destroy(): Promise<void> {
    await Promise.all([
      this.audio.stop(),
      this.midi.stop(),
    ]);
  }

  /**
   * Update audio data (call in render loop)
   */
  updateAudio(): void {
    this.audio.update();
  }

  /**
   * Resume AudioContext if suspended
   */
  async resumeAudio(): Promise<boolean> {
    return this.audio.resume();
  }

  /**
   * Check if all systems are ready
   */
  isReady(): boolean {
    return this.audio.getState() === 'active';
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    audio: string;
    midi: string;
    pattern: number;
    ready: boolean;
  } {
    return {
      audio: this.audio.getState(),
      midi: this.midi.getState(),
      pattern: this.currentPatternIndex,
      ready: this.isReady(),
    };
  }
}
