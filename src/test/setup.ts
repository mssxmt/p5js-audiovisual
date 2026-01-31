/**
 * Vitest setup file
 * Global test configuration and mocks for Web Audio API, Web MIDI API, and browser APIs
 */

import { vi } from 'vitest';
import { EventTarget } from 'happy-dom';
import '@testing-library/jest-dom';

// Track mock data
const mockMidiInputs = new Map<string, MockMIDIInput>();
const mockMidiOutputs = new Map<string, MockMIDIOutput>();
const mockAudioDevices: MediaDeviceInfo[] = [];

// Mock Web Audio API - AnalyserNode
class MockAnalyserNode extends EventTarget {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  minDecibels = -90;
  maxDecibels = -10;

  // Simulate FFT data
  private dataArray = new Uint8Array(1024).fill(0);

  getByteFrequencyData(array: Uint8Array): void {
    // Copy mock data with some values for testing
    for (let i = 0; i < array.length && i < this.dataArray.length; i++) {
      array[i] = this.dataArray[i];
    }
  }

  // Helper to set test data
  setTestData(values: number[]): void {
    for (let i = 0; i < values.length && i < this.dataArray.length; i++) {
      this.dataArray[i] = Math.min(255, Math.max(0, values[i]));
    }
  }

  connect(): void {
    // Mock connect
  }

  disconnect(): void {
    // Mock disconnect
  }
}

// Mock Web Audio API - MediaStreamAudioSourceNode
class MockMediaStreamAudioSourceNode extends EventTarget {
  connect(): void {
    // Mock connect
  }

  disconnect(): void {
    // Mock disconnect
  }
}

// Mock Web Audio API - AudioContext
class MockAudioContext extends EventTarget {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  private analyser: MockAnalyserNode | null = null;

  createAnalyser(): AnalyserNode {
    this.analyser = new MockAnalyserNode();
    return this.analyser as unknown as AnalyserNode;
  }

  createMediaStreamSource(): MediaStreamAudioSourceNode {
    return new MockMediaStreamAudioSourceNode() as unknown as MediaStreamAudioSourceNode;
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  // Test helper to get the analyser
  getMockAnalyser(): MockAnalyserNode | null {
    return this.analyser;
  }
}

// Mock Web MIDI API - MIDIInput
class MockMIDIInput {
  id: string;
  name: string;
  manufacturer: string = 'Test Manufacturer';
  connection: MIDIPortConnectionState = 'closed';
  state: MIDIPortDeviceState = 'disconnected';
  onmidimessage: ((event: MIDIMessageEvent) => void) | null = null;
  private messageListeners: Set<(event: MIDIMessageEvent) => void> = new Set();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  open(): void {
    this.connection = 'open';
    this.state = 'connected';
  }

