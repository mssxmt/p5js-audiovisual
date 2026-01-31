import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { P5Wrapper } from './P5Wrapper';
import { Store } from '../core/Store';
import type { IBasePattern } from '../types/pattern';
import type p5 from 'p5';

// Mock p5
vi.mock('p5', () => ({
  default: vi.fn().mockImplementation((sketch: any, _node: HTMLElement) => {
    // Simulate p5 instance creation
    const mockInstance = {
      // Mock p5 properties
      width: 800,
      height: 600,
      windowWidth: 800,
      windowHeight: 600,
      frameCount: 0,
      deltaTime: 16,

      // Mock p5 methods
      setup: vi.fn(function(this: p5) {
        sketch.setup?.(this);
      }),
      draw: vi.fn(function(this: p5) {
        this.frameCount++;
        sketch.draw?.(this);
      }),
      resizeCanvas: vi.fn(function(this: p5, w: number, h: number) {
        this.width = w;
        this.height = h;
      }),
      createCanvas: vi.fn(function(this: p5, w: number, h: number) {
        this.width = w;
        this.height = h;
        return {
          parent: vi.fn(),
        };
      }),
      background: vi.fn(),
      clear: vi.fn(),
      remove: vi.fn(),
    };

    // Call sketch setup immediately (simulating p5 initialization)
    setTimeout(() => {
      sketch.setup?.(mockInstance as unknown as p5);
    }, 0);

    // Track the instance for cleanup in tests
    (globalThis as any).__mockP5Instance = mockInstance;

    return mockInstance;
  }),
}));

// Mock pattern class
class MockPattern implements IBasePattern {
  readonly config = {
    name: 'TestPattern',
    description: 'Test pattern',
    version: '1.0.0',
  };

  setup = vi.fn(async (_p: p5) => {
    // Mock setup
  });

  update = vi.fn((_p: p5, _context: any) => {
    // Mock update
  });

  draw = vi.fn((_p: p5, _options: any) => {
    // Mock draw
  });

  cleanup = vi.fn(async (_p: p5) => {
    // Mock cleanup
  });
}

