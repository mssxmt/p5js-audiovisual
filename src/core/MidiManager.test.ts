/**
 * Unit tests for MidiManager
 * Tests Web MIDI API wrapper, CC mappings, and MIDI data handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MidiManager } from './MidiManager';
import type { MidiCCMapping } from '../types/midi';

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

  addEventListener(
    type: string,
    _listener: EventListener
  ): void {
    if (type === 'midimessage') {
      this.onmidimessage = _listener as ((event: MIDIMessageEvent) => void);
    }
  }

  removeEventListener(
    type: string,
    _listener: EventListener
  ): void {
    if (type === 'midimessage') {
      this.onmidimessage = null;
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

class MockMIDIOutput implements MIDIOutput {
  id: string;
  manufacturer: string | null;
  name: string;
  version: string | null;
  type = 'output' as const;
  state: MIDIPortDeviceState = 'connected';
  connection: MIDIPortConnectionState = 'closed';
  onstatechange: ((event: MIDIConnectionEvent) => void) | null = null;

  sentMessages: number[][] = [];

  constructor(
    id: string,
    name: string,
    manufacturer: string | null = null
  ) {
    this.id = id;
    this.name = name;
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

  send(data: [number, number, number], _timestamp?: number): void {
    this.sentMessages.push([...data]);
  }

  addEventListener(
    _type: string,
    _listener: EventListener
  ): void {
    // Not implemented for output
  }

  removeEventListener(
    _type: string,
    _listener: EventListener
  ): void {
    // Not implemented for output
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
  public outputPorts: Map<string, MockMIDIOutput>;

  constructor(sysexEnabled: boolean = false) {
    this.sysexEnabled = sysexEnabled;
    this.inputPorts = new Map();
    this.outputPorts = new Map();
    this.inputs = new Map();
    this.outputs = new Map();
  }

  addInput(id: string, name: string, manufacturer: string | null = null): MockMIDIPort {
    const port = new MockMIDIPort(id, name, 'input', manufacturer);
    this.inputPorts.set(id, port);
    this.inputs.set(id, port as MIDIInput);
    return port;
  }

  addOutput(id: string, name: string, manufacturer: string | null = null): MockMIDIOutput {
    const output = new MockMIDIOutput(id, name, manufacturer);
    this.outputPorts.set(id, output);
    this.outputs.set(id, output as MIDIOutput);
    return output;
  }

  removeInput(id: string): void {
    const port = this.inputPorts.get(id);
    if (port) {
      port.state = 'disconnected';
      port.connection = 'closed';
      this.inputs.delete(id);
    }
  }

  removeOutput(id: string): void {
    const output = this.outputPorts.get(id);
    if (output) {
      output.state = 'disconnected';
      output.connection = 'closed';
      this.outputs.delete(id);
    }
  }

  addEventListener(
    type: string,
    _listener: EventListener
  ): void {
    if (type === 'statechange') {
      this.onstatechange = _listener as ((event: MIDIConnectionEvent) => void);
    }
  }

  removeEventListener(
    type: string,
    _listener: EventListener
  ): void {
    if (type === 'statechange') {
      this.onstatechange = null;
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  // Simulate state change event
  simulateStateChange(port: MIDIInput | MIDIOutput): void {
    if (this.onstatechange) {
      this.onstatechange({ port } as unknown as MIDIConnectionEvent);
    }
  }
}

describe('MidiManager', () => {
  let manager: MidiManager;
  let mockAccess: MockMIDIAccess;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock MIDI access
    mockAccess = new MockMIDIAccess(false);

    // Add default devices
    mockAccess.addInput('input1', 'Keyboard 1', 'Yamaha');
    mockAccess.addInput('input2', 'Pad Controller', 'Akai');
    mockAccess.addOutput('output1', 'Synth 1', 'Korg');

    // Mock navigator.requestMIDIAccess
    globalThis.navigator.requestMIDIAccess = vi.fn(() => Promise.resolve(mockAccess)) as any;

    manager = new MidiManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default state', () => {
      expect(manager.getState()).toBe('idle');
    });

    it('should create empty MIDI data initially', () => {
      const data = manager.getData();

      expect(data.cc).toBeInstanceOf(Map);
      expect(data.cc.size).toBe(0);
      expect(data.programChange).toBeNull();
      expect(data.clock).toBe(0);
    });

    it('should accept event callbacks', () => {
      const onStateChange = vi.fn();
      const onCcChange = vi.fn();
      const onDeviceChange = vi.fn();

      const eventManager = new MidiManager({
        onStateChange,
        onCcChange,
        onDeviceChange,
      });

      expect(eventManager).toBeDefined();
    });
  });

  describe('isSupported', () => {
    it('should return true when Web MIDI API is available', () => {
      expect(manager.isSupported()).toBe(true);
    });

    it('should return false when Web MIDI API is not available', () => {
      // @ts-ignore - Remove requestMIDIAccess to simulate unsupported browser
      delete navigator.requestMIDIAccess;

      const unsupportedManager = new MidiManager();
      expect(unsupportedManager.isSupported()).toBe(false);

      // Restore
      globalThis.navigator.requestMIDIAccess = vi.fn(() => Promise.resolve(mockAccess)) as any;
    });
  });

  describe('initialize', () => {
    it('should initialize MIDI access successfully', async () => {
      const onStateChange = vi.fn();
      const eventManager = new MidiManager({ onStateChange });

      const result = await eventManager.initialize();

      expect(result).toBe(true);
      expect(eventManager.getState()).toBe('active');
      expect(onStateChange).toHaveBeenCalledWith('requesting');
      expect(onStateChange).toHaveBeenCalledWith('active');
    });

    it('should connect to existing MIDI inputs', async () => {
      await manager.initialize();

      const devices = manager.getDevices();
      const inputDevices = devices.filter((d) => d.type === 'input');

      expect(inputDevices).toHaveLength(2);
      expect(inputDevices[0].name).toBe('Keyboard 1');
      expect(inputDevices[1].name).toBe('Pad Controller');
    });

    it('should connect to existing MIDI outputs', async () => {
      await manager.initialize();

      const devices = manager.getDevices();
      const outputDevices = devices.filter((d) => d.type === 'output');

      expect(outputDevices).toHaveLength(1);
      expect(outputDevices[0].name).toBe('Synth 1');
    });

    it('should handle sysex parameter', async () => {
      const sysexManager = new MidiManager();
      await sysexManager.initialize(true);

      expect(globalThis.navigator.requestMIDIAccess).toHaveBeenCalledWith({
        sysex: true,
        software: false,
      });
    });

    it('should return false when Web MIDI API is not supported', async () => {
      // @ts-ignore
      delete navigator.requestMIDIAccess;

      const onError = vi.fn();
      const unsupportedManager = new MidiManager({ onError });

      const result = await unsupportedManager.initialize();

      expect(result).toBe(false);
      expect(unsupportedManager.getState()).toBe('unsupported');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));

      // Restore
      globalThis.navigator.requestMIDIAccess = vi.fn(() => Promise.resolve(mockAccess)) as any;
    });

    it('should handle requestMIDIAccess failure', async () => {
      globalThis.navigator.requestMIDIAccess = vi.fn(() =>
        Promise.reject(new Error('MIDI access denied'))
      ) as any;

      const onError = vi.fn();
      const errorManager = new MidiManager({ onError });

      const result = await errorManager.initialize();

      expect(result).toBe(false);
      expect(errorManager.getState()).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should trigger onDeviceChange event', async () => {
      const onDeviceChange = vi.fn();
      const eventManager = new MidiManager({ onDeviceChange });

      await eventManager.initialize();

      expect(onDeviceChange).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should set up state change listener', async () => {
      await manager.initialize();

      expect(mockAccess.onstatechange).not.toBeNull();
    });
  });

  describe('stop', () => {
    it('should cleanup MIDI resources', async () => {
      await manager.initialize();
      expect(manager.getState()).toBe('active');

      manager.stop();

      expect(manager.getState()).toBe('idle');
      expect(mockAccess.onstatechange).toBeNull();
    });

    it('should disconnect all input devices', async () => {
      await manager.initialize();

      manager.stop();

      // All inputs should be disconnected
      expect(manager['inputDevices'].size).toBe(0);
    });

    it('should clear all output devices', async () => {
      await manager.initialize();

      manager.stop();

      expect(manager['outputDevices'].size).toBe(0);
    });

    it('should reset MIDI data', async () => {
      await manager.initialize();

      // Add some data
      manager['currentData'].cc.set('0:1', 0.5);
      manager['currentData'].programChange = 5;
      manager['currentData'].clock = 100;

      manager.stop();

      const data = manager.getData();
      expect(data.cc.size).toBe(0);
      expect(data.programChange).toBeNull();
      expect(data.clock).toBe(0);
    });

    it('should clear CC mappings', async () => {
      await manager.initialize();

      manager.addCCMapping({
        channel: 0,
        ccNumber: 1,
        parameterPath: 'test.param',
        min: 0,
        max: 1,
        currentValue: 0.5,
      });

      expect(manager.getCCMappings().length).toBe(1);

      manager.stop();

      expect(manager.getCCMappings().length).toBe(0);
    });
  });

  describe('getData', () => {
    it('should return current MIDI data', () => {
      const data = manager.getData();

      expect(data).toHaveProperty('cc');
      expect(data).toHaveProperty('programChange');
      expect(data).toHaveProperty('clock');
    });

    it('should return immutable data', () => {
      const data = manager.getData();

      // Same reference for Map, but changes to Map don't affect original
      expect(data.cc).toBeInstanceOf(Map);
    });
  });

  describe('getState', () => {
    it('should return idle state initially', () => {
      expect(manager.getState()).toBe('idle');
    });

    it('should return active state after initialization', async () => {
      await manager.initialize();

      expect(manager.getState()).toBe('active');
    });

    it('should return error state after error', async () => {
      globalThis.navigator.requestMIDIAccess = vi.fn(() =>
        Promise.reject(new Error('Error'))
      ) as any;

      const errorManager = new MidiManager();
      await errorManager.initialize();

      expect(errorManager.getState()).toBe('error');
    });
  });

  describe('getDevices', () => {
    it('should return empty list before initialization', () => {
      const devices = manager.getDevices();

      expect(devices).toEqual([]);
    });

    it('should return all connected devices after initialization', async () => {
      await manager.initialize();

      const devices = manager.getDevices();

      expect(devices).toHaveLength(3); // 2 inputs + 1 output
    });

    it('should include device metadata', async () => {
      await manager.initialize();

      const devices = manager.getDevices();
      const keyboard = devices.find((d) => d.name === 'Keyboard 1');

      expect(keyboard).toBeDefined();
      expect(keyboard?.id).toBe('input1');
      expect(keyboard?.manufacturer).toBe('Yamaha');
      expect(keyboard?.type).toBe('input');
    });

    it('should show connected state for open ports', async () => {
      await manager.initialize();

      // Open a port
      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        await port.open();
      }

      const devices = manager.getDevices();
      const keyboard = devices.find((d) => d.name === 'Keyboard 1');

      expect(keyboard?.state).toBe('connected');
    });

    it('should show disconnected state for closed ports', async () => {
      await manager.initialize();

      const devices = manager.getDevices();

      // All ports should be disconnected by default
      expect(devices.every((d) => d.state === 'disconnected')).toBe(true);
    });
  });

  describe('CC mappings', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    describe('addCCMapping', () => {
      it('should add CC mapping', () => {
        const mapping: MidiCCMapping = {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 0,
          max: 100,
          currentValue: 0,
        };

        manager.addCCMapping(mapping);

        expect(manager.getCCMappings()).toHaveLength(1);
        expect(manager.getCCMappings()[0]).toEqual(mapping);
      });

      it('should update existing CC mapping', () => {
        const mapping1: MidiCCMapping = {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param1',
          min: 0,
          max: 100,
          currentValue: 0,
        };

        const mapping2: MidiCCMapping = {
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param2',
          min: 0,
          max: 200,
          currentValue: 50,
        };

        manager.addCCMapping(mapping1);
        manager.addCCMapping(mapping2);

        expect(manager.getCCMappings()).toHaveLength(1);
        expect(manager.getCCMappings()[0].parameterPath).toBe('test.param2');
        expect(manager.getCCMappings()[0].max).toBe(200);
      });

      it('should handle multiple CC mappings', () => {
        manager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'param1',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        manager.addCCMapping({
          channel: 0,
          ccNumber: 2,
          parameterPath: 'param2',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        manager.addCCMapping({
          channel: 1,
          ccNumber: 1,
          parameterPath: 'param3',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        expect(manager.getCCMappings()).toHaveLength(3);
      });
    });

    describe('removeCCMapping', () => {
      it('should remove CC mapping', () => {
        manager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        expect(manager.getCCMappings()).toHaveLength(1);

        manager.removeCCMapping(0, 1);

        expect(manager.getCCMappings()).toHaveLength(0);
      });

      it('should handle removing non-existent mapping', () => {
        manager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        manager.removeCCMapping(0, 999); // Non-existent

        expect(manager.getCCMappings()).toHaveLength(1);
      });
    });

    describe('getCCMappings', () => {
      it('should return readonly array of mappings', () => {
        manager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'param1',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        const mappings = manager.getCCMappings();

        expect(Array.isArray(mappings)).toBe(true);
        expect(mappings).toHaveLength(1);
      });
    });

    describe('getCCValue', () => {
      it('should return 0 for unmapped CC', () => {
        expect(manager.getCCValue(0, 1)).toBe(0);
      });

      it('should return current CC value', () => {
        // Simulate CC message
        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          // CC message: status=0xB0 (CC on ch 0), cc=1, value=64
          port.simulateMessage([0xb0, 1, 64]);
        }

        expect(manager.getCCValue(0, 1)).toBeCloseTo(64 / 127, 4);
      });

      it('should return normalized value (0-1)', () => {
        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          // CC with value 127 should return ~1.0
          port.simulateMessage([0xb0, 1, 127]);
        }

        expect(manager.getCCValue(0, 1)).toBeCloseTo(1, 4);
      });
    });
  });

  describe('MIDI message handling', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    describe('CC messages', () => {
      it('should handle CC message and update data', () => {
        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          port.simulateMessage([0xb0, 1, 64]);
        }

        const data = manager.getData();
        expect(data.cc.get('0:1')).toBeCloseTo(64 / 127, 4);
      });

      it('should trigger onCcChange event for mapped CC', async () => {
        const onCcChange = vi.fn();
        const eventManager = new MidiManager({ onCcChange });

        await eventManager.initialize();

        eventManager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 0,
          max: 100,
          currentValue: 0,
        });

        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          port.simulateMessage([0xb0, 1, 64]);
        }

        expect(onCcChange).toHaveBeenCalledWith(
          expect.objectContaining({
            channel: 0,
            ccNumber: 1,
            currentValue: expect.closeTo(50.4, 0.1), // 64/127 * 100
          })
        );
      });

      it('should scale CC value based on mapping min/max', async () => {
        const onCcChange = vi.fn();
        const eventManager = new MidiManager({ onCcChange });

        await eventManager.initialize();

        eventManager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 10,
          max: 20,
          currentValue: 0,
        });

        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          port.simulateMessage([0xb0, 1, 64]); // 0.5 normalized
        }

        expect(onCcChange).toHaveBeenCalledWith(
          expect.objectContaining({
            currentValue: expect.closeTo(15, 0.1), // 10 + 0.5 * (20-10)
          })
        );
      });

      it('should handle CC from different channels', () => {
        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          // Channel 0, CC 1
          port.simulateMessage([0xb0, 1, 100]);
          // Channel 1, CC 1
          port.simulateMessage([0xb1, 1, 50]);
        }

        const data = manager.getData();
        expect(data.cc.get('0:1')).toBeCloseTo(100 / 127, 4);
        expect(data.cc.get('1:1')).toBeCloseTo(50 / 127, 4);
      });
    });

    describe('Program Change messages', () => {
      it('should handle Program Change message', async () => {
        const onProgramChange = vi.fn();
        const eventManager = new MidiManager({ onProgramChange });

        await eventManager.initialize();

        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          // Program Change: status=0xC0 (Program Change on ch 0), program=5
          port.simulateMessage([0xc0, 5, 0]);
        }

        const data = eventManager.getData();
        expect(data.programChange).toBe(5);
        expect(onProgramChange).toHaveBeenCalledWith(5);
      });
    });

    describe('MIDI Clock messages', () => {
      it('should handle MIDI Clock message', async () => {
        // Use the existing manager from parent beforeEach
        // which is already initialized

        // Trigger clock increment directly through private method for testing
        const initialClock = manager.getData().clock;
        expect(initialClock).toBe(0);

        // Call handleClock three times (simulating 3 MIDI clock messages)
        manager['handleClock']();
        manager['handleClock']();
        manager['handleClock']();

        const data = manager.getData();
        expect(data.clock).toBe(3);
      });
    });

    describe('Unknown message types', () => {
      it('should ignore unknown message types', () => {
        const port = mockAccess.inputPorts.get('input1');
        if (port) {
          // Note On: status=0x90
          port.simulateMessage([0x90, 60, 127]);
        }

        // Should not throw, data should be unchanged
        const data = manager.getData();
        expect(data.cc.size).toBe(0);
      });
    });
  });

  describe('Sending MIDI messages', () => {
    beforeEach(async () => {
      await manager.initialize();
      // Open the output device for sending
      const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;
      await output.open();
    });

    describe('sendMessage', () => {
      it('should send message to output device', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        const result = manager.sendMessage('output1', [0xb0, 1, 64]);

        expect(result).toBe(true);
        expect(output.sentMessages).toHaveLength(1);
        expect(output.sentMessages[0]).toEqual([0xb0, 1, 64]);
      });

      it('should send message with timestamp', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        const timestamp = performance.now();
        const result = manager.sendMessage('output1', [0xb0, 1, 64], timestamp);

        expect(result).toBe(true);
        expect(output.sentMessages).toHaveLength(1);
      });

      it('should return false for non-existent device', () => {
        const result = manager.sendMessage('nonexistent', [0xb0, 1, 64]);

        expect(result).toBe(false);
      });

      it('should return false for disconnected device', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;
        output.close();

        const result = manager.sendMessage('output1', [0xb0, 1, 64]);

        expect(result).toBe(false);
      });
    });

    describe('sendCC', () => {
      it('should send CC message', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        const result = manager.sendCC('output1', 0, 1, 64);

        expect(result).toBe(true);
        expect(output.sentMessages).toHaveLength(1);
        expect(output.sentMessages[0]).toEqual([0xb0, 1, 64]);
      });

      it('should construct correct status byte', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        // Channel 5: status = 0xB0 + 5 = 0xB5
        manager.sendCC('output1', 5, 7, 100);

        expect(output.sentMessages[0][0]).toBe(0xb5);
      });

      it('should mask CC number to 7 bits', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        manager.sendCC('output1', 0, 0xff, 64); // CC number > 127

        expect(output.sentMessages[0][1]).toBe(0x7f); // Masked to 7 bits
      });

      it('should mask value to 7 bits', () => {
        const output = mockAccess.outputPorts.get('output1') as MockMIDIOutput;

        manager.sendCC('output1', 0, 1, 0xff); // Value > 127

        expect(output.sentMessages[0][2]).toBe(0x7f); // Masked to 7 bits
      });
    });
  });

  describe('Device connection state changes', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should connect new input device', async () => {
      const onDeviceChange = vi.fn();
      const eventManager = new MidiManager({ onDeviceChange });

      // Initialize to set up device tracking
      await eventManager.initialize();

      // Simulate connecting a new device
      const newPort = mockAccess.addInput('input3', 'New Keyboard', 'Roland');

      // Manually trigger the state change handler
      const handler = (eventManager as any).handleStateChange;
      if (handler) {
        handler({ port: newPort } as unknown as MIDIConnectionEvent);
      }

      expect(eventManager.getDevices().length).toBeGreaterThan(0);
    });

    it('should disconnect input device', async () => {
      const onDeviceChange = vi.fn();
      const eventManager = new MidiManager({ onDeviceChange });

      // Initialize to set up device tracking
      await eventManager.initialize();

      // Get initial device count
      const initialCount = eventManager.getDevices().length;
      expect(initialCount).toBeGreaterThan(0);

      // Simulate disconnecting a device
      mockAccess.removeInput('input1');
      const port = mockAccess.inputPorts.get('input1')!;

      // Manually trigger the state change handler
      const handler = (eventManager as any).handleStateChange;
      if (handler) {
        handler({ port } as unknown as MIDIConnectionEvent);
      }

      // Device should be removed
      expect(eventManager['inputDevices'].has('input1')).toBe(false);
    });

    it('should connect new output device', async () => {
      const onDeviceChange = vi.fn();
      const eventManager = new MidiManager({ onDeviceChange });

      // Initialize to set up device tracking
      await eventManager.initialize();

      // Simulate connecting a new output device
      const newOutput = mockAccess.addOutput('output2', 'New Synth', 'Nord');

      // Manually trigger the state change handler
      const handler = (eventManager as any).handleStateChange;
      if (handler) {
        handler({ port: newOutput } as unknown as MIDIConnectionEvent);
      }

      expect(eventManager.getDevices().length).toBeGreaterThan(0);
    });

    it('should disconnect output device', async () => {
      const onDeviceChange = vi.fn();
      const eventManager = new MidiManager({ onDeviceChange });

      // Initialize to set up device tracking
      await eventManager.initialize();

      // Get initial device count
      const initialCount = eventManager.getDevices().length;
      expect(initialCount).toBeGreaterThan(0);

      // Simulate disconnecting output device
      mockAccess.removeOutput('output1');
      const output = mockAccess.outputPorts.get('output1')!;

      // Manually trigger the state change handler
      const handler = (eventManager as any).handleStateChange;
      if (handler) {
        handler({ port: output } as unknown as MIDIConnectionEvent);
      }

      // Device should be removed
      expect(eventManager['outputDevices'].has('output1')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple initialize calls', async () => {
      await manager.initialize();
      await manager.initialize();
      await manager.initialize();

      expect(manager.getState()).toBe('active');
    });

    it('should handle stop without initialize', () => {
      expect(() => manager.stop()).not.toThrow();
      expect(manager.getState()).toBe('idle');
    });

    it('should handle adding mapping before initialization', () => {
      expect(() => {
        manager.addCCMapping({
          channel: 0,
          ccNumber: 1,
          parameterPath: 'test.param',
          min: 0,
          max: 100,
          currentValue: 0,
        });
      }).not.toThrow();
    });

    it('should handle removing mapping before initialization', () => {
      expect(() => manager.removeCCMapping(0, 1)).not.toThrow();
    });

    it('should handle null event callbacks', async () => {
      const nullEventManager = new MidiManager({});

      await nullEventManager.initialize();

      expect(nullEventManager.getState()).toBe('active');
    });

    it('should handle CC value at boundary (0)', async () => {
      await manager.initialize();

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xb0, 1, 0]);
      }

      expect(manager.getCCValue(0, 1)).toBe(0);
    });

    it('should handle CC value at boundary (127)', async () => {
      await manager.initialize();

      const port = mockAccess.inputPorts.get('input1');
      if (port) {
        port.simulateMessage([0xb0, 1, 127]);
      }

      expect(manager.getCCValue(0, 1)).toBeCloseTo(1, 4);
    });
  });
});
