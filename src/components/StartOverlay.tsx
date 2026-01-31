import React from 'react';

export interface StartOverlayProps {
  onStart: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ onStart }) => {
  const handleStart = () => {
    onStart();
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1>AUDIO VISUAL SYSTEM</h1>
        <p>Press START to begin</p>
        <button
          onClick={handleStart}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.2rem',
            cursor: 'pointer',
            backgroundColor: '#fff',
            color: '#000',
            border: 'none',
          }}
        >
          START
        </button>
      </div>
    </div>
  );
};
