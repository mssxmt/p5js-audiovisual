import type p5 from 'p5';
import type { AudioData } from './audio';
import type { MidiData } from './midi';

export interface PatternConfig {
  name: string;
  description: string;
  version: string;
}

export interface PatternContext {
  audio: AudioData;
  midi: MidiData;
  deltaTime: number;
}

export interface PatternRenderOptions {
  clearBackground: boolean;
  trails: boolean;
  trailAlpha: number;
}

/**
 * Parameter metadata for UI controls
 */
export interface ParameterMeta {
  min: number;
  max: number;
  step: number;
  label?: string;
}

export type ParameterMetaMap = Record<string, ParameterMeta>;

export enum PatternCategory {
  PHYSICS = 'physics',
  GEOMETRIC = 'geometric',
  PARTICLE = 'particle',
  FLUID = 'fluid',
}

/**
 * Abstract base class interface for all visual patterns
 */
export interface IBasePattern {
  readonly config: PatternConfig;

  setup(p: p5): void | Promise<void>;
  update(p: p5, context: PatternContext): void;
  draw(p: p5, options: PatternRenderOptions): void;
  cleanup(p: p5): void | Promise<void>;
  resize?(p: p5, width: number, height: number): void;
  getParams?(): Record<string, any>;
  setParams?(params: Record<string, any>): void;
  getParamMeta?(): ParameterMetaMap;
}
