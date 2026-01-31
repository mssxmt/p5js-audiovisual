import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type p5 from 'p5';
import type { AudioDeviceInfo } from '../types/audio';
import type { MidiCCAssignment, MidiLearnState } from '../types/midiAssignment';
import type { MidiChannelFilter } from '../types/midi';
import { MIDI_CHANNEL_LABELS } from '../types/midi';
import { ParameterControl } from './ui/ParameterControl';
import './ui/control-panel.css';

// Pattern with parameters interface
interface PatternWithParams {
  name?: string;
  getParams?(): Record<string, any>;
  setParams?(params: Record<string, any>): void;
  getParamMeta?(): Record<string, { min: number; max: number; step: number }>;
}

export interface ControlPanelProps {
  pattern: PatternWithParams | null;
  p5: p5 | null;
  devices?: AudioDeviceInfo[];
  currentDeviceId?: string | null;
  onDeviceChange?: (deviceId: string) => void;
  // MIDI Learn
  midiAssignments: ReadonlyArray<MidiCCAssignment>;
  midiLearnState: MidiLearnState;
  activeLearningParam: string | null;
  onStartLearning: (paramName: string) => void;
  onCancelLearning: () => void;
  onRemoveAssignment: (paramName: string) => void;
  midiChannelFilter?: MidiChannelFilter;
  onMidiChannelChange?: (filter: MidiChannelFilter) => void;
}

