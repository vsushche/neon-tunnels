import { SEGMENT_LENGTH } from './constants.js';

const uiElements = {
    uiSpeed: document.getElementById('ui-speed'),
    uiSpeedBar: document.getElementById('ui-speed-bar'),
    uiLevel: document.getElementById('ui-level'),
    uiTime: document.getElementById('ui-time'),
    uiProgress: document.getElementById('ui-progress-bar'),
    flashOverlay: document.getElementById('flash-overlay'),
    menuScreen: document.getElementById('menu-screen'),
    startBtn: document.getElementById('start-btn'),
    menuTitle: document.getElementById('menu-title')
};

export function updateHUD(state) {
    uiElements.uiLevel.innerText = state.currentLevel;
    uiElements.uiTime.innerText = state.elapsedTime.toFixed(2) + 's';
    uiElements.uiSpeed.innerText = Math.floor(state.speed);
    uiElements.uiSpeedBar.style.width = `${Math.max(0, (state.speed / state.MAX_SPEED) * 100)}%`;
    let progress = Math.min(100, Math.max(0, (state.cameraZ / (state.trackLength * SEGMENT_LENGTH)) * 100));
    uiElements.uiProgress.style.width = `${progress}%`;
}

export function showFlash() {
    uiElements.flashOverlay.classList.add('flash');
    setTimeout(() => {
        if(uiElements.flashOverlay) uiElements.flashOverlay.classList.remove('flash');
    }, 50);
}

export function showMenu(title, color, btnText) {
    uiElements.menuTitle.innerText = title;
    uiElements.menuTitle.style.color = color;
    uiElements.startBtn.innerText = btnText;
    uiElements.menuScreen.classList.remove('hidden');
}

export function hideMenu() {
    uiElements.menuScreen.classList.add('hidden');
}

export function onStartBtnClick(callback) {
    uiElements.startBtn.addEventListener('click', callback);
}
