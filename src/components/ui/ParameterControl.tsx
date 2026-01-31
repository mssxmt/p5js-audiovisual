import React from 'react';
import type { MidiCCAssignment } from '../../types/midiAssignment';
import { Slider } from './Slider';
import { MidiLearnButton } from './MidiLearnButton';
import { MidiMappingDisplay } from './MidiMappingDisplay';

export interface ParameterControlProps {
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  // MIDI Learn
  midiAssignment: MidiCCAssignment | null;
  isLearning: boolean;
  onStartLearning: () => void;
  onClearAssignment: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Parameter control row with slider and MIDI Learn
 * Layout: [Label] [Slider......] [MIDI] [Assignment]
 */
export const ParameterControl: React.FC<ParameterControlProps> = ({
  name,
  value,
  min,
  max,
  step,
  onChange,
  midiAssignment,
  isLearning,
  onStartLearning,
  onClearAssignment,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`parameter-control ${className}`}>
      <div className="parameter-info">
        <label className="parameter-name">{name}</label>
        <MidiMappingDisplay assignment={midiAssignment} />
      </div>
      <div className="parameter-controls">
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          disabled={disabled}
        />
        <MidiLearnButton
          isLearning={isLearning}
          isAssigned={midiAssignment !== null}
          onToggleLearn={onStartLearning}
          onClearAssignment={onClearAssignment}
        />
      </div>
    </div>
  );
};
