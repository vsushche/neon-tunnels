import { InputHandler } from './input.js';
import { Renderer } from './renderer.js';
import { state, updateEngine, startGame } from './engine.js';
import { onStartBtnClick } from './ui.js';
import { AudioManager } from './audio.js';

const input = new InputHandler();
const renderer = new Renderer();
const audio = new AudioManager();

onStartBtnClick(() => {
    audio.init();
    if (state.gameState === 'win') {
        startGame(state.currentLevel + 1, audio);
    } else {
        startGame(1, audio);
    }
});

let lastTime = performance.now();

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    updateEngine(dt, now, audio, input);
    renderer.render(state, now);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
