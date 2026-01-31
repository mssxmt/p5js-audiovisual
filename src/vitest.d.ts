/**
 * Vitest global type definitions
 * Extends global namespace with Vitest globals and test environment types
 */

import type { RenderingContext, Screen } from 'vitest/browser';

declare global {
  // Vitest globals
  const describe: typeof import('vitest').describe;
  const it: typeof import('vitest').it;
  const test: typeof import('vitest').test;
  const expect: typeof import('vitest').expect;
  const vi: typeof import('vitest').vi;
  const beforeAll: typeof import('vitest').beforeAll;
  const afterAll: typeof import('vitest').afterAll;
  const beforeEach: typeof import('vitest').beforeEach;
  const afterEach: typeof import('vitest').afterEach;

  // Browser environment globals (happy-dom)
  const document: Document;
  const window: Window & typeof globalThis;
  const navigator: Navigator;
  const performance: Performance;
  const requestAnimationFrame: typeof window.requestAnimationFrame;
  const cancelAnimationFrame: typeof window.cancelAnimationFrame;

  // Web Audio API
  const AudioContext: typeof window.AudioContext;
  const webkitAudioContext: typeof window.AudioContext;

  // Web MIDI API
  interface Navigator {
    requestMIDIAccess: (options?: MIDIAccessOptions) => Promise<MIDIAccess>;
  }

  // MediaDevices API
  interface Navigator {
    mediaDevices: {
      getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
      enumerateDevices: () => Promise<MediaDeviceInfo[]>;
    };
  }
}

export {};
