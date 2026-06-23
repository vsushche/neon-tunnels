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
        master.gain.setValueAtTime(0.85, now);
        master.gain.linearRampToValueAtTime(0.6, now + 0.05);
        master.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        master.connect(this.audioCtx.destination);

        // Initial transient click — the detonation impact
        const click = this.audioCtx.createOscillator();
        const clickGain = this.audioCtx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(800, now);
        click.frequency.exponentialRampToValueAtTime(60, now + 0.02);
        clickGain.gain.setValueAtTime(1.0, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        click.connect(clickGain);
        clickGain.connect(master);
        click.start(now);
        click.stop(now + 0.04);

        // Deep sub-bass boom — the shockwave you feel
        const boom = this.audioCtx.createOscillator();
        const boomGain = this.audioCtx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(80, now);
        boom.frequency.exponentialRampToValueAtTime(22, now + 0.8);
        boomGain.gain.setValueAtTime(1.0, now + 0.01);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        boom.connect(boomGain);
        boomGain.connect(master);
        boom.start(now);
        boom.stop(now + 1.0);

        // Distorted mid-range crunch
        const crunch = this.audioCtx.createOscillator();
        const crunchGain = this.audioCtx.createGain();
        const crunchDist = this.audioCtx.createWaveShaperFunction
            ? null
            : this.audioCtx.createWaveShaper();
        crunch.type = 'sawtooth';
        crunch.frequency.setValueAtTime(120, now);
        crunch.frequency.exponentialRampToValueAtTime(30, now + 0.4);
        crunchGain.gain.setValueAtTime(0.7, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        crunch.connect(crunchGain);
        crunchGain.connect(master);
        crunch.start(now);
        crunch.stop(now + 0.5);

        // Filtered noise burst — debris and shrapnel
        const noise1 = this.createNoiseSource(0.6);
        const noiseBP = this.audioCtx.createBiquadFilter();
        const noiseLP = this.audioCtx.createBiquadFilter();
        const noiseGain1 = this.audioCtx.createGain();
        noiseBP.type = 'bandpass';
        noiseBP.frequency.setValueAtTime(2000, now);
        noiseBP.frequency.exponentialRampToValueAtTime(400, now + 0.5);
        noiseBP.Q.setValueAtTime(1.2, now);
        noiseLP.type = 'lowpass';
        noiseLP.frequency.setValueAtTime(6000, now);
        noiseLP.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        noiseGain1.gain.setValueAtTime(0.8, now);
        noiseGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        noise1.connect(noiseBP);
        noiseBP.connect(noiseLP);
        noiseLP.connect(noiseGain1);
        noiseGain1.connect(master);
        noise1.start(now);
        noise1.stop(now + 0.65);

        // High-frequency hiss tail — fire and heat dissipation
        const noise2 = this.createNoiseSource(1.0);
        const hissFilter = this.audioCtx.createBiquadFilter();
        const hissGain = this.audioCtx.createGain();
        hissFilter.type = 'highpass';
        hissFilter.frequency.setValueAtTime(3000, now + 0.05);
        hissFilter.frequency.exponentialRampToValueAtTime(800, now + 0.9);
        hissGain.gain.setValueAtTime(0.0, now);
        hissGain.gain.linearRampToValueAtTime(0.35, now + 0.04);
        hissGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        noise2.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(master);
        noise2.start(now);
        noise2.stop(now + 1.1);

        // Resonant metallic ping — shrapnel ringing
        const ping = this.audioCtx.createOscillator();
        const pingGain = this.audioCtx.createGain();
        ping.type = 'sine';
        ping.frequency.setValueAtTime(1800, now + 0.02);
        ping.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        pingGain.gain.setValueAtTime(0.25, now + 0.02);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        ping.connect(pingGain);
        pingGain.connect(master);
        ping.start(now + 0.02);
        ping.stop(now + 0.4);
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
