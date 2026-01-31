import React from 'react';
import type { MidiCCAssignment } from '../../types/midiAssignment';

export interface MidiMappingDisplayProps {
  assignment: MidiCCAssignment | null;
  className?: string;
}

/**
 * Display MIDI CC assignment info
 * Shows "Ch X CC Y" format when assigned
 */
export const MidiMappingDisplay: React.FC<MidiMappingDisplayProps> = ({
  assignment,
  className = '',
}) => {
  if (!assignment || assignment.channel === null || assignment.ccNumber === null) {
    return (
      <span className={`midi-mapping-display empty ${className}`}>
        Unassigned
      </span>
    );
  }

  return (
    <span className={`midi-mapping-display assigned ${className}`}>
      Ch{assignment.channel + 1} CC{assignment.ccNumber}
    </span>
  );
};
