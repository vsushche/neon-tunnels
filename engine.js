import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT, SHIP_ACCEL, SHIP_FRICTION, SHIP_SIZE } from './constants.js';
import { keys } from './input.js';
import { updateHUD, showFlash, showMenu, hideMenu } from './ui.js';
import { createTrack } from './track.js';
import { playCrashSound, playDoorPassSound, startEngineSound, updateEngineSound, stopEngineSound } from './audio.js';

export const state = {
    gameState: 'menu', // menu, playing, win
    currentLevel: 1,
    startTime: 0,
    elapsedTime: 0,
    cameraZ: 0,
    speed: 0,
    MAX_SPEED: 2500,
    shipX: 0,
    shipY: 0,
    shipVX: 0,
    shipVY: 0,
    track: [],
    trackLength: 0
};

export function startGame(level) {
    state.currentLevel = level;
    state.startTime = performance.now();
    state.elapsedTime = 0;
    
    const trackData = createTrack(level);
    state.track = trackData.track;
    state.trackLength = trackData.trackLength;
    state.MAX_SPEED = trackData.maxSpeed;
    
    state.cameraZ = 0;
    state.speed = 0;
    state.shipX = 0;
    state.shipY = 0;
    state.shipVX = 0;
    state.shipVY = 0;
    
    state.gameState = 'playing';
    hideMenu();
    startEngineSound();
    updateHUD(state);
}

export function handleCrash() {
    if (state.gameState !== 'playing') return;
    playCrashSound();
    showFlash();

    state.speed = 0; 
    state.cameraZ -= 300;
    
    updateHUD(state);
}

export function handleWin() {
    if (state.gameState !== 'playing') return;
    state.gameState = 'win';
    setTimeout(() => {
        showMenu("SECTOR CLEARED", "#00ffcc", "NEXT SECTOR");
        stopEngineSound();
    }, 1500);
}

export function updateEngine(dt, now) {
    if (state.gameState === 'playing') {
        state.elapsedTime = (now - state.startTime) / 1000;
        
        if (keys.Space) {
            state.speed += 1500 * dt;
        } else if (keys.Shift) {
            state.speed -= 3000 * dt;
        } else {
            state.speed -= 800 * dt;
        }
        
        state.speed = Math.max(0, Math.min(state.speed, state.MAX_SPEED));
        state.cameraZ += state.speed * dt;
        
        if (keys.ArrowLeft) state.shipVX -= SHIP_ACCEL * dt;
        if (keys.ArrowRight) state.shipVX += SHIP_ACCEL * dt;
        if (keys.ArrowUp) state.shipVY -= SHIP_ACCEL * dt;
        if (keys.ArrowDown) state.shipVY += SHIP_ACCEL * dt;
        
        state.shipVX *= SHIP_FRICTION;
        state.shipVY *= SHIP_FRICTION;
        
        state.shipX += state.shipVX * dt;
        state.shipY += state.shipVY * dt;
        
        let currentSegIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
        
        if (currentSegIndex >= state.trackLength - 2) {
            handleWin();
            return;
        }
        
        let currentSeg = state.track[currentSegIndex];
        if (!currentSeg) return;

        let currentW = (TUNNEL_WIDTH * currentSeg.widthFactor) / 2;
        let currentH = TUNNEL_HEIGHT / 2;
        let collisionMargin = SHIP_SIZE;
        let hitWall = false;
        
        if (state.shipX < -currentW + collisionMargin) { state.shipX = -currentW + collisionMargin; state.shipVX = Math.abs(state.shipVX) * 1.2 + 2000; hitWall = true; }
        if (state.shipX > currentW - collisionMargin) { state.shipX = currentW - collisionMargin; state.shipVX = -Math.abs(state.shipVX) * 1.2 - 2000; hitWall = true; }
        if (state.shipY < -currentH + collisionMargin) { state.shipY = -currentH + collisionMargin; state.shipVY = Math.abs(state.shipVY) * 1.2 + 2000; hitWall = true; }
        if (state.shipY > currentH - collisionMargin) { state.shipY = currentH - collisionMargin; state.shipVY = -Math.abs(state.shipVY) * 1.2 - 2000; hitWall = true; }
        
        if (hitWall) {
            state.speed *= 0.4;
            playCrashSound();
            showFlash();
        }
        
        if (currentSegIndex > 0) {
            let segDist = state.cameraZ - (currentSegIndex * SEGMENT_LENGTH);
            if (segDist < 100 && state.speed > 0) {
                if (currentSeg.type === 'door') {
                    let sineWave = (Math.sin(now * 0.0005 * currentSeg.doorSpeed + currentSeg.doorPhaseOffset) + 1) / 2;
                    let doorClosedRatio = sineWave * 1.0;
                    let safeDistanceY = currentH * (1 - doorClosedRatio);
                    
                    if (Math.abs(state.shipY) + SHIP_SIZE > safeDistanceY) {
                        handleCrash();
                    } else if (!currentSeg.passed) {
                        playDoorPassSound();
                        currentSeg.passed = true;
                    }
                } else if (currentSeg.type === 'mine') {
                    let dx = state.shipX - currentSeg.mineX;
                    let dy = state.shipY - currentSeg.mineY;
                    if (Math.sqrt(dx*dx + dy*dy) < SHIP_SIZE + 50) {
                        handleCrash();
                    }
                }
            }
        }
        
        updateHUD(state);
        updateEngineSound(state.speed, state.MAX_SPEED);
    } else if (state.gameState === 'win') {
        state.speed *= 0.95;
        state.cameraZ += state.speed * dt;
        updateEngineSound(state.speed, state.MAX_SPEED);
    }
}
