/**
 * MIDI CC Assignment types
 */

/**
 * MIDI Learn state
 */
export type MidiLearnState = 'idle' | 'learning' | 'completed';

/**
 * MIDI CC Assignment for a single parameter
 */
export interface MidiCCAssignment {
  parameterName: string;
  channel: number | null;  // null = unassigned
  ccNumber: number | null;  // null = unassigned
  min: number;
  max: number;
  inverted: boolean;  // Reverse the MIDI value
}

/**
 * MIDI Learn events
 */
export interface MidiLearnEvents {
  onLearnStart?: (parameterPath: string) => void;
  onLearnCancel?: (parameterPath: string) => void;
  onLearnComplete?: (assignment: MidiCCAssignment) => void;
  onCcMappingUpdate?: (assignments: ReadonlyArray<MidiCCAssignment>) => void;
}

/**
 * MIDI Learn result
 */
export interface MidiLearnResult {
  cancelled: string | null;  // Previous learning that was cancelled, or null
}
