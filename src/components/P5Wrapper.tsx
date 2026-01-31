import React, { useEffect, useRef, useCallback } from 'react';
import p5 from 'p5';
import type { Store } from '../core/Store';
import type { IBasePattern, PatternContext, PatternRenderOptions } from '../types/pattern';

export interface P5WrapperProps {
  store: Store | null;
  patterns: IBasePattern[];
}

export const P5Wrapper: React.FC<P5WrapperProps> = ({ store, patterns }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const currentPatternRef = useRef<IBasePattern | null>(null);
  const isPatternSetupRef = useRef<boolean>(false);
  const previousPatternIndexRef = useRef<number>(-1);
  const frameCountRef = useRef<number>(0);

  /**
   * Clean up current pattern resources
   */
  const cleanupPattern = useCallback(async (pattern: IBasePattern | null, p5Instance: p5 | null) => {
    if (!pattern || !p5Instance) {
      return;
    }

    try {
      const cleanupResult = pattern.cleanup(p5Instance);
      if (cleanupResult instanceof Promise) {
        await cleanupResult;
      }
    } catch (error) {
      console.error(`Error cleaning up pattern "${pattern.config.name}":`, error);
    }
  }, []);

  /**
   * Setup a new pattern
   */
  const setupPattern = useCallback(async (
    pattern: IBasePattern,
    p5Instance: p5
  ): Promise<boolean> => {
    try {
      const setupResult = pattern.setup(p5Instance);
      if (setupResult instanceof Promise) {
        await setupResult;
      }
      isPatternSetupRef.current = true;
      return true;
    } catch (error) {
      console.error(`Error setting up pattern "${pattern.config.name}":`, error);
      return false;
    }
  }, []);

  /**
   * Initialize p5 instance and setup canvas
   */
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const sketch = (p: p5) => {
      p.setup = () => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        // Create canvas matching container size with WEBGL mode
        const canvas = p.createCanvas(container.clientWidth, container.clientHeight, p.WEBGL);
        canvas.parent(container);
      };

      p.draw = () => {
        if (!store || !currentPatternRef.current || !isPatternSetupRef.current) {
          return;
        }

        const pattern = currentPatternRef.current;

        // Update audio data from store
        store.updateAudio();

        // Get current data from store
        const audioData = store.getAudioData();
        const midiData = store.getMidiData();

        // Debug logging for first 60 frames
        frameCountRef.current++;
        if (frameCountRef.current <= 60) {
          console.log('[P5Wrapper Debug]', {
            frame: frameCountRef.current,
            audioState: store.audio.getState(),
            audioLevel: audioData.level,
            audioBands: audioData.bands,
            audioDataLength: audioData.raw.length,
            patternName: pattern.config.name,
            particleCount: (pattern as any).params?.particleCount,
          });
        }

        // Create pattern context
        const context: PatternContext = {
          audio: audioData as any,
          midi: midiData as any,
          deltaTime: p.deltaTime,
        };

        // Update pattern
        try {
          pattern.update(p, context);
        } catch (error) {
          console.error(`Error updating pattern "${pattern.config.name}":`, error);
        }

        // Render options with trail effect
        const renderOptions: PatternRenderOptions = {
          clearBackground: false,
          trails: true,
          trailAlpha: 0.1,
        };

        // Draw pattern
        try {
          pattern.draw(p, renderOptions);
        } catch (error) {
          console.error(`Error drawing pattern "${pattern.config.name}":`, error);
        }
      };

      p.windowResized = () => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        p.resizeCanvas(container.clientWidth, container.clientHeight);

        // Notify current pattern of resize if supported
        if (currentPatternRef.current && currentPatternRef.current.resize) {
          try {
            currentPatternRef.current.resize(p, p.width, p.height);
          } catch (error) {
            console.error(`Error resizing pattern "${currentPatternRef.current.config.name}":`, error);
          }
        }
      };
    };

    // Create p5 instance
    try {
      p5InstanceRef.current = new p5(sketch, containerRef.current);
    } catch (error) {
      console.error('Error creating p5 instance:', error);
    }

    // Cleanup on unmount
    return () => {
      // Clean up current pattern
      const currentPattern = currentPatternRef.current;
      const p5Instance = p5InstanceRef.current;

      if (currentPattern && p5Instance) {
        cleanupPattern(currentPattern, p5Instance).catch((error) => {
          console.error('Error during pattern cleanup:', error);
        });
      }

      // Remove p5 instance
      if (p5InstanceRef.current) {
        try {
          p5InstanceRef.current.remove();
        } catch (error) {
          console.error('Error removing p5 instance:', error);
        }
        p5InstanceRef.current = null;
      }

      currentPatternRef.current = null;
      isPatternSetupRef.current = false;
      previousPatternIndexRef.current = -1;
    };
  }, [cleanupPattern]);

  /**
   * Handle pattern changes
   */
  useEffect(() => {
    if (!store || !p5InstanceRef.current || patterns.length === 0) {
      return;
    }

    const patternIndex = store.getPatternIndex();

    // Skip if pattern index hasn't changed
    if (patternIndex === previousPatternIndexRef.current) {
      return;
    }

    // Clamp pattern index
    const validIndex = Math.max(0, Math.min(patternIndex, patterns.length - 1));

    // Skip if no pattern at index
    if (!patterns[validIndex]) {
      return;
    }

    const newPattern = patterns[validIndex];
    const p5Instance = p5InstanceRef.current;
    const previousPattern = currentPatternRef.current;

    // Clean up previous pattern if exists
    if (previousPattern) {
      cleanupPattern(previousPattern, p5Instance).catch((error) => {
        console.error('Error during pattern switch cleanup:', error);
      });
    }

    // Setup new pattern
    setupPattern(newPattern, p5Instance).catch((error) => {
      console.error('Error during pattern switch setup:', error);
    });

    // Update refs
    currentPatternRef.current = newPattern;
    previousPatternIndexRef.current = validIndex;
  }, [store, patterns, cleanupPattern, setupPattern]);

  return (
    <div
      data-testid="p5-wrapper"
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
};
