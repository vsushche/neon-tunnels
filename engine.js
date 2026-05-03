import { GAME_CONFIG } from './gameConfig.js';
import { GameEventType, gameEvent } from './events.js';
import { createTrack } from './track.js';

const { levels: LEVEL_CONFIG, tunnel: TUNNEL_CONFIG, ship: SHIP_CONFIG, laser: LASER_CONFIG, track: TRACK_CONFIG, autopilot: AUTOPILOT_CONFIG, countdown: COUNTDOWN_CONFIG } = GAME_CONFIG;
const SEGMENT_LENGTH = TUNNEL_CONFIG.segmentLength;
const TUNNEL_WIDTH = TUNNEL_CONFIG.width;
const TUNNEL_HEIGHT = TUNNEL_CONFIG.height;
const SHIP_ACCEL = SHIP_CONFIG.accel;
const SHIP_FRICTION = SHIP_CONFIG.friction;
const SHIP_WIDTH = SHIP_CONFIG.width;
const SHIP_HEIGHT = SHIP_CONFIG.height;

export const EngineStatus = Object.freeze({
    MENU:      'menu',
    COUNTDOWN: 'countdown',
    PLAYING:   'playing',
    EXITING:   'exiting',
    WIN:       'win',
    COMPLETE:  'complete'
});

export class GameState {
    constructor() {
        this.gameState = EngineStatus.MENU;
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
        this.countdownTime = 0;
        this.lastBeepStep = -1;
        this.projectiles = [];
        this.lastFireTime = 0;
    }
}

export class GameEngine {
    constructor(input) {
        this.input = input;
        this.state = new GameState();
    }

    async start(level) {
        const trackData = await createTrack(level);
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
        this.state.projectiles = [];
        this.state.lastFireTime = 0;
        
        this.state.gameState = EngineStatus.COUNTDOWN;
        this.state.countdownTime = COUNTDOWN_CONFIG.duration;
        this.state.lastBeepStep = -1;

        return [
            gameEvent(GameEventType.LEVEL_STARTED, { level })
        ];
    }

    handleCrash(events) {
        if (this.state.gameState !== EngineStatus.PLAYING) return;
        
        this.state.speed *= SHIP_CONFIG.crashSpeedPenalty;
        this.state.cameraZ -= SHIP_CONFIG.crashRewind;
        if (this.state.cameraZ < 0) this.state.cameraZ = 0;

        events.push(gameEvent(GameEventType.SHIP_CRASHED));
    }

    handleWin(events) {
        if (this.state.currentLevel >= LEVEL_CONFIG.count) {
            this.state.gameState = EngineStatus.COMPLETE;
            events.push(gameEvent(GameEventType.GAME_COMPLETED));
        } else {
            this.state.gameState = EngineStatus.WIN;
            events.push(gameEvent(GameEventType.LEVEL_COMPLETED, { level: this.state.currentLevel }));
        }
    }

