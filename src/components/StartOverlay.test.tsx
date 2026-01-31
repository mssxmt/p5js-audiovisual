import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartOverlay } from './StartOverlay';

describe('StartOverlay', () => {
  it('renders START button with correct text', () => {
    const onStart = vi.fn();
    render(<StartOverlay onStart={onStart} />);

    const startButton = screen.getByRole('button', { name: /start/i });
    expect(startButton).toBeInTheDocument();
  });

  it('calls onStart callback when button is clicked', () => {
    const onStart = vi.fn();
    render(<StartOverlay onStart={onStart} />);

    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('displays title text', () => {
    const onStart = vi.fn();
    render(<StartOverlay onStart={onStart} />);

    const title = screen.getByText('AUDIO VISUAL SYSTEM');
    expect(title).toBeInTheDocument();
  });

  it('displays instruction text', () => {
    const onStart = vi.fn();
    render(<StartOverlay onStart={onStart} />);

    const instruction = screen.getByText(/press START to begin/i);
    expect(instruction).toBeInTheDocument();
  });

  it('applies correct full-screen styles', () => {
    const onStart = vi.fn();
    const { container } = render(<StartOverlay onStart={onStart} />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.height).toBe('100vh');
    expect(overlay.style.backgroundColor).toBe('#000');
    expect(overlay.style.color).toBe('#fff');
  });

  it('has button with correct cursor pointer style', () => {
    const onStart = vi.fn();
    render(<StartOverlay onStart={onStart} />);

    const startButton = screen.getByRole('button', { name: /start/i });
    expect(startButton).toHaveStyle({ cursor: 'pointer' });
  });
});
