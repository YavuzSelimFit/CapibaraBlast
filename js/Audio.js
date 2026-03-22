export default class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    _init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    _play(freq, type, duration, volume = 0.1, decay = true) {
        this._init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (decay) {
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        }

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playDrop() {
        // Short low frequencies square wave for "thud"
        this._play(150, 'square', 0.1, 0.05);
    }

    playMerge(value = 1) {
        // Escalating sine waves for clean chime
        const base = 440;
        const freq = base * Math.pow(1.059, value); // Dynamic pitch based on block value
        this._play(freq, 'sine', 0.3, 0.1);
    }

    playClear() {
        // Multi-frequency burst
        [523.25, 659.25, 783.99].forEach((f, i) => {
            setTimeout(() => this._play(f, 'triangle', 0.2, 0.05), i * 50);
        });
    }

    playGameOver() {
        // Descending doom
        this._play(200, 'sawtooth', 1.0, 0.1);
        this._play(150, 'sawtooth', 1.2, 0.1);
    }
}
