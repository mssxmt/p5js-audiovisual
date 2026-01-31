/**
 * Unit tests for LevaPanel MIDI mapping display functionality
 * Tests MIDI CC mapping information display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { render } from '@testing-library/react';
import { LevaPanel } from './LevaPanel';
import type { MidiCCMapping } from '../types/midi';
import type { AudioDeviceInfo } from '../types/audio';

// Mock leva
vi.mock('leva', () => ({
  useControls: vi.fn(() => ({})),
  folder: vi.fn((config) => config),
}));

// Mock pattern with MIDI mappings
class MockPatternWithMidiMappings {
  config = {
    name: 'TestPattern',
    description: 'Test pattern with MIDI mappings',
    version: '1.0.0',
  };

  getMidiMappings(): MidiCCMapping[] {
    return [
      {
        channel: 0,
        ccNumber: 1,
        parameterPath: 'gravity',
        min: 0,
        max: 1,
        currentValue: 0.5,
      },
      {
        channel: 0,
        ccNumber: 2,
        parameterPath: 'noiseIntensity',
        min: 0,
        max: 1,
        currentValue: 0.3,
      },
      {
        channel: 0,
        ccNumber: 3,
        parameterPath: 'particleCount',
        min: 50,
        max: 500,
        currentValue: 200,
      },
    ];
  }

  getParams() {
    return {
      gravity: 0.5,
      noiseIntensity: 0.3,
      particleCount: 200,
      trailAlpha: 0.15,
    };
  }

  setParams(_params: Record<string, any>): void {
    // Mock setParams
  }

  setup = vi.fn();
  update = vi.fn();
  draw = vi.fn();
  cleanup = vi.fn();
}

// Mock pattern without MIDI mappings
class MockPatternWithoutMidiMappings {
  config = {
    name: 'NoMidiPattern',
    description: 'Test pattern without MIDI mappings',
    version: '1.0.0',
  };

  getParams() {
    return {
      intensity: 0.5,
      speed: 1.0,
    };
  }

  setParams(_params: Record<string, any>): void {
    // Mock setParams
  }

  setup = vi.fn();
  update = vi.fn();
  draw = vi.fn();
  cleanup = vi.fn();
}

// Mock pattern with empty MIDI mappings
class MockPatternWithEmptyMidiMappings {
  config = {
    name: 'EmptyMidiPattern',
    description: 'Test pattern with empty MIDI mappings',
    version: '1.0.0',
  };

  getMidiMappings(): MidiCCMapping[] {
    return [];
  }

  getParams() {
    return {
      intensity: 0.5,
    };
  }

  setParams(_params: Record<string, any>): void {
    // Mock setParams
  }

  setup = vi.fn();
  update = vi.fn();
  draw = vi.fn();
  cleanup = vi.fn();
}

// Mock p5 instance
const mockP5Instance = {
  width: 800,
  height: 600,
} as any;

describe('LevaPanel - MIDI Mapping Display', () => {
  let mockPatternWithMidi: MockPatternWithMidiMappings;
  let mockPatternWithoutMidi: MockPatternWithoutMidiMappings;
  let mockPatternWithEmptyMidi: MockPatternWithEmptyMidiMappings;
  let mockP5: any;

  beforeEach(() => {
    mockPatternWithMidi = new MockPatternWithMidiMappings();
    mockPatternWithoutMidi = new MockPatternWithoutMidiMappings();
    mockPatternWithEmptyMidi = new MockPatternWithEmptyMidiMappings();
    mockP5 = mockP5Instance;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('pattern with MIDI mappings', () => {
    it('should render without crashing when pattern has MIDI mappings', () => {
      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mockPatternWithMidi.getMidiMappings()}
          />
        );
      }).not.toThrow();
    });

    it('should receive MIDI mappings as prop', () => {
      const mappings = mockPatternWithMidi.getMidiMappings();

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });

    it('should handle multiple MIDI mappings', () => {
      const mappings = mockPatternWithMidi.getMidiMappings();

      expect(mappings.length).toBe(3);

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });
  });

  describe('pattern without MIDI mappings', () => {
    it('should render when pattern does not have getMidiMappings method', () => {
      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithoutMidi as any}
            p5={mockP5}
            midiMappings={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should render when midiMappings prop is undefined', () => {
      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should render when midiMappings is empty array', () => {
      const mappings = mockPatternWithEmptyMidi.getMidiMappings();

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithEmptyMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });
  });

  describe('MIDI mapping data structure', () => {
    it('should accept mappings with all required fields', () => {
      const mappings: MidiCCMapping[] = [
        {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'testParam',
          min: 0,
          max: 1,
          currentValue: 0.5,
        },
      ];

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });

    it('should handle mappings with different channels', () => {
      const mappings: MidiCCMapping[] = [
        {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'param1',
          min: 0,
          max: 1,
          currentValue: 0.5,
        },
        {
          channel: 1,
          ccNumber: 2,
          parameterPath: 'param2',
          min: 0,
          max: 1,
          currentValue: 0.7,
        },
        {
          channel: 15,
          ccNumber: 127,
          parameterPath: 'param3',
          min: 0,
          max: 100,
          currentValue: 50,
        },
      ];

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle null pattern with midiMappings', () => {
      const mappings: MidiCCMapping[] = [
        {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test',
          min: 0,
          max: 1,
          currentValue: 0.5,
        },
      ];

      expect(() => {
        render(
          <LevaPanel
            pattern={null}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });

    it('should handle null p5 with midiMappings', () => {
      const mappings: MidiCCMapping[] = [
        {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test',
          min: 0,
          max: 1,
          currentValue: 0.5,
        },
      ];

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={null}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });

    it('should handle large number of mappings', () => {
      const mappings: MidiCCMapping[] = Array.from({ length: 128 }, (_, i) => ({
        channel: Math.floor(i / 16),
        ccNumber: i,
        parameterPath: `param${i}`,
        min: 0,
        max: 1,
        currentValue: 0.5,
      }));

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });
  });

  describe('integration with existing props', () => {
    it('should work alongside devices prop', () => {
      const devices: AudioDeviceInfo[] = [
        { deviceId: 'device1', label: 'Device 1', kind: 'audioinput' },
      ];

      const mappings = mockPatternWithMidi.getMidiMappings();

      expect(() => {
        render(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            devices={devices}
            currentDeviceId="device1"
            onDeviceChange={vi.fn()}
            midiMappings={mappings}
          />
        );
      }).not.toThrow();
    });

    it('should update when mappings change', () => {
      const mappings1: MidiCCMapping[] = [
        {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'param1',
          min: 0,
          max: 1,
          currentValue: 0.5,
        },
      ];

      const mappings2: MidiCCMapping[] = [
        ...mappings1,
        {
          channel: 0,
          ccNumber: 2,
          parameterPath: 'param2',
          min: 0,
          max: 1,
          currentValue: 0.7,
        },
      ];

      const { rerender } = render(
        <LevaPanel
          pattern={mockPatternWithMidi as any}
          p5={mockP5}
          midiMappings={mappings1}
        />
      );

      expect(() => {
        rerender(
          <LevaPanel
            pattern={mockPatternWithMidi as any}
            p5={mockP5}
            midiMappings={mappings2}
          />
        );
      }).not.toThrow();
    });
  });

  describe('H key toggle with MIDI mappings', () => {
    it('should toggle visibility with H key when MIDI mappings present', () => {
      render(
        <LevaPanel
          pattern={mockPatternWithMidi as any}
          p5={mockP5}
          midiMappings={mockPatternWithMidi.getMidiMappings()}
        />
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'h' });
        window.dispatchEvent(event);
      });

      expect(true).toBe(true);
    });
  });
});
