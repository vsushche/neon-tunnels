import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT, SHIP_ACCEL, SHIP_FRICTION, SHIP_SIZE } from './constants.js';
import { updateHUD, showFlash, showMenu, hideMenu } from './ui.js';
import { createTrack } from './track.js';

const EXIT_ZONE_SEGMENTS = 15;

export class GameState {
    constructor() {
        this.gameState = 'menu'; // menu, playing, exiting, win
        this.currentLevel = 1;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.cameraZ = 0;
        this.speed = 0;
        this.shipX = 0;
        this.shipY = 0;
        this.shipVX = 0;
        this.shipVY = 0;
        this.track = [];
        this.trackLength = 0;
        this.MAX_SPEED = 0;
    }
}

export class GameEngine {
    constructor(audio, input) {
        this.audio = audio;
        this.input = input;
        this.state = new GameState();
    }

    start(level) {
        const trackData = createTrack(level);
        this.state.track = trackData.track;
        this.state.trackLength = trackData.trackLength;
        this.state.MAX_SPEED = trackData.maxSpeed;
        this.state.currentLevel = level;
        this.state.startTime = performance.now();
        this.state.cameraZ = 0;
        this.state.speed = 0;
        this.state.shipX = 0;
        this.state.shipY = 0;
        this.state.shipVX = 0;
        this.state.shipVY = 0;
        
        this.state.gameState = 'playing';
        hideMenu();
        this.audio.startEngineSound();
        updateHUD(this.state);
    }

    handleCrash() {
        if (this.state.gameState !== 'playing') return;
        this.audio.playCrashSound();
        showFlash();
        
        this.state.speed *= 0.5;
        this.state.cameraZ -= 200;
        if (this.state.cameraZ < 0) this.state.cameraZ = 0;
    }

    handleWin() {
        this.state.gameState = 'win';
        this.audio.stopEngineSound();
        showMenu(`MISSION COMPLETE! LEVEL ${this.state.currentLevel} CLEAR.`, "#00ffcc", "NEXT LEVEL");
    }

    update(dt, now) {
        const { state, input, audio } = this;

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
            
            // Activate doors ahead of the player
            for (let ahead = 0; ahead < 20; ahead++) {
                let idx = currentSegIndex + ahead;
                if (idx >= 0 && idx < state.trackLength && state.track[idx].door) {
                    state.track[idx].door.checkActivation(state.cameraZ, now);
                }
            }
            
            // Enter exit zone — switch to cinematic autopilot
            if (currentSegIndex >= state.trackLength - EXIT_ZONE_SEGMENTS) {
                state.gameState = 'exiting';
                audio.playVictoryMelody();
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
            
            if (state.shipX < -currentW + collisionMargin) { state.shipX = -currentW + collisionMargin; state.shipVX = Math.abs(state.shipVX) * 1.2 + 200; hitWall = true; }
            if (state.shipX > currentW - collisionMargin) { state.shipX = currentW - collisionMargin; state.shipVX = -Math.abs(state.shipVX) * 1.2 - 200; hitWall = true; }
            if (state.shipY < -currentH + collisionMargin) { state.shipY = -currentH + collisionMargin; state.shipVY = Math.abs(state.shipVY) * 1.2 + 200; hitWall = true; }
            if (state.shipY > currentH - collisionMargin) { state.shipY = currentH - collisionMargin; state.shipVY = -Math.abs(state.shipVY) * 1.2 - 200; hitWall = true; }
            
            if (hitWall) {
                state.speed *= 0.4;
                audio.playScrapeSound();
            }
            
            if (currentSegIndex > 0) {
                let segDist = state.cameraZ - (currentSegIndex * SEGMENT_LENGTH);
                if (segDist < 100 && state.speed > 0) {
                    if (currentSeg.door) {
                        let result = currentSeg.door.checkCollision(state.shipX, state.shipY, SHIP_SIZE, currentW, currentH, now);
                        if (result === 'crash') {
                            this.handleCrash();
                        } else if (result === 'passed') {
                            audio.playDoorPassSound();
                        }
                    } else if (currentSeg.type === 'mine') {
                        let dx = state.shipX - currentSeg.mineX;
                        let dy = state.shipY - currentSeg.mineY;
                        if (Math.sqrt(dx*dx + dy*dy) < SHIP_SIZE + 50) {
                            this.handleCrash();
                        }
                    }
                }
            }
            
            updateHUD(state);
            audio.updateEngineSound(state.speed, state.MAX_SPEED);
        } else if (state.gameState === 'exiting') {
            // Autopilot: accelerate to max and center the ship
            state.speed += (state.MAX_SPEED - state.speed) * 2 * dt;
            state.cameraZ += state.speed * dt;
            
            // Smoothly center the ship
            state.shipX *= 0.92;
            state.shipY *= 0.92;
            state.shipVX *= 0.8;
            state.shipVY *= 0.8;
            
            let currentSegIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
            if (currentSegIndex >= state.trackLength + 15) {
                this.handleWin();
            }
            
            audio.updateEngineSound(state.speed, state.MAX_SPEED);
        } else if (state.gameState === 'win') {
            state.speed *= 0.95;
            state.cameraZ += state.speed * dt;
            audio.updateEngineSound(state.speed, state.MAX_SPEED);
        }
    }
}
