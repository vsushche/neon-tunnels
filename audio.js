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

    playScrapeSound() {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        
        // High-frequency friction noise
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(200, now + 0.15);
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.2);
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

    playVictoryMelody() {
        if (!this.audioCtx) return;
        
        // Triumphant ascending fanfare: C5 E5 G5 C6 — pause — E6 G6 C7
        const notes = [
            { freq: 523.25, time: 0.0,  dur: 0.25 },  // C5
            { freq: 659.25, time: 0.25, dur: 0.25 },  // E5
            { freq: 783.99, time: 0.5,  dur: 0.25 },  // G5
            { freq: 1046.5, time: 0.75, dur: 0.5  },  // C6 (longer)
            { freq: 1318.5, time: 1.5,  dur: 0.2  },  // E6
            { freq: 1568.0, time: 1.7,  dur: 0.2  },  // G6
            { freq: 2093.0, time: 1.9,  dur: 0.8  },  // C7 (final, long)
        ];
        
        const now = this.audioCtx.currentTime;
        
        for (const note of notes) {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = note.freq;
            
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.15, now + note.time + 0.03);
            gain.gain.setValueAtTime(0.15, now + note.time + note.dur * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(now + note.time);
            osc.stop(now + note.time + note.dur + 0.05);
        }
    }
}
