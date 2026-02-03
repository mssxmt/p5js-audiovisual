import type {
  AudioConfig,
  AudioData,
  AudioDeviceInfo,
  AudioState,
  AudioEvents,
  FrequencyBand,
} from '../types/audio';

const DEFAULT_CONFIG: AudioConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.5,
  minDecibels: -90,
  maxDecibels: -10,
};

/**
 * Manages Web Audio API, FFT analysis, and provides normalized audio data
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  private config: AudioConfig;
  private state: AudioState = 'idle';
  private events: AudioEvents;

  // Current device ID tracking
  private currentDeviceId: string | null = null;

  // Current audio data (updated every frame)
  private currentData: AudioData = this.createEmptyAudioData();

  // FFT frequency bin ranges (calculated based on sample rate and FFT size)
  private frequencyRanges: Record<keyof FrequencyBand, [number, number]> = {
    subBass: [0, 0],
    bass: [0, 0],
    lowMid: [0, 0],
    mid: [0, 0],
    highMid: [0, 0],
    treble: [0, 0],
    brilliance: [0, 0],
  };

  constructor(config: Partial<AudioConfig> = {}, events: AudioEvents = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events;
  }

  /**
   * Get current audio data (immutable)
   */
  getData(): Readonly<AudioData> {
    return this.currentData;
  }

  /**
   * Get current state
   */
  getState(): AudioState {
    return this.state;
  }

  /**
   * Get AudioContext (for external control if needed)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get available audio input devices
   */
  async getDevices(): Promise<AudioDeviceInfo[]> {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
          kind: d.kind as MediaDeviceKind,
        }));
    } catch (error) {
      this.handleError(new Error('Failed to enumerate audio devices'));
      return [];
    }
  }

  /**
   * Initialize audio with specific device
   */
  async initialize(deviceId?: string): Promise<boolean> {
    if (this.state === 'active') {
      await this.stop();
    }

    this.setState('initializing');

    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create analyser
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyser.minDecibels = this.config.minDecibels;
      this.analyser.maxDecibels = this.config.maxDecibels;

      // Calculate frequency ranges
      this.calculateFrequencyRanges();

      // Get audio stream
      // Use exact constraint only when switching devices, not for initial request
      const constraints: MediaStreamConstraints = deviceId
        ? { audio: { deviceId: { ideal: deviceId } } }
        : { audio: true };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create source
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);

      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Track actual device ID from stream (may differ from requested deviceId when using 'ideal' constraint)
      const audioTrack = this.stream.getAudioTracks()[0];
      const settings = audioTrack?.getSettings();
      this.currentDeviceId = (settings?.deviceId as string) ?? deviceId ?? 'default';

      console.log('[AudioManager] Initialized with device:', this.currentDeviceId);

      this.setState('active');

      // Start update loop
      this.startUpdateLoop();

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Resume suspended AudioContext
   */
  async resume(): Promise<boolean> {
    if (!this.audioContext) {
      return false;
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop audio processing and cleanup
   */
  async stop(): Promise<void> {
    this.stopUpdateLoop();

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    this.audioContext = null;
    this.analyser = null;
    this.currentData = this.createEmptyAudioData();
    this.currentDeviceId = null;
    this.setState('idle');
  }

  /**
   * Update audio data (call this in p5 draw loop or requestAnimationFrame)
   */
  update(): void {
    if (!this.analyser || this.state !== 'active') {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Get time-domain data (waveform)
    const timeDataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(timeDataArray);
    const waveform = Array.from(timeDataArray).map((v) => (v - 128) / 128);

    // Calculate normalized values
    const normalized = Array.from(dataArray).map((v) => v / 255);

    // Calculate frequency bands
    const bands = this.calculateFrequencyBands(dataArray);

    // Calculate overall level
    const level = normalized.reduce((sum, val) => sum + val, 0) / normalized.length;

    this.currentData = {
      raw: dataArray,
      normalized,
      spectrum: normalized,
      waveform,
      bands,
      level,
    };

    this.events.onDataUpdate?.(this.currentData);
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.analyser) {
      if (config.fftSize) this.analyser.fftSize = config.fftSize;
      if (config.smoothingTimeConstant !== undefined) {
        this.analyser.smoothingTimeConstant = config.smoothingTimeConstant;
      }
      if (config.minDecibels !== undefined) {
        this.analyser.minDecibels = config.minDecibels;
      }
      if (config.maxDecibels !== undefined) {
        this.analyser.maxDecibels = config.maxDecibels;
      }

      if (config.fftSize) {
        this.calculateFrequencyRanges();
      }
    }
  }

  /**
   * Get current device ID
   * @returns Current device ID or null if not initialized
   */
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  /**
   * Change audio device
   * Stops current device and initializes with new device
   * @param deviceId - Device ID to switch to
   * @returns true if successful, false otherwise
   */
  async changeDevice(deviceId: string): Promise<boolean> {
    console.log('[AudioManager] Changing device from', this.currentDeviceId, 'to', deviceId);
    return this.initialize(deviceId);
  }

  // Private methods

  private createEmptyAudioData(): AudioData {
    return {
      raw: new Uint8Array(0),
      normalized: [],
      spectrum: [],
      waveform: [],
      bands: {
        subBass: 0,
        bass: 0,
        lowMid: 0,
        mid: 0,
        highMid: 0,
        treble: 0,
        brilliance: 0,
      },
      level: 0,
    };
  }

  private calculateFrequencyRanges(): void {
    if (!this.audioContext || !this.analyser) {
      return;
    }

    const sampleRate = this.audioContext.sampleRate;
    const binCount = this.analyser.frequencyBinCount;
    const binSize = sampleRate / 2 / binCount;

    // Define frequency ranges (Hz)
    const ranges = {
      subBass: [20, 60],
      bass: [60, 250],
      lowMid: [250, 500],
      mid: [500, 2000],
      highMid: [2000, 4000],
      treble: [4000, 6000],
      brilliance: [6000, 20000],
    };

    // Convert to bin indices
    this.frequencyRanges = {
      subBass: [Math.floor(ranges.subBass[0] / binSize), Math.ceil(ranges.subBass[1] / binSize)],
      bass: [Math.floor(ranges.bass[0] / binSize), Math.ceil(ranges.bass[1] / binSize)],
      lowMid: [Math.floor(ranges.lowMid[0] / binSize), Math.ceil(ranges.lowMid[1] / binSize)],
      mid: [Math.floor(ranges.mid[0] / binSize), Math.ceil(ranges.mid[1] / binSize)],
      highMid: [Math.floor(ranges.highMid[0] / binSize), Math.ceil(ranges.highMid[1] / binSize)],
      treble: [Math.floor(ranges.treble[0] / binSize), Math.ceil(ranges.treble[1] / binSize)],
      brilliance: [Math.floor(ranges.brilliance[0] / binSize), Math.ceil(ranges.brilliance[1] / binSize)],
    };
  }

  private calculateFrequencyBands(data: Uint8Array): FrequencyBand {
    const calculateAverage = (start: number, end: number): number => {
      if (start >= data.length) return 0;
      const actualEnd = Math.min(end, data.length);
      let sum = 0;
      for (let i = start; i < actualEnd; i++) {
        sum += data[i];
      }
      return (sum / (actualEnd - start)) / 255;
    };

    return {
      subBass: calculateAverage(...this.frequencyRanges.subBass),
      bass: calculateAverage(...this.frequencyRanges.bass),
      lowMid: calculateAverage(...this.frequencyRanges.lowMid),
      mid: calculateAverage(...this.frequencyRanges.mid),
      highMid: calculateAverage(...this.frequencyRanges.highMid),
      treble: calculateAverage(...this.frequencyRanges.treble),
      brilliance: calculateAverage(...this.frequencyRanges.brilliance),
    };
  }

  private updateLoopId: number | null = null;

  private startUpdateLoop(): void {
    const loop = () => {
      this.update();
      this.updateLoopId = requestAnimationFrame(loop);
    };
    loop();
  }

  private stopUpdateLoop(): void {
    if (this.updateLoopId !== null) {
      cancelAnimationFrame(this.updateLoopId);
      this.updateLoopId = null;
    }
  }

  private setState(state: AudioState): void {
    if (this.state !== state) {
      this.state = state;
      this.events.onStateChange?.(state);
    }
  }

  private handleError(error: Error): void {
    console.error('[AudioManager Error]', error);
    this.setState('error');
    this.events.onError?.(error);
  }
}
