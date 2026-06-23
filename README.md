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
- `events.js`: Domain game events shared by engine, UI, and audio.
- `renderer.js`: Canvas-based 3D rendering engine.
- `input.js`: Keyboard input handling.
- `audio.js`: Sound effect and music management.
- `track.js`: Builds tunnel segments and obstacles from JSON level data.
- `levelLoader.js`: Loads and caches JSON levels.
- `levels/`: Authored JSON level definitions.
- `levels/level.schema.json`: JSON Schema contract for authored or generated levels.
- `gameConfig.js`: Game balance, geometry, rendering, and progression configuration.
- `ui.js`: DOM-based HUD and menu updates.

### Controls

- **Arrow Keys**: Navigate the ship.
- **Space**: Accelerate (Gas).
- **Alt**: Brake.
- **X**: Fire.

### Running the Project

Since the project uses ES Modules, it must be served via a web server (it won't work by opening `index.html` directly from the file system). Use Git Bash to run the following commands:

Start the development server with live reload:

```bash
npm start
```

Then open the local URL printed in the terminal.

Validate all authored levels against the JSON Schema:

```bash
npm run validate:levels
```

### Codex Note

Codex must not start the development server automatically. The project owner starts `npm start` manually and watches the server console to verify which files are being read. If the server is not running, ask the owner to start it instead of launching Python, live-server, or any other server process.

## Development

To modify global game mechanics (speed, acceleration, laser behavior, etc.), edit `gameConfig.js`. To tune level length, colors, curves, doors, and mines, edit the JSON files in `levels/`. Use `levels/level.schema.json` as the generation contract for authored or generated levels. To add new game states, update the `EngineStatus` enum and handlers in `engine.js`.
