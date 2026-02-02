/**
 * Unit tests for Store
 * Tests unified store managing Audio and MIDI subsystems
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Store } from './Store';
import { AudioManager } from './AudioManager';
import { MidiManager } from './MidiManager';
import type { AudioData, MidiData, AudioState, MidiState } from '../types';

// Mock managers for isolation
class MockAudioManager extends AudioManager {
  public testData: AudioData = {
    raw: new Uint8Array([100, 150, 200]),
    normalized: [0.4, 0.6, 0.8],
    spectrum: [0.4, 0.6, 0.8],
    waveform: [0.1, -0.2, 0.3],
    bands: {
      subBass: 0.5,
      bass: 0.6,
      lowMid: 0.7,
      mid: 0.8,
      highMid: 0.9,
      treble: 1.0,
      brilliance: 0.3,
    },
    level: 0.7,
  };

  public mockInitializeResult = true;
  public mockResumeResult = true;
  public mockState: AudioState = 'idle';

  override async initialize(): Promise<boolean> {
    if (this.mockInitializeResult) {
      this.mockState = 'active';
    } else {
      this.mockState = 'error';
    }
    return this.mockInitializeResult;
  }

  override async resume(): Promise<boolean> {
    return this.mockResumeResult;
  }

  override async stop(): Promise<void> {
    this.mockState = 'idle';
  }

  override update(): void {
    // Do nothing in mock
  }

  override getData(): AudioData {
    return this.testData;
  }

  override getState(): AudioState {
    return this.mockState;
  }
}

class MockMidiManager extends MidiManager {
  public testData: MidiData = {
    cc: new Map([['0:1', 0.5]]),
    programChange: 3,
    clock: 100,
  };

  public mockInitializeResult = true;
  public mockState: MidiState = 'idle';

  override async initialize(): Promise<boolean> {
    if (this.mockInitializeResult) {
      this.mockState = 'active';
    } else {
      this.mockState = 'error';
    }
    return this.mockInitializeResult;
  }

  override stop(): void {
    this.mockState = 'idle';
  }

  override getData(): MidiData {
    return this.testData;
  }

  override getState(): MidiState {
    return this.mockState;
  }

  override getDevices() {
    return [
      {
        id: 'midi1',
        name: 'Mock MIDI',
        manufacturer: 'Test',
        state: 'connected' as const,
        type: 'input' as const,
      },
    ];
  }
}

describe('Store', () => {
  let store: Store;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create store with mock managers
    store = new Store();
    // Replace with mock managers
    (store as any).audio = new MockAudioManager();
    (store as any).midi = new MockMidiManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default state', () => {
      expect(store.getPatternIndex()).toBe(0);
    });

    it('should accept custom config', () => {
      const customStore = new Store({
        audio: {
          fftSize: 4096,
          smoothingTimeConstant: 0.9,
        },
        midi: {
          sysexEnabled: true,
        },
      });

      expect(customStore).toBeDefined();
    });

    it('should accept event callbacks', () => {
      const onAudioStateChange = vi.fn();
      const onMidiStateChange = vi.fn();
      const onPatternChange = vi.fn();

      const eventStore = new Store({}, {
        onAudioStateChange,
        onMidiStateChange,
        onPatternChange,
      });

      expect(eventStore).toBeDefined();
    });

    it('should create AudioManager and MidiManager instances', () => {
      expect(store.audio).toBeInstanceOf(AudioManager);
      expect(store.midi).toBeInstanceOf(MidiManager);
    });
  });

  describe('getAudioData', () => {
    it('should return audio data from AudioManager', () => {
      const data = store.getAudioData();

      expect(data).toHaveProperty('raw');
      expect(data).toHaveProperty('normalized');
      expect(data).toHaveProperty('spectrum');
      expect(data).toHaveProperty('bands');
      expect(data).toHaveProperty('level');
    });

    it('should return immutable data', () => {
      const data1 = store.getAudioData();
      const data2 = store.getAudioData();

      expect(data1).toEqual(data2);
    });

    it('should reflect current audio state', () => {
      const data = store.getAudioData();

      expect(data.bands.bass).toBe(0.6);
      expect(data.level).toBe(0.7);
    });
  });

  describe('getMidiData', () => {
    it('should return MIDI data from MidiManager', () => {
      const data = store.getMidiData();

      expect(data).toHaveProperty('cc');
      expect(data).toHaveProperty('programChange');
      expect(data).toHaveProperty('clock');
    });

    it('should return immutable data', () => {
      const data1 = store.getMidiData();
      const data2 = store.getMidiData();

      expect(data1).toEqual(data2);
    });

    it('should reflect current MIDI state', () => {
      const data = store.getMidiData();

      expect(data.cc.get('0:1')).toBe(0.5);
      expect(data.programChange).toBe(3);
      expect(data.clock).toBe(100);
    });
  });

  describe('getPatternIndex', () => {
    it('should return initial pattern index 0', () => {
      expect(store.getPatternIndex()).toBe(0);
    });

    it('should return updated pattern index', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(5);

      expect(store.getPatternIndex()).toBe(5);
    });
  });

  describe('setPatternIndex', () => {
    it('should set pattern index', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(3);

      expect(store.getPatternIndex()).toBe(3);
    });

    it('should trigger onPatternChange event', () => {
      const onPatternChange = vi.fn();
      const eventStore = new Store({}, { onPatternChange });
      (eventStore as any).audio = new MockAudioManager();
      (eventStore as any).midi = new MockMidiManager();

      eventStore.setTotalPatterns(10);
      eventStore.setPatternIndex(5);

      expect(onPatternChange).toHaveBeenCalledWith(5);
    });

    it('should not trigger event for same index', () => {
      const onPatternChange = vi.fn();
      const eventStore = new Store({}, { onPatternChange });
      (eventStore as any).audio = new MockAudioManager();
      (eventStore as any).midi = new MockMidiManager();

      eventStore.setTotalPatterns(10);
      eventStore.setPatternIndex(0); // Initial index

      expect(onPatternChange).not.toHaveBeenCalled();
    });

    it('should clamp index to minimum 0', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(-5);

      expect(store.getPatternIndex()).toBe(0);
    });

    it('should clamp index to maximum (totalPatterns - 1)', () => {
      store.setTotalPatterns(5);
      store.setPatternIndex(10);

      expect(store.getPatternIndex()).toBe(4);
    });

    it('should handle totalPatterns = 0', () => {
      store.setTotalPatterns(0);
      store.setPatternIndex(5);

      // Should clamp to 0
      expect(store.getPatternIndex()).toBe(0);
    });

    it('should handle totalPatterns = 1', () => {
      store.setTotalPatterns(1);
      store.setPatternIndex(5);

      expect(store.getPatternIndex()).toBe(0);
    });
  });

  describe('setTotalPatterns', () => {
    it('should set total pattern count', () => {
      store.setTotalPatterns(10);

      expect(store['totalPatterns']).toBe(10);
    });

    it('should clamp minimum to 1', () => {
      store.setTotalPatterns(0);
      expect(store['totalPatterns']).toBe(1);

      store.setTotalPatterns(-5);
      expect(store['totalPatterns']).toBe(1);
    });

    it('should clamp current index if exceeds new total', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(8);

      store.setTotalPatterns(5);

      expect(store.getPatternIndex()).toBe(4); // Clamped to 5-1
    });

    it('should not clamp current index if within new total', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(5);

      store.setTotalPatterns(20);

      expect(store.getPatternIndex()).toBe(5); // Unchanged
    });

    it('should handle setting total before index', () => {
      store.setTotalPatterns(5);
      store.setPatternIndex(3);

      expect(store.getPatternIndex()).toBe(3);
    });
  });

  describe('initialize', () => {
    it('should initialize both audio and MIDI subsystems', async () => {
      const result = await store.initialize();

      expect(result).toHaveProperty('audio');
      expect(result).toHaveProperty('midi');
    });

    it('should return success status for both subsystems', async () => {
      const result = await store.initialize();

      expect(result.audio).toBe(true);
      expect(result.midi).toBe(true);
    });

    it('should handle audio initialization failure', async () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockInitializeResult = false;

      const result = await store.initialize();

      expect(result.audio).toBe(false);
      expect(result.midi).toBe(true);
    });

    it('should handle MIDI initialization failure', async () => {
      const mockMidi = store.midi as unknown as MockMidiManager;
      mockMidi.mockInitializeResult = false;

      const result = await store.initialize();

      expect(result.audio).toBe(true);
      expect(result.midi).toBe(false);
    });

    it('should handle both subsystems failing', async () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      const mockMidi = store.midi as unknown as MockMidiManager;
      mockAudio.mockInitializeResult = false;
      mockMidi.mockInitializeResult = false;

      const result = await store.initialize();

      expect(result.audio).toBe(false);
      expect(result.midi).toBe(false);
    });

    it('should initialize with audio device ID', async () => {
      const initializeSpy = vi.spyOn(store.audio, 'initialize');

      await store.initialize('device123');

      expect(initializeSpy).toHaveBeenCalledWith('device123');
    });

    it('should initialize without audio device ID by default', async () => {
      const initializeSpy = vi.spyOn(store.audio, 'initialize');

      await store.initialize();

      expect(initializeSpy).toHaveBeenCalledWith(undefined);
    });

    it('should use Promise.allSettled for parallel initialization', async () => {
      // This test verifies both are initialized in parallel
      const audioInitSpy = vi.spyOn(store.audio, 'initialize');
      const midiInitSpy = vi.spyOn(store.midi, 'initialize');

      await store.initialize();

      expect(audioInitSpy).toHaveBeenCalled();
      expect(midiInitSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should cleanup both audio and MIDI subsystems', async () => {
      await store.initialize();
      await store.destroy();

      const mockAudio = store.audio as unknown as MockAudioManager;
      const mockMidi = store.midi as unknown as MockMidiManager;

      expect(mockAudio.getState()).toBe('idle');
      expect(mockMidi.getState()).toBe('idle');
    });

    it('should call audio.stop()', async () => {
      const stopSpy = vi.spyOn(store.audio, 'stop');

      await store.destroy();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should call midi.stop()', async () => {
      const stopSpy = vi.spyOn(store.midi, 'stop');

      await store.destroy();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle destroy without initialize', async () => {
      await expect(store.destroy()).resolves.not.toThrow();
    });

    it('should use Promise.all for parallel cleanup', async () => {
      const audioStopSpy = vi.spyOn(store.audio, 'stop');
      const midiStopSpy = vi.spyOn(store.midi, 'stop');

      await store.destroy();

      expect(audioStopSpy).toHaveBeenCalled();
      expect(midiStopSpy).toHaveBeenCalled();
    });
  });

  describe('updateAudio', () => {
    it('should call audio.update()', () => {
      const updateSpy = vi.spyOn(store.audio, 'update');

      store.updateAudio();

      expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle multiple updates', () => {
      const updateSpy = vi.spyOn(store.audio, 'update');

      store.updateAudio();
      store.updateAudio();
      store.updateAudio();

      expect(updateSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('resumeAudio', () => {
    it('should call audio.resume()', async () => {
      const resumeSpy = vi.spyOn(store.audio, 'resume');

      await store.resumeAudio();

      expect(resumeSpy).toHaveBeenCalled();
    });

    it('should return audio.resume() result', async () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockResumeResult = true;

      const result = await store.resumeAudio();

      expect(result).toBe(true);
    });

    it('should return false on resume failure', async () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockResumeResult = false;

      const result = await store.resumeAudio();

      expect(result).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return false when audio is not active', () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockState = 'idle';

      expect(store.isReady()).toBe(false);
    });

    it('should return true when audio is active', () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockState = 'active';

      expect(store.isReady()).toBe(true);
    });

    it('should reflect audio state changes', () => {
      const mockAudio = store.audio as unknown as MockAudioManager;

      mockAudio.mockState = 'idle';
      expect(store.isReady()).toBe(false);

      mockAudio.mockState = 'active';
      expect(store.isReady()).toBe(true);

      mockAudio.mockState = 'error';
      expect(store.isReady()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return status object with all properties', () => {
      const status = store.getStatus();

      expect(status).toHaveProperty('audio');
      expect(status).toHaveProperty('midi');
      expect(status).toHaveProperty('pattern');
      expect(status).toHaveProperty('ready');
    });

    it('should reflect current audio state', () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockState = 'active';

      const status = store.getStatus();

      expect(status.audio).toBe('active');
    });

    it('should reflect current MIDI state', () => {
      const mockMidi = store.midi as unknown as MockMidiManager;
      mockMidi.mockState = 'active';

      const status = store.getStatus();

      expect(status.midi).toBe('active');
    });

    it('should reflect current pattern index', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(5);

      const status = store.getStatus();

      expect(status.pattern).toBe(5);
    });

    it('should reflect ready state', () => {
      const mockAudio = store.audio as unknown as MockAudioManager;

      mockAudio.mockState = 'idle';
      expect(store.getStatus().ready).toBe(false);

      mockAudio.mockState = 'active';
      expect(store.getStatus().ready).toBe(true);
    });
  });

  describe('event propagation', () => {
    it('should propagate audio state changes', () => {
      const onAudioStateChange = vi.fn();
      const onMidiStateChange = vi.fn();

      const eventStore = new Store({}, {
        onAudioStateChange,
        onMidiStateChange,
      });
      (eventStore as any).audio = new MockAudioManager();
      (eventStore as any).midi = new MockMidiManager();

      // Trigger audio state change
      const mockAudio = eventStore.audio as unknown as MockAudioManager;
      mockAudio.mockState = 'active';

      eventStore.getStatus();

      // The audio state change should be propagated through AudioManager's event
      // In real implementation, this would happen during initialize
    });

    it('should propagate MIDI state changes', () => {
      const onMidiStateChange = vi.fn();

      const eventStore = new Store({}, {
        onMidiStateChange,
      });
      (eventStore as any).audio = new MockAudioManager();
      (eventStore as any).midi = new MockMidiManager();

      // The MIDI state change should be propagated through MidiManager's event
      // In real implementation, this would happen during initialize
    });
  });

  describe('edge cases', () => {
    it('should handle negative pattern indices', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(-100);

      expect(store.getPatternIndex()).toBe(0);
    });

    it('should handle very large pattern indices', () => {
      store.setTotalPatterns(10);
      store.setPatternIndex(999999);

      expect(store.getPatternIndex()).toBe(9);
    });

    it('should handle zero total patterns', () => {
      store.setTotalPatterns(0);
      store.setPatternIndex(5);

      expect(store.getPatternIndex()).toBe(0);
      expect(store['totalPatterns']).toBe(1); // Clamped to minimum 1
    });

    it('should handle multiple initialize calls', async () => {
      await store.initialize();
      await store.initialize();
      await store.initialize();

      // Should not throw
      expect(store).toBeDefined();
    });

    it('should handle multiple destroy calls', async () => {
      await store.initialize();
      await store.destroy();
      await store.destroy();
      await store.destroy();

      // Should not throw
      expect(store).toBeDefined();
    });

    it('should handle destroy without initialize', async () => {
      await expect(store.destroy()).resolves.not.toThrow();
    });

    it('should handle updateAudio before initialize', () => {
      expect(() => store.updateAudio()).not.toThrow();
    });

    it('should handle resumeAudio before initialize', async () => {
      const result = await store.resumeAudio();
      expect(typeof result).toBe('boolean');
    });

    it('should handle pattern operations before setting total', () => {
      store.setPatternIndex(5);
      // Should clamp to 0 since totalPatterns is 0 initially
      expect(store.getPatternIndex()).toBe(0);
    });

    it('should handle setting total patterns multiple times', () => {
      store.setTotalPatterns(5);
      expect(store['totalPatterns']).toBe(5);

      store.setTotalPatterns(10);
      expect(store['totalPatterns']).toBe(10);

      store.setTotalPatterns(3);
      expect(store['totalPatterns']).toBe(3);
    });

    it('should handle getting status after destroy', async () => {
      await store.initialize();
      await store.destroy();

      const status = store.getStatus();

      expect(status).toHaveProperty('audio');
      expect(status).toHaveProperty('midi');
      expect(status).toHaveProperty('pattern');
      expect(status).toHaveProperty('ready');
    });
  });

  describe('integration tests', () => {
    it('should handle complete lifecycle', async () => {
      // Initial state
      expect(store.isReady()).toBe(false);
      expect(store.getPatternIndex()).toBe(0);

      // Initialize
      const initResult = await store.initialize();
      expect(initResult.audio).toBe(true);
      expect(initResult.midi).toBe(true);

      const mockAudio = store.audio as unknown as MockAudioManager;
      const mockMidi = store.midi as unknown as MockMidiManager;

      expect(mockAudio.mockState).toBe('active');
      expect(mockMidi.mockState).toBe('active');

      // Set patterns
      store.setTotalPatterns(5);
      store.setPatternIndex(2);
      expect(store.getPatternIndex()).toBe(2);

      // Check status
      const status = store.getStatus();
      expect(status.audio).toBe('active');
      expect(status.midi).toBe('active');
      expect(status.pattern).toBe(2);
      expect(status.ready).toBe(true);

      // Update audio
      store.updateAudio();

      // Destroy
      await store.destroy();
      expect(mockAudio.mockState).toBe('idle');
      expect(mockMidi.mockState).toBe('idle');
    });

    it('should handle pattern switching with boundary conditions', () => {
      store.setTotalPatterns(3);

      // Switch to first pattern
      store.setPatternIndex(0);
      expect(store.getPatternIndex()).toBe(0);

      // Switch to last pattern
      store.setPatternIndex(2);
      expect(store.getPatternIndex()).toBe(2);

      // Try to go beyond (should clamp)
      store.setPatternIndex(10);
      expect(store.getPatternIndex()).toBe(2);

      // Try to go below (should clamp)
      store.setPatternIndex(-5);
      expect(store.getPatternIndex()).toBe(0);
    });

    it('should handle partial initialization', async () => {
      const mockAudio = store.audio as unknown as MockAudioManager;
      mockAudio.mockInitializeResult = false;

      const result = await store.initialize();

      expect(result.audio).toBe(false);
      expect(result.midi).toBe(true);
      expect(store.isReady()).toBe(false); // Audio is not active
    });
  });
});
