import { playCrashSound, playDoorPassSound, startEngineSound, updateEngineSound, stopEngineSound } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiSpeed = document.getElementById('ui-speed');
const uiSpeedBar = document.getElementById('ui-speed-bar');
const uiLevel = document.getElementById('ui-level');
const uiTime = document.getElementById('ui-time');
const uiProgress = document.getElementById('ui-progress-bar');
const flashOverlay = document.getElementById('flash-overlay');
const menuScreen = document.getElementById('menu-screen');
const startBtn = document.getElementById('start-btn');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Constants
const SEGMENT_LENGTH = 200;
const TUNNEL_WIDTH = 1200;
const TUNNEL_HEIGHT = 800;
const FOCAL_LENGTH = 400;
const VISIBLE_SEGMENTS = 20;

// Game State
let gameState = 'menu'; // menu, playing, dead, win
let currentLevel = 1;
let startTime = 0;
let elapsedTime = 0;
let cameraZ = 0;
let speed = 0;
let MAX_SPEED = 2500;
let shipX = 0;
let shipY = 0;
let shipVX = 0;
let shipVY = 0;
const SHIP_ACCEL = 8000;
const SHIP_FRICTION = 0.85;
const SHIP_SIZE = 100; // Radius of collision

let track = [];
let trackLength = 0;

// Inputs
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false, Shift: false };
window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });

startBtn.addEventListener('click', () => {
    window.initAudio();
    if (gameState === 'win') {
        startGame(currentLevel + 1);
    } else {
        startGame(1);
    }
});

function createTrack(level) {
    track = [];
    trackLength = 200 + level * 100; // Longer levels
    MAX_SPEED = 2000 + level * 500;
    
    let currentCurveX = 0;
    let currentCurveY = 0;
    
    // Theme colors based on level
    const hue1 = (level * 60) % 360;
    const hue2 = (hue1 + 180) % 360;
    
    for (let i = 0; i < trackLength; i++) {
        // Change curve randomly, sharpness increases with level
        if (i % 20 === 0 && i > 10 && i < trackLength - 20) {
            currentCurveX = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
            currentCurveY = (Math.random() - 0.5) * 0.1 * (1 + level * 0.2);
        }
        
        // Return to center at end
        if (i > trackLength - 20) {
            currentCurveX = 0;
            currentCurveY = 0;
        }

        let type = 'normal';
        let widthFactor = 1.0;
        let doorPhaseOffset = 0;
        let doorSpeed = 1 + level * 0.2;
        
        // Add obstacles (doors, narrowings, mines)
        if (i > 30 && i < trackLength - 30) {
            if (i % 40 === 0) {
                type = 'door';
                doorPhaseOffset = Math.random() * Math.PI * 2;
            } else if (i % 75 === 0) {
                type = 'narrow';
                widthFactor = 0.5; // Tunnel is half width
            } else if (i % 27 === 0) {
                type = 'mine';
            }
        }
        
        let colorIndex = Math.floor(i / 2) % 2; // Alternate colors every 2 segments
        
        track.push({
            index: i,
            z: i * SEGMENT_LENGTH,
            curveX: currentCurveX,
            curveY: currentCurveY,
            colorIndex: colorIndex,
            type: type,
            widthFactor: widthFactor,
            doorPhaseOffset: doorPhaseOffset,
            doorSpeed: doorSpeed,
            mineX: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_WIDTH - 200) : 0,
            mineY: type === 'mine' ? (Math.random() - 0.5) * (TUNNEL_HEIGHT - 200) : 0,
            hue: colorIndex === 0 ? hue1 : hue2,
            passed: false // To track if we played door pass sound
        });
    }
}

function startGame(level) {
    currentLevel = level;
    startTime = performance.now();
    elapsedTime = 0;
    createTrack(level);
    resetPlayer();
    gameState = 'playing';
    menuScreen.classList.add('hidden');
    startEngineSound();
    updateHUD();
}

