import React from 'react';

export interface MidiLearnButtonProps {
  isLearning: boolean;
  isAssigned: boolean;
  onToggleLearn: () => void;
  onClearAssignment?: () => void;
  className?: string;
}

/**
 * MIDI Learn button with blink animation
 * - Solid when assigned
 * - Blinking when learning
 * - Outlined when unassigned
 */
export const MidiLearnButton: React.FC<MidiLearnButtonProps> = ({
  isLearning,
  isAssigned,
  onToggleLearn,
  onClearAssignment,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAssigned && !isLearning && onClearAssignment) {
      onClearAssignment();
    } else {
      onToggleLearn();
    }
  };

  const buttonClassName = [
    'midi-learn-button',
    isLearning ? 'learning' : '',
    isAssigned && !isLearning ? 'assigned' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      title={
        isLearning
          ? 'Learning... (Move a MIDI controller)'
          : isAssigned
            ? 'Assigned (Click to unassign)'
            : 'Click to assign MIDI CC'
      }
    >
      <span className="midi-learn-icon">
        {isLearning ? 'M' : isAssigned ? '✓' : 'M'}
      </span>
    </button>
  );
};
