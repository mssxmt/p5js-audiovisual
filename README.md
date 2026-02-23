# p5js-audiovisual

Audio-reactive visualizations built with p5.js and React.

## Features

- **Multiple Visualization Patterns**: 10 unique patterns with different visual styles
- **Audio-Reactive**: Responds to bass, mid, and treble frequencies
- **MIDI Learn**: Map MIDI CC controls to any parameter
- **Keyboard Controls**: Switch patterns and adjust parameters in real-time
- **Custom UI Panel**: Intuitive parameter controls with Leva integration

## Patterns

| Key | Pattern | Description |
|-----|---------|-------------|
| 1 | BlackHolePattern | Classic black hole with accretion disk |
| 2 | GargantuaPattern | Interstellar-style black hole with gravitational lensing |
| 3 | DataPattern | Minimal data visualization |
| 4 | ThreeDPattern | 3D interactive visualizer |
| 5 | FlowFieldPattern | Fluid, silk-like flow field visualization |
| 6 | BloodVesselPattern | Organic branching vessels inspired by Akira |
| 7 | WireframeTerrainPattern | 3D wireframe terrain landscape |
| 8 | Barcode3DPattern | 3D barcode data visualization |
| 9 | Frame3DPattern | 3D frame/cage structure visualization |

## Controls

### Keyboard
- **1-9**: Switch to pattern
- **H**: Toggle parameter panel
- **SPACE**: Randomize parameters

### Audio
- Connect microphone or audio input for audio reactivity
- Bass affects expansion/pulse
- Mid affects motion/chaos
- Treble affects brightness/glow

### MIDI
- MIDI Learn mode: Click parameter name, then move MIDI controller
- Assign unlimited MIDI CC controls to any parameter

## Development

### Install
```bash
npm install
```

### Start
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Tech Stack

- **p5.js** - Graphics and audio analysis
- **React** - UI framework
- **Vite** - Build tool
- **Leva** - Parameter controls
- **Web Audio API** - Real-time audio processing

## License

MIT
