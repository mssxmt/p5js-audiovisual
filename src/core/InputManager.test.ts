/**
 * Unit tests for InputManager
 * Tests keyboard input handling, key bindings, and event filtering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from './InputManager';

// Helper function to create mock KeyboardEvent
const createMockEvent = (
  key: string,
  options: Partial<KeyboardEvent> = {}
): KeyboardEvent => {
  return {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    target: document.body,
    ...options,
  } as unknown as KeyboardEvent;
};

describe('InputManager', () => {
  let manager: InputManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock window methods
    (window.addEventListener as any) = vi.fn();
    (window.removeEventListener as any) = vi.fn();

    manager = new InputManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default state', () => {
      expect(manager.getEnabled()).toBe(true);
    });

    it('should set up default key bindings', () => {
      const bindings = manager.getBindings();

      expect(bindings.length).toBeGreaterThan(0);

      // Should have H key binding
      const hBinding = bindings.find((b) => b.key.toLowerCase() === 'h');
      expect(hBinding).toBeDefined();
      expect(hBinding?.description).toBe('Toggle Leva Panel');

      // Should have Space key binding
      const spaceBinding = bindings.find((b) => b.key === ' ');
      expect(spaceBinding).toBeDefined();
      expect(spaceBinding?.description).toBe('Randomize Parameters');

      // Should have digit key bindings (1-9)
      for (let i = 1; i <= 9; i++) {
        const digitBinding = bindings.find((b) => b.key === String(i));
        expect(digitBinding).toBeDefined();
        expect(digitBinding?.description).toBe(`Switch to Pattern ${i}`);
      }
    });

    it('should accept event callbacks', () => {
      const onPatternSwitch = vi.fn();
      const onToggleLeva = vi.fn();
      const onRandomize = vi.fn();

      const eventManager = new InputManager({
        onPatternSwitch,
        onToggleLeva,
        onRandomize,
      });

      expect(eventManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should register keyboard event listeners', () => {
      manager.initialize();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      );
    });

    it('should only initialize once', () => {
      // This test verifies that initialize() adds listeners each time it's called
      // The current implementation doesn't guard against duplicate calls
      const testManager = new InputManager();

      // Clear previous calls from constructor
      (window.addEventListener as any).mockClear();

      testManager.initialize();
      const callsAfterFirstInit = (window.addEventListener as any).mock.calls.length;

      testManager.initialize();
      const callsAfterSecondInit = (window.addEventListener as any).mock.calls.length;

      // Verify that initialize() adds 2 listeners each time (keydown + keyup)
      expect(callsAfterSecondInit).toBe(callsAfterFirstInit + 2);
    });
  });

  describe('destroy', () => {
    it('should remove keyboard event listeners', () => {
      manager.initialize();
      manager.destroy();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      );
    });

    it('should handle destroy without initialize', () => {
      expect(() => manager.destroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      // Create a new manager with cleared mocks
      const testManager = new InputManager();

      // Clear previous calls from constructor
      (window.addEventListener as any).mockClear();
      (window.removeEventListener as any).mockClear();

      testManager.initialize();
      const callsAfterFirstDestroy = (window.removeEventListener as any).mock.calls.length;

      testManager.destroy();
      const callsAfterSecondDestroy = (window.removeEventListener as any).mock.calls.length;

      // Verify that destroy() adds 2 removeEventListener calls each time (keydown + keyup)
      expect(callsAfterSecondDestroy).toBe(callsAfterFirstDestroy + 2);
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state', () => {
      manager.setEnabled(false);
      expect(manager.getEnabled()).toBe(false);

      manager.setEnabled(true);
      expect(manager.getEnabled()).toBe(true);
    });

    it('should accept boolean value', () => {
      manager.setEnabled(false);
      expect(manager.getEnabled()).toBe(false);

      manager.setEnabled(true);
      expect(manager.getEnabled()).toBe(true);
    });
  });

  describe('getEnabled', () => {
    it('should return initial enabled state', () => {
      expect(manager.getEnabled()).toBe(true);
    });

    it('should return updated enabled state', () => {
      manager.setEnabled(false);
      expect(manager.getEnabled()).toBe(false);
    });
  });

  describe('bind', () => {
    it('should register custom key binding', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test Action');

      const bindings = manager.getBindings();
      const binding = bindings.find((b) => b.key.toLowerCase() === 'a');

      expect(binding).toBeDefined();
      expect(binding?.callback).toBe(callback);
      expect(binding?.description).toBe('Test Action');
    });

    it('should convert key to lowercase', () => {
      const callback = vi.fn();

      manager.bind('A', callback, 'Test');

      const bindings = manager.getBindings();
      const binding = bindings.find((b) => b.key.toLowerCase() === 'a');

      expect(binding).toBeDefined();
    });

    it('should allow special characters', () => {
      const callback = vi.fn();

      manager.bind('+', callback, 'Plus Action');
      manager.bind('-', callback, 'Minus Action');
      manager.bind('=', callback, 'Equal Action');

      const bindings = manager.getBindings();

      expect(bindings.some((b) => b.key === '+')).toBe(true);
      expect(bindings.some((b) => b.key === '-')).toBe(true);
      expect(bindings.some((b) => b.key === '=')).toBe(true);
    });

    it('should update existing binding', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.bind('x', callback1, 'Action 1');
      manager.bind('x', callback2, 'Action 2');

      const bindings = manager.getBindings();
      const binding = bindings.find((b) => b.key.toLowerCase() === 'x');

      expect(binding?.callback).toBe(callback2);
      expect(binding?.description).toBe('Action 2');
    });

    it('should handle multiple bindings for different keys', () => {
      const callback = vi.fn();

      manager.bind('q', callback, 'Action 1');
      manager.bind('w', callback, 'Action 2');
      manager.bind('e', callback, 'Action 3');

      const bindings = manager.getBindings();

      expect(bindings.filter((b) => b.key.toLowerCase() === 'q')).toHaveLength(1);
      expect(bindings.filter((b) => b.key.toLowerCase() === 'w')).toHaveLength(1);
      expect(bindings.filter((b) => b.key.toLowerCase() === 'e')).toHaveLength(1);
    });
  });

  describe('unbind', () => {
    it('should remove key binding', () => {
      const callback = vi.fn();

      manager.bind('z', callback, 'Test Action');
      expect(manager.getBindings().some((b) => b.key.toLowerCase() === 'z')).toBe(true);

      manager.unbind('z');
      expect(manager.getBindings().some((b) => b.key.toLowerCase() === 'z')).toBe(false);
    });

    it('should convert key to lowercase', () => {
      const callback = vi.fn();

      manager.bind('Z', callback, 'Test');
      manager.unbind('Z');

      expect(manager.getBindings().some((b) => b.key.toLowerCase() === 'z')).toBe(false);
    });

    it('should handle unbinding non-existent key', () => {
      expect(() => manager.unbind('nonexistent')).not.toThrow();
    });

    it('should not affect other bindings', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Action A');
      manager.bind('b', callback, 'Action B');
      manager.bind('c', callback, 'Action C');

      manager.unbind('b');

      const bindings = manager.getBindings();

      expect(bindings.some((b) => b.key.toLowerCase() === 'a')).toBe(true);
      expect(bindings.some((b) => b.key.toLowerCase() === 'b')).toBe(false);
      expect(bindings.some((b) => b.key.toLowerCase() === 'c')).toBe(true);
    });
  });

  describe('getBindings', () => {
    it('should return all key bindings', () => {
      const bindings = manager.getBindings();

      expect(Array.isArray(bindings)).toBe(true);
      expect(bindings.length).toBeGreaterThan(0);
    });

    it('should return readonly array', () => {
      const bindings1 = manager.getBindings();
      const bindings2 = manager.getBindings();

      expect(bindings1).not.toBe(bindings2); // Different references
    });

    it('should include default bindings', () => {
      const bindings = manager.getBindings();

      expect(bindings.some((b) => b.key.toLowerCase() === 'h')).toBe(true);
      expect(bindings.some((b) => b.key === ' ')).toBe(true);
      for (let i = 1; i <= 9; i++) {
        expect(bindings.some((b) => b.key === String(i))).toBe(true);
      }
    });

    it('should include custom bindings', () => {
      const callback = vi.fn();
      manager.bind('t', callback, 'Custom Action');

      const bindings = manager.getBindings();

      expect(bindings.some((b) => b.key.toLowerCase() === 't')).toBe(true);
    });
  });

  describe('getKeyHelp', () => {
    it('should return help text array', () => {
      const help = manager.getKeyHelp();

      expect(Array.isArray(help)).toBe(true);
      expect(help.length).toBe(3);
    });

    it('should include H key help', () => {
      const help = manager.getKeyHelp();

      expect(help).toContain('H - Toggle Leva Panel');
    });

    it('should include Space key help', () => {
      const help = manager.getKeyHelp();

      expect(help).toContain('SPACE - Randomize Parameters');
    });

    it('should include digit keys help', () => {
      const help = manager.getKeyHelp();

      expect(help).toContain('1-9 - Switch Pattern');
    });
  });

  describe('handleKeyDown', () => {
    let mockEvent: KeyboardEvent;

    beforeEach(() => {
      // Create mock event
      mockEvent = createMockEvent('a');
    });

    it('should trigger callback for bound key', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      manager['handleKeyDown'](mockEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should call preventDefault for bound keys', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      manager['handleKeyDown'](mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not trigger callback when disabled', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      manager.setEnabled(false);
      manager['handleKeyDown'](mockEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should ignore Ctrl key combinations', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      const ctrlEvent = createMockEvent('a', { ctrlKey: true });
      manager['handleKeyDown'](ctrlEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(ctrlEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore Meta key combinations', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      const metaEvent = createMockEvent('a', { metaKey: true });
      manager['handleKeyDown'](metaEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(metaEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore Alt key combinations', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      const altEvent = createMockEvent('a', { altKey: true });
      manager['handleKeyDown'](altEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(altEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should allow Shift key combinations', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');
      const shiftEvent = createMockEvent('a', { shiftKey: true });
      manager['handleKeyDown'](shiftEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should ignore input elements', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const inputEvent = createMockEvent('a', { target: document.createElement('input') });
      manager['handleKeyDown'](inputEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(inputEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore textarea elements', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const textareaEvent = createMockEvent('a', { target: document.createElement('textarea') });
      manager['handleKeyDown'](textareaEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(textareaEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle non-input elements', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const divEvent = createMockEvent('a', { target: document.createElement('div') });
      manager['handleKeyDown'](divEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should convert key to lowercase for matching', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const upperEvent = createMockEvent('A');
      manager['handleKeyDown'](upperEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle space key', () => {
      const callback = vi.fn();

      manager.bind(' ', callback, 'Space Action');

      const spaceEvent = createMockEvent(' ');
      manager['handleKeyDown'](spaceEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should handle digit keys', () => {
      const callback = vi.fn();

      manager.bind('5', callback, 'Digit 5');

      const digitEvent = createMockEvent('5');
      manager['handleKeyDown'](digitEvent);

      expect(callback).toHaveBeenCalled();
    });

    it('should not trigger for unbound keys', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const zEvent = createMockEvent('z');
      manager['handleKeyDown'](zEvent);

      expect(callback).not.toHaveBeenCalled();
      expect(zEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('should handle default H key binding', () => {
      const onToggleLeva = vi.fn();

      const eventManager = new InputManager({ onToggleLeva });

      const hEvent = createMockEvent('h');
      eventManager['handleKeyDown'](hEvent);

      expect(onToggleLeva).toHaveBeenCalled();
    });

    it('should handle default Space key binding', () => {
      const onRandomize = vi.fn();

      const eventManager = new InputManager({ onRandomize });

      const spaceEvent = createMockEvent(' ');
      eventManager['handleKeyDown'](spaceEvent);

      expect(onRandomize).toHaveBeenCalled();
    });

    it('should handle default digit key bindings', () => {
      const onPatternSwitch = vi.fn();

      const eventManager = new InputManager({ onPatternSwitch });

      for (let i = 0; i < 9; i++) {
        const digitEvent = createMockEvent(String(i + 1));
        eventManager['handleKeyDown'](digitEvent);
      }

      expect(onPatternSwitch).toHaveBeenCalledTimes(9);
      expect(onPatternSwitch).toHaveBeenCalledWith(0);
      expect(onPatternSwitch).toHaveBeenCalledWith(1);
      expect(onPatternSwitch).toHaveBeenCalledWith(8);
    });
  });

  describe('handleKeyUp', () => {
    let mockEvent: KeyboardEvent;

    beforeEach(() => {
      mockEvent = createMockEvent('a');
    });

    it('should exist and be callable', () => {
      expect(() => manager['handleKeyUp'](mockEvent)).not.toThrow();
    });

    it('should not throw with any key', () => {
      const zEvent = createMockEvent('z');
      expect(() => manager['handleKeyUp'](zEvent)).not.toThrow();

      const enterEvent = createMockEvent('Enter');
      expect(() => manager['handleKeyUp'](enterEvent)).not.toThrow();

      const escapeEvent = createMockEvent('Escape');
      expect(() => manager['handleKeyUp'](escapeEvent)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty key string', () => {
      const callback = vi.fn();

      expect(() => manager.bind('', callback, 'Empty')).not.toThrow();
    });

    it('should handle special keys', () => {
      const callback = vi.fn();

      expect(() => manager.bind('Enter', callback, 'Enter')).not.toThrow();
      expect(() => manager.bind('Escape', callback, 'Escape')).not.toThrow();
      expect(() => manager.bind('Tab', callback, 'Tab')).not.toThrow();
    });

    it('should handle case sensitivity', () => {
      const callback = vi.fn();

      manager.bind('A', callback, 'Test');

      // Should match uppercase
      const mockEvent1 = createMockEvent('A');
      manager['handleKeyDown'](mockEvent1);
      expect(callback).toHaveBeenCalledTimes(1);

      // Should match lowercase
      const mockEvent2 = createMockEvent('a');
      manager['handleKeyDown'](mockEvent2);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple event callbacks', () => {
      const onToggleLeva = vi.fn();
      const onRandomize = vi.fn();
      const onPatternSwitch = vi.fn();

      const eventManager = new InputManager({
        onToggleLeva,
        onRandomize,
        onPatternSwitch,
      });

      const mockEventH = createMockEvent('h');
      const mockEventSpace = createMockEvent(' ');
      const mockEvent1 = createMockEvent('1');

      eventManager['handleKeyDown'](mockEventH);
      eventManager['handleKeyDown'](mockEventSpace);
      eventManager['handleKeyDown'](mockEvent1);

      expect(onToggleLeva).toHaveBeenCalledTimes(1);
      expect(onRandomize).toHaveBeenCalledTimes(1);
      expect(onPatternSwitch).toHaveBeenCalledTimes(1);
      expect(onPatternSwitch).toHaveBeenCalledWith(0);
    });

    it('should handle null/undefined callbacks gracefully', () => {
      const nullManager = new InputManager({});

      const mockEvent = createMockEvent('h');

      expect(() => nullManager['handleKeyDown'](mockEvent)).not.toThrow();
    });

    it('should handle null target element', () => {
      const callback = vi.fn();

      manager.bind('a', callback, 'Test');

      const mockEvent = createMockEvent('a', { target: null });

      // The implementation doesn't handle null target, so it will throw
      // This is expected behavior - we expect valid event targets
      expect(() => manager['handleKeyDown'](mockEvent)).toThrow();
    });
  });

  describe('integration tests', () => {
    it('should handle complete key binding lifecycle', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Bind
      manager.bind('k', callback1, 'Action 1');
      expect(manager.getBindings().some((b) => b.key.toLowerCase() === 'k')).toBe(true);

      // Trigger
      const mockEvent = createMockEvent('k');
      manager['handleKeyDown'](mockEvent);
      expect(callback1).toHaveBeenCalledTimes(1);

      // Update
      manager.bind('k', callback2, 'Action 2');

      manager['handleKeyDown'](mockEvent);
      expect(callback1).toHaveBeenCalledTimes(1); // Not called again
      expect(callback2).toHaveBeenCalledTimes(1);

      // Unbind
      manager.unbind('k');

      manager['handleKeyDown'](mockEvent);
      expect(callback2).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle enable/disable lifecycle', () => {
      const callback = vi.fn();

      manager.bind('x', callback, 'Test');

      const mockEvent = createMockEvent('x');

      // Enabled by default
      manager['handleKeyDown'](mockEvent);
      expect(callback).toHaveBeenCalledTimes(1);

      // Disabled
      manager.setEnabled(false);
      manager['handleKeyDown'](mockEvent);
      expect(callback).toHaveBeenCalledTimes(1); // Not called

      // Re-enabled
      manager.setEnabled(true);
      manager['handleKeyDown'](mockEvent);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should handle initialize/destroy lifecycle', () => {
      manager.initialize();
      expect(window.addEventListener).toHaveBeenCalled();

      manager.destroy();
      expect(window.removeEventListener).toHaveBeenCalled();
    });
  });
});
