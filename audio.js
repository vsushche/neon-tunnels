// Simple Audio Synthesizer
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

export function playCrashSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

export function playDoorPassSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

let engineOsc;
let engineGain;
let isEngineRunning = false;

export function startEngineSound() {
    if (!audioCtx) return;
    if (isEngineRunning) return;
    
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    
    // Triangle wave gives a smooth low-frequency hum
    engineOsc.type = 'triangle';
    
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    
    engineOsc.frequency.value = 40;
    engineGain.gain.value = 0.05;
    
    engineOsc.start();
    isEngineRunning = true;
}

export function updateEngineSound(speed, maxSpeed) {
    if (!audioCtx || !isEngineRunning) return;
    
    let normalizedSpeed = speed / maxSpeed;
    if (normalizedSpeed < 0) normalizedSpeed = 0;
    if (normalizedSpeed > 1) normalizedSpeed = 1;
    
    // Adjust pitch: 40Hz to 150Hz
    engineOsc.frequency.setTargetAtTime(40 + normalizedSpeed * 110, audioCtx.currentTime, 0.1);
    
    // Adjust volume: 0.05 to 0.15
    engineGain.gain.setTargetAtTime(0.05 + normalizedSpeed * 0.1, audioCtx.currentTime, 0.1);
}

export function stopEngineSound() {
    if (isEngineRunning && engineOsc) {
        engineOsc.stop();
        engineOsc.disconnect();
        engineGain.disconnect();
        isEngineRunning = false;
    }
}

// Attach to window so game.js can call it if needed, or just export
window.initAudio = initAudio;
