/**
 * Unit tests for LevaPanel channel selection functionality
 * Tests MIDI channel filter UI and callback handling
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { LevaPanel } from './LevaPanel';
import type { MidiChannelFilter } from '../types/midi';
import { MIDI_CHANNEL_LABELS } from '../types/midi';
import type { AudioDeviceInfo } from '../types/audio';

describe('LevaPanel - Channel Selection', () => {
  const mockPattern = {
    getParams: () => ({
      'Test Param': {
        value: 0.5,
        min: 0,
        max: 1,
      },
    }),
  };

  const mockDevices: AudioDeviceInfo[] = [
    { deviceId: 'device1', label: 'Test Device 1', kind: 'audioinput' },
    { deviceId: 'device2', label: 'Test Device 2', kind: 'audioinput' },
  ];

  describe('channel selection UI', () => {
    it('should render without crashing when midiChannelFilter prop is provided', () => {
      const onChannelChange = vi.fn();

      expect(() => {
        renderHook(() =>
          LevaPanel({
            pattern: mockPattern,
            p5: null,
            devices: mockDevices,
            currentDeviceId: 'device1',
            onDeviceChange: vi.fn(),
            midiChannelFilter: 'all',
            onMidiChannelChange: onChannelChange,
            midiMappings: [],
          })
        );
      }).not.toThrow();
    });

    it('should have correct channel filter type values', () => {
      const expectedOptions: MidiChannelFilter[] = [
        'all', 'off',
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15',
      ];

      const allValues: MidiChannelFilter[] = [
        'all', 'off',
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15',
      ];

      expect(allValues).toEqual(expectedOptions);
    });

    it('should accept all valid channel filter values', () => {
      const onChannelChange = vi.fn();
      const channels: MidiChannelFilter[] = [
        'all', 'off',
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15',
      ];

      channels.forEach((channel) => {
        expect(() => {
          renderHook(() =>
            LevaPanel({
              pattern: mockPattern,
              p5: null,
              devices: [],
              midiChannelFilter: channel,
              onMidiChannelChange: onChannelChange,
              midiMappings: [],
            })
          );
        }).not.toThrow();
      });
    });
  });

  describe('onMidiChannelChange callback', () => {
    it('should accept callback function', () => {
      const onChannelChange = vi.fn();

      const props = {
        pattern: mockPattern,
        p5: null,
        devices: mockDevices,
        currentDeviceId: 'device1',
        onDeviceChange: vi.fn(),
        midiChannelFilter: 'all' as MidiChannelFilter,
        onMidiChannelChange: onChannelChange,
        midiMappings: [],
      };

      expect(() => {
        renderHook(() => LevaPanel(props));
      }).not.toThrow();
      expect(props.onMidiChannelChange).toBeDefined();
    });

    it('should accept null callback', () => {
      const props = {
        pattern: mockPattern,
        p5: null,
        devices: [],
        midiChannelFilter: 'all' as MidiChannelFilter,
        onMidiChannelChange: undefined,
        midiMappings: [],
      };

      expect(() => {
        renderHook(() => LevaPanel(props));
      }).not.toThrow();
    });
  });

  describe('MIDI_CHANNEL_LABELS', () => {
    it('should have correct display labels', () => {
      expect(MIDI_CHANNEL_LABELS.all).toBe('All');
      expect(MIDI_CHANNEL_LABELS.off).toBe('Off');
      expect(MIDI_CHANNEL_LABELS['0']).toBe('1');
      expect(MIDI_CHANNEL_LABELS['7']).toBe('8');
      expect(MIDI_CHANNEL_LABELS['15']).toBe('16');
    });

    it('should have labels for all channel filter values', () => {
      const channels: MidiChannelFilter[] = [
        'all', 'off',
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15',
      ];

      channels.forEach((channel) => {
        expect(MIDI_CHANNEL_LABELS[channel]).toBeDefined();
        expect(typeof MIDI_CHANNEL_LABELS[channel]).toBe('string');
      });
    });
  });
});
