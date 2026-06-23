import { GameEventType } from './events.js';

const AudioContext = window.AudioContext || window.webkitAudioContext;

export class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.isEngineRunning = false;
        this.menuAudio = null;
        this.audioCtx = new AudioContext();
        this.audioCtx.resume();
    }

    handleEvents(events, state) {
        for (const event of events) {
            switch (event.type) {
                case GameEventType.MENU_ACTIVATED:
                    this.startMenuMusic();
                    break;

                case GameEventType.LEVEL_STARTED:
                    this.stopMenuMusic();
                    this.startEngineSound();
                    break;

                case GameEventType.COUNTDOWN_BEEP:
                    this.playCountdownBeep(event.payload.isHigh);
                    break;

                case GameEventType.LASER_FIRED:
                    this.playLaserSound();
                    break;

                case GameEventType.SHIP_CRASHED:
                    this.playCrashSound();
                    break;

                case GameEventType.MINE_DESTROYED:
                    this.playMineDestroyedSound();
                    break;

                case GameEventType.WALL_SCRAPED:
                    this.playScrapeSound();
                    break;

                case GameEventType.DOOR_PASSED:
                    this.playDoorPassSound();
                    break;

                case GameEventType.EXIT_STARTED:
                    this.playVictoryMelody();
                    break;

                case GameEventType.LEVEL_COMPLETED:
                case GameEventType.GAME_COMPLETED:
                    this.stopEngineSound();
                    this.startMenuMusic();
                    break;

                default:
                    break;
            }
        }

        this.updateEngineSound(state.speed, state.MAX_SPEED);
    }

    playMineDestroyedSound() {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const master = this.audioCtx.createGain();
        master.gain.setValueAtTime(0.7, now);
        master.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        master.connect(this.audioCtx.destination);

        const boom = this.audioCtx.createOscillator();
        const boomGain = this.audioCtx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(95, now);
        boom.frequency.exponentialRampToValueAtTime(34, now + 0.36);
        boomGain.gain.setValueAtTime(1.0, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        boom.connect(boomGain);
        boomGain.connect(master);
        boom.start(now);
        boom.stop(now + 0.42);

        const crack = this.audioCtx.createOscillator();
        const crackGain = this.audioCtx.createGain();
        crack.type = 'sawtooth';
        crack.frequency.setValueAtTime(70, now);
        crack.frequency.exponentialRampToValueAtTime(18, now + 0.16);
        crackGain.gain.setValueAtTime(0.55, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        crack.connect(crackGain);
        crackGain.connect(master);
        crack.start(now);
        crack.stop(now + 0.18);

        const noise = this.createNoiseSource(0.22);
        const noiseFilter = this.audioCtx.createBiquadFilter();
        const noiseGain = this.audioCtx.createGain();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(3600, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(260, now + 0.22);
        noiseFilter.Q.setValueAtTime(0.8, now);
        noiseGain.gain.setValueAtTime(0.75, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(master);
        noise.start(now);
        noise.stop(now + 0.24);

        const snap = this.audioCtx.createOscillator();
        const snapGain = this.audioCtx.createGain();
        snap.type = 'triangle';
        snap.frequency.setValueAtTime(160, now);
        snap.frequency.exponentialRampToValueAtTime(45, now + 0.08);
        snapGain.gain.setValueAtTime(0.9, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        snap.connect(snapGain);
        snapGain.connect(master);
        snap.start(now);
        snap.stop(now + 0.1);
    }

    createNoiseSource(duration) {
        const sampleRate = this.audioCtx.sampleRate;
        const buffer = this.audioCtx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        return source;
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
            { freq: 523.25, time: 0.0, dur: 0.25 }, // C5
            { freq: 659.25, time: 0.25, dur: 0.25 }, // E5
            { freq: 783.99, time: 0.5, dur: 0.25 }, // G5
            { freq: 1046.5, time: 0.75, dur: 0.5 }, // C6 (longer)
            { freq: 1318.5, time: 1.5, dur: 0.2 }, // E6
            { freq: 1568.0, time: 1.7, dur: 0.2 }, // G6
            { freq: 2093.0, time: 1.9, dur: 0.8 } // C7 (final, long)
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

    playCountdownBeep(isHigh = false) {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(isHigh ? 880 : 440, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playLaserSound() {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    startMenuMusic() {
        if (!this.audioCtx) return;
        if (this.menuInterval) return;

        const notes = [130.81, 261.63, 196.0, 261.63, 146.83, 293.66, 220.0, 293.66]; // C3, C4, G3, C4, D3, D4, A3, D4

        let step = 0;
        const tempo = 140; // BPM
        const stepTime = 60 / tempo / 2; // 1/8 notes

        this.menuInterval = setInterval(() => {
            const now = this.audioCtx.currentTime;
            const freq = notes[step % notes.length];

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const filter = this.audioCtx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + stepTime);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 0.9);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now);
            osc.stop(now + stepTime);

            step++;
        }, stepTime * 1000);
    }

    stopMenuMusic() {
        if (this.menuInterval) {
            clearInterval(this.menuInterval);
            this.menuInterval = null;
        }
    }
}
