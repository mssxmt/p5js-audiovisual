export interface MidiCCMapping {
  channel: number;
  ccNumber: number;
  parameterPath: string; // e.g., 'physics.gravity', 'visual.noiseIntensity'
  min: number;
  max: number;
  currentValue: number;
}

export interface MidiData {
  cc: Map<string, number>; // Key: "channel:ccNumber", Value: normalized 0-1
  programChange: number | null;
  clock: number; // MIDI clock count
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string | null;
  state: 'connected' | 'disconnected';
  type: 'input' | 'output';
}

export type MidiState = 'idle' | 'requesting' | 'active' | 'unsupported' | 'error';

export interface MidiEvents {
  onStateChange?: (state: MidiState) => void;
  onCcChange?: (mapping: MidiCCMapping) => void;
  onProgramChange?: (program: number) => void;
  onDeviceChange?: (devices: MidiDevice[]) => void;
  onError?: (error: Error) => void;
  // MIDI Learn events
  onLearnStart?: (parameterPath: string) => void;
  onLearnCancel?: (parameterPath: string) => void;
  onLearnComplete?: (assignment: any) => void;
  // MIDI CC to Parameter mapping (for UI sync)
  onMidiParameterChange?: (parameterName: string, value: number) => void;
}

/**
 * MIDI channel filter type
 * - 'all': Receive all channels
 * - 'off': Disable MIDI
 * - '0'-'15': Receive only specific channel (0-15 internally)
 */
export type MidiChannelFilter = 'all' | 'off' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';

/**
 * Display label for MIDI channel filter
 */
export const MIDI_CHANNEL_LABELS: Record<MidiChannelFilter, string> = {
  'all': 'All',
  'off': 'Off',
  '0': '1',
  '1': '2',
  '2': '3',
  '3': '4',
  '4': '5',
  '5': '6',
  '6': '7',
  '7': '8',
  '8': '9',
  '9': '10',
  '10': '11',
  '11': '12',
  '12': '13',
  '13': '14',
  '14': '15',
  '15': '16',
} as const;
