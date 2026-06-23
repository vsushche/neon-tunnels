import { GAME_CONFIG } from './gameConfig.js';

const FOCAL_LENGTH = GAME_CONFIG.tunnel.focalLength;

export class Starfield {
    constructor(count, spread, depth) {
        this.stars = [];
        this.spread = spread;
        this.depth = depth;

        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * spread,
                y: (Math.random() - 0.5) * spread,
                z: Math.random() * depth
            });
        }
    }

    render(ctx, width, height, cameraZ) {
        ctx.fillStyle = '#ffffff';
        for (let star of this.stars) {
            let dz = star.z - (cameraZ % this.depth);
            if (dz < 0) dz += this.depth;
            if (dz < 10) continue;

            let scale = FOCAL_LENGTH / dz;
            let sx = width / 2 + star.x * scale;
            let sy = height / 2 + star.y * scale;

            let size = Math.max(0.5, 3 * scale);
            ctx.fillRect(sx, sy, size, size);
        }
    }
}
