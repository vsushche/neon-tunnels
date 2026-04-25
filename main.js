import { initInput } from './input.js';
import { initRenderer, render } from './renderer.js';
import { state, updateEngine, startGame } from './engine.js';
import { onStartBtnClick } from './ui.js';

initInput();
initRenderer();

onStartBtnClick(() => {
    window.initAudio();
    if (state.gameState === 'win') {
        startGame(state.currentLevel + 1);
    } else {
        startGame(1);
    }
});

let lastTime = performance.now();

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    updateEngine(dt, now);
    render(state, now);
    
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
