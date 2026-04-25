import { SEGMENT_LENGTH, TUNNEL_WIDTH, TUNNEL_HEIGHT, FOCAL_LENGTH, VISIBLE_SEGMENTS } from './constants.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;

export function initRenderer() {
    window.addEventListener('resize', resize);
    resize();
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
}

export function render(state, now) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    if (state.track.length === 0) return;

    let baseIndex = Math.floor(state.cameraZ / SEGMENT_LENGTH);
    let basePercent = (state.cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    
    if (baseIndex >= state.trackLength) return;
    
    let currentSeg = state.track[baseIndex];
    
    let dx = -(currentSeg.curveX * basePercent);
    let dy = -(currentSeg.curveY * basePercent);
    let x = 0;
    let y = 0;
    
    let projectedSegments = [];
    
    for (let n = 0; n < VISIBLE_SEGMENTS; n++) {
        let index = baseIndex + n;
        if (index >= state.trackLength) break;
        let seg = state.track[index];
        
        let relZ = (n + 1 - basePercent) * SEGMENT_LENGTH;
        let scale = FOCAL_LENGTH / relZ;
        
        x += dx;
        y += dy;
        dx += seg.curveX;
        dy += seg.curveY;
        
        let screenX = width / 2 + (x - state.shipX) * scale;
        let screenY = height / 2 + (y - state.shipY) * scale;
        
        let w = (TUNNEL_WIDTH * seg.widthFactor) * scale / 2;
        let h = TUNNEL_HEIGHT * scale / 2;
        
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
        let p1 = projectedSegments[i];
        let p2 = projectedSegments[i-1];
        
        let dim = 1 - (i / VISIBLE_SEGMENTS);
        if (p1.seg.index >= state.trackLength - 5) {
            dim += 0.5;
        }
        
        let lightness = p1.seg.colorIndex === 0 ? 30 : 20;
        lightness *= dim;
        
        let hue = p1.seg.hue;
        
        let colorFloor = `hsl(${hue}, 80%, ${lightness}%)`;
        let colorCeil  = `hsl(${hue}, 80%, ${lightness - 5}%)`;
        let colorWall  = `hsl(${hue}, 80%, ${lightness + 5}%)`;
        
        polygon(ctx, p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, colorCeil);
        polygon(ctx, p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, colorFloor);
        polygon(ctx, p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, colorWall);
        polygon(ctx, p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, colorWall);
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${dim * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.tl_x, p1.tl_y); ctx.lineTo(p2.tl_x, p2.tl_y);
        ctx.moveTo(p1.tr_x, p1.tr_y); ctx.lineTo(p2.tr_x, p2.tr_y);
        ctx.moveTo(p1.bl_x, p1.bl_y); ctx.lineTo(p2.bl_x, p2.bl_y);
        ctx.moveTo(p1.br_x, p1.br_y); ctx.lineTo(p2.br_x, p2.br_y);
        ctx.moveTo(p2.tl_x, p2.tl_y); ctx.lineTo(p2.tr_x, p2.tr_y);
        ctx.lineTo(p2.br_x, p2.br_y); ctx.lineTo(p2.bl_x, p2.bl_y);
        ctx.lineTo(p2.tl_x, p2.tl_y);
        ctx.stroke();

        if (p2.seg.type === 'door') {
            let doorVal = Math.sin(now * 0.003 * p2.seg.doorSpeed + p2.seg.doorPhaseOffset);
            let doorClosedRatio = Math.max(0, Math.min(1, -doorVal * 5 + 0.5));
            
            if (doorClosedRatio > 0) {
                let doorH = p2.h * doorClosedRatio;
                ctx.fillStyle = `hsla(340, 100%, 50%, 0.8)`;
                
                ctx.fillRect(p2.sx - p2.w, p2.sy - p2.h, p2.w * 2, doorH);
                ctx.fillRect(p2.sx - p2.w, p2.sy + p2.h - doorH, p2.w * 2, doorH);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(p2.sx - p2.w, p2.sy - p2.h, p2.w * 2, doorH);
                ctx.strokeRect(p2.sx - p2.w, p2.sy + p2.h - doorH, p2.w * 2, doorH);
            }
        }
        
        if (p2.seg.type === 'mine') {
            let mScale = p2.scale;
            let mX = p2.sx + p2.seg.mineX * mScale;
            let mY = p2.sy + p2.seg.mineY * mScale;
            let mRadius = 50 * mScale;
            
            ctx.beginPath();
            ctx.arc(mX, mY, mRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffaa00';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(mX, mY, mRadius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }
    
    if (baseIndex >= state.trackLength - VISIBLE_SEGMENTS) {
        let dist = (state.trackLength - baseIndex) / VISIBLE_SEGMENTS;
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - dist})`;
        ctx.fillRect(0, 0, width, height);
    }
}
