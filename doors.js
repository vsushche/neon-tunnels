import { GAME_CONFIG } from './gameConfig.js';

const { tunnel: TUNNEL_CONFIG, ship: SHIP_CONFIG, doors: DOOR_CONFIG } = GAME_CONFIG;
const SEGMENT_LENGTH = TUNNEL_CONFIG.segmentLength;
const SHIP_WIDTH = SHIP_CONFIG.width;
const SHIP_HEIGHT = SHIP_CONFIG.height;
const ACTIVATION_DISTANCE = DOOR_CONFIG.activationDistanceSegments * SEGMENT_LENGTH;

export class BaseDoor {
    constructor(speed, phaseOffset) {
        this.speed = speed;
        this.phaseOffset = phaseOffset;
        this.passed = false;
        this.hue = 0;

        // Activation system
        this.doorZ = 0; // set by track generator
        this.activated = false;
        this.activationTime = 0;

        // Hit system
        this.lastHitTime = 0;
        this.hitFlashDuration = 1000; // 1 second red glow

        // Cycle timing (in seconds) — can be overridden per door
        this.closeTime = 1.4; // time to go from open to fully closed
        this.pauseTime = 0.1; // time to stay fully closed
        this.openTime = 1.4; // time to open back up
    }

    /**
     * Called when a laser hits the door.
     */
    onHit(now) {
        this.lastHitTime = now;
        // Specific doors can override what happens on hit
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
            return phase / t1;
        } else if (phase < t2) {
            return 1.0;
        } else if (phase < t3) {
            return 1.0 - (phase - t2) / this.openTime;
        } else {
            return 0.0;
        }
    }

    checkCollision(shipX, shipY, shipW, shipH, currentW, currentH, now) {
        return 'none';
    }

    checkLaserHit(laserX, laserY, laserW, laserH, currentW, currentH, now) {
        return false;
    }

    render(ctx, sx, sy, w, h, now, dim) {}
}

export class DoubleDoor extends BaseDoor {
    constructor(orientation, speed, phaseOffset) {
        super(speed, phaseOffset);
        this.orientation = orientation; // 'vertical' or 'horizontal'
    }

    checkCollision(shipX, shipY, shipW, shipH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);

