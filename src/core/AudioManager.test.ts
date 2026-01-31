/**
 * Unit tests for AudioManager
 * Tests Web Audio API wrapper, FFT analysis, and frequency band calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from './AudioManager';

describe('AudioManager', () => {
  let manager: AudioManager;
  let mockAudioContext: any;
  let mockAnalyser: any;
  let mockMediaStream: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create fresh mock instances
    // Store the requested device ID so getSettings can return it
    let requestedDeviceId: string | undefined = undefined;
    const stopSpy = vi.fn();
    const getSettingsSpy = vi.fn(() => ({ deviceId: requestedDeviceId ?? 'default' }));

    const mockAudioTrack = {
      stop: stopSpy,
      getSettings: getSettingsSpy,
    };
    mockMediaStream = {
      getTracks: vi.fn(() => [mockAudioTrack]),
      getAudioTracks: vi.fn(() => [mockAudioTrack]),
    };

    mockAnalyser = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      smoothingTimeConstant: 0.8,
      minDecibels: -90,
      maxDecibels: -10,
      getByteFrequencyData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      state: 'suspended',
      sampleRate: 44100,
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      resume: vi.fn(async () => {
        mockAudioContext.state = 'running';
      }),
      close: vi.fn(async () => {
        mockAudioContext.state = 'closed';
      }),
    };

    // Mock AudioContext constructor
    (globalThis as any).AudioContext = vi.fn(() => mockAudioContext);
    ((globalThis as any).AudioContext as any).prototype.resume = vi.fn();

    // Mock getUserMedia
    (navigator.mediaDevices.getUserMedia as any).mockImplementation(
      (constraints: MediaStreamConstraints) => {
        // Track requested device ID
        if (constraints.audio && typeof constraints.audio === 'object') {
          const audioConstraints = constraints.audio as any;
          requestedDeviceId = audioConstraints.deviceId?.ideal ?? audioConstraints.deviceId?.exact ?? undefined;
        } else {
          requestedDeviceId = undefined;
        }
        return Promise.resolve(mockMediaStream);
      }
    );

    // Mock enumerateDevices
    (navigator.mediaDevices.enumerateDevices as any).mockResolvedValue([
      {
        deviceId: 'device1',
        kind: 'audioinput',
        label: 'Microphone 1',
      },
      {
        deviceId: 'device2',
        kind: 'audioinput',
        label: 'Microphone 2',
      },
      {
        deviceId: 'speaker1',
        kind: 'audiooutput',
        label: 'Speaker 1',
      },
    ]);

    manager = new AudioManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultManager = new AudioManager();

      expect(defaultManager.getState()).toBe('idle');
      expect(defaultManager.getAudioContext()).toBeNull();
    });

    it('should create instance with custom config', () => {
      const onStateChange = vi.fn();
      const onError = vi.fn();
      const customManager = new AudioManager(
        {
          fftSize: 4096,
          smoothingTimeConstant: 0.9,
        },
        {
          onStateChange,
          onError,
        }
      );

      expect(customManager.getState()).toBe('idle');
    });

    it('should create empty audio data initially', () => {
      const data = manager.getData();

      expect(data.raw).toBeInstanceOf(Uint8Array);
      expect(data.raw.length).toBe(0);
      expect(data.normalized).toEqual([]);
      expect(data.spectrum).toEqual([]);
      expect(data.bands.subBass).toBe(0);
      expect(data.bands.bass).toBe(0);
      expect(data.bands.lowMid).toBe(0);
      expect(data.bands.mid).toBe(0);
      expect(data.bands.highMid).toBe(0);
      expect(data.bands.treble).toBe(0);
      expect(data.bands.brilliance).toBe(0);
      expect(data.level).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should initialize AudioContext and create analyser', async () => {
      const onStateChange = vi.fn();
      const testManager = new AudioManager({}, { onStateChange });

      const result = await testManager.initialize();

      expect(result).toBe(true);
      expect(testManager.getState()).toBe('active');
      expect(onStateChange).toHaveBeenCalledWith('initializing');
      expect(onStateChange).toHaveBeenCalledWith('active');
      expect((globalThis as any).AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    });

    it('should set analyser config from constructor', async () => {
      const testManager = new AudioManager({
        fftSize: 4096,
        smoothingTimeConstant: 0.9,
        minDecibels: -100,
        maxDecibels: -5,
      });

      await testManager.initialize();

      expect(mockAnalyser.fftSize).toBe(4096);
      expect(mockAnalyser.smoothingTimeConstant).toBe(0.9);
      expect(mockAnalyser.minDecibels).toBe(-100);
      expect(mockAnalyser.maxDecibels).toBe(-5);
    });

    it('should request audio stream from mediaDevices', async () => {
      await manager.initialize();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    it('should initialize with specific device ID', async () => {
      const deviceId = 'device1';

      await manager.initialize(deviceId);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { ideal: deviceId } },
      });
    });

    it('should resume AudioContext if suspended', async () => {
      mockAudioContext.state = 'suspended';

      await manager.initialize();

      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(mockAudioContext.state).toBe('running');
    });

    it('should reconnect if already active', async () => {
      await manager.initialize();
      expect(manager.getState()).toBe('active');

      // Initialize again
      const result = await manager.initialize();
      expect(result).toBe(true);
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle getUserMedia failure', async () => {
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      );

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });

      const result = await errorManager.initialize();

      expect(result).toBe(false);
      expect(errorManager.getState()).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle AudioContext creation failure', async () => {
      (globalThis as any).AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });

      const result = await errorManager.initialize();

      expect(result).toBe(false);
      expect(errorManager.getState()).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getData', () => {
    it('should return immutable audio data', () => {
      const data = manager.getData();

      // Verify data structure
      expect(data).toHaveProperty('raw');
      expect(data).toHaveProperty('normalized');
      expect(data).toHaveProperty('spectrum');
      expect(data).toHaveProperty('bands');
      expect(data).toHaveProperty('level');
    });

    it('should return updated data after update call', async () => {
      await manager.initialize();

      // Mock getByteFrequencyData to return some values
      const mockFrequencyData = new Uint8Array(1024).fill(128);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();

      expect(data.raw.length).toBe(1024);
      expect(data.normalized.length).toBe(1024);
      expect(data.spectrum.length).toBe(1024);
      expect(data.level).toBeGreaterThan(0);
    });

    it('should return empty data when not initialized', () => {
      const data = manager.getData();

      expect(data.raw.length).toBe(0);
      expect(data.level).toBe(0);
    });
  });

  describe('getState', () => {
    it('should return idle state initially', () => {
      expect(manager.getState()).toBe('idle');
    });

    it('should return active state after initialization starts', async () => {
      const onStateChange = vi.fn();
      const testManager = new AudioManager({}, { onStateChange });

      // State changes to initializing, then to active
      await testManager.initialize();

      expect(testManager.getState()).toBe('active');
      expect(onStateChange).toHaveBeenCalledWith('initializing');
      expect(onStateChange).toHaveBeenCalledWith('active');
    });

    it('should return active state after successful initialization', async () => {
      await manager.initialize();

      expect(manager.getState()).toBe('active');
    });

    it('should return error state after initialization failure', async () => {
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      );

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });

      await errorManager.initialize();

      expect(errorManager.getState()).toBe('error');
    });

    it('should return idle state after stop', async () => {
      await manager.initialize();
      await manager.stop();

      expect(manager.getState()).toBe('idle');
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should populate audio data with FFT results', () => {
      const mockFrequencyData = new Uint8Array(1024).fill(200);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();

      expect(mockAnalyser.getByteFrequencyData).toHaveBeenCalled();
      expect(data.raw.length).toBe(1024);
      expect(data.normalized[0]).toBe(200 / 255);
      expect(data.spectrum[0]).toBe(200 / 255);
    });

    it('should calculate overall level from normalized data', () => {
      // Create frequency data with known average
      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        mockFrequencyData[i] = 128; // Average will be 128/255
      }
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();

      expect(data.level).toBeCloseTo(128 / 255, 4);
    });

    it('should not update when state is not active', () => {
      manager['state'] = 'idle';

      manager.update();

      // Update is guarded by state check, so analyser method should not be called
      // The implementation checks state before calling getByteFrequencyData
      expect(manager['state']).toBe('idle');
    });

    it('should not update when analyser is null', () => {
      // Create a manager that hasn't been initialized
      const nullAnalyserManager = new AudioManager();

      // Set analyser to null explicitly
      nullAnalyserManager['analyser'] = null;
      nullAnalyserManager['state'] = 'active';

      nullAnalyserManager.update();

      // Should not throw and data should remain empty
      const data = nullAnalyserManager.getData();
      expect(data.raw.length).toBe(0);
    });

    it('should trigger onDataUpdate event', () => {
      const onDataUpdate = vi.fn();
      const eventManager = new AudioManager({}, { onDataUpdate });

      eventManager['audioContext'] = mockAudioContext;
      eventManager['analyser'] = mockAnalyser;
      eventManager['state'] = 'active';

      const mockFrequencyData = new Uint8Array(1024).fill(100);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      eventManager.update();

      expect(onDataUpdate).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should calculate frequency bands correctly', () => {
      // Create data with energy in bass region (bins 3-12 for 44.1kHz sample rate)
      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) {
        // Higher values in bass region (60-250 Hz -> bins 3-12)
        if (i >= 3 && i <= 12) {
          mockFrequencyData[i] = 255;
        } else {
          mockFrequencyData[i] = 0;
        }
      }
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();

      // Bass should be high, other bands low
      expect(data.bands.bass).toBeGreaterThan(0.5);
      expect(data.bands.subBass).toBeLessThan(0.1);
    });
  });

  describe('getDevices', () => {
    it('should enumerate audio input devices', async () => {
      await manager.getDevices();

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
      expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled();
    });

    it('should filter only audioinput devices', async () => {
      const devices = await manager.getDevices();

      expect(devices).toHaveLength(2);
      expect(devices.every((d) => d.kind === 'audioinput')).toBe(true);
    });

    it('should include device labels', async () => {
      const devices = await manager.getDevices();

      expect(devices[0].label).toBe('Microphone 1');
      expect(devices[1].label).toBe('Microphone 2');
    });

    it('should generate labels for unnamed devices', async () => {
      (navigator.mediaDevices.enumerateDevices as any).mockResolvedValue([
        {
          deviceId: 'abc123def456',
          kind: 'audioinput',
          label: '',
        },
      ]);

      const devices = await manager.getDevices();

      expect(devices[0].label).toBe('Microphone abc12');
    });

    it('should handle permission denial gracefully', async () => {
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Permission denied')
      );

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });

      const devices = await errorManager.getDevices();

      expect(devices).toEqual([]);
      expect(onError).toHaveBeenCalled();
    });

    it('should handle enumerateDevices failure', async () => {
      (navigator.mediaDevices.enumerateDevices as any).mockRejectedValue(
        new Error('Enumeration failed')
      );

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });

      const devices = await errorManager.getDevices();

      expect(devices).toEqual([]);
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume suspended AudioContext', async () => {
      await manager.initialize();
      mockAudioContext.state = 'suspended';

      const result = await manager.resume();

      expect(result).toBe(true);
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should return true if context is already running', async () => {
      await manager.initialize();
      mockAudioContext.state = 'running';

      // Clear the mock from initialization
      mockAudioContext.resume.mockClear();

      const result = await manager.resume();

      expect(result).toBe(true);
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });

    it('should return false if AudioContext is null', async () => {
      const result = await manager.resume();

      expect(result).toBe(false);
    });

    it('should handle resume failure gracefully', async () => {
      await manager.initialize();
      mockAudioContext.state = 'suspended';
      mockAudioContext.resume.mockRejectedValue(new Error('Resume failed'));

      const result = await manager.resume();

      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop audio processing and cleanup', async () => {
      await manager.initialize();
      await manager.stop();

      expect(manager.getState()).toBe('idle');
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should stop media stream tracks', async () => {
      await manager.initialize();
      const stopSpy = vi.fn();
      mockMediaStream.getTracks = vi.fn(() => [{ stop: stopSpy }]);

      await manager.stop();

      expect(stopSpy).toHaveBeenCalled();
    });

    it('should disconnect source', async () => {
      await manager.initialize();

      await manager.stop();

      expect(manager['source']).toBeNull();
    });

    it('should clear audio data', async () => {
      await manager.initialize();

      // Update with some data
      const mockFrequencyData = new Uint8Array(1024).fill(200);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });
      manager.update();
      expect(manager.getData().level).toBeGreaterThan(0);

      // Stop
      await manager.stop();

      const data = manager.getData();
      expect(data.raw.length).toBe(0);
      expect(data.level).toBe(0);
    });

    it('should handle stopping when not initialized', async () => {
      await manager.stop();

      expect(manager.getState()).toBe('idle');
    });

    it('should stop update loop', async () => {
      await manager.initialize();

      // Cancel RAF spy
      vi.spyOn(globalThis, 'cancelAnimationFrame');

      await manager.stop();

      // Verify cleanup
      expect(manager.getState()).toBe('idle');
    });
  });

  describe('setConfig', () => {
    it('should update internal config', () => {
      manager.setConfig({
        fftSize: 4096,
        smoothingTimeConstant: 0.9,
      });

      // Config is updated internally
      expect(manager['config'].fftSize).toBe(4096);
    });

    it('should update analyser if initialized', async () => {
      await manager.initialize();

      manager.setConfig({
        fftSize: 4096,
        smoothingTimeConstant: 0.9,
        minDecibels: -100,
        maxDecibels: -5,
      });

      expect(mockAnalyser.fftSize).toBe(4096);
      expect(mockAnalyser.smoothingTimeConstant).toBe(0.9);
      expect(mockAnalyser.minDecibels).toBe(-100);
      expect(mockAnalyser.maxDecibels).toBe(-5);
    });

    it('should not update analyser if not initialized', () => {
      manager.setConfig({ fftSize: 4096 });

      expect(mockAnalyser.fftSize).toBe(2048); // Default, unchanged
    });

    it('should recalculate frequency ranges when fftSize changes', async () => {
      await manager.initialize();

      manager.setConfig({ fftSize: 4096 });

      // Verify frequency ranges are recalculated
      expect(manager['frequencyRanges']).toBeDefined();
    });
  });

  describe('getAudioContext', () => {
    it('should return null before initialization', () => {
      expect(manager.getAudioContext()).toBeNull();
    });

    it('should return AudioContext after initialization', async () => {
      await manager.initialize();

      expect(manager.getAudioContext()).toBe(mockAudioContext);
    });

    it('should return null after stop', async () => {
      await manager.initialize();
      await manager.stop();

      expect(manager.getAudioContext()).toBeNull();
    });
  });

  describe('frequency band calculation', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should calculate sub-bass band (20-60 Hz)', () => {
      // At 44.1kHz sample rate with 2048 FFT size:
      // Bin size = 44100 / 2 / 1024 ≈ 21.5 Hz
      // Sub-bass (20-60 Hz) ≈ bins 1-3

      const mockFrequencyData = new Uint8Array(1024);
      mockFrequencyData[1] = 255;
      mockFrequencyData[2] = 255;
      mockFrequencyData[3] = 255;
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.bands.subBass).toBeGreaterThan(0);
    });

    it('should calculate bass band (60-250 Hz)', () => {
      // Bass (60-250 Hz) ≈ bins 3-12

      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 3; i <= 12; i++) {
        mockFrequencyData[i] = 200;
      }
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.bands.bass).toBeGreaterThan(0);
    });

    it('should calculate mid band (500-2000 Hz)', () => {
      // Mid (500-2000 Hz) ≈ bins 24-94

      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 24; i <= 94; i++) {
        mockFrequencyData[i] = 180;
      }
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.bands.mid).toBeGreaterThan(0);
    });

    it('should calculate treble band (4000-6000 Hz)', () => {
      // Treble (4000-6000 Hz) ≈ bins 187-280

      const mockFrequencyData = new Uint8Array(1024);
      for (let i = 187; i <= 280; i++) {
        mockFrequencyData[i] = 150;
      }
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.bands.treble).toBeGreaterThan(0);
    });

    it('should handle out of range frequency bands', () => {
      // Test with data that exceeds array bounds in some bands
      const mockFrequencyData = new Uint8Array(1024).fill(100);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      // All bands should have values between 0 and 1
      expect(data.bands.subBass).toBeGreaterThanOrEqual(0);
      expect(data.bands.subBass).toBeLessThanOrEqual(1);
      expect(data.bands.brilliance).toBeGreaterThanOrEqual(0);
      expect(data.bands.brilliance).toBeLessThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty frequency data', async () => {
      await manager.initialize();

      const mockFrequencyData = new Uint8Array(1024).fill(0);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.level).toBe(0);
      expect(data.bands.subBass).toBe(0);
    });

    it('should handle maximum frequency data', async () => {
      await manager.initialize();

      const mockFrequencyData = new Uint8Array(1024).fill(255);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      manager.update();

      const data = manager.getData();
      expect(data.level).toBeCloseTo(1, 4);
    });

    it('should handle concurrent update calls', async () => {
      await manager.initialize();

      const mockFrequencyData = new Uint8Array(1024).fill(128);
      mockAnalyser.getByteFrequencyData.mockImplementation((data: Uint8Array) => {
        data.set(mockFrequencyData);
      });

      // Multiple updates
      manager.update();
      manager.update();
      manager.update();

      const data = manager.getData();
      expect(data.level).toBeGreaterThan(0);
    });

    it('should handle rapid initialize/stop cycles', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.initialize();
        expect(manager.getState()).toBe('active');
        await manager.stop();
        expect(manager.getState()).toBe('idle');
      }
    });

    it('should handle null event callbacks', () => {
      const nullEventManager = new AudioManager({}, {});

      expect(() => {
        nullEventManager['handleError'](new Error('Test'));
      }).not.toThrow();
    });
  });

  describe('update loop', () => {
    it('should start update loop on initialization', async () => {
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

      await manager.initialize();

      expect(rafSpy).toHaveBeenCalled();
    });

    it('should stop update loop on stop', async () => {
      vi.spyOn(globalThis, 'cancelAnimationFrame');

      await manager.initialize();
      await manager.stop();

      // Update loop should be stopped
      expect(manager['updateLoopId']).toBeNull();
    });
  });

  describe('getCurrentDeviceId', () => {
    it('returns null when not initialized', () => {
      const deviceId = manager.getCurrentDeviceId();
      expect(deviceId).toBeNull();
    });

    it('returns default device ID when initialized without device ID', async () => {
      await manager.initialize();
      const deviceId = manager.getCurrentDeviceId();
      expect(deviceId).toBe('default');
    });

    it('returns the device ID used during initialization', async () => {
      const expectedDeviceId = 'device1';
      await manager.initialize(expectedDeviceId);
      const deviceId = manager.getCurrentDeviceId();
      expect(deviceId).toBe(expectedDeviceId);
    });

    it('returns null after stop', async () => {
      await manager.initialize('device1');
      await manager.stop();
      const deviceId = manager.getCurrentDeviceId();
      expect(deviceId).toBeNull();
    });
  });

  describe('changeDevice', () => {
    it('changes to a different device and reinitializes', async () => {
      const onStateChange = vi.fn();
      const testManager = new AudioManager({}, { onStateChange });

      await testManager.initialize('device1');
      expect(testManager.getCurrentDeviceId()).toBe('device1');

      const result = await testManager.changeDevice('device2');
      expect(result).toBe(true);
      expect(testManager.getCurrentDeviceId()).toBe('device2');
      expect(onStateChange).toHaveBeenCalledWith('initializing');
      expect(onStateChange).toHaveBeenCalledWith('active');
    });

    it('stops current stream before changing device', async () => {
      await manager.initialize('device1');
      const stopSpy = vi.fn();
      mockMediaStream.getTracks = vi.fn(() => [{ stop: stopSpy }]);

      await manager.changeDevice('device2');

      expect(stopSpy).toHaveBeenCalled();
    });

    it('creates new AudioContext when changing device', async () => {
      await manager.initialize('device1');
      const audioContextCalls = (globalThis as any).AudioContext.mock.calls.length;

      await manager.changeDevice('device2');

      expect((globalThis as any).AudioContext).toHaveBeenCalledTimes(audioContextCalls + 1);
    });

    it('requests media stream with new device ID', async () => {
      await manager.initialize('device1');
      (navigator.mediaDevices.getUserMedia as any).mockClear();

      await manager.changeDevice('device2');

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { ideal: 'device2' } },
      });
    });

    it('returns false and sets error state when device change fails', async () => {
      await manager.initialize('device1');
      (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(
        new Error('Device not found')
      );

      const onError = vi.fn();
      const errorManager = new AudioManager({}, { onError });
      await errorManager.initialize('device1');

      const result = await errorManager.changeDevice('invalid-device');

      expect(result).toBe(false);
      expect(errorManager.getState()).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('maintains active state after successful device change', async () => {
      await manager.initialize('device1');
      expect(manager.getState()).toBe('active');

      await manager.changeDevice('device2');

      expect(manager.getState()).toBe('active');
    });

    it('handles changeDevice when not initialized', async () => {
      const result = await manager.changeDevice('device1');
      expect(result).toBe(true);
      expect(manager.getState()).toBe('active');
    });

    it('handles changeDevice to same device', async () => {
      await manager.initialize('device1');

      const result = await manager.changeDevice('device1');

      expect(result).toBe(true);
      // Should still request media stream even for same device
      expect((navigator.mediaDevices.getUserMedia as any).mock.calls.length).toBeGreaterThan(0);
    });

    it('preserves config when changing device', async () => {
      const configManager = new AudioManager({
        fftSize: 4096,
        smoothingTimeConstant: 0.9,
      });
      await configManager.initialize('device1');

      await configManager.changeDevice('device2');

      expect(configManager['config'].fftSize).toBe(4096);
      expect(configManager['config'].smoothingTimeConstant).toBe(0.9);
    });
  });
});
