import { SEGMENT_LENGTH } from './constants.js';

const ACTIVATION_DISTANCE = 15 * SEGMENT_LENGTH; // 15 segments ahead

export class BaseDoor {
    constructor(speed, phaseOffset) {
        this.speed = speed;
        this.phaseOffset = phaseOffset;
        this.passed = false;
        this.hue = Math.floor(Math.random() * 360);
        
        // Activation system
        this.doorZ = 0;         // set by track generator
        this.activated = false;
        this.activationTime = 0;
        
        // Cycle timing (in seconds)
        this.closeTime = 0.8;   // time to go from open to fully closed
        this.pauseTime = 0.15;  // time to stay fully closed
        this.openTime = 1.2;    // time to open back up
    }

    /**
     * Called each frame from the engine. Checks if player is close enough
     * to activate this door's deterministic cycle.
     */
    checkActivation(cameraZ, now) {
        if (this.activated) return;
        let dist = this.doorZ - cameraZ;
        if (dist > 0 && dist < ACTIVATION_DISTANCE) {
            this.activated = true;
            this.activationTime = now;
        }
    }

    getClosedRatio(now) {
        if (!this.activated) {
            // Before activation: door is fully open
            return 0;
        }
        
        // After activation: deterministic close → pause → open cycle (looping)
        let elapsed = (now - this.activationTime) / 1000;
        
        let t1 = this.closeTime;
        let t2 = t1 + this.pauseTime;
        let t3 = t2 + this.openTime;
        let totalCycle = t3 + 0.3; // small gap of "fully open" before next cycle
        
        let phase = elapsed % totalCycle;
        
        if (phase < t1) {
            // Phase 1: closing (0 → 1)
            return phase / t1;
        } else if (phase < t2) {
            // Phase 2: fully closed
            return 1.0;
        } else if (phase < t3) {
            // Phase 3: opening (1 → 0)
            return 1.0 - (phase - t2) / this.openTime;
        } else {
            // Phase 4: fully open (brief pause before next cycle)
            return 0.0;
        }
    }

    checkCollision(shipX, shipY, shipSize, currentW, currentH, now) {
        return 'none';
    }

    render(ctx, sx, sy, w, h, now, dim) {
    }
}

export class DoubleDoor extends BaseDoor {
    constructor(orientation, speed, phaseOffset) {
        super(speed, phaseOffset);
        this.orientation = orientation; // 'vertical' or 'horizontal'
    }

    checkCollision(shipX, shipY, shipSize, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);
        
        if (this.orientation === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            if (Math.abs(shipY) + shipSize > safeDistanceY) {
                return 'crash';
            } else if (!this.passed) {
                this.passed = true;
                return 'passed';
            }
        } else if (this.orientation === 'horizontal') {
            let safeDistanceX = currentW * (1 - ratio);
            if (Math.abs(shipX) + shipSize > safeDistanceX) {
                return 'crash';
            } else if (!this.passed) {
                this.passed = true;
                return 'passed';
            }
        }
        return 'none';
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let ratio = this.getClosedRatio(now);
        if (ratio > 0) {
            let lightness = 50 * dim;
            let strokeAlpha = dim;
            ctx.fillStyle = `hsl(${this.hue}, 100%, ${lightness}%)`;
            ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
            ctx.lineWidth = 3;

            if (this.orientation === 'vertical') {
                let doorH = h * ratio;
                
                ctx.fillRect(sx - w, sy - h, w * 2, doorH);
                ctx.fillRect(sx - w, sy + h - doorH, w * 2, doorH);
                
                ctx.strokeRect(sx - w, sy - h, w * 2, doorH);
                ctx.strokeRect(sx - w, sy + h - doorH, w * 2, doorH);
            } else if (this.orientation === 'horizontal') {
                let doorW = w * ratio;
                
                ctx.fillRect(sx - w, sy - h, doorW, h * 2);
                ctx.fillRect(sx + w - doorW, sy - h, doorW, h * 2);
                
                ctx.strokeRect(sx - w, sy - h, doorW, h * 2);
                ctx.strokeRect(sx + w - doorW, sy - h, doorW, h * 2);
            }
        }
    }
}

export class SingleDoor extends BaseDoor {
    constructor(origin, speed, phaseOffset) {
        super(speed, phaseOffset);
        this.origin = origin; // 'top', 'bottom', 'left', 'right'
    }

    checkCollision(shipX, shipY, shipSize, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);
        let crashed = false;

        if (this.origin === 'top') {
            let doorEdgeY = -currentH + (2 * currentH * ratio);
            if (shipY - shipSize < doorEdgeY) crashed = true;
        } else if (this.origin === 'bottom') {
            let doorEdgeY = currentH - (2 * currentH * ratio);
            if (shipY + shipSize > doorEdgeY) crashed = true;
        } else if (this.origin === 'left') {
            let doorEdgeX = -currentW + (2 * currentW * ratio);
            if (shipX - shipSize < doorEdgeX) crashed = true;
        } else if (this.origin === 'right') {
            let doorEdgeX = currentW - (2 * currentW * ratio);
            if (shipX + shipSize > doorEdgeX) crashed = true;
        }

        if (crashed) return 'crash';
        
        if (!this.passed) {
            this.passed = true;
            return 'passed';
        }
        return 'none';
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let ratio = this.getClosedRatio(now);
        if (ratio > 0) {
            let lightness = 50 * dim;
            let strokeAlpha = dim;
            ctx.fillStyle = `hsl(${this.hue}, 100%, ${lightness}%)`;
            ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
            ctx.lineWidth = 3;

            if (this.origin === 'top') {
                let doorH = h * 2 * ratio;
                ctx.fillRect(sx - w, sy - h, w * 2, doorH);
                ctx.strokeRect(sx - w, sy - h, w * 2, doorH);
            } else if (this.origin === 'bottom') {
                let doorH = h * 2 * ratio;
                ctx.fillRect(sx - w, sy + h - doorH, w * 2, doorH);
                ctx.strokeRect(sx - w, sy + h - doorH, w * 2, doorH);
            } else if (this.origin === 'left') {
                let doorW = w * 2 * ratio;
                ctx.fillRect(sx - w, sy - h, doorW, h * 2);
                ctx.strokeRect(sx - w, sy - h, doorW, h * 2);
            } else if (this.origin === 'right') {
                let doorW = w * 2 * ratio;
                ctx.fillRect(sx + w - doorW, sy - h, doorW, h * 2);
                ctx.strokeRect(sx + w - doorW, sy - h, doorW, h * 2);
            }
        }
    }
}