  close(): void {
    this.connection = 'closed';
    this.state = 'disconnected';
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (type === 'midimessage' && listener && typeof listener === 'function') {
      this.messageListeners.add(listener as (event: MIDIMessageEvent) => void);
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null
  ): void {
    if (type === 'midimessage' && listener && typeof listener === 'function') {
      this.messageListeners.delete(listener as (event: MIDIMessageEvent) => void);
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  // Test helper to simulate MIDI message
  sendTestMessage(data: number[]): void {
    const midiEvent = {
      data: new Uint8Array(data),
      receivedTime: performance.now(),
    } as unknown as MIDIMessageEvent;

    // Update onmidimessage callback
    if (this.onmidimessage) {
      this.onmidimessage(midiEvent);
    }

    // Also notify all addEventListener listeners
    this.messageListeners.forEach((listener) => {
      listener(midiEvent);
    });
  }
}

// Mock Web MIDI API - MIDIOutput
class MockMIDIOutput extends EventTarget {
  id: string;
  name: string;
  manufacturer: string = 'Test Manufacturer';
  connection: MIDIPortConnectionState = 'closed';
  state: MIDIPortDeviceState = 'disconnected';
  sentMessages: number[][] = [];

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  open(): void {
    this.connection = 'open';
    this.state = 'connected';
  }

  close(): void {
    this.connection = 'closed';
    this.state = 'disconnected';
  }

  send(data: [number, number, number], _timestamp?: number): void {
    this.sentMessages.push([...data]);
  }

  // Test helper to get sent messages
  getSentMessages(): number[][] {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }
}

// Mock Web MIDI API - MIDIAccess
class MockMIDIAccess {
  inputs: Map<string, MockMIDIInput> = new Map();
  outputs: Map<string, MockMIDIOutput> = new Map();
  sysexEnabled: boolean = false;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null = null;
  private stateChangeListeners: Set<(event: MIDIConnectionEvent) => void> = new Set();

  constructor(sysex: boolean) {
    this.sysexEnabled = sysex;
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null
  ): void {
    if (type === 'statechange' && listener && typeof listener === 'function') {
      this.stateChangeListeners.add(listener as (event: MIDIConnectionEvent) => void);
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null
  ): void {
    if (type === 'statechange' && listener && typeof listener === 'function') {
      this.stateChangeListeners.delete(listener as (event: MIDIConnectionEvent) => void);
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  // Test helpers
  addTestInput(id: string, name: string): void {
    const input = new MockMIDIInput(id, name);
    input.open();
    this.inputs.set(id, input);
    mockMidiInputs.set(id, input);

    // Simulate state change event
    const event = { port: input as unknown as MIDIPort } as MIDIConnectionEvent;
    this.onstatechange?.(event);

    // Also notify all addEventListener listeners
    this.stateChangeListeners.forEach((listener) => {
      listener(event);
    });
  }

  addTestOutput(id: string, name: string): void {
    const output = new MockMIDIOutput(id, name);
    output.open();
    this.outputs.set(id, output);
    mockMidiOutputs.set(id, output);

    // Simulate state change event
    const event = { port: output as unknown as MIDIPort } as MIDIConnectionEvent;
    this.onstatechange?.(event);

    // Also notify all addEventListener listeners
    this.stateChangeListeners.forEach((listener) => {
      listener(event);
    });
  }

  removeTestInput(id: string): void {
    const input = this.inputs.get(id);
    if (input) {
      input.close();
      this.inputs.delete(id);
      mockMidiInputs.delete(id);

      const event = { port: input as unknown as MIDIPort } as MIDIConnectionEvent;
      this.onstatechange?.(event);

      // Also notify all addEventListener listeners
      this.stateChangeListeners.forEach((listener) => {
        listener(event);
      });
    }
  }
}

// Mock MediaStream
class MockMediaStream extends EventTarget {
  private tracks: MediaStreamTrack[] = [];

  constructor(tracks: MediaStreamTrack[] = []) {
    super();
    this.tracks = tracks;
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }
}

// Mock MediaStreamTrack
class MockMediaStreamTrack extends EventTarget {
  kind: string;
  enabled: boolean = true;
  muted: boolean = false;
  id: string;
  label: string = 'Test Track';

  constructor(kind: string, id: string) {
    super();
    this.kind = kind;
    this.id = id;
  }

  stop(): void {
    this.enabled = false;
  }
}

// ============================================================================
// EXPORT TEST HELPERS
// ============================================================================

/**
 * Test helpers for MIDI mocking
 */
export const midiTestHelpers = {
  /**
   * Add a test MIDI input device
   */
  addTestInput: (id: string, name: string) => {
    const access = (globalThis.navigator as any).__testMidiAccess;
    if (access) {
      access.addTestInput(id, name);
    }
  },

  /**
   * Add a test MIDI output device
   */
  addTestOutput: (id: string, name: string) => {
    const access = (globalThis.navigator as any).__testMidiAccess;
    if (access) {
      access.addTestOutput(id, name);
    }
  },

  /**
   * Get a mock MIDI input by ID
   */
  getInput: (id: string) => {
    return mockMidiInputs.get(id);
  },

  /**
   * Get a mock MIDI output by ID
   */
  getOutput: (id: string) => {
    return mockMidiOutputs.get(id);
  },

  /**
   * Remove a test MIDI input device
   */
  removeTestInput: (id: string) => {
    const access = (globalThis.navigator as any).__testMidiAccess;
    if (access) {
      access.removeTestInput(id);
    }
  },

  /**
   * Clear all test MIDI devices
   */
  clearAll: () => {
    mockMidiInputs.clear();
    mockMidiOutputs.clear();
  },
};

/**
 * Test helpers for Audio mocking
 */
export const audioTestHelpers = {
  /**
   * Get the current mock analyser for setting test data
   */
  getMockAnalyser: (): MockAnalyserNode | null => {
    const ctx = (globalThis as any).__mockAudioContext;
    return ctx ? ctx.getMockAnalyser() : null;
  },

  /**
   * Set FFT test data
   */
  setFFTData: (values: number[]) => {
    const analyser = audioTestHelpers.getMockAnalyser();
    if (analyser) {
      analyser.setTestData(values);
    }
  },

  /**
   * Set audio devices for enumeration
   */
  setAudioDevices: (devices: MediaDeviceInfo[]) => {
    mockAudioDevices.length = 0;
    mockAudioDevices.push(...devices);
  },

  /**
   * Clear all test audio data
   */
  clearAll: () => {
    const analyser = audioTestHelpers.getMockAnalyser();
    if (analyser) {
      analyser.setTestData([]);
    }
    mockAudioDevices.length = 0;
  },
};

/**
 * Test helpers for MediaStream mocking
 */
export const mediaTestHelpers = {
  /**
   * Create a mock media stream
   */
  createMockStream: () => {
    const audioTrack = new MockMediaStreamTrack('audio', 'test-audio-track');
    return new MockMediaStream([audioTrack as unknown as MediaStreamTrack]);
  },

  /**
   * Create a mock media stream track
   */
  createMockTrack: (kind: string, id: string) => {
    return new MockMediaStreamTrack(kind, id);
  },
};

// ============================================================================
// SETUP GLOBAL MOCKS
// ============================================================================

// Store reference to current mock context
let currentMockContext: MockAudioContext | null = null;

// Mock AudioContext constructor
globalThis.AudioContext = class implements Partial<AudioContext> {
  state: AudioContextState = 'suspended';
  sampleRate = 44100;
  readonly BASE_LATENCY = 0;
  readonly outputLatency = 0;

  constructor() {
    currentMockContext = new MockAudioContext();
    (globalThis as any).__mockAudioContext = currentMockContext;
  }

  createAnalyser(): AnalyserNode {
    if (!currentMockContext) {
      currentMockContext = new MockAudioContext();
      (globalThis as any).__mockAudioContext = currentMockContext;
    }
    return currentMockContext.createAnalyser() as unknown as AnalyserNode;
  }

  createMediaStreamSource(): MediaStreamAudioSourceNode {
    if (!currentMockContext) {
      currentMockContext = new MockAudioContext();
      (globalThis as any).__mockAudioContext = currentMockContext;
    }
    return currentMockContext.createMediaStreamSource() as unknown as MediaStreamAudioSourceNode;
  }

  async resume(): Promise<void> {
    if (currentMockContext) {
      await currentMockContext.resume();
      this.state = currentMockContext.state;
    }
  }

  async close(): Promise<void> {
    if (currentMockContext) {
      await currentMockContext.close();
      this.state = currentMockContext.state;
    }
  }

  suspend(): Promise<void> {
    this.state = 'suspended';
    return Promise.resolve();
  }
} as unknown as typeof AudioContext;

// Mock webkitAudioContext fallback
(globalThis as any).webkitAudioContext = globalThis.AudioContext;

// Mock navigator.requestMIDIAccess
globalThis.navigator.requestMIDIAccess = vi.fn(async (options: { sysex?: boolean }) => {
  const access = new MockMIDIAccess(options?.sysex || false);
  (globalThis.navigator as any).__testMidiAccess = access;
  return access as unknown as MIDIAccess;
});

// Mock navigator.mediaDevices
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(async (_constraints: MediaStreamConstraints) => {
      return mediaTestHelpers.createMockStream() as unknown as MediaStream;
    }),
    enumerateDevices: vi.fn(async () => {
      return [...mockAudioDevices];
    }),
  },
  writable: false,
  configurable: true,
});

// Mock requestAnimationFrame and cancelAnimationFrame
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  return id;
});

globalThis.cancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Test helper to trigger all pending RAF callbacks
export const triggerAnimationFrames = (count: number = 1) => {
  for (let i = 0; i < count; i++) {
    rafCallbacks.forEach((callback) => {
      callback(performance.now());
    });
  }
};

// Clear RAF callbacks between tests
export const clearAnimationFrames = () => {
  rafCallbacks.clear();
  rafId = 0;
};

// Export types for test files
export type {
  MockAnalyserNode,
  MockMediaStreamAudioSourceNode,
  MockAudioContext,
  MockMIDIInput,
  MockMIDIOutput,
  MockMIDIAccess,
  MockMediaStream,
  MockMediaStreamTrack,
};
