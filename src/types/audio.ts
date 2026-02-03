export interface AudioConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export interface FrequencyBand {
  subBass: number;    // 20-60 Hz
  bass: number;       // 60-250 Hz
  lowMid: number;     // 250-500 Hz
  mid: number;        // 500-2kHz
  highMid: number;    // 2kHz-4kHz
  treble: number;     // 4kHz-6kHz
  brilliance: number; // 6kHz-20kHz
}

export interface AudioData {
  raw: Uint8Array;
  normalized: number[];
  bands: FrequencyBand;
  level: number;           // Overall volume level (0-1)
  spectrum: number[];      // Full FFT spectrum normalized
  waveform: number[];      // Time-domain waveform data (-1 to 1)
  peakFrequency: number;   // Peak frequency in Hz (most dominant frequency)
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export type AudioState = 'idle' | 'initializing' | 'active' | 'error';

export interface AudioEvents {
  onStateChange?: (state: AudioState) => void;
  onDataUpdate?: (data: AudioData) => void;
  onError?: (error: Error) => void;
}
