# Tunnels of Armageddon - Browser Edition (Neon Tunnels)

A modular, high-performance browser-based tunnel racing game built with Vanilla JavaScript and HTML5 Canvas.

## Project Description
**Neon Tunnels** is a fast-paced racing game where players navigate a 3D-effect tunnel, dodging obstacles and waiting for gates to open. The game features a retro-futuristic neon aesthetic with dynamic audio and smooth animations.

## How to Work with the Project

### Directory Structure
- `index.html`: The main entry point and UI structure.
- `style.css`: Modern glassmorphism UI styles and neon effects.
- `main.js`: Game loop and module initialization.
- `engine.js`: Core game logic, state management, and level progression.
- `renderer.js`: Canvas-based 3D rendering engine.
- `input.js`: Keyboard input handling.
- `audio.js`: Sound effect and music management.
- `track.js`: Procedural tunnel and obstacle generation.
- `constants.js`: Game balance and configuration parameters.
- `ui.js`: DOM-based HUD and menu updates.

### Controls
- **Arrow Keys**: Navigate the ship.
- **Space**: Accelerate (Gas).
- **Alt**: Brake.
- **X**: Fire.

### Running the Project
Since the project uses ES Modules, it must be served via a web server (it won't work by opening `index.html` directly from the file system). Use Git Bash to run the following commands:

#### Option 1: Python (Recommended if installed)
Run the following command in the project root:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080` in your browser.


## Development
To modify game mechanics (speed, acceleration, etc.), edit `constants.js`. To add new game states, update the `EngineStatus` enum and handlers in `engine.js`.
