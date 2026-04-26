import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT, SHIP_ACCEL, SHIP_FRICTION, SHIP_SIZE } from './constants.js';
import { updateHUD, showFlash, showMenu, hideMenu } from './ui.js';
import { createTrack } from './track.js';

export const state = {
    gameState: 'menu', // menu, playing, win
    currentLevel: 1,
    startTime: 0,
    cameraZ: 0,
    speed: 0,
    shipX: 0,
    shipY: 0,
    shipVX: 0,
    shipVY: 0,
    track: [],
    trackLength: 0,
    MAX_SPEED: 0
};

export function startGame(level, audio) {
    const trackData = createTrack(level);
    state.track = trackData.track;
    state.trackLength = trackData.trackLength;
    state.MAX_SPEED = trackData.maxSpeed;
    state.currentLevel = level;
    state.startTime = performance.now();
    state.cameraZ = 0;
    state.speed = 0;
    state.shipX = 0;
    state.shipY = 0;
    state.shipVX = 0;
    state.shipVY = 0;
    
    state.gameState = 'playing';
    hideMenu();
    audio.startEngineSound();
    updateHUD(state);
}

export function handleCrash(audio) {
    if (state.gameState !== 'playing') return;
    audio.playCrashSound();
    showFlash();
    
    state.speed *= 0.5;
    state.cameraZ -= 200;
    if (state.cameraZ < 0) state.cameraZ = 0;
}

function handleWin(audio) {
    state.gameState = 'win';
    audio.stopEngineSound();
    showMenu(`MISSION COMPLETE! LEVEL ${state.currentLevel} CLEAR.`, "#00ffcc", "NEXT LEVEL");
}

export function updateEngine(dt, now, audio, input) {
    if (state.gameState === 'playing') {
        state.elapsedTime = (now - state.startTime) / 1000;
        
        if (input.keys.Space) {
            state.speed += 1500 * dt;
        } else if (input.keys.Shift) {
            state.speed -= 3000 * dt;
        } else {
            state.speed -= 800 * dt;
        }
        
        state.speed = Math.max(0, Math.min(state.speed, state.MAX_SPEED));
        state.cameraZ += state.speed * dt;
        
        if (input.keys.ArrowLeft) state.shipVX -= SHIP_ACCEL * dt;
        if (input.keys.ArrowRight) state.shipVX += SHIP_ACCEL * dt;
        if (input.keys.ArrowUp) state.shipVY -= SHIP_ACCEL * dt;
        if (input.keys.ArrowDown) state.shipVY += SHIP_ACCEL * dt;
        
        state.shipVX *= SHIP_FRICTION;
        state.shipVY *= SHIP_FRICTION;
        
        state.shipX += state.shipVX * dt;
        state.shipY += state.shipVY * dt;
        
        let currentSegIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
        
        if (currentSegIndex >= state.trackLength + 10) {
            handleWin(audio);
            return;
        }
        
        let currentSeg = state.track[currentSegIndex];
        if (!currentSeg) {
            updateHUD(state);
            audio.updateEngineSound(state.speed, state.MAX_SPEED);
            return;
        }

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
            audio.playCrashSound();
            showFlash();
        }
        
        if (currentSegIndex > 0) {
            let segDist = state.cameraZ - (currentSegIndex * SEGMENT_LENGTH);
            if (segDist < 100 && state.speed > 0) {
                if (currentSeg.door) {
                    let result = currentSeg.door.checkCollision(state.shipX, state.shipY, SHIP_SIZE, currentW, currentH, now);
                    if (result === 'crash') {
                        handleCrash(audio);
                    } else if (result === 'passed') {
                        audio.playDoorPassSound();
                    }
                } else if (currentSeg.type === 'mine') {
                    let dx = state.shipX - currentSeg.mineX;
                    let dy = state.shipY - currentSeg.mineY;
                    if (Math.sqrt(dx*dx + dy*dy) < SHIP_SIZE + 50) {
                        handleCrash(audio);
                    }
                }
            }
        }
        
        updateHUD(state);
        audio.updateEngineSound(state.speed, state.MAX_SPEED);
    } else if (state.gameState === 'win') {
        state.speed *= 0.95;
        state.cameraZ += state.speed * dt;
        audio.updateEngineSound(state.speed, state.MAX_SPEED);
    }
}
