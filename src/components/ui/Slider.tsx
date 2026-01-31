import React, { useRef, useEffect } from 'react';

export interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Custom slider component with smooth interaction
 */
export const Slider: React.FC<SliderProps> = ({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate percentage for visual fill
  const percentage = ((value - min) / (max - min)) * 100;

  // Update input value when value prop changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = String(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className={`slider-container ${className}`}>
      {label && <label className="slider-label">{label}</label>}
      <div className="slider-wrapper">
        <div className="slider-track">
          <div
            className="slider-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="slider-input"
        />
        <div className="slider-value">{value.toFixed(step < 1 ? 3 : 1)}</div>
      </div>
    </div>
  );
};
