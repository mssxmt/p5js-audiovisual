/**
 * Unit tests for MidiManager channel filter functionality
 * Tests MIDI channel filtering for CC and Program Change messages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MidiManager } from './MidiManager';
import type { MidiChannelFilter } from '../types/midi';

// Mock MIDI port
class MockMIDIPort implements MIDIInput {
  id: string;
  manufacturer: string | null;
  name: string;
  version: string | null;
  type: 'input' | 'output';
  state: MIDIPortDeviceState = 'connected';
  connection: MIDIPortConnectionState = 'closed';
  onmidimessage: ((event: MIDIMessageEvent) => void) | null = null;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null = null;

  constructor(
    id: string,
    name: string,
    type: 'input' | 'output',
    manufacturer: string | null = null
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.manufacturer = manufacturer;
    this.version = null;
  }

  open(): Promise<MIDIPort> {
    this.connection = 'open';
    this.state = 'connected';
    return Promise.resolve(this);
  }

  close(): Promise<MIDIPort> {
    this.connection = 'closed';
    this.state = 'disconnected';
    return Promise.resolve(this);
  }

  // Simulate receiving MIDI message
  simulateMessage(data: number[]): void {
    if (this.onmidimessage) {
      const event = new MessageEvent('midimessage', { data: new Uint8Array(data) });
      this.onmidimessage(event as unknown as MIDIMessageEvent);
    }
  }

  addEventListener(type: string, _listener: EventListener): void {
    if (type === 'midimessage') {
      this.onmidimessage = _listener as ((event: MIDIMessageEvent) => void);
    }
  }

  removeEventListener(type: string, _listener: EventListener): void {
    if (type === 'midimessage') {
      this.onmidimessage = null;
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// Mock MIDIAccess
class MockMIDIAccess implements MIDIAccess {
  inputs: Map<string, MIDIInput>;
  outputs: Map<string, MIDIOutput>;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null = null;
  sysexEnabled: boolean = false;

  public inputPorts: Map<string, MockMIDIPort>;

  constructor(sysexEnabled: boolean = false) {
    this.sysexEnabled = sysexEnabled;
    this.inputPorts = new Map();
    this.inputs = new Map();
    this.outputs = new Map();
  }

  addInput(id: string, name: string, manufacturer: string | null = null): MockMIDIPort {
    const port = new MockMIDIPort(id, name, 'input', manufacturer);
    this.inputPorts.set(id, port);
    this.inputs.set(id, port as MIDIInput);
    return port;
  }

  addEventListener(type: string, _listener: EventListener): void {
    if (type === 'statechange') {
      this.onstatechange = _listener as ((event: MIDIConnectionEvent) => void);
    }
  }

  removeEventListener(type: string, _listener: EventListener): void {
    if (type === 'statechange') {
      this.onstatechange = null;
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

describe('MidiManager - Channel Filter', () => {
  let manager: MidiManager;
  let mockAccess: MockMIDIAccess;
  let onCcChangeSpy: ReturnType<typeof vi.fn>;
  let onProgramChangeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock MIDI access
    mockAccess = new MockMIDIAccess(false);

    // Add default device
    mockAccess.addInput('input1', 'Test Keyboard', 'Yamaha');

    // Mock navigator.requestMIDIAccess
    globalThis.navigator.requestMIDIAccess = vi.fn(() => Promise.resolve(mockAccess)) as any;

    onCcChangeSpy = vi.fn();
    onProgramChangeSpy = vi.fn();

    manager = new MidiManager({
      onCcChange: onCcChangeSpy,
      onProgramChange: onProgramChangeSpy,
    });
  });

  afterEach(() => {
    manager.stop();
    vi.clearAllMocks();
  });

  describe('setChannelFilter / getChannelFilter', () => {
    it('should set and get channel filter', () => {
      manager.setChannelFilter('5');
      expect(manager.getChannelFilter()).toBe('5');
    });

    it('should default to "all" channel filter', () => {
      expect(manager.getChannelFilter()).toBe('all');
    });

    it('should accept "all" filter', () => {
      manager.setChannelFilter('all');
      expect(manager.getChannelFilter()).toBe('all');
    });

    it('should accept "off" filter', () => {
      manager.setChannelFilter('off');
      expect(manager.getChannelFilter()).toBe('off');
    });

    it('should accept channel numbers "0" to "15"', () => {
      const channels: MidiChannelFilter[] = [
        '0', '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12', '13', '14', '15',
      ];

      channels.forEach((channel) => {
        manager.setChannelFilter(channel);
        expect(manager.getChannelFilter()).toBe(channel);
      });
    });
  });

  describe('handleCC with channel filter', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should process CC message when filter is "all"', () => {
      manager.setChannelFilter('all');

      manager.addCCMapping({
        channel: 3,
        ccNumber: 10,
        parameterPath: 'test.param',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xB3, 10, 64]); // Channel 3, CC 10, value 64
      }

      expect(manager.getCCValue(3, 10)).toBeCloseTo(64 / 127, 5);
      expect(onCcChangeSpy).toHaveBeenCalled();
    });

    it('should process CC message when channel matches filter', () => {
      manager.setChannelFilter('5'); // Channel 5

      manager.addCCMapping({
        channel: 5,
        ccNumber: 20,
        parameterPath: 'test.param',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xB5, 20, 100]); // Channel 5, CC 20, value 100
      }

      expect(manager.getCCValue(5, 20)).toBeCloseTo(100 / 127, 5);
      expect(onCcChangeSpy).toHaveBeenCalled();
    });

    it('should ignore CC message when channel does not match filter', () => {
      manager.setChannelFilter('3'); // Channel 3 only

      manager.addCCMapping({
        channel: 5,
        ccNumber: 20,
        parameterPath: 'test.param',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xB5, 20, 100]); // Channel 5, CC 20, value 100
      }

      // Should not update value
      expect(manager.getCCValue(5, 20)).toBe(0);
      expect(onCcChangeSpy).not.toHaveBeenCalled();
    });

    it('should ignore all CC messages when filter is "off"', () => {
      manager.setChannelFilter('off');

      manager.addCCMapping({
        channel: 3,
        ccNumber: 10,
        parameterPath: 'test.param',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xB3, 10, 64]); // Channel 3, CC 10, value 64
      }

      expect(manager.getCCValue(3, 10)).toBe(0);
      expect(onCcChangeSpy).not.toHaveBeenCalled();
    });

    it('should process CC from all channels when filter is "all"', () => {
      manager.setChannelFilter('all');

      // Add mappings for different channels
      manager.addCCMapping({
        channel: 0,
        ccNumber: 10,
        parameterPath: 'test.param1',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      manager.addCCMapping({
        channel: 7,
        ccNumber: 20,
        parameterPath: 'test.param2',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      manager.addCCMapping({
        channel: 15,
        ccNumber: 30,
        parameterPath: 'test.param3',
        min: 0,
        max: 1,
        currentValue: 0,
      });

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        // Channel 0
        port.simulateMessage([0xB0, 10, 50]);
        // Channel 7
        port.simulateMessage([0xB7, 20, 75]);
        // Channel 15
        port.simulateMessage([0xBF, 30, 100]);
      }

      expect(manager.getCCValue(0, 10)).toBeCloseTo(50 / 127, 5);
      expect(manager.getCCValue(7, 20)).toBeCloseTo(75 / 127, 5);
      expect(manager.getCCValue(15, 30)).toBeCloseTo(100 / 127, 5);
      expect(onCcChangeSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('handleProgramChange with channel filter', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should process program change when filter is "all"', () => {
      manager.setChannelFilter('all');

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xC3, 42, 0]); // Channel 3, program 42
      }

      expect(manager.getData().programChange).toBe(42);
      expect(onProgramChangeSpy).toHaveBeenCalledWith(42);
    });

    it('should process program change when channel matches filter', () => {
      manager.setChannelFilter('7'); // Channel 7

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xC7, 25, 0]); // Channel 7, program 25
      }

      expect(manager.getData().programChange).toBe(25);
      expect(onProgramChangeSpy).toHaveBeenCalledWith(25);
    });

    it('should ignore program change when channel does not match filter', () => {
      manager.setChannelFilter('3'); // Channel 3 only

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xC7, 25, 0]); // Channel 7, program 25
      }

      expect(manager.getData().programChange).toBeNull();
      expect(onProgramChangeSpy).not.toHaveBeenCalled();
    });

    it('should ignore all program changes when filter is "off"', () => {
      manager.setChannelFilter('off');

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xC3, 42, 0]); // Channel 3, program 42
      }

      expect(manager.getData().programChange).toBeNull();
      expect(onProgramChangeSpy).not.toHaveBeenCalled();
    });
  });
});
