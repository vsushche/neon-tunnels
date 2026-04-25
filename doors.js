export class Door {
    constructor(type, speed, phaseOffset) {
        this.type = type; // 'vertical', 'horizontal', etc.
        this.speed = speed;
        this.phaseOffset = phaseOffset;
        this.passed = false;
    }

    getClosedRatio(now) {
        let sineWave = (Math.sin(now * 0.0005 * this.speed + this.phaseOffset) + 1) / 2;
        return sineWave * 1.0;
    }

    checkCollision(shipX, shipY, shipSize, currentW, currentH, now) {
        let ratio = this.getClosedRatio(now);
        
        if (this.type === 'vertical') {
            let safeDistanceY = currentH * (1 - ratio);
            if (Math.abs(shipY) + shipSize > safeDistanceY) {
                return 'crash';
            } else if (!this.passed) {
                this.passed = true;
                return 'passed';
            }
        }
        return 'none';
    }

    render(ctx, sx, sy, w, h, now) {
        let ratio = this.getClosedRatio(now);
        if (ratio > 0) {
            if (this.type === 'vertical') {
                let doorH = h * ratio;
                ctx.fillStyle = `hsl(340, 100%, 50%)`;
                
                ctx.fillRect(sx - w, sy - h, w * 2, doorH);
                ctx.fillRect(sx - w, sy + h - doorH, w * 2, doorH);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(sx - w, sy - h, w * 2, doorH);
                ctx.strokeRect(sx - w, sy + h - doorH, w * 2, doorH);
            }
        }
    }
}
