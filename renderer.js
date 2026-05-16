import { GAME_CONFIG } from './gameConfig.js';
import { Starfield } from './stars.js';
import { EngineStatus } from './engine.js';

const { tunnel: TUNNEL_CONFIG, mines: MINE_CONFIG, laser: LASER_CONFIG, render: RENDER_CONFIG } = GAME_CONFIG;
const SEGMENT_LENGTH = TUNNEL_CONFIG.segmentLength;
const TUNNEL_WIDTH = TUNNEL_CONFIG.width;
const TUNNEL_HEIGHT = TUNNEL_CONFIG.height;
const FOCAL_LENGTH = TUNNEL_CONFIG.focalLength;
const VISIBLE_SEGMENTS = TUNNEL_CONFIG.visibleSegments;

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.starfield = new Starfield(RENDER_CONFIG.starCount, RENDER_CONFIG.starSpread, RENDER_CONFIG.starDepth);
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    polygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineTo(x3, y3);
        this.ctx.lineTo(x4, y4);
        this.ctx.closePath();
        this.ctx.fill();
    }

    render(state, now) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        if (state.track.length === 0) return;
        
        const baseIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
        
        this.renderStars(state, baseIndex);
        this.renderTunnel(state, now, baseIndex);
        this.renderReticle(state);
        
        if (state.gameState === EngineStatus.COUNTDOWN) {
            this.renderCountdown(state);
        }
    }

    renderReticle(state) {
        if (state.gameState !== EngineStatus.PLAYING && state.gameState !== EngineStatus.EXITING) return;

        const ctx = this.ctx;
        const x = this.width / 2;
        const y = this.height / 2;
        const radius = RENDER_CONFIG.reticleRadius;
        const lineLength = RENDER_CONFIG.reticleLineLength;
        const gap = RENDER_CONFIG.reticleGap;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.82)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ffcc';

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - radius - gap - lineLength, y);
        ctx.lineTo(x - radius - gap, y);
        ctx.moveTo(x + radius + gap, y);
        ctx.lineTo(x + radius + gap + lineLength, y);
        ctx.moveTo(x, y - radius - gap - lineLength);
        ctx.lineTo(x, y - radius - gap);
        ctx.moveTo(x, y + radius + gap);
        ctx.lineTo(x, y + radius + gap + lineLength);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderStars(state, baseIndex) {
        const distToEnd = state.trackLength - baseIndex;
        let starOpacity = 0;
        
        if (distToEnd < VISIBLE_SEGMENTS) {
            starOpacity = 1 - (distToEnd / VISIBLE_SEGMENTS);
            if (starOpacity < 0) starOpacity = 0;
            if (starOpacity > 1) starOpacity = 1;
        }
        
        if (starOpacity > 0) {
            this.ctx.globalAlpha = starOpacity;
            this.starfield.render(this.ctx, this.width, this.height, state.cameraZ);
            this.ctx.globalAlpha = 1.0;
        }
    }

    renderTunnel(state, now, baseIndex) {
        const basePercent = (state.cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const currentSeg = state.track[Math.min(baseIndex, state.trackLength - 1)];
        
        let dx = -(currentSeg.curveX * basePercent);
        let dy = -(currentSeg.curveY * basePercent);
        let x = 0;
        let y = 0;
        
        const projectedSegments = [];
        
        for (let n = 0; n < VISIBLE_SEGMENTS; n++) {
            const index = baseIndex + n;
            if (index >= state.trackLength) break;
            const seg = state.track[index];
            
            const relZ = (n + 1 - basePercent) * SEGMENT_LENGTH;
            const scale = FOCAL_LENGTH / relZ;
            
            x += dx;
            y += dy;
            dx += seg.curveX;
            dy += seg.curveY;
            
            const screenX = this.width / 2 + (x - state.shipX) * scale;
            const screenY = this.height / 2 + (y - state.shipY) * scale;
            
            const w = (TUNNEL_WIDTH * seg.widthFactor) * scale / 2;
            const h = (TUNNEL_HEIGHT * seg.heightFactor) * scale / 2;
            
            projectedSegments.push({
                seg: seg,
                scale: scale,
                sx: screenX,
                sy: screenY,
                w: w,
                h: h,
                tl_x: screenX - w, tl_y: screenY - h,
                tr_x: screenX + w, tr_y: screenY - h,
                bl_x: screenX - w, bl_y: screenY + h,
                br_x: screenX + w, br_y: screenY + h
            });
        }
        
        for (let i = projectedSegments.length - 1; i > 0; i--) {
            const p1 = projectedSegments[i];
            const p2 = projectedSegments[i-1];
            
            let dim = 1 - (i / VISIBLE_SEGMENTS);
            if (p1.seg.index >= state.trackLength - 15) {
                dim += 0.5;
            }

            const laserGlow = this.getLaserGlow(state.projectiles, now, p1.seg.index, dim);
            const explosionGlow = this.getExplosionGlow(state, now, p1.seg.index, dim);
            
            this.renderSegmentPolygons(p1, p2, dim, laserGlow, explosionGlow);
            this.renderSegmentWires(p1, p2, dim, laserGlow, explosionGlow);
            
            // Draw projectiles that are physically in this segment (behind p2 obstacles)
            const minZ = p2.seg.index * SEGMENT_LENGTH;
            const maxZ = p1.seg.index * SEGMENT_LENGTH;
            this.renderProjectiles(state, now, minZ, maxZ);
            
            this.renderSegmentObstacles(p2, now, dim);
        }
    }

    getLaserGlow(projectiles, now, segmentIndex, dim) {
        let laserGlow = 0;

        projectiles.forEach(p => {
            const age = now - p.startTime;
            const progress = age / LASER_CONFIG.lifetimeMs;
            const headZ = p.z + LASER_CONFIG.startOffset + progress * LASER_CONFIG.range;
            const dist = Math.abs(headZ - segmentIndex * SEGMENT_LENGTH);
            if (dist < RENDER_CONFIG.laserGlowDistance) {
                let glow = (1 - dist / RENDER_CONFIG.laserGlowDistance) * 0.4;
                glow *= dim;

                laserGlow += glow;
            }
        });

        return Math.min(1.5, laserGlow);
    }

    getExplosionGlow(state, now, segmentIndex, dim) {
        let explosionGlow = 0;

        for (let i = 0; i < state.track.length; i++) {
            const seg = state.track[i];
            if (!seg.mineExplosionStart) continue;

            const age = now - seg.mineExplosionStart;
            if (age < 0 || age > MINE_CONFIG.explosionDurationMs) continue;

            const dist = Math.abs((i - segmentIndex) * SEGMENT_LENGTH);
            if (dist >= MINE_CONFIG.explosionGlowDistance) continue;

            const timeFade = 1 - age / MINE_CONFIG.explosionDurationMs;
            const blastPulse = Math.sin((1 - timeFade) * Math.PI);
            const distanceFade = 1 - dist / MINE_CONFIG.explosionGlowDistance;
            explosionGlow += (timeFade * 0.7 + blastPulse * 0.5) * distanceFade * dim;
        }

        return Math.min(1.8, explosionGlow);
    }

    renderSegmentPolygons(p1, p2, dim, laserGlow = 0, explosionGlow = 0) {
        // Muted lightness for the base tunnel
        let lightness = p1.seg.colorIndex === 0 ? 15 : 10;
        lightness *= dim;
        
        const hue = p1.seg.hue;
        
        // Muted saturation (was 80%)
        const colorFloor = `hsl(${hue}, 40%, ${lightness}%)`;
        const colorCeil  = `hsl(${hue}, 40%, ${lightness - 3}%)`;
        const colorWall  = `hsl(${hue}, 40%, ${lightness + 3}%)`;
        
        this.polygon(p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, colorCeil);
        this.polygon(p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, colorFloor);
        this.polygon(p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, colorWall);
        this.polygon(p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, colorWall);
        
        // Add transparent pink highlight over existing colors
        if (laserGlow > 0) {
            const glowAlpha = Math.min(0.4, laserGlow * 0.4); // max 40% opacity
            const glowColor = `rgba(255, 105, 180, ${glowAlpha})`; // Hot Pink
            this.polygon(p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, glowColor);
            this.polygon(p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, glowColor);
            this.polygon(p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, glowColor);
            this.polygon(p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, glowColor);
        }

        if (explosionGlow > 0) {
            const glowAlpha = Math.min(0.48, explosionGlow * 0.42);
            const glowColor = `rgba(255, 154, 46, ${glowAlpha})`;
            this.polygon(p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, glowColor);
            this.polygon(p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, glowColor);
            this.polygon(p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, glowColor);
            this.polygon(p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, glowColor);
        }
    }

    renderSegmentWires(p1, p2, dim, laserGlow = 0, explosionGlow = 0) {
        // Muted wires: 50% saturation, lower lightness
        this.ctx.strokeStyle = `hsl(${p1.seg.hue}, 50%, ${30 * dim}%)`;
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.tl_x, p1.tl_y); this.ctx.lineTo(p1.tr_x, p1.tr_y);
        this.ctx.lineTo(p1.br_x, p1.br_y); this.ctx.lineTo(p1.bl_x, p1.bl_y);
        this.ctx.closePath();
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.tl_x, p1.tl_y); this.ctx.lineTo(p2.tl_x, p2.tl_y);
        this.ctx.moveTo(p1.tr_x, p1.tr_y); this.ctx.lineTo(p2.tr_x, p2.tr_y);
        this.ctx.moveTo(p1.bl_x, p1.bl_y); this.ctx.lineTo(p2.bl_x, p2.bl_y);
        this.ctx.moveTo(p1.br_x, p1.br_y); this.ctx.lineTo(p2.br_x, p2.br_y);
        this.ctx.stroke();

        // Optional: add a subtle pink glow to the wires
        if (laserGlow > 0) {
            const glowAlpha = Math.min(0.8, laserGlow * 0.8);
            this.ctx.strokeStyle = `rgba(255, 105, 180, ${glowAlpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.tl_x, p1.tl_y); this.ctx.lineTo(p1.tr_x, p1.tr_y);
            this.ctx.lineTo(p1.br_x, p1.br_y); this.ctx.lineTo(p1.bl_x, p1.bl_y);
            this.ctx.closePath();
            this.ctx.stroke();
        }

        if (explosionGlow > 0) {
            const glowAlpha = Math.min(0.9, explosionGlow * 0.75);
            this.ctx.strokeStyle = `rgba(255, 196, 74, ${glowAlpha})`;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.moveTo(p1.tl_x, p1.tl_y); this.ctx.lineTo(p1.tr_x, p1.tr_y);
            this.ctx.lineTo(p1.br_x, p1.br_y); this.ctx.lineTo(p1.bl_x, p1.bl_y);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }

    renderSegmentObstacles(p2, now, dim) {
        if (p2.seg.door) {
            p2.seg.door.render(this.ctx, p2.sx, p2.sy, p2.w, p2.h, now, dim);
        }
        
        if (p2.seg.type === 'mine' && !p2.seg.mineDestroyed) {
            const mScale = p2.scale;
            const mX = p2.sx + p2.seg.mineX * mScale;
            const mY = p2.sy + p2.seg.mineY * mScale;
            const mRadius = MINE_CONFIG.radius * mScale;
            this.renderEnergyMine(mX, mY, mRadius, now, dim, p2.seg.index);
        } else if (p2.seg.type === 'mine' && p2.seg.mineExplosionStart) {
            const age = now - p2.seg.mineExplosionStart;
            if (age >= 0 && age <= MINE_CONFIG.explosionDurationMs) {
                const mScale = p2.scale;
                const mX = p2.sx + p2.seg.mineX * mScale;
                const mY = p2.sy + p2.seg.mineY * mScale;
                const mRadius = MINE_CONFIG.radius * mScale;
                this.renderMineExplosion(mX, mY, mRadius, age, dim, p2.seg.index);
            }
        }
    }

    renderEnergyMine(x, y, radius, now, dim, seed = 0) {
        if (radius <= 0.5 || dim <= 0) return;

        const ctx = this.ctx;
        const time = now * 0.001;
        const phase = time * 4.8 + seed * 0.41;
        const pulse = 0.5 + Math.sin(phase) * 0.5;
        const flicker = 0.5 + Math.sin(phase * 1.7 + seed) * 0.5;
        const outerRadius = radius * (1.75 + pulse * 0.45);
        const bodyRadius = radius * (0.82 + pulse * 0.18);
        const coreRadius = radius * (0.28 + flicker * 0.08);
        const alpha = Math.min(1, dim * 1.25);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const aura = ctx.createRadialGradient(x, y, radius * 0.15, x, y, outerRadius);
        aura.addColorStop(0, `rgba(255, 255, 255, ${0.34 * alpha})`);
        aura.addColorStop(0.2, `rgba(0, 255, 255, ${0.46 * alpha})`);
        aura.addColorStop(0.58, `rgba(255, 79, 216, ${0.2 * alpha})`);
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        const spikes = 18;
        ctx.beginPath();
        for (let i = 0; i <= spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const ripple = Math.sin(angle * 5 + phase * 1.6) * 0.16 + Math.sin(angle * 9 - phase) * 0.08;
            const r = bodyRadius * (1 + ripple);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const plasma = ctx.createRadialGradient(x, y, coreRadius * 0.2, x, y, bodyRadius * 1.25);
        plasma.addColorStop(0, `rgba(255, 255, 255, ${0.92 * alpha})`);
        plasma.addColorStop(0.26, `rgba(137, 255, 255, ${0.72 * alpha})`);
        plasma.addColorStop(0.62, `rgba(255, 170, 0, ${0.5 * alpha})`);
        plasma.addColorStop(1, `rgba(255, 40, 174, ${0.08 * alpha})`);
        ctx.fillStyle = plasma;
        ctx.fill();

        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const spin = phase * (i % 2 === 0 ? 0.42 : -0.34) + i * Math.PI * 0.68;
            const arcRadius = radius * (0.95 + i * 0.18 + pulse * 0.08);
            ctx.strokeStyle = i === 1
                ? `rgba(255, 210, 67, ${0.58 * alpha})`
                : `rgba(72, 245, 255, ${0.62 * alpha})`;
            ctx.lineWidth = Math.max(1, radius * (0.06 - i * 0.008));
            ctx.beginPath();
            ctx.arc(x, y, arcRadius, spin, spin + Math.PI * (0.72 + pulse * 0.18));
            ctx.stroke();
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.shadowBlur = radius * (1.4 + pulse);
        ctx.shadowColor = '#6fffff';
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderMineExplosion(x, y, radius, age, dim, seed = 0) {
        if (radius <= 0.5 || dim <= 0) return;

        const ctx = this.ctx;
        const progress = Math.min(1, age / MINE_CONFIG.explosionDurationMs);
        const fade = 1 - progress;
        const blastRadius = radius * MINE_CONFIG.explosionScale;
        const shockRadius = blastRadius * (1.0 + progress * 5.4);
        const coreRadius = blastRadius * (1.25 + Math.sin(progress * Math.PI) * 1.1);
        const alpha = Math.min(1, dim * 1.35) * fade;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const flash = ctx.createRadialGradient(x, y, radius * 0.1, x, y, shockRadius);
        flash.addColorStop(0, `rgba(255, 255, 255, ${0.98 * alpha})`);
        flash.addColorStop(0.16, `rgba(255, 228, 126, ${0.82 * alpha})`);
        flash.addColorStop(0.42, `rgba(255, 98, 35, ${0.36 * alpha})`);
        flash.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(x, y, shockRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 235, 170, ${0.86 * alpha})`;
        ctx.lineWidth = Math.max(1, radius * (0.14 + fade * 0.18));
        ctx.beginPath();
        ctx.arc(x, y, shockRadius * (0.62 + progress * 0.22), 0, Math.PI * 2);
        ctx.stroke();

        const shards = 16;
        ctx.lineCap = 'round';
        for (let i = 0; i < shards; i++) {
            const angle = (i / shards) * Math.PI * 2 + seed * 0.37;
            const jitter = Math.sin(seed * 13.1 + i * 2.17) * 0.26;
            const rayLength = blastRadius * (1.25 + progress * (3.4 + jitter));
            const inner = coreRadius * (0.35 + progress * 0.2);
            const sx = x + Math.cos(angle) * inner;
            const sy = y + Math.sin(angle) * inner;
            const ex = x + Math.cos(angle) * rayLength;
            const ey = y + Math.sin(angle) * rayLength;
            ctx.strokeStyle = i % 3 === 0
                ? `rgba(112, 248, 255, ${0.7 * alpha})`
                : `rgba(255, 146, 42, ${0.82 * alpha})`;
            ctx.lineWidth = Math.max(1, radius * (0.04 + fade * 0.06));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * alpha})`;
        ctx.shadowBlur = radius * (2.4 + fade * 2.2);
        ctx.shadowColor = '#ffb22e';
        ctx.beginPath();
        ctx.arc(x, y, coreRadius * fade, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderCountdown(state) {
        const time = state.countdownTime;
        if (time <= 0) return;

        let text = "";
        let progress = 0;

        if (time > 2.25) {
            text = "3";
            progress = (3.0 - time) / 0.75;
        } else if (time > 1.5) {
            text = "2";
            progress = (2.25 - time) / 0.75;
        } else if (time > 0.75) {
            text = "1";
            progress = (1.5 - time) / 0.75;
        } else {
            text = "GO!";
            progress = (0.75 - time) / 0.75;
        }

        // Project text: fly from z=-200 to z=5000
        const z = -200 + progress * 5200;
        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + z);
        
        if (scale <= 0) return;

        const fontSize = Math.floor(400 * scale);
        this.ctx.font = `bold ${fontSize}px "Orbitron", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Wireframe effect
        this.ctx.strokeStyle = `rgba(0, 255, 255, ${1.0 - progress * 0.8})`;
        this.ctx.lineWidth = Math.max(1, 5 * scale);
        
        this.ctx.strokeText(text, this.width / 2, this.height / 2);
        
        // Subtle glow
        this.ctx.shadowBlur = 15 * scale;
        this.ctx.shadowColor = '#00ffff';
        this.ctx.strokeText(text, this.width / 2, this.height / 2);
        this.ctx.shadowBlur = 0;
    }

    renderProjectiles(state, now, minZ = -Infinity, maxZ = Infinity) {
        this.ctx.lineWidth = 4;
        
        state.projectiles.forEach(p => {
            const age = now - p.startTime;
            const progress = age / LASER_CONFIG.lifetimeMs;
            
            // Laser bolt position in world Z
            const laserSpeed = LASER_CONFIG.range;
            const laserLength = LASER_CONFIG.renderLength;
            
            // Head starts slightly ahead and flies forward
            const headZ = p.z + LASER_CONFIG.startOffset + progress * laserSpeed;
            
            // Tail grows naturally from cannon, reaching full length after laserLength distance traveled
            const distanceTraveled = headZ - (p.z + LASER_CONFIG.startOffset);
            const currentLength = Math.min(laserLength, distanceTraveled);
            const tailZ = headZ - currentLength;
            
            // Use the TAIL (nearest to camera) for Z-sorting, not the head!
            // Otherwise closer tunnel segments paint over the laser body.
            const effectiveTailZ = Math.max(tailZ, state.cameraZ + 50);
            if (effectiveTailZ < minZ || effectiveTailZ >= maxZ) return;
            
            // Wing cannons: spread wide near fire point, converge over distance
            const wingSpread = LASER_CONFIG.wingSpread;
            const convergeDistance = LASER_CONFIG.convergeDistance;
            
            const sides = [-1, 1];
            
            sides.forEach(side => {
                // World X/Y offset that diminishes with Z (convergence)
                const getOffsetX = (z) => {
                    const t = Math.min(1, Math.max(0, (z - p.z) / convergeDistance));
                    return wingSpread * side * (1 - t);
                };
                const getOffsetY = (z) => {
                    const t = Math.min(1, Math.max(0, (z - p.z) / convergeDistance));
                    return 80 * (1 - t); // slight downward offset (wings below cockpit)
                };
                
                const minRelZ = 50;
                
                let tailRelZ = tailZ - state.cameraZ;
                const headRelZ = headZ - state.cameraZ;
                if (headRelZ < minRelZ) return; // fully behind camera
                
                let renderTailZ = tailZ;
                let renderTailX = p.x + getOffsetX(tailZ);
                let renderTailY = p.y + getOffsetY(tailZ);
                
                const headWorldX = p.x + getOffsetX(headZ);
                const headWorldY = p.y + getOffsetY(headZ);
                
                // True 3D clipping against the near plane (z = state.cameraZ + minRelZ)
                // This prevents the "too short" distortion when the tail is behind the camera!
                if (tailRelZ < minRelZ) {
                    const t = (minRelZ - tailRelZ) / (headRelZ - tailRelZ);
                    renderTailX = renderTailX + t * (headWorldX - renderTailX);
                    renderTailY = renderTailY + t * (headWorldY - renderTailY);
                    tailRelZ = minRelZ;
                }
                
                const tailScale = FOCAL_LENGTH / tailRelZ;
                const tailSX = this.width / 2 + (renderTailX - state.shipX) * tailScale;
                const tailSY = this.height / 2 + (renderTailY - state.shipY) * tailScale;
                
                const headScale = FOCAL_LENGTH / headRelZ;
                const headSX = this.width / 2 + (headWorldX - state.shipX) * headScale;
                const headSY = this.height / 2 + (headWorldY - state.shipY) * headScale;

                const dx = headSX - tailSX;
                const dy = headSY - tailSY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 0.1) return;
                
                const nx = -dy / len;
                const ny = dx / len;
                
                // True 3D width using original projection scales
                const baseWorldWidth = LASER_CONFIG.worldWidth; 
                const tailW = Math.max(0.5, (baseWorldWidth * tailScale) / 2);
                const headW = Math.max(0.5, (baseWorldWidth * headScale) / 2);

                this.ctx.beginPath();
                this.ctx.moveTo(tailSX + nx * tailW, tailSY + ny * tailW);
                this.ctx.lineTo(tailSX - nx * tailW, tailSY - ny * tailW);
                this.ctx.lineTo(headSX - nx * headW, headSY - ny * headW);
                this.ctx.lineTo(headSX + nx * headW, headSY + ny * headW);
                this.ctx.closePath();
                
                this.ctx.fillStyle = '#ff1a1a'; // bright scarlet core
                
                // Fade out based on distance, not time! 
                const visibleDistance = LASER_CONFIG.range;
                const distFade = Math.max(0, 1 - (tailRelZ / visibleDistance)); 
                this.ctx.globalAlpha = distFade * distFade; // Quadratic fade
                
                this.ctx.shadowBlur = Math.max(2, 50 * tailScale * distFade); 
                this.ctx.shadowColor = '#ff0000';
                
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1.0;
            });
        });
    }
}