/**
 * Custom Control Panel replacing Leva
 * Features:
 * - Parameter-based layout with sliders
 * - MIDI Learn button for each parameter
 * - MIDI assignment display
 * - Audio device selection
 * - MIDI channel filter
 * - Toggle with H key
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  pattern,
  devices = [],
  currentDeviceId,
  onDeviceChange,
  midiAssignments,
  midiLearnState,
  activeLearningParam,
  onStartLearning,
  onCancelLearning,
  onRemoveAssignment,
  midiChannelFilter = 'all',
  onMidiChannelChange,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [localParams, setLocalParams] = useState<Record<string, any>>({});

  // Initialize local params from pattern
  useEffect(() => {
    if (pattern?.getParams) {
      try {
        const params = pattern.getParams();
        setLocalParams(params);
      } catch (error) {
        console.error('Error getting pattern parameters:', error);
      }
    }
  }, [pattern]);

  // Listen for parameter updates from MIDI
  useEffect(() => {
    const handleParameterUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ name: string; value: number }>;
      const { name, value } = customEvent.detail;
      setLocalParams(prev => ({ ...prev, [name]: value }));
    };

    window.addEventListener('parameterUpdate', handleParameterUpdate);
    return () => window.removeEventListener('parameterUpdate', handleParameterUpdate);
  }, []);

  // Handle keyboard toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'h') {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get assignment for a parameter
  const getAssignmentForParam = useCallback((paramName: string): MidiCCAssignment | null => {
    return midiAssignments.find(a => a.parameterName === paramName) ?? null;
  }, [midiAssignments]);

  // Handle parameter change
  const handleParamChange = useCallback((paramName: string, value: any) => {
    setLocalParams(prev => ({ ...prev, [paramName]: value }));
    pattern?.setParams?.({ [paramName]: value });
  }, [pattern]);

  // Handle MIDI Learn start
  const handleStartLearning = useCallback((paramName: string) => {
    if (midiLearnState === 'learning' && activeLearningParam !== paramName) {
      // Already learning something else, will auto-cancel
      onStartLearning(paramName);
    } else if (midiLearnState === 'learning' && activeLearningParam === paramName) {
      // Cancel current learning
      onCancelLearning();
    } else {
      // Start new learning
      onStartLearning(paramName);
    }
  }, [midiLearnState, activeLearningParam, onStartLearning, onCancelLearning]);

  // Create MIDI channel options
  const midiChannelOptions = useMemo(() => {
    const options: Record<string, MidiChannelFilter> = {};
    options[MIDI_CHANNEL_LABELS.all] = 'all';
    options[MIDI_CHANNEL_LABELS.off] = 'off';
    for (let i = 0; i < 16; i++) {
      const channel = i.toString() as MidiChannelFilter;
      options[MIDI_CHANNEL_LABELS[channel]] = channel;
    }
    return options;
  }, []);

  // Handle MIDI channel change
  const handleMidiChannelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    const channel = midiChannelOptions[label];
    if (channel && onMidiChannelChange) {
      onMidiChannelChange(channel);
    }
  }, [midiChannelOptions, onMidiChannelChange]);

  // Handle audio device change
  const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    if (deviceId && onDeviceChange) {
      onDeviceChange(deviceId);
    }
  }, [onDeviceChange]);

  if (!isVisible) {
    return null;
  }

  // Check if value is a color object
  const isColorObject = (value: any): boolean => {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'r' in value &&
      'g' in value &&
      'b' in value
    );
  };

  // Get parameter metadata (min, max, step)
  const getParamMeta = (key: string, value: any): { min: number; max: number; step: number } => {
    // Try pattern.getParamMeta first
    if (pattern?.getParamMeta) {
      const metaMap = pattern.getParamMeta();
      if (metaMap[key]) {
        return metaMap[key];
      }
    }

    // Fallback: check if value object has min/max/step
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const hasMin = 'min' in value;
      const hasMax = 'max' in value;
      const hasStep = 'step' in value;
      if (hasMin && hasMax && hasStep) {
        return { min: value.min, max: value.max, step: value.step };
      }
    }

    // Final fallback: sensible defaults
    const numValue = typeof value === 'number' ? value : 0;
    if (numValue >= 0 && numValue <= 1) {
      return { min: 0, max: 1, step: 0.01 };
    }
    if (key.includes('Count')) {
      return { min: 1, max: 2000, step: 1 };
    }
    if (key.includes('Radius') || key.includes('Length')) {
      return { min: 0, max: 500, step: 1 };
    }
    // Default for most parameters
    return { min: 0, max: 1, step: 0.01 };
  };

  return (
    <div className="control-panel">
      <div className="control-panel-header">
        <h2>Controls</h2>
        <button
          className="close-button"
          onClick={() => setIsVisible(false)}
          title="Press H to toggle"
        >
          ×
        </button>
      </div>

      <div className="control-panel-content">
        {/* Audio Device Selection */}
        {devices.length > 0 && (
          <div className="control-section">
            <h3>Audio</h3>
            <div className="control-row">
              <label>Device</label>
              <select
                value={currentDeviceId ?? ''}
                onChange={handleDeviceChange}
                className="control-select"
              >
                <option value="">Select device...</option>
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* MIDI Channel Filter */}
        <div className="control-section">
          <h3>MIDI</h3>
          <div className="control-row">
            <label>Channel</label>
            <select
              value={MIDI_CHANNEL_LABELS[midiChannelFilter]}
              onChange={handleMidiChannelChange}
              className="control-select"
            >
              {Object.entries(midiChannelOptions).map(([label, value]) => (
                <option key={value} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {midiLearnState === 'learning' && (
            <div className="midi-learning-status">
              <span className="blink">Learning...</span> Move a MIDI controller to assign
            </div>
          )}
        </div>

        {/* Pattern Parameters */}
        {pattern && (
          <div className="control-section">
            <h3>{pattern.name ?? 'Parameters'}</h3>
            {Object.entries(localParams).map(([key, value]) => {
              // Skip color objects for now
              if (isColorObject(value)) {
                return null;
              }

              // Handle select options
              if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'options' in value) {
                return (
                  <div key={key} className="control-row">
                    <label>{key}</label>
                    <select
                      value={String(value.value)}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="control-select"
                    >
                      {Object.entries(value.options).map(([label, val]) => (
                        <option key={String(val)} value={String(val)}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              // Handle number values with slider
              if (typeof value === 'number' || (typeof value === 'object' && value !== null && 'value' in value)) {
                const numValue = typeof value === 'number' ? value : value.value;
                const { min, max, step } = getParamMeta(key, value);

                return (
                  <ParameterControl
                    key={key}
                    name={key}
                    value={numValue}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(newValue) => handleParamChange(key, newValue)}
                    midiAssignment={getAssignmentForParam(key)}
                    isLearning={activeLearningParam === key}
                    onStartLearning={() => handleStartLearning(key)}
                    onClearAssignment={() => onRemoveAssignment(key)}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
};
