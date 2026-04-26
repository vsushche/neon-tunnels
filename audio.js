const AudioContext = window.AudioContext || window.webkitAudioContext;

export class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;
    }

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
        }
    }

    playCrashSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    }

    playDoorPassSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    startEngineSound() {
        if (!this.audioCtx) return;
        if (this.isEngineRunning) return;
        
        this.engineOsc = this.audioCtx.createOscillator();
        this.engineGain = this.audioCtx.createGain();
        
        this.engineOsc.type = 'triangle';
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.audioCtx.destination);
        
        this.engineOsc.frequency.value = 40;
        this.engineGain.gain.value = 0.05;
        
        this.engineOsc.start();
        this.isEngineRunning = true;
    }

    updateEngineSound(speed, maxSpeed) {
        if (!this.audioCtx || !this.isEngineRunning) return;
        
        let normalizedSpeed = speed / maxSpeed;
        if (normalizedSpeed < 0) normalizedSpeed = 0;
        if (normalizedSpeed > 1) normalizedSpeed = 1;
        
        this.engineOsc.frequency.setTargetAtTime(40 + normalizedSpeed * 110, this.audioCtx.currentTime, 0.1);
        this.engineGain.gain.setTargetAtTime(0.05 + normalizedSpeed * 0.1, this.audioCtx.currentTime, 0.1);
    }

    stopEngineSound() {
        if (this.isEngineRunning && this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc.disconnect();
            this.engineGain.disconnect();
            this.isEngineRunning = false;
        }
    }
}
