import { GAME_CONFIG } from './gameConfig.js';
import { GameEventType } from './events.js';

const SEGMENT_LENGTH = GAME_CONFIG.tunnel.segmentLength;

const uiElements = {
    uiSpeed: document.getElementById('ui-speed'),
    uiSpeedBar: document.getElementById('ui-speed-bar'),
    uiLevel: document.getElementById('ui-level'),
    uiTime: document.getElementById('ui-time'),
    uiProgress: document.getElementById('ui-progress-bar'),
    flashOverlay: document.getElementById('flash-overlay'),
    menuScreen: document.getElementById('menu-screen'),
    startBtn: document.getElementById('start-btn'),
    menuTitle: document.getElementById('menu-title'),
    menuDesc: document.getElementById('menu-desc')
};

export function updateHUD(state) {
    uiElements.uiLevel.innerText = state.currentLevel;
    uiElements.uiTime.innerText = state.elapsedTime.toFixed(2) + 's';
    uiElements.uiSpeed.innerText = Math.floor(state.speed);
    const speedPercent = state.MAX_SPEED > 0 ? (state.speed / state.MAX_SPEED) * 100 : 0;
    uiElements.uiSpeedBar.style.width = `${Math.max(0, speedPercent)}%`;
    const trackDistance = state.trackLength * SEGMENT_LENGTH;
    let progress = trackDistance > 0 ? Math.min(100, Math.max(0, (state.cameraZ / trackDistance) * 100)) : 0;
    uiElements.uiProgress.style.width = `${progress}%`;
}

export function handleEvents(events, state) {
    updateHUD(state);

    for (const event of events) {
        switch (event.type) {
            case GameEventType.LEVEL_STARTED:
                hideMenu();
                break;

            case GameEventType.SHIP_CRASHED:
                showFlash();
                break;

            case GameEventType.LEVEL_COMPLETED:
                showMenu(`MISSION COMPLETE! LEVEL ${event.payload.level} CLEAR.`, 'NEXT LEVEL');
                break;

            case GameEventType.GAME_COMPLETED:
                showMenu('ARMAGEDDON AVERTED. ALL TUNNELS CLEAR.', 'RESTART');
                break;

            default:
                break;
        }
    }
}

export function showFlash() {
    uiElements.flashOverlay.classList.add('flash');
    setTimeout(() => {
        if (uiElements.flashOverlay) uiElements.flashOverlay.classList.remove('flash');
    }, 50);
}

export function showMenu(title, btnText) {
    uiElements.menuTitle.innerText = title;
    uiElements.startBtn.innerText = btnText;
    uiElements.menuDesc.classList.add('hidden');
    uiElements.menuScreen.classList.remove('hidden');
}

export function hideMenu() {
    uiElements.menuScreen.classList.add('hidden');
}

export function onStartBtnClick(callback) {
    uiElements.startBtn.addEventListener('click', callback);
}