function resetPlayer() {
    cameraZ = 0;
    speed = 0;
    shipX = 0;
    shipY = 0;
    shipVX = 0;
    shipVY = 0;
}

function handleCrash() {
    if (gameState !== 'playing') return;
    playCrashSound();
    
    // Flash effect
    flashOverlay.classList.add('flash');
    setTimeout(() => {
        if(flashOverlay) flashOverlay.classList.remove('flash');
    }, 50);

    speed = 0; 
    cameraZ -= 300; // Легкий отскок назад
    
    updateHUD();
}

function handleWin() {
    if (gameState !== 'playing') return;
    gameState = 'win';
    setTimeout(() => {
        document.getElementById('menu-title').innerText = "SECTOR CLEARED";
        document.getElementById('menu-title').style.color = "#00ffcc";
        document.getElementById('start-btn').innerText = "NEXT SECTOR";
        menuScreen.classList.remove('hidden');
        stopEngineSound();
    }, 1500);
}

function updateHUD() {
    uiLevel.innerText = currentLevel;
    uiTime.innerText = elapsedTime.toFixed(2) + 's';
    uiSpeed.innerText = Math.floor(speed);
    uiSpeedBar.style.width = `${Math.max(0, (speed / MAX_SPEED) * 100)}%`;
    let progress = Math.min(100, Math.max(0, (cameraZ / (trackLength * SEGMENT_LENGTH)) * 100));
    uiProgress.style.width = `${progress}%`;
}

// Draw Polygon Helper
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

let lastTime = performance.now();

function gameLoop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // Cap delta time

    if (gameState === 'playing') {
        update(dt, now);
        updateEngineSound(speed, MAX_SPEED);
    } else if (gameState === 'win') {
        speed *= 0.95; // Smooth stop
        cameraZ += speed * dt;
        updateEngineSound(speed, MAX_SPEED);
    }
    
    render(now);
    requestAnimationFrame(gameLoop);
}

function update(dt, now) {
    elapsedTime = (now - startTime) / 1000;
    // Speed control
    if (keys.Space) {
        speed += 1500 * dt;
    } else if (keys.Shift) {
        speed -= 3000 * dt; // Strong brake
    } else {
        speed -= 800 * dt; // Natural friction
    }
    
    speed = Math.max(0, Math.min(speed, MAX_SPEED));
    cameraZ += speed * dt;
    
    // Ship Movement (Inertia based sliding)
    if (keys.ArrowLeft) shipVX -= SHIP_ACCEL * dt;
    if (keys.ArrowRight) shipVX += SHIP_ACCEL * dt;
    if (keys.ArrowUp) shipVY -= SHIP_ACCEL * dt;
    if (keys.ArrowDown) shipVY += SHIP_ACCEL * dt;
    
    shipVX *= SHIP_FRICTION;
    shipVY *= SHIP_FRICTION;
    
    shipX += shipVX * dt;
    shipY += shipVY * dt;
    
    // Current segment
    let currentSegIndex = Math.floor(cameraZ / SEGMENT_LENGTH);
    
    // Win Condition
    if (currentSegIndex >= trackLength - 2) {
        handleWin();
        return;
    }
    
    let currentSeg = track[currentSegIndex];
    if (!currentSeg) return;

    // Boundary Check against current segment width
    let currentW = (TUNNEL_WIDTH * currentSeg.widthFactor) / 2;
    let currentH = TUNNEL_HEIGHT / 2;
    
    let collisionMargin = SHIP_SIZE;
    
    let hitWall = false;
    
    if (shipX < -currentW + collisionMargin) { shipX = -currentW + collisionMargin; shipVX = Math.abs(shipVX) * 1.2 + 2000; hitWall = true; }
    if (shipX > currentW - collisionMargin) { shipX = currentW - collisionMargin; shipVX = -Math.abs(shipVX) * 1.2 - 2000; hitWall = true; }
    if (shipY < -currentH + collisionMargin) { shipY = -currentH + collisionMargin; shipVY = Math.abs(shipVY) * 1.2 + 2000; hitWall = true; }
    if (shipY > currentH - collisionMargin) { shipY = currentH - collisionMargin; shipVY = -Math.abs(shipVY) * 1.2 - 2000; hitWall = true; }
    
    if (hitWall) {
        speed *= 0.4; // Lose forward speed
        
        // Provide feedback without losing a life
        playCrashSound();
        flashOverlay.classList.add('flash');
        setTimeout(() => {
            if(flashOverlay) flashOverlay.classList.remove('flash');
        }, 50);
    }
    
    // Obstacle Collisions
    // We check the segment we are currently entering
    if (currentSegIndex > 0) {
        let segDist = cameraZ - (currentSegIndex * SEGMENT_LENGTH);
        // If we are close to passing the boundary
        if (segDist < 100 && speed > 0) {
            if (currentSeg.type === 'door') {
                // Check if door is closed
                // Door cycle: sin wave based on time
                let doorVal = Math.sin(now * 0.003 * currentSeg.doorSpeed + currentSeg.doorPhaseOffset);
                let isOpen = doorVal > 0; // Open half the time
                
                if (!isOpen) {
                    handleCrash();
                } else if (!currentSeg.passed) {
                    playDoorPassSound();
                    currentSeg.passed = true;
                }
            } else if (currentSeg.type === 'mine') {
                // simple box collision
                let dx = shipX - currentSeg.mineX;
                let dy = shipY - currentSeg.mineY;
                if (Math.sqrt(dx*dx + dy*dy) < SHIP_SIZE + 50) { // 50 is mine radius
                    handleCrash();
                }
            }
        }
    }
    
    updateHUD();
}

