type KeyCallback = () => void;

interface KeyBinding {
  key: string;
  callback: KeyCallback;
  description: string;
}

interface InputEvents {
  onPatternSwitch?: (index: number) => void;
  onToggleLeva?: () => void;
  onRandomize?: () => void;
}

/**
 * Manages keyboard input for pattern switching and UI control
 */
export class InputManager {
  private bindings: Map<string, KeyBinding> = new Map();
  private isEnabled = true;
  private events: InputEvents;

  // Key codes
  private static readonly KEYS = {
    H: 'h',
    SPACE: ' ',
    DIGITS: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const,
  };

  constructor(events: InputEvents = {}) {
    this.events = events;
    this.setupDefaultBindings();
  }

  /**
   * Initialize keyboard listeners
   */
  initialize(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Cleanup keyboard listeners
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Enable/disable input handling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if input is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Register a custom key binding
   */
  bind(key: string, callback: KeyCallback, description: string): void {
    this.bindings.set(key.toLowerCase(), { key, callback, description });
  }

  /**
   * Unregister a key binding
   */
  unbind(key: string): void {
    this.bindings.delete(key.toLowerCase());
  }

  /**
   * Get all key bindings
   */
  getBindings(): ReadonlyArray<KeyBinding> {
    return Array.from(this.bindings.values());
  }

  /**
   * Get default key help text
   */
  getKeyHelp(): string[] {
    return [
      'H - Toggle Leva Panel',
      'SPACE - Randomize Parameters',
      '1-9 - Switch Pattern',
    ];
  }

  // Private methods

  private setupDefaultBindings(): void {
    // H key - Toggle Leva panel
    this.bind(InputManager.KEYS.H, () => {
      this.events.onToggleLeva?.();
    }, 'Toggle Leva Panel');

    // Space key - Randomize parameters
    this.bind(InputManager.KEYS.SPACE, () => {
      this.events.onRandomize?.();
    }, 'Randomize Parameters');

    // 1-9 keys - Pattern switching
    InputManager.KEYS.DIGITS.forEach((key, index) => {
      this.bind(key, () => {
        this.events.onPatternSwitch?.(index);
      }, `Switch to Pattern ${index + 1}`);
    });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) {
      return;
    }

    // Ignore if modifier keys are pressed (allow browser shortcuts)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Ignore if typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    const key = event.key.toLowerCase();
    const binding = this.bindings.get(key);

    if (binding) {
      event.preventDefault();
      binding.callback();
    }
  };

  private handleKeyUp = (_event: KeyboardEvent): void => {
    // Reserved for future use (e.g., keyup actions)
  };
}
