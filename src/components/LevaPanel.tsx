import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useControls } from 'leva';
import type p5 from 'p5';
import type { AudioDeviceInfo } from '../types/audio';
import type { MidiCCMapping, MidiChannelFilter } from '../types/midi';
import { MIDI_CHANNEL_LABELS } from '../types/midi';

// Pattern with parameters interface
interface PatternWithParams {
  getParams?(): Record<string, any>;
  setParams?(params: Record<string, any>): void;
}

export interface LevaPanelProps {
  pattern: PatternWithParams | null;
  p5: p5 | null;
  devices?: AudioDeviceInfo[];
  currentDeviceId?: string | null;
  onDeviceChange?: (deviceId: string) => void;
  midiMappings?: ReadonlyArray<MidiCCMapping>;
  midiChannelFilter?: MidiChannelFilter;
  onMidiChannelChange?: (filter: MidiChannelFilter) => void;
}

/**
 * LevaPanel component
 * Displays Leva controls for pattern parameters
 * Toggle visibility with H key
 */
export const LevaPanel: React.FC<LevaPanelProps> = ({
  pattern,
  devices = [],
  currentDeviceId,
  onDeviceChange,
  midiMappings,
  midiChannelFilter = 'all',
  onMidiChannelChange,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  /**
   * Create MIDI mappings display text
   */
  const midiMappingsText = useMemo(() => {
    if (!midiMappings || midiMappings.length === 0) {
      return undefined;
    }

    return midiMappings
      .map(
        (m) =>
          `CC${m.ccNumber} (${m.channel}): ${m.parameterPath} [${m.min}-${m.max}]`
      )
      .join('\n');
  }, [midiMappings]);

  /**
   * Create device options for Leva select
   */
  const deviceOptions = useMemo(() => {
    if (!devices || devices.length === 0) {
      return {};
    }
    return devices.reduce((acc, device) => {
      acc[device.label] = device.deviceId;
      return acc;
    }, {} as Record<string, string>);
  }, [devices]);

  /**
   * Get initial device value for Leva
   */
  const initialDeviceValue = useMemo(() => {
    if (!currentDeviceId || devices.length === 0) {
      return undefined;
    }
    const device = devices.find((d) => d.deviceId === currentDeviceId);
    return device?.label;
  }, [currentDeviceId, devices]);

  /**
   * Check if device should trigger onChange (only when user manually changes)
   */
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Mark as initialized after mount
    setIsInitialized(true);
  }, []);

  /**
   * Create MIDI channel options for Leva select
   */
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

  /**
   * Get initial MIDI channel value for Leva
   */
  const initialMidiChannelValue = useMemo(() => {
    return MIDI_CHANNEL_LABELS[midiChannelFilter];
  }, [midiChannelFilter]);

  /**
   * Handle keyboard events for toggling visibility
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle with H key (case-insensitive)
      if (event.key.toLowerCase() === 'h') {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Get parameters configuration from pattern with onChange handlers
   */
  const paramsConfig = useMemo(() => {
    if (!pattern?.getParams || !pattern?.setParams) {
      return {};
    }

    try {
      const params = pattern.getParams();
      const config: Record<string, any> = {};

      // Add onChange handler to each parameter
      for (const [key, value] of Object.entries(params)) {
        const currentPattern = pattern;

        // Check if value is a color object (has r, g, b properties)
        const isColorObject =
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          'r' in value &&
          'g' in value &&
          'b' in value &&
          typeof value.r === 'number' &&
          typeof value.g === 'number' &&
          typeof value.b === 'number';

        if (isColorObject) {
          // Convert RGB (0-255) to Leva color format (0-1)
          const colorObj = value as { r: number; g: number; b: number };
          const levaColor = {
            r: colorObj.r / 255,
            g: colorObj.g / 255,
            b: colorObj.b / 255,
          };

          config[key] = {
            value: levaColor,
            onChange: (newValue: unknown) => {
              // Convert back from Leva (0-1) to RGB (0-255)
              const levaColorValue = newValue as { r: number; g: number; b: number };
              const rgbColor = {
                r: Math.round(levaColorValue.r * 255),
                g: Math.round(levaColorValue.g * 255),
                b: Math.round(levaColorValue.b * 255),
              };
              console.log('[Leva Panel] Color changed:', {
                key,
                levaValue: levaColorValue,
                rgbValue: rgbColor,
              });
              (currentPattern as any)?.setParams({ [key]: rgbColor });
            },
          };
        } else {
          // For regular values
          config[key] = {
            value,
            onChange: (newValue: unknown) => {
              (currentPattern as any)?.setParams({ [key]: newValue });
            },
          };

          // Preserve special Leva options if present
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const valueObj = value as Record<string, unknown>;
            if ('options' in valueObj) {
              config[key].options = valueObj.options;
            }
            if ('min' in valueObj) {
              config[key].min = valueObj.min;
            }
            if ('max' in valueObj) {
              config[key].max = valueObj.max;
            }
            if ('step' in valueObj) {
              config[key].step = valueObj.step;
            }
          }
        }
      }

      return config;
    } catch (error) {
      console.error('Error getting pattern parameters:', error);
      return {};
    }
  }, [pattern]);

  /**
   * Handle device change
   */
  const handleDeviceChangeChange = useCallback((value: unknown) => {
    // Skip during initialization to prevent double initialization
    if (!isInitialized) {
      return;
    }
    if (typeof value === 'string' && onDeviceChange) {
      const deviceId = deviceOptions[value];
      if (deviceId) {
        onDeviceChange(deviceId);
      }
    }
  }, [deviceOptions, onDeviceChange, isInitialized]);

  /**
   * Handle MIDI channel change
   */
  const handleMidiChannelChangeChange = useCallback((value: unknown) => {
    if (typeof value === 'string' && onMidiChannelChange) {
      const channel = midiChannelOptions[value];
      if (channel) {
        onMidiChannelChange(channel);
      }
    }
  }, [midiChannelOptions, onMidiChannelChange]);

  /**
   * Set up Leva controls
   */
  useControls(() => {
    // If not visible, return empty config
    if (!isVisible) {
      return {};
    }

    const config: Record<string, any> = {};

    // Add audio device selection if available
    if (devices.length > 0 && Object.keys(deviceOptions).length > 0) {
      const deviceConfig: any = {
        value: initialDeviceValue,
        options: deviceOptions,
      };

      if (onDeviceChange) {
        deviceConfig.onChange = handleDeviceChangeChange;
      }

      config['Audio Device'] = deviceConfig;
    }

    // Add MIDI channel selection
    const midiChannelConfig: any = {
      value: initialMidiChannelValue,
      options: midiChannelOptions,
    };

    if (onMidiChannelChange) {
      midiChannelConfig.onChange = handleMidiChannelChangeChange;
    }

    config['MIDI Channel'] = midiChannelConfig;

    // Add MIDI mappings info if available
    if (midiMappingsText) {
      config['_MIDI Mappings'] = {
        value: midiMappingsText,
        disabled: true,
        editable: false,
      };
    }

    // Add pattern parameters if pattern exists
    if (pattern) {
      Object.assign(config, paramsConfig);
    }

    return config;
  }, [isVisible, devices, deviceOptions, initialDeviceValue, handleDeviceChangeChange, midiChannelOptions, initialMidiChannelValue, handleMidiChannelChangeChange, midiMappingsText, pattern, paramsConfig]);

  // This component doesn't render anything directly
  // Leva renders its own panel based on useControls calls
  return null;
};
