import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { GameEngine, EngineStatus } from './engine.js';
import { GameEventType, gameEvent } from './events.js';
import { handleEvents as handleUIEvents, onStartBtnClick } from './ui.js';
import { AudioManager } from './audio.js';

const input = new InputHandler();
const renderer = new Renderer();
const audio = new AudioManager();
const engine = new GameEngine(input);
window.onclick = () => {
    handleGameEvents([gameEvent(GameEventType.MENU_ACTIVATED)]);
    window.onclick = null;
}


onStartBtnClick(async () => {
    let events;
    if (engine.state.gameState === EngineStatus.WIN) {
        events = await engine.start(engine.state.currentLevel + 1);
    } else {
        events = await engine.start(1);
    }
    handleGameEvents(events);
});

let lastTime = performance.now();

function handleGameEvents(events) {
    audio.handleEvents(events, engine.state);
    handleUIEvents(events, engine.state);
}

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    const events = engine.update(dt, now);
    handleGameEvents(events);
    renderer.render(engine.state, now);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
