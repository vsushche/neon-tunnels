import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT, FOCAL_LENGTH, VISIBLE_SEGMENTS } from './constants.js';
import { Starfield } from './stars.js';

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.starfield = new Starfield(400, 4000, 4000);
        
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
            const h = TUNNEL_HEIGHT * scale / 2;
            
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
            
            this.renderSegmentPolygons(p1, p2, dim);
            this.renderSegmentWires(p1, p2, dim);
            this.renderSegmentObstacles(p2, now, dim);
        }
    }

    renderSegmentPolygons(p1, p2, dim) {
        let lightness = p1.seg.colorIndex === 0 ? 30 : 20;
        lightness *= dim;
        
        const hue = p1.seg.hue;
        
        const colorFloor = `hsl(${hue}, 80%, ${lightness}%)`;
        const colorCeil  = `hsl(${hue}, 80%, ${lightness - 5}%)`;
        const colorWall  = `hsl(${hue}, 80%, ${lightness + 5}%)`;
        
        this.polygon(p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, colorCeil);
        this.polygon(p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, colorFloor);
        this.polygon(p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, colorWall);
        this.polygon(p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, colorWall);
    }

    renderSegmentWires(p1, p2, dim) {
        const hue = p1.seg.hue;
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${dim * 0.5})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.tl_x, p1.tl_y); this.ctx.lineTo(p2.tl_x, p2.tl_y);
        this.ctx.moveTo(p1.tr_x, p1.tr_y); this.ctx.lineTo(p2.tr_x, p2.tr_y);
        this.ctx.moveTo(p1.bl_x, p1.bl_y); this.ctx.lineTo(p2.bl_x, p2.bl_y);
        this.ctx.moveTo(p1.br_x, p1.br_y); this.ctx.lineTo(p2.br_x, p2.br_y);
        this.ctx.moveTo(p2.tl_x, p2.tl_y); this.ctx.lineTo(p2.tr_x, p2.tr_y);
        this.ctx.lineTo(p2.br_x, p2.br_y); this.ctx.lineTo(p2.bl_x, p2.bl_y);
        this.ctx.lineTo(p2.tl_x, p2.tl_y);
        this.ctx.stroke();
    }

    renderSegmentObstacles(p2, now, dim) {
        if (p2.seg.door) {
            p2.seg.door.render(this.ctx, p2.sx, p2.sy, p2.w, p2.h, now, dim);
        }
        
        if (p2.seg.type === 'mine') {
            const mScale = p2.scale;
            const mX = p2.sx + p2.seg.mineX * mScale;
            const mY = p2.sy + p2.seg.mineY * mScale;
            const mRadius = 50 * mScale;
            
            this.ctx.beginPath();
            this.ctx.arc(mX, mY, mRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(mX, mY, mRadius * 0.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
        }
    }
}
