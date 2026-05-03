import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { GameEngine, EngineStatus } from './engine.js';
import { onSecretCompleteClick, onStartBtnClick } from './ui.js';
import { AudioManager } from './audio.js';

const input = new InputHandler();
const renderer = new Renderer();
const audio = new AudioManager();
const engine = new GameEngine(audio, input);
window.onclick = () => {
    audio.startMenuMusic();
    window.onclick = null;
}


onStartBtnClick(async () => {
    audio.stopMenuMusic();
    if (engine.state.gameState === EngineStatus.WIN) {
        await engine.start(engine.state.currentLevel + 1);
    } else {
        await engine.start(1);
    }
});

onSecretCompleteClick(() => {
    engine.showCompleteScreen();
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