function render(now) {
    // Clear screen
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    if (track.length === 0) return;

    let baseIndex = Math.floor(cameraZ / SEGMENT_LENGTH);
    let basePercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    
    if (baseIndex >= trackLength) return; // End of track
    
    let currentSeg = track[baseIndex];
    
    // Accumulate curves to get screen offsets
    let dx = -(currentSeg.curveX * basePercent);
    let dy = -(currentSeg.curveY * basePercent);
    let x = 0;
    let y = 0;
    
    let projectedSegments = [];
    
    for (let n = 0; n < VISIBLE_SEGMENTS; n++) {
        let index = baseIndex + n;
        if (index >= trackLength) break;
        let seg = track[index];
        
        // Depth
        let relZ = (n + 1 - basePercent) * SEGMENT_LENGTH;
        let scale = FOCAL_LENGTH / relZ;
        
        x += dx;
        y += dy;
        dx += seg.curveX;
        dy += seg.curveY;
        
        // Ship offset shifting the tunnel
        let screenX = width / 2 + (x - shipX) * scale;
        let screenY = height / 2 + (y - shipY) * scale;
        
        let w = (TUNNEL_WIDTH * seg.widthFactor) * scale / 2;
        let h = TUNNEL_HEIGHT * scale / 2;
        
        projectedSegments.push({
            seg: seg,
            scale: scale,
            sx: screenX,
            sy: screenY,
            w: w,
            h: h,
            // Corners
            tl_x: screenX - w, tl_y: screenY - h,
            tr_x: screenX + w, tr_y: screenY - h,
            bl_x: screenX - w, bl_y: screenY + h,
            br_x: screenX + w, br_y: screenY + h
        });
    }
    
    // Draw from back to front
    for (let i = projectedSegments.length - 1; i > 0; i--) {
        let p1 = projectedSegments[i];   // Farther
        let p2 = projectedSegments[i-1]; // Closer (so we draw walls from p2 back to p1)
        
        // Darken based on distance (i)
        let dim = 1 - (i / VISIBLE_SEGMENTS);
        // Add brightness for finish line
        if (p1.seg.index >= trackLength - 5) {
            dim += 0.5; // Bright zone at the end
        }
        
        let lightness = p1.seg.colorIndex === 0 ? 30 : 20;
        lightness *= dim;
        
        let hue = p1.seg.hue;
        
        let colorFloor = `hsl(${hue}, 80%, ${lightness}%)`;
        let colorCeil  = `hsl(${hue}, 80%, ${lightness - 5}%)`;
        let colorWall  = `hsl(${hue}, 80%, ${lightness + 5}%)`;
        
        // Draw Ceiling
        polygon(ctx, p1.tl_x, p1.tl_y, p1.tr_x, p1.tr_y, p2.tr_x, p2.tr_y, p2.tl_x, p2.tl_y, colorCeil);
        // Draw Floor
        polygon(ctx, p1.bl_x, p1.bl_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.bl_x, p2.bl_y, colorFloor);
        // Draw Left Wall
        polygon(ctx, p1.tl_x, p1.tl_y, p1.bl_x, p1.bl_y, p2.bl_x, p2.bl_y, p2.tl_x, p2.tl_y, colorWall);
        // Draw Right Wall
        polygon(ctx, p1.tr_x, p1.tr_y, p1.br_x, p1.br_y, p2.br_x, p2.br_y, p2.tr_x, p2.tr_y, colorWall);
        
        // Draw Grid lines for speed illusion
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${dim * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.tl_x, p1.tl_y); ctx.lineTo(p2.tl_x, p2.tl_y);
        ctx.moveTo(p1.tr_x, p1.tr_y); ctx.lineTo(p2.tr_x, p2.tr_y);
        ctx.moveTo(p1.bl_x, p1.bl_y); ctx.lineTo(p2.bl_x, p2.bl_y);
        ctx.moveTo(p1.br_x, p1.br_y); ctx.lineTo(p2.br_x, p2.br_y);
        // Connecting rings
        ctx.moveTo(p2.tl_x, p2.tl_y); ctx.lineTo(p2.tr_x, p2.tr_y);
        ctx.lineTo(p2.br_x, p2.br_y); ctx.lineTo(p2.bl_x, p2.bl_y);
        ctx.lineTo(p2.tl_x, p2.tl_y);
        ctx.stroke();

        // Draw Obstacles on the p2 segment boundary
        if (p2.seg.type === 'door') {
            let doorVal = Math.sin(now * 0.003 * p2.seg.doorSpeed + p2.seg.doorPhaseOffset);
            let doorClosedRatio = 0;
            if (doorVal <= 0) {
                // Closed state animation
                doorClosedRatio = 1.0; 
            } else {
                // Animating open/close
                // We can make it snap or smooth. Let's do snap: open or closed
                doorClosedRatio = 0.0;
            }
            
            // To make it look like a physical door, let's make it slide from top and bottom
            // if doorVal goes from -1 to 1, let's map it smoothly when near 0
            doorClosedRatio = Math.max(0, Math.min(1, -doorVal * 5 + 0.5)); // smooth transition
            
            if (doorClosedRatio > 0) {
                let doorH = p2.h * doorClosedRatio;
                ctx.fillStyle = `hsla(340, 100%, 50%, 0.8)`; // Neon Red/Pink
                
                // Top Door
                ctx.fillRect(p2.sx - p2.w, p2.sy - p2.h, p2.w * 2, doorH);
                // Bottom Door
                ctx.fillRect(p2.sx - p2.w, p2.sy + p2.h - doorH, p2.w * 2, doorH);
                
                // Door frame stroke
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
            
            // Glowing mine
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
    
    // Draw finish light
    if (baseIndex >= trackLength - VISIBLE_SEGMENTS) {
        let dist = (trackLength - baseIndex) / VISIBLE_SEGMENTS; // 1 to 0
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - dist})`;
        ctx.fillRect(0, 0, width, height);
    }
}

requestAnimationFrame(gameLoop);
