import { useEffect, useMemo, useRef, useState } from 'react';
import { Store } from './core';
import { InputManager } from './core/InputManager';
import { BlackHolePattern } from './patterns';
import { StartOverlay } from './components';
import { P5Wrapper } from './components/P5Wrapper';
import { LevaPanel } from './components/LevaPanel';
import type { AudioDeviceInfo } from './types/audio';
import type { MidiCCMapping, MidiChannelFilter } from './types/midi';

// Available patterns
const PATTERNS = [new BlackHolePattern()];

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [showLeva, setShowLeva] = useState(true);
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [midiMappings, setMidiMappings] = useState<ReadonlyArray<MidiCCMapping>>([]);
  const [midiChannelFilter, setMidiChannelFilter] = useState<MidiChannelFilter>('all');

  // Use refs for managers to avoid re-renders
  const storeRef = useRef<Store | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);

  // Initialize store and input manager
  useEffect(() => {
    const store = new Store(
      {
        audio: {
          fftSize: 2048,
          smoothingTimeConstant: 0.8,
        },
        midi: {
          sysexEnabled: false,
        },
      },
      {
        onPatternChange: (index) => {
          setCurrentPatternIndex(index);
        },
      }
    );

    const inputManager = new InputManager({
      onPatternSwitch: (index) => {
        if (index < PATTERNS.length) {
          store.setPatternIndex(index);
        }
      },
      onToggleLeva: () => {
        setShowLeva((prev) => !prev);
      },
      onRandomize: () => {
        // TODO: Implement randomize functionality
        console.log('Randomize parameters');
      },
    });

    inputManager.initialize();

    storeRef.current = store;
    inputManagerRef.current = inputManager;

    // Set total patterns
    store.setTotalPatterns(PATTERNS.length);

    return () => {
      inputManager.destroy();
      store.destroy();
    };
  }, []);

  // Handle start
  const handleStart = async () => {
    const store = storeRef.current;
    if (!store) return;

    console.log('[App] Starting initialization...');

    // Initialize audio and MIDI
    const result = await store.initialize();

    console.log('[App] Initialization result:', result);

    if (result.audio) {
      // Only proceed if audio is actually active
      if (store.audio.getState() === 'active') {
        // Get available audio devices
        const audioDevices = await store.audio.getDevices();
        setDevices(audioDevices);
        const deviceId = store.audio.getCurrentDeviceId();
        setCurrentDeviceId(deviceId);
      } else {
        console.error('[App] Audio initialization failed:', store.audio.getState());
      }
    }

    if (result.midi) {
      // Only proceed if MIDI is actually active
      if (store.midi.getState() === 'active') {
        // Set up MIDI CC mappings from current pattern
        const currentPattern = PATTERNS[currentPatternIndex];
        if (currentPattern && 'getMidiMappings' in currentPattern) {
          const patternMappings = (currentPattern as any).getMidiMappings();
          // Register mappings with MidiManager
          patternMappings.forEach((mapping: MidiCCMapping) => {
            store.midi.addCCMapping(mapping);
          });
          setMidiMappings(patternMappings);
        }
      } else {
        console.log('[App] MIDI not available:', store.midi.getState());
      }
    }

    if (result.audio || result.midi) {
      setIsStarted(true);
    }
  };

  // Handle device change
  const handleDeviceChange = async (deviceId: string) => {
    const store = storeRef.current;
    if (!store) return;

    const success = await store.audio.changeDevice(deviceId);
    if (success) {
      setCurrentDeviceId(deviceId);
    }
  };

  // Handle MIDI channel filter change
  const handleMidiChannelChange = (filter: MidiChannelFilter) => {
    const store = storeRef.current;
    if (!store) return;

    store.midi.setChannelFilter(filter);
    setMidiChannelFilter(filter);
  };

  // Get current pattern instance
  const currentPattern = useMemo(() => {
    return PATTERNS[currentPatternIndex] || null;
  }, [currentPatternIndex]);

  return (
    <>
      {!isStarted ? (
        <StartOverlay onStart={handleStart} />
      ) : (
        <>
          <P5Wrapper
            store={storeRef.current}
            patterns={PATTERNS}
          />
          {showLeva && currentPattern && (
            <LevaPanel
              pattern={currentPattern}
              p5={null}
              devices={devices}
              currentDeviceId={currentDeviceId}
              onDeviceChange={handleDeviceChange}
              midiMappings={midiMappings}
              midiChannelFilter={midiChannelFilter}
              onMidiChannelChange={handleMidiChannelChange}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;