        if (this.orientation === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            if (Math.abs(shipY) + shipH / 2 > safeDistanceY) {
                return 'crash';
            } else if (!this.passed) {
                this.passed = true;
                return 'passed';
            }
        } else if (this.orientation === 'horizontal') {
            let safeDistanceX = currentW * (1 - ratio);
            if (Math.abs(shipX) + shipW / 2 > safeDistanceX) {
                return 'crash';
            } else if (!this.passed) {
                this.passed = true;
                return 'passed';
            }
        }
        return 'none';
    }

    checkLaserHit(laserX, laserY, laserW, laserH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);

        if (this.orientation === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            return Math.abs(laserY) + laserH / 2 > safeDistanceY;
        } else if (this.orientation === 'horizontal') {
            let safeDistanceX = currentW * (1 - ratio);
            return Math.abs(laserX) + laserW / 2 > safeDistanceX;
        }
        return false;
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let ratio = this.getClosedRatio(now);
        if (ratio > 0) {
            let hue = this.hue;
            let saturation = 100;
            let lightness = 50 * dim;

            // Flash red on hit
            const hitAge = now - this.lastHitTime;
            if (hitAge < this.hitFlashDuration) {
                const hitFactor = 1.0 - hitAge / this.hitFlashDuration;
                hue = 0; // Red
                lightness += hitFactor * 40;
            }

            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.strokeStyle = `rgba(255, 255, 255, ${dim})`;
            ctx.lineWidth = 2;

            if (this.orientation === 'vertical') {
                let doorH = h * ratio;
                ctx.fillRect(sx - w, sy - h, w * 2, doorH);
                ctx.strokeRect(sx - w, sy - h, w * 2, doorH);
                ctx.fillRect(sx - w, sy + h - doorH, w * 2, doorH);
                ctx.strokeRect(sx - w, sy + h - doorH, w * 2, doorH);
            } else {
                let doorW = w * ratio;
                ctx.fillRect(sx - w, sy - h, doorW, h * 2);
                ctx.strokeRect(sx - w, sy - h, doorW, h * 2);
                ctx.fillRect(sx + w - doorW, sy - h, doorW, h * 2);
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

    checkCollision(shipX, shipY, shipW, shipH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);
        let crashed = false;

        if (this.origin === 'top') {
            let doorEdgeY = -currentH + 2 * currentH * ratio;
            if (shipY - shipH / 2 < doorEdgeY) crashed = true;
        } else if (this.origin === 'bottom') {
            let doorEdgeY = currentH - 2 * currentH * ratio;
            if (shipY + shipH / 2 > doorEdgeY) crashed = true;
        } else if (this.origin === 'left') {
            let doorEdgeX = -currentW + 2 * currentW * ratio;
            if (shipX - shipW / 2 < doorEdgeX) crashed = true;
        } else if (this.origin === 'right') {
            let doorEdgeX = currentW - 2 * currentW * ratio;
            if (shipX + shipW / 2 > doorEdgeX) crashed = true;
        }

        if (crashed) return 'crash';

        if (!this.passed) {
            this.passed = true;
            return 'passed';
        }
        return 'none';
    }

    checkLaserHit(laserX, laserY, laserW, laserH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);

        if (this.origin === 'top') {
            let doorEdgeY = -currentH + 2 * currentH * ratio;
            return laserY - laserH / 2 < doorEdgeY;
        } else if (this.origin === 'bottom') {
            let doorEdgeY = currentH - 2 * currentH * ratio;
            return laserY + laserH / 2 > doorEdgeY;
        } else if (this.origin === 'left') {
            let doorEdgeX = -currentW + 2 * currentW * ratio;
            return laserX - laserW / 2 < doorEdgeX;
        } else if (this.origin === 'right') {
            let doorEdgeX = currentW - 2 * currentW * ratio;
            return laserX + laserW / 2 > doorEdgeX;
        }
        return false;
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let ratio = this.getClosedRatio(now);
        if (ratio > 0) {
            let hue = this.hue;
            let saturation = 100;
            let lightness = 50 * dim;

            // Flash red on hit
            const hitAge = now - this.lastHitTime;
            if (hitAge < this.hitFlashDuration) {
                const hitFactor = 1.0 - hitAge / this.hitFlashDuration;
                hue = 0; // Red
                lightness += hitFactor * 40;
            }

            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.strokeStyle = `rgba(255, 255, 255, ${dim})`;
            ctx.lineWidth = 2;

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

export class GateDoor extends BaseDoor {
    constructor(direction, speed, phaseOffset) {
        super(speed, phaseOffset);
        this.direction = direction; // 'horizontal' or 'vertical'
        this.gapRatio = 0.35; // Default 35% of tunnel dimension
    }

    getGapHalfSize(currentDimension, minSize) {
        let halfSize = currentDimension * this.gapRatio;
        const minHalfSize = (minSize * 1.5) / 2;
        return Math.max(halfSize, minHalfSize);
    }

    /**
     * Returns gap center position normalized to -1..+1
     * Before activation: centered (0). After: oscillates.
     */
    getGapPosition(now) {
        if (!this.activated) {
            return 0;
        }
        let elapsed = (now - this.activationTime) / 1000;
        return Math.sin(elapsed * this.speed * 0.75);
    }

    checkCollision(shipX, shipY, shipW, shipH, currentW, currentH, now) {
        let gapPos = this.getGapPosition(now);

        if (this.direction === 'horizontal') {
            let gapHalfW = this.getGapHalfSize(currentW, shipW);
            let gapCenterX = gapPos * (currentW - gapHalfW);

            if (shipX + shipW / 2 > gapCenterX + gapHalfW || shipX - shipW / 2 < gapCenterX - gapHalfW) {
                return 'crash';
            }
        } else {
            let gapHalfH = this.getGapHalfSize(currentH, shipH);
            let gapCenterY = gapPos * (currentH - gapHalfH);

            if (shipY + shipH / 2 > gapCenterY + gapHalfH || shipY - shipH / 2 < gapCenterY - gapHalfH) {
                return 'crash';
            }
        }

        if (!this.passed) {
            this.passed = true;
            return 'passed';
        }
        return 'none';
    }

    checkLaserHit(laserX, laserY, laserW, laserH, currentW, currentH, now) {
        let gapPos = this.getGapPosition(now);

        if (this.direction === 'horizontal') {
            let gapHalfW = this.getGapHalfSize(currentW, laserW);
            let gapCenterX = gapPos * (currentW - gapHalfW);

            return laserX + laserW / 2 > gapCenterX + gapHalfW || laserX - laserW / 2 < gapCenterX - gapHalfW;
        } else {
            let gapHalfH = this.getGapHalfSize(currentH, laserH);
            let gapCenterY = gapPos * (currentH - gapHalfH);

            return laserY + laserH / 2 > gapCenterY + gapHalfH || laserY - laserH / 2 < gapCenterY - gapHalfH;
        }
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let gapPos = this.getGapPosition(now);
        let hue = this.hue;
        let saturation = 100;
        let lightness = 50 * dim;

        // Flash red on hit
        const hitAge = now - this.lastHitTime;
        if (hitAge < this.hitFlashDuration) {
            const hitFactor = 1.0 - hitAge / this.hitFlashDuration;
            hue = 0; // Red
            lightness += hitFactor * 40;
        }

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${dim})`;
        ctx.lineWidth = 3;

        if (this.direction === 'horizontal') {
            let gapHalfW = this.getGapHalfSize(w, SHIP_WIDTH);
            let gapCenterX = gapPos * (w - gapHalfW);

            // Left panel
            let leftPanelW = w + gapCenterX - gapHalfW;
            if (leftPanelW > 0) {
                ctx.fillRect(sx - w, sy - h, leftPanelW, h * 2);
                ctx.strokeRect(sx - w, sy - h, leftPanelW, h * 2);
            }

            // Right panel
            let rightStart = sx + gapCenterX + gapHalfW;
            let rightPanelW = sx + w - rightStart;
            if (rightPanelW > 0) {
                ctx.fillRect(rightStart, sy - h, rightPanelW, h * 2);
                ctx.strokeRect(rightStart, sy - h, rightPanelW, h * 2);
            }
        } else {
            let gapHalfH = this.getGapHalfSize(h, SHIP_HEIGHT);
            let gapCenterY = gapPos * (h - gapHalfH);

            // Top panel
            let topPanelH = h + gapCenterY - gapHalfH;
            if (topPanelH > 0) {
                ctx.fillRect(sx - w, sy - h, w * 2, topPanelH);
                ctx.strokeRect(sx - w, sy - h, w * 2, topPanelH);
            }

            // Bottom panel
            let bottomStart = sy + gapCenterY + gapHalfH;
            let bottomPanelH = sy + h - bottomStart;
            if (bottomPanelH > 0) {
                ctx.fillRect(sx - w, bottomStart, w * 2, bottomPanelH);
                ctx.strokeRect(sx - w, bottomStart, w * 2, bottomPanelH);
            }
        }
    }
}
export class SensorDoor extends BaseDoor {
    constructor(orientation, speed, phaseOffset) {
        super(speed, phaseOffset);
        this.orientation = orientation; // 'vertical' or 'horizontal'
        this.openTime = 1.2; // Takes 1.2s to open fully
        this.hue = 280; // Purple/Violet for sensors
    }

    // Sensor doors don't open by proximity! Only by laser hit.
    checkActivation(cameraZ, now) {
        // Do nothing
    }

    onHit(now) {
        super.onHit(now);
        if (!this.activated) {
            this.activated = true;
            this.activationTime = now;
        }
    }

    getClosedRatio(now) {
        if (!this.activated) return 1.0; // Initially closed

        let elapsed = (now - this.activationTime) / 1000;
        // Opens once and stays open (linear transition)
        return Math.max(0, 1.0 - elapsed / this.openTime);
    }

    checkCollision(shipX, shipY, shipW, shipH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);

        if (this.orientation === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            if (Math.abs(shipY) + shipH / 2 > safeDistanceY) {
                return 'crash';
            }
        } else {
            let safeDistanceX = currentW * (1 - ratio);
            if (Math.abs(shipX) + shipW / 2 > safeDistanceX) {
                return 'crash';
            }
        }

        if (!this.passed && ratio <= 0.05) {
            this.passed = true;
            return 'passed';
        }
        return 'none';
    }

    checkLaserHit(laserX, laserY, laserW, laserH, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);

        if (this.orientation === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            return Math.abs(laserY) + laserH / 2 > safeDistanceY;
        } else {
            let safeDistanceX = currentW * (1 - ratio);
            return Math.abs(laserX) + laserW / 2 > safeDistanceX;
        }
    }

    render(ctx, sx, sy, w, h, now, dim) {
        let ratio = this.getClosedRatio(now);
        let alpha = dim * 0.8;

        // Base color
        let hue = this.hue;
        let saturation = 80;
        let lightness = 40 * dim;

        // Flash red on hit
        const hitAge = now - this.lastHitTime;
        if (hitAge < this.hitFlashDuration) {
            const hitFactor = 1.0 - hitAge / this.hitFlashDuration;
            hue = 0; // Red
            saturation = 100;
            lightness += hitFactor * 40;
        }

        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${dim})`;
        ctx.lineWidth = 2;

        if (this.orientation === 'vertical') {
            let doorH = h * ratio;
            // Top half
            ctx.fillRect(sx - w, sy - h, w * 2, doorH);
            ctx.strokeRect(sx - w, sy - h, w * 2, doorH);
            // Bottom half
            ctx.fillRect(sx - w, sy + h - doorH, w * 2, doorH);
            ctx.strokeRect(sx - w, sy + h - doorH, w * 2, doorH);
        } else {
            let doorW = w * ratio;
            // Left half
            ctx.fillRect(sx - w, sy - h, doorW, h * 2);
            ctx.strokeRect(sx - w, sy - h, doorW, h * 2);
            // Right half
            ctx.fillRect(sx + w - doorW, sy - h, doorW, h * 2);
            ctx.strokeRect(sx + w - doorW, sy - h, doorW, h * 2);
        }

        // Add a "sensor" glow when activated but still closing
        if (this.activated && ratio > 0) {
            ctx.shadowBlur = 15 * dim;
            ctx.shadowColor = 'white';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}
