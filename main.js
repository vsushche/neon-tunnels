import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { GameEngine, EngineStatus } from './engine.js';
import { onStartBtnClick } from './ui.js';
import { AudioManager } from './audio.js';

const input = new InputHandler();
const renderer = new Renderer();
const audio = new AudioManager();
const engine = new GameEngine(audio, input);
window.onclick = () => {
    audio.startMenuMusic();
    window.onclick = null;
}


onStartBtnClick(() => {
    audio.stopMenuMusic();
    if (engine.state.gameState === EngineStatus.WIN) {
        engine.start(engine.state.currentLevel + 1);
    } else {
        engine.start(1);
    }
});

let lastTime = performance.now();

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    engine.update(dt, now);
    renderer.render(engine.state, now);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
