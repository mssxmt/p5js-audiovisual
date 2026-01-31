/**
 * Application-wide constants
 */

// Audio defaults
export const AUDIO_DEFAULTS = {
  FFT_SIZE: 2048,
  SMOOTHING: 0.8,
  MIN_DECIBELS: -90,
  MAX_DECIBELS: -10,
} as const;

// MIDI defaults
export const MIDI_DEFAULTS = {
  SYSEX_ENABLED: false,
  DEFAULT_CHANNEL: 0,
} as const;

// Pattern defaults
export const PATTERN_DEFAULTS = {
  MAX_PATTERNS: 9,
  SWITCH_TRANSITION: 500, // ms
} as const;

// Render defaults
export const RENDER_DEFAULTS = {
  TARGET_FPS: 60,
  TRAIL_ALPHA: 0.1,
} as const;

// Keys
export const KEYS = {
  TOGGLE_LEVA: 'h',
  RANDOMIZE: ' ',
  PATTERN_PREFIX: '123456789',
} as const;

// Color palette (for reference in patterns)
export const PALETTE = {
  NEON_CYAN: [0, 255, 255],
  NEON_MAGENTA: [255, 0, 255],
  NEON_GREEN: [57, 255, 20],
  DEEP_PURPLE: [75, 0, 130],
  ELECTRIC_BLUE: [0, 115, 255],
} as const;
