import type {
  MidiCCMapping,
  MidiChannelFilter,
  MidiData,
  MidiDevice,
  MidiState,
  MidiEvents,
} from '../types/midi';
import { MidiLearnManager } from './MidiLearnManager';

/**
 * Manages Web MIDI API, CC mappings, and provides MIDI data for visual patterns
 */
export class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private inputDevices: Map<string, MIDIInput> = new Map();
  private outputDevices: Map<string, MIDIOutput> = new Map();

  private state: MidiState = 'idle';
  private events: MidiEvents;

  // MIDI Learn manager
  private learnManager: MidiLearnManager;

  // Current MIDI data (updated on MIDI events)
  private currentData: MidiData = {
    cc: new Map<string, number>(),
    programChange: null,
    clock: 0,
  };

  // CC Mappings: key is "channel:ccNumber"
  private ccMappings: Map<string, MidiCCMapping> = new Map();

  // Channel filter
  private channelFilter: MidiChannelFilter = 'all';

  constructor(events: MidiEvents = {}) {
    this.events = events;
    this.learnManager = new MidiLearnManager(events);
  }

  /**
   * Get current MIDI data (immutable)
   */
  getData(): Readonly<MidiData> {
    return this.currentData;
  }

  /**
   * Get current state
   */
  getState(): MidiState {
    return this.state;
  }

  /**
   * Get list of connected MIDI devices
   */
  getDevices(): MidiDevice[] {
    const devices: MidiDevice[] = [];

    this.inputDevices.forEach((port, id) => {
      devices.push({
        id,
        name: port.name,
        manufacturer: port.manufacturer ?? 'Unknown',
        state: port.connection === 'open' ? 'connected' : 'disconnected',
        type: 'input',
      } as MidiDevice);
    });

    this.outputDevices.forEach((port, id) => {
      devices.push({
        id,
        name: port.name,
        manufacturer: port.manufacturer ?? 'Unknown',
        state: port.connection === 'open' ? 'connected' : 'disconnected',
        type: 'output',
      } as MidiDevice);
    });

    return devices;
  }

  /**
   * Check if Web MIDI API is supported
   */
  isSupported(): boolean {
    return 'requestMIDIAccess' in navigator;
  }

  /**
   * Initialize MIDI
   */
  async initialize(sysexEnabled: boolean = false): Promise<boolean> {
    if (!this.isSupported()) {
      this.setState('unsupported');
      this.events.onError?.(new Error('Web MIDI API is not supported in this browser'));
      return false;
    }

    this.setState('requesting');

    try {
      this.midiAccess = await navigator.requestMIDIAccess({
        sysex: sysexEnabled,
        software: false,
      });

      // Set up device connection listeners
      this.midiAccess.addEventListener('statechange', this.handleStateChange);

      // Connect to existing inputs
      this.midiAccess.inputs.forEach((input) => {
        this.connectInput(input);
      });

      // Connect to existing outputs
      this.midiAccess.outputs.forEach((output) => {
        this.connectOutput(output);
      });

      this.setState('active');
      this.notifyDeviceChange();

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Stop MIDI and cleanup
   */
  stop(): void {
    // Disconnect all inputs
    this.inputDevices.forEach((input) => {
      input.removeEventListener('midimessage', this.handleMidiMessage);
    });
    this.inputDevices.clear();

    // Clear outputs
    this.outputDevices.clear();

    // Close MIDI access
    if (this.midiAccess) {
      this.midiAccess.removeEventListener('statechange', this.handleStateChange);
      this.midiAccess = null;
    }

    // Reset data
    this.currentData = {
      cc: new Map<string, number>(),
      programChange: null,
      clock: 0,
    };

    this.ccMappings.clear();
    this.setState('idle');
  }

  /**
   * Add or update a CC mapping
   */
  addCCMapping(mapping: MidiCCMapping): void {
    const key = `${mapping.channel}:${mapping.ccNumber}`;
    this.ccMappings.set(key, mapping);
  }

  /**
   * Remove a CC mapping
   */
  removeCCMapping(channel: number, ccNumber: number): void {
    const key = `${channel}:${ccNumber}`;
    this.ccMappings.delete(key);
  }

  /**
   * Get all CC mappings
   */
  getCCMappings(): ReadonlyArray<MidiCCMapping> {
    return Array.from(this.ccMappings.values());
  }

  /**
   * Get value for a specific CC
   */
  getCCValue(channel: number, ccNumber: number): number {
    const key = `${channel}:${ccNumber}`;
    return this.currentData.cc.get(key) ?? 0;
  }

  /**
   * Set MIDI channel filter
   * - 'all': Receive all channels
   * - 'off': Disable MIDI
   * - '0'-'15': Receive only specific channel
   */
  setChannelFilter(filter: MidiChannelFilter): void {
    this.channelFilter = filter;
  }

  /**
   * Get current MIDI channel filter
   */
  getChannelFilter(): MidiChannelFilter {
    return this.channelFilter;
  }

  /**
   * Send MIDI message to output device
   */
  sendMessage(deviceId: string, data: number[], timestamp?: number): boolean {
    const output = this.outputDevices.get(deviceId);
    if (!output || output.connection !== 'open') {
      return false;
    }

    output.send(data as [number, number, number], timestamp);
    return true;
  }

  /**
   * Send CC message
   */
  sendCC(deviceId: string, channel: number, ccNumber: number, value: number): boolean {
    const status = 0xb0 + (channel & 0x0f);
    return this.sendMessage(deviceId, [status, ccNumber & 0x7f, value & 0x7f]);
  }

  // Private methods

  private connectInput(input: MIDIInput): void {
    input.addEventListener('midimessage', this.handleMidiMessage);
    this.inputDevices.set(input.id, input);
  }

  private connectOutput(output: MIDIOutput): void {
    this.outputDevices.set(output.id, output);
  }

  private disconnectInput(input: MIDIInput): void {
    input.removeEventListener('midimessage', this.handleMidiMessage);
    this.inputDevices.delete(input.id);
  }

  private disconnectOutput(output: MIDIOutput): void {
    this.outputDevices.delete(output.id);
  }

  private handleMidiMessage = (event: MIDIMessageEvent): void => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const [status, byte1, byte2] = data;
    const messageType = status & 0xf0;
    const channel = status & 0x0f;

    // Apply channel filter
    if (!this.shouldProcessChannel(channel)) {
      return;
    }

    switch (messageType) {
      case 0xb0: // Control Change (CC)
        this.handleCC(channel, byte1, byte2);
        break;

      case 0xc0: // Program Change
        this.handleProgramChange(channel, byte1);
        break;

      case 0xf8: // MIDI Clock
        this.handleClock();
        break;
    }
  };

  private handleCC(channel: number, ccNumber: number, value: number): void {
    // Check if in learn mode - let LearnManager handle it
    if (this.learnManager.isLearning()) {
      const consumed = this.learnManager.handleMidiInput(channel, ccNumber);
      if (consumed) {
        // Learn was complete, now process the CC normally
        // Fall through to normal processing below
      }
    }

    const normalized = value / 127;
    const key = `${channel}:${ccNumber}`;

    // Update current data
    this.currentData.cc.set(key, normalized);

    // Check for Learn Manager assignments
    const learnAssignment = this.learnManager.getAssignment(key);
    if (learnAssignment) {
      // Use Learn Manager assignment
      const mappedValue = this.learnManager.mapMidiValue(value, learnAssignment.min, learnAssignment.max);
      const updatedMapping = { ...learnAssignment, currentValue: mappedValue };
      this.events.onCcChange?.(updatedMapping as any);
      // Notify parameter change for UI sync
      this.events.onMidiParameterChange?.(learnAssignment.parameterName, mappedValue);
      return;
    }

    // Check legacy ccMappings for backward compatibility
    const mapping = this.ccMappings.get(key);
    if (mapping) {
      const scaledValue = mapping.min + normalized * (mapping.max - mapping.min);
      const updatedMapping = { ...mapping, currentValue: scaledValue };
      this.events.onCcChange?.(updatedMapping);
      // Notify parameter change for UI sync
      this.events.onMidiParameterChange?.(mapping.parameterPath, scaledValue);
    }
  }

  private handleProgramChange(_channel: number, program: number): void {
    this.currentData.programChange = program;
    this.events.onProgramChange?.(program);
  }

  private handleClock(): void {
    this.currentData.clock++;
  }

  /**
   * Check if a channel should be processed based on the current filter
   */
  private shouldProcessChannel(channel: number): boolean {
    if (this.channelFilter === 'off') {
      return false;
    }

    if (this.channelFilter === 'all') {
      return true;
    }

    // Convert string channel to number for comparison
    const filterChannel = parseInt(this.channelFilter, 10);
    return channel === filterChannel;
  }

  private handleStateChange = (event: MIDIConnectionEvent): void => {
    const port = event.port;
    if (!port) return;

    if (port.type === 'input') {
      if (port.state === 'connected') {
        this.connectInput(port as MIDIInput);
      } else {
        this.disconnectInput(port as MIDIInput);
      }
    } else if (port.type === 'output') {
      if (port.state === 'connected') {
        this.connectOutput(port as MIDIOutput);
      } else {
        this.disconnectOutput(port as MIDIOutput);
      }
    }

    this.notifyDeviceChange();
  };

  private notifyDeviceChange(): void {
    this.events.onDeviceChange?.(this.getDevices());
  }

  private setState(state: MidiState): void {
    if (this.state !== state) {
      this.state = state;
      this.events.onStateChange?.(state);
    }
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.events.onError?.(error);
  }

  /**
   * Get the MIDI Learn manager
   */
  getLearnManager(): MidiLearnManager {
    return this.learnManager;
  }

  /**
   * Start MIDI learn mode for a parameter
   */
  startLearning(parameterPath: string): void {
    this.learnManager.startLearning(parameterPath);
  }

  /**
   * Cancel current MIDI learn mode
   */
  cancelLearning(): void {
    this.learnManager.cancelLearning();
  }

  /**
   * Get all MIDI learn assignments
   */
  getLearnAssignments(): Map<string, import('../types/midiAssignment').MidiCCAssignment> {
    return this.learnManager.getAssignments();
  }

  /**
   * Remove MIDI learn assignment for a parameter
   */
  removeLearnAssignment(parameterPath: string): void {
    this.learnManager.removeAssignment(parameterPath);
  }

  /**
   * Get learn state
   */
  getLearnState(): import('../types/midiAssignment').MidiLearnState {
    return this.learnManager.getState();
  }

  /**
   * Get active learning parameter
   */
  getActiveLearning(): string | null {
    return this.learnManager.getActiveLearning();
  }

  /**
   * Set parameter metadata function for MIDI Learn
   */
  setParamMetaFn(getParamMeta: (paramName: string) => { min: number; max: number; step: number } | null): void {
    this.learnManager.setParamMetaFn(getParamMeta);
  }
}