    update(dt, now) {
        const { state, input } = this;
        const events = [];

        if (state.gameState === EngineStatus.COUNTDOWN) {
            const currentStep = Math.floor(state.countdownTime / COUNTDOWN_CONFIG.stepDuration);
            if (currentStep !== state.lastBeepStep && currentStep >= 0) {
                events.push(gameEvent(GameEventType.COUNTDOWN_BEEP, { isHigh: currentStep === 0 }));
                state.lastBeepStep = currentStep;
            }
            
            state.countdownTime -= dt;
            if (state.countdownTime <= 0) {
                state.gameState = EngineStatus.PLAYING;
                state.startTime = now; // reset start time to actual play start
                events.push(gameEvent(GameEventType.COUNTDOWN_FINISHED));
            }
        } else if (state.gameState === EngineStatus.PLAYING) {
            state.elapsedTime = (now - state.startTime) / 1000;
            
            if (input.controls.throttle) {
                state.speed += SHIP_CONFIG.throttleAccel * dt;
            } else if (input.controls.brake) {
                state.speed -= SHIP_CONFIG.brakeDecel * dt;
            } else {
                state.speed -= SHIP_CONFIG.coastDecel * dt;
            }
            
            state.speed = Math.max(0, Math.min(state.speed, state.MAX_SPEED));
            state.cameraZ += state.speed * dt;
            
            if (input.controls.left) state.shipVX -= SHIP_ACCEL * dt;
            if (input.controls.right) state.shipVX += SHIP_ACCEL * dt;
            if (input.controls.up) state.shipVY -= SHIP_ACCEL * dt;
            if (input.controls.down) state.shipVY += SHIP_ACCEL * dt;

            // Shooting (renderer draws the twin lasers)
            if (input.controls.fire && now - state.lastFireTime > LASER_CONFIG.fireCooldownMs) {
                state.projectiles.push({
                    x: state.shipX,
                    y: state.shipY,
                    z: state.cameraZ,
                    startTime: now
                });
                state.lastFireTime = now;
                events.push(gameEvent(GameEventType.LASER_FIRED));
            }

            // Update projectiles and check for hits
            state.projectiles = state.projectiles.filter(p => {
                const age = now - p.startTime;
                if (age > LASER_CONFIG.lifetimeMs) return false;
                
                const previousAge = Math.max(0, age - dt * 1000);
                const previousProgress = previousAge / LASER_CONFIG.lifetimeMs;
                const progress = age / LASER_CONFIG.lifetimeMs;
                const previousHeadZ = p.z + LASER_CONFIG.startOffset + previousProgress * LASER_CONFIG.range;
                const headZ = p.z + LASER_CONFIG.startOffset + progress * LASER_CONFIG.range;

                const startSegIdx = Math.max(0, Math.floor(Math.min(previousHeadZ, headZ) / SEGMENT_LENGTH));
                const endSegIdx = Math.min(state.trackLength - 1, Math.floor(Math.max(previousHeadZ, headZ) / SEGMENT_LENGTH));

                // Sweep across every segment crossed this frame so fast laser bolts cannot skip thin doors.
                for (let segIdx = startSegIdx; segIdx <= endSegIdx; segIdx++) {
                    const seg = state.track[segIdx];
                    if (!seg || !seg.door) continue;

                    const currentW = (TUNNEL_WIDTH * seg.widthFactor) / 2;
                    const currentH = (TUNNEL_HEIGHT * seg.heightFactor) / 2;

                    if (seg.door.checkLaserHit(p.x, p.y, LASER_CONFIG.hitSize, LASER_CONFIG.hitSize, currentW, currentH, now)) {
                        const distToDoor = seg.door.doorZ - state.cameraZ;
                        if (distToDoor < LASER_CONFIG.triggerDistance) {
                            seg.door.onHit(now);
                        } else {
                            seg.door.lastHitTime = now;
                        }
                        events.push(gameEvent(GameEventType.LASER_HIT_DOOR, { segmentIndex: segIdx }));
                        return false; // Laser absorbed by door
                    }
                }
                
                return headZ < state.cameraZ + LASER_CONFIG.range;
            });
            
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
            if (currentSegIndex >= state.trackLength - TRACK_CONFIG.exitZoneSegments) {
                state.gameState = EngineStatus.EXITING;
                events.push(gameEvent(GameEventType.EXIT_STARTED, { level: state.currentLevel }));
                return events;
            }
            
            let currentSeg = state.track[currentSegIndex];
            if (!currentSeg) {
                return events;
            }

            let currentW = (TUNNEL_WIDTH * currentSeg.widthFactor) / 2;
            let currentH = (TUNNEL_HEIGHT * currentSeg.heightFactor) / 2;
            let marginX = SHIP_WIDTH / 2;
            let marginY = SHIP_HEIGHT / 2;
            let hitWall = false;
            
            if (state.shipX < -currentW + marginX) { state.shipX = -currentW + marginX; state.shipVX = Math.abs(state.shipVX) * SHIP_CONFIG.wallBounce + SHIP_CONFIG.wallKick; hitWall = true; }
            if (state.shipX > currentW - marginX) { state.shipX = currentW - marginX; state.shipVX = -Math.abs(state.shipVX) * SHIP_CONFIG.wallBounce - SHIP_CONFIG.wallKick; hitWall = true; }
            if (state.shipY < -currentH + marginY) { state.shipY = -currentH + marginY; state.shipVY = Math.abs(state.shipVY) * SHIP_CONFIG.wallBounce + SHIP_CONFIG.wallKick; hitWall = true; }
            if (state.shipY > currentH - marginY) { state.shipY = currentH - marginY; state.shipVY = -Math.abs(state.shipVY) * SHIP_CONFIG.wallBounce - SHIP_CONFIG.wallKick; hitWall = true; }
            
            if (hitWall) {
                state.speed *= SHIP_CONFIG.wallSpeedPenalty;
                events.push(gameEvent(GameEventType.WALL_SCRAPED));
            }
            
            if (currentSegIndex > 0) {
                let segDist = state.cameraZ - (currentSegIndex * SEGMENT_LENGTH);
                if (segDist < 100 && state.speed > 0) {
                    if (currentSeg.door) {
                        let result = currentSeg.door.checkCollision(state.shipX, state.shipY, SHIP_WIDTH, SHIP_HEIGHT, currentW, currentH, now);
                        if (result === 'crash') {
                            this.handleCrash(events);
                        } else if (result === 'passed') {
                            events.push(gameEvent(GameEventType.DOOR_PASSED, { segmentIndex: currentSegIndex }));
                        }
                    } else if (currentSeg.type === 'mine') {
                        let dx = state.shipX - currentSeg.mineX;
                        let dy = state.shipY - currentSeg.mineY;
                        if (Math.sqrt(dx*dx + dy*dy) < SHIP_WIDTH/2 + 50) {
                            this.handleCrash(events);
                        }
                    }
                }
            }
        } else if (state.gameState === EngineStatus.EXITING) {
            // Autopilot: accelerate to max and center the ship
            state.speed += (state.MAX_SPEED - state.speed) * 2 * dt;
            state.cameraZ += state.speed * dt;
            
            // Smoothly center the ship
            state.shipX *= AUTOPILOT_CONFIG.centerDamping;
            state.shipY *= AUTOPILOT_CONFIG.centerDamping;
            state.shipVX *= AUTOPILOT_CONFIG.velocityDamping;
            state.shipVY *= AUTOPILOT_CONFIG.velocityDamping;
            
            let currentSegIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
            if (currentSegIndex >= state.trackLength + AUTOPILOT_CONFIG.finishPaddingSegments) {
                this.handleWin(events);
            }
        } else if (state.gameState === EngineStatus.WIN) {
            state.speed *= AUTOPILOT_CONFIG.winDriftSpeedDamping;
            state.cameraZ += state.speed * dt;
        } else if (state.gameState === EngineStatus.COMPLETE) {
            state.speed *= AUTOPILOT_CONFIG.winDriftSpeedDamping;
            state.cameraZ += state.speed * dt;
        }

        return events;
    }
}
