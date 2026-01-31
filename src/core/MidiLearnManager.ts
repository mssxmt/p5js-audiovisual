/**
 * MidiLearnManager - Manages MIDI Learn state and CC assignments
 *
 * Handles:
 * - Exclusive Learn state (only one parameter can learn at a time)
 * - MIDI CC assignment to parameters
 * - Learn cancellation and completion events
 */

import type { MidiCCAssignment, MidiLearnEvents, MidiLearnState, MidiLearnResult } from '../types/midiAssignment';

/**
 * MidiLearnManager - Manages MIDI Learn functionality
 */
export class MidiLearnManager {
  private learnState: MidiLearnState = 'idle';
  private activeLearning: string | null = null; // parameterPath
  private mappings: Map<string, MidiCCAssignment> = new Map();
  private events: MidiLearnEvents = {};

  constructor(events: MidiLearnEvents = {}) {
    this.events = events;
  }

  /**
   * Get current learn state
   */
  getState(): MidiLearnState {
    return this.learnState;
  }

  /**
   * Check if currently learning
   */
  isLearning(): boolean {
    return this.learnState === 'learning';
  }

  /**
   * Get the parameter currently being learned
   */
  getActiveLearning(): string | null {
    return this.activeLearning;
  }

  /**
   * Start learning a parameter
   * @param parameterPath - Path to parameter (e.g., 'diskRadius')
   * @returns Result with cancelled previous learning if any
   */
  startLearning(parameterPath: string): MidiLearnResult {
    const cancelled = this.activeLearning;

    if (cancelled) {
      // Cancel previous learning
      console.log(`[MidiLearn] Canceling learning: ${cancelled} → Starting: ${parameterPath}`);
      this.events.onLearnCancel?.(cancelled);
    }

    this.activeLearning = parameterPath;
    this.learnState = 'learning';
    this.events.onLearnStart?.(parameterPath);

    return { cancelled };
  }

  /**
   * Cancel current learning
   */
  cancelLearning(): void {
    if (this.activeLearning) {
      const cancelled = this.activeLearning;
      console.log(`[MidiLearn] Learning cancelled: ${cancelled}`);
      this.activeLearning = null;
      this.learnState = 'idle';
      this.events.onLearnCancel?.(cancelled);
    }
  }

  /**
   * Handle MIDI CC message during learn mode
   * @param channel - MIDI channel (0-15)
   * @param ccNumber - CC number (0-127)
   * @returns true if CC was consumed (learn mode active)
   */
  handleMidiInput(channel: number, ccNumber: number): boolean {
    if (this.learnState !== 'learning' || !this.activeLearning) {
      return false;
    }

    console.log(`[MidiLearn] Received MIDI: Ch${channel} CC${ccNumber} → ${this.activeLearning}`);

    // Create assignment
    const assignment: MidiCCAssignment = {
      parameterName: this.activeLearning,
      channel,
      ccNumber,
      min: 0,
      max: 1,
      inverted: false,
    };

    this.completeLearning(assignment);
    return true;
  }

  /**
   * Complete learning and register the assignment
   */
  private completeLearning(assignment: MidiCCAssignment): void {
    const key = `${assignment.channel}:${assignment.ccNumber}`;
    this.mappings.set(key, assignment);

    const param = this.activeLearning!;
    this.activeLearning = null;
    this.learnState = 'idle';

    console.log(`[MidiLearn] Learning complete: ${param} → Ch${assignment.channel} CC${assignment.ccNumber}`);

    this.events.onLearnComplete?.(assignment);
    this.events.onCcMappingUpdate?.(Array.from(this.mappings.values()));
  }

  /**
   * Get all MIDI CC assignments
   */
  getAssignments(): Map<string, MidiCCAssignment> {
    return new Map(this.mappings);
  }

  /**
   * Get assignment for a specific parameter
   */
  getAssignment(parameterPath: string): MidiCCAssignment | null {
    for (const assignment of this.mappings.values()) {
      if (assignment.parameterName === parameterPath) {
        return assignment;
      }
    }
    return null;
  }

  /**
   * Remove assignment for a parameter
   */
  removeAssignment(parameterPath: string): void {
    for (const [key, assignment] of this.mappings.entries()) {
      if (assignment.parameterName === parameterPath) {
        this.mappings.delete(key);
        console.log(`[MidiLearn] Removed assignment: ${parameterPath}`);
        this.events.onCcMappingUpdate?.(Array.from(this.mappings.values()));
        return;
      }
    }
  }

  /**
   * Clear all assignments
   */
  clearAllAssignments(): void {
    this.mappings.clear();
    console.log('[MidiLearn] All assignments cleared');
    this.events.onCcMappingUpdate?.([]);
  }

  /**
   * Map MIDI CC value (0-127) to parameter range
   */
  mapMidiValue(ccValue: number, min: number, max: number): number {
    const normalized = ccValue / 127; // 0-1
    return min + normalized * (max - min);
  }
}