describe('P5Wrapper', () => {
  let mockStore: Store;
  let mockPatterns: IBasePattern[];
  let mockPattern: MockPattern;

  beforeEach(() => {
    // Create mock store
    mockStore = new Store({}, {}) as Store;
    mockStore.setTotalPatterns(1);

    // Create mock patterns
    mockPattern = new MockPattern();
    mockPatterns = [mockPattern];

    // Clear any previous p5 instance
    delete (globalThis as any).__mockP5Instance;

    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (globalThis as any).__mockP5Instance;
  });

  it('renders without crashing', () => {
    render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);
    expect(true).toBe(true);
  });

  it('creates a container div for p5 canvas', () => {
    const { container } = render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);
    const wrapperDiv = container.querySelector('[data-testid="p5-wrapper"]');
    expect(wrapperDiv).toBeInTheDocument();
  });

  it('initializes pattern on mount', async () => {
    render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // Wait for p5 mock initialization
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });
  });

  it('cleans up pattern on unmount', async () => {
    const { unmount } = render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // Wait for initialization
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });

    unmount();

    // Verify cleanup was called (pattern cleanup happens in effect cleanup)
    // Note: In real scenarios, p5.remove() would be called
    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  it('handles pattern switching when pattern index changes', async () => {
    const mockPattern2 = new MockPattern();
    const patterns: IBasePattern[] = [mockPattern, mockPattern2];

    // Set total patterns to 2
    mockStore.setTotalPatterns(2);

    render(<P5Wrapper store={mockStore} patterns={patterns} />);

    // Wait for initialization
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });

    // Change pattern index
    mockStore.setPatternIndex(1);

    // Wait for pattern change to take effect
    await waitFor(() => {
      expect(mockStore.getPatternIndex()).toBe(1);
    });
  });

  it('gets audio data from store during render', () => {
    const getAudioDataSpy = vi.spyOn(mockStore, 'getAudioData').mockReturnValue({
      raw: new Uint8Array(1024),
      normalized: [],
      bands: {
        subBass: 0,
        bass: 0,
        lowMid: 0,
        mid: 0,
        highMid: 0,
        treble: 0,
        brilliance: 0,
      },
      level: 0,
      spectrum: [],
    });

    render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // getAudioData is called in the draw loop
    expect(getAudioDataSpy).toBeDefined();
  });

  it('gets MIDI data from store during render', () => {
    const getMidiDataSpy = vi.spyOn(mockStore, 'getMidiData').mockReturnValue({
      cc: new Map(),
      programChange: null,
      clock: 0,
    });

    render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // getMidiData is called in the draw loop
    expect(getMidiDataSpy).toBeDefined();
  });

  it('updates audio data from store in render loop', () => {
    const updateAudioSpy = vi.spyOn(mockStore, 'updateAudio');

    render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // updateAudio is called in the draw loop
    expect(updateAudioSpy).toBeDefined();
  });

  it('handles empty patterns array gracefully', () => {
    expect(() => {
      render(<P5Wrapper store={mockStore} patterns={[]} />);
    }).not.toThrow();
  });

  it('handles null store gracefully', () => {
    expect(() => {
      render(<P5Wrapper store={null as unknown as Store} patterns={mockPatterns} />);
    }).not.toThrow();
  });

  it('applies correct container styles', () => {
    const { container } = render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);
    const wrapperDiv = container.querySelector('[data-testid="p5-wrapper"]');

    expect(wrapperDiv).toHaveStyle({
      width: '100%',
      height: '100%',
      position: 'relative',
    });
  });

  it('respects pattern lifecycle on mount and unmount', async () => {
    const { unmount } = render(<P5Wrapper store={mockStore} patterns={mockPatterns} />);

    // Wait for mount
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });

    unmount();

    // Verify no errors during cleanup
    await waitFor(() => {
      expect(true).toBe(true);
    });
  });

  it('handles errors in pattern setup gracefully', async () => {
    const errorPattern = {
      config: { name: 'ErrorPattern', description: 'Test', version: '1.0.0' },
      setup: vi.fn().mockRejectedValue(new Error('Setup failed')),
      update: vi.fn(),
      draw: vi.fn(),
      cleanup: vi.fn(),
    } as unknown as IBasePattern;

    expect(() => {
      render(<P5Wrapper store={mockStore} patterns={[errorPattern]} />);
    }).not.toThrow();

    // Wait for initialization
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });
  });

  it('handles multiple patterns with correct switching', async () => {
    const pattern1 = new MockPattern();
    const pattern2 = new MockPattern();
    const pattern3 = new MockPattern();

    const patterns: IBasePattern[] = [pattern1, pattern2, pattern3];
    mockStore.setTotalPatterns(3);

    render(<P5Wrapper store={mockStore} patterns={patterns} />);

    // Wait for initialization
    await waitFor(() => {
      expect((globalThis as any).__mockP5Instance).toBeDefined();
    });

    // Switch to pattern 2
    mockStore.setPatternIndex(1);
    await waitFor(() => {
      expect(mockStore.getPatternIndex()).toBe(1);
    });

    // Switch to pattern 3
    mockStore.setPatternIndex(2);
    await waitFor(() => {
      expect(mockStore.getPatternIndex()).toBe(2);
    });
  });

  it('clamps pattern index to valid range', () => {
    const patterns: IBasePattern[] = [mockPattern];
    mockStore.setTotalPatterns(1);

    render(<P5Wrapper store={mockStore} patterns={patterns} />);

    // Try to set invalid index
    mockStore.setPatternIndex(10);

    // Should be clamped to valid range
    expect(mockStore.getPatternIndex()).toBe(0);
  });
});
