import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Store } from './core';
import { InputManager } from './core/InputManager';
import { BlackHolePattern, GargantuaPattern, DataPattern, ThreeDPattern, FlowFieldPattern, BloodVesselPattern, WireframeTerrainPattern } from './patterns';
import { StartOverlay } from './components';
import { P5Wrapper } from './components/P5Wrapper';
import { LevaPanel } from './components/LevaPanel';
import { ControlPanel } from './components/ControlPanel';
import type { AudioDeviceInfo } from './types/audio';
import type { MidiCCMapping, MidiChannelFilter } from './types/midi';
import type { MidiCCAssignment, MidiLearnState } from './types/midiAssignment';

// Available patterns
const PATTERNS = [
  new BlackHolePattern(),     // Key 1: Original black hole
  new GargantuaPattern(),     // Key 2: Interstellar-style black hole
  new DataPattern(),          // Key 3: Minimal data visualization
  new ThreeDPattern(),        // Key 4: 3D interactive visualizer
  new FlowFieldPattern(),     // Key 5: Flow field visualization
  new BloodVesselPattern(),   // Key 6: Blood vessel visualization
  new WireframeTerrainPattern(), // Key 7: Wireframe terrain
];

// Custom event for parameter updates (for ControlPanel sync)
class ParameterUpdateEvent extends CustomEvent<{ name: string; value: number }> {
  constructor(detail: { name: string; value: number }) {
    super('parameterUpdate', { detail });
  }
}

declare global {
  interface WindowEventMap {
    parameterUpdate: ParameterUpdateEvent;
  }
}

function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [showLeva, setShowLeva] = useState(true);
  const [useCustomPanel, setUseCustomPanel] = useState(true); // Toggle between Leva and custom panel
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [midiMappings, setMidiMappings] = useState<ReadonlyArray<MidiCCMapping>>([]);
  const [midiChannelFilter, setMidiChannelFilter] = useState<MidiChannelFilter>('all');
  // MIDI Learn state
  const [midiAssignments, setMidiAssignments] = useState<ReadonlyArray<MidiCCAssignment>>([]);
  const [midiLearnState, setMidiLearnState] = useState<MidiLearnState>('idle');
  const [activeLearningParam, setActiveLearningParam] = useState<string | null>(null);

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
        onMidiParameterChange: (parameterName, value) => {
          // Update pattern parameter
          const pattern = PATTERNS[currentPatternIndex];
          if (pattern && pattern.setParams) {
            pattern.setParams({ [parameterName]: value });
          }
          // Dispatch event for ControlPanel sync
          window.dispatchEvent(new ParameterUpdateEvent({ name: parameterName, value }));
        },
      }
    );

    // Set up MIDI Learn events
    const midiManager = store.midi;
    const learnManager = midiManager.getLearnManager();

    // Subscribe to MIDI Learn events via custom event handling
    // We'll poll the state for UI updates
    const learnStateInterval = setInterval(() => {
      setMidiLearnState(learnManager.getState());
      setActiveLearningParam(learnManager.getActiveLearning());
      setMidiAssignments(Array.from(learnManager.getAssignments().values()));
    }, 100);

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
      clearInterval(learnStateInterval);
      inputManager.destroy();
      store.destroy();
    };
  }, []);

  // Update MIDI Learn parameter metadata when pattern changes
  useEffect(() => {
    const store = storeRef.current;
    if (!store) return;

    const pattern = PATTERNS[currentPatternIndex];
    if (pattern && pattern.getParamMeta) {
      const paramMeta = pattern.getParamMeta();
      store.midi.setParamMetaFn((paramName: string) => {
        return paramMeta[paramName] ?? null;
      });
      console.log('[App] Updated MIDI Learn parameter metadata for:', pattern.constructor.name);
    }
  }, [currentPatternIndex]);

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

  // MIDI Learn handlers
  const handleStartLearning = useCallback((paramName: string) => {
    const store = storeRef.current;
    if (!store) return;

    console.log('[App] Starting MIDI Learn for:', paramName);
    store.midi.startLearning(paramName);
  }, []);

  const handleCancelLearning = useCallback(() => {
    const store = storeRef.current;
    if (!store) return;

    console.log('[App] Canceling MIDI Learn');
    store.midi.cancelLearning();
  }, []);

  const handleRemoveAssignment = useCallback((paramName: string) => {
    const store = storeRef.current;
    if (!store) return;

    console.log('[App] Removing MIDI assignment for:', paramName);
    store.midi.removeLearnAssignment(paramName);
  }, []);

  // Get current pattern instance
  const currentPattern = useMemo(() => {
    return PATTERNS[currentPatternIndex] || null;
  }, [currentPatternIndex]);

  // Toggle between custom panel and Leva
  const handleTogglePanel = useCallback(() => {
    setUseCustomPanel(prev => !prev);
  }, []);

  return (
    <>
      {!isStarted ? (
        <StartOverlay onStart={handleStart} />
      ) : (
        <>
          <P5Wrapper
            store={storeRef.current}
            patterns={PATTERNS}
            currentPatternIndex={currentPatternIndex}
          />
          {showLeva && currentPattern && (
            <>
              {useCustomPanel ? (
                <ControlPanel
                  pattern={currentPattern}
                  p5={null}
                  devices={devices}
                  currentDeviceId={currentDeviceId}
                  onDeviceChange={handleDeviceChange}
                  midiAssignments={midiAssignments}
                  midiLearnState={midiLearnState}
                  activeLearningParam={activeLearningParam}
                  onStartLearning={handleStartLearning}
                  onCancelLearning={handleCancelLearning}
                  onRemoveAssignment={handleRemoveAssignment}
                  midiChannelFilter={midiChannelFilter}
                  onMidiChannelChange={handleMidiChannelChange}
                />
              ) : (
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
              {/* Panel toggle button for testing */}
              <button
                onClick={handleTogglePanel}
                style={{
                  position: 'fixed',
                  bottom: '20px',
                  right: '20px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  zIndex: 1001,
                }}
              >
                {useCustomPanel ? 'Switch to Leva' : 'Switch to Custom'}
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

export default App;
