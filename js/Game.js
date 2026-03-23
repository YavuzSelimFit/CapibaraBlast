import Renderer from './Renderer.js?v=34.2';
import Grid from './Grid.js?v=34.2';
import Input from './Input.js?v=34.2';
import BlockFactory from './BlockFactory.js?v=34.2';
import Audio from './Audio.js?v=34.2';

class Game {
    constructor() {
        // Satır sayısını 14'ten 10'a düşürdük (Daha kısa oyun alanı)
        this.grid = new Grid(8, 10); 
        this.renderer = new Renderer(this.grid);
        this.factory = new BlockFactory();
        this.audio = new Audio();
        this.input = null;

        this.score = 0;
        this.highScores = JSON.parse(localStorage.getItem('capy_scores') || '[]');
        this.level = 1;
        this.level = 1;
        this.linesClearedTotal = 0;
        
        this.trauma = 0; // Screen shake decay variable

        this.active = null;   // { grid, x, y }
        this.next = null;

        // Bridge Capacitor Plugins
        this.Haptics = window.Capacitor?.Plugins?.Haptics;
        this.Pref = window.Capacitor?.Plugins?.Preferences;
        this.AdMob = window.Capacitor?.Plugins?.AdMob;
        
        this.isGameOver = false;
        this.isPaused = true; 

        // CONSTANT SPEED DO NOT INCREASE
        this.baseSpeed = 0.0008; 
        this.speed = this.baseSpeed;
        this.lastTime = 0;
        this.lockDelay = 350;
        this.lockTimer = 0;
        this.powerUpMode = null;
    }

    boot() {
        console.log('Game booting...');
        this.input = new Input(this);
        this._bindUI();
        console.log('UI Bound');
        
        // No auto-start or splash-click-anywhere. 
        // btn-start in _bindUI will trigger the transition.
        this.next = this._newPiece();
        this.renderer.updateNext(this.next);
        this._loadState(); // Attempt to resume session
        this._initAdMob();
    }

    _start() {
        this.isPaused = false;
        this._spawn();
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }

    _newPiece() {
        return this.factory.createRandom(this.grid);
    }

    _spawn() {
        if (!this.next) this.next = this._newPiece();
        this.active = this.next;
        this.next = this._newPiece();
        this.renderer.updateNext(this.next);
        
        // EKSİK OLAN KISIM: Başlangıç x ve y koordinatlarını belirle
        this.active.x = Math.floor((this.grid.width - this.active.grid[0].length) / 2);
        this.active.y = -this.active.grid.length; 
        
        this.active.vx = this.active.x;
        this.active.vy = this.active.y;
        this.active.scaleX = 1.0;
        this.active.scaleY = 1.0;

        let checkY = Math.max(0, Math.floor(this.active.y));
        if (!this.grid.canPlace(this.active.grid, this.active.x, checkY)) {
            this.isGameOver = true;
            this._showGameOver();
        }
    }

    _loop(timestamp) {
        if (this.isPaused || this.isGameOver) return;
        
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Decay trauma
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - 0.03);
        }

        // this.input.update();  <-- BU SATIRI TAMAMEN SİL VEYA YORUMA AL
        this._tick(dt); // Keep _tick for game logic
        this.renderer.render(this.active);

        requestAnimationFrame(t => this._loop(t));
    }

    _tick(dt) {
        if (!this.active) return;

        this.active.y += this.speed * dt;
        if (!this.grid.canPlace(this.active.grid, this.active.x, this.active.y)) {
            this.active.y = Math.floor(this.active.y);
            this._lock();
            this._shake(0.15); // subtle shake on normal lock
            return;
        }

        // Tweening & Squash/Stretch Mathematics
        const lerpDelay = 0.35;
        const oldVy = this.active.vy;
        
        this.active.vx += (this.active.x - this.active.vx) * lerpDelay;
        this.active.vy += (this.active.y - this.active.vy) * lerpDelay;
        
        const dy = this.active.vy - oldVy;
        const stretch = Math.min(0.4, dy * 1.5); // Max 40% elongation
        this.active.scaleY = 1.0 + stretch;
        this.active.scaleX = 1.0 / this.active.scaleY; // Area conservation: A = w * h
    }

    steer(dx) {
        if (!this.active || this.isGameOver) return;
        const nx = this.active.x + dx;
        const sy = this.active.y < 0 ? 0 : Math.floor(this.active.y);
        if (this.grid.canPlace(this.active.grid, nx, sy)) {
            this.active.x = nx;
            this._haptic('LIGHT');
        }
    }

    hardDrop() {
        if (!this.active || this.isGameOver) return;
        let y = Math.floor(this.active.y < 0 ? 0 : this.active.y);
        while (this.grid.canPlace(this.active.grid, this.active.x, y + 1)) y++;
        this.active.y = y;
        this._haptic('HEAVY');
        this._lock();
        this._shake(0.6); // Massive trauma spike
    }

    _shake(intensity = 0.5) {
        this.trauma = Math.min(1.0, this.trauma + intensity);
        if (navigator.vibrate) navigator.vibrate(50);
    }
    
    async _lock() {
        if (!this.active) return;
        const gx = this.active.x, gy = Math.floor(this.active.y);
        this._haptic('MEDIUM');
        this.audio.playDrop();

        // Landing particles
        const s = this.renderer.cellSize;
        for (let r = 0; r < this.active.grid.length; r++)
            for (let c = 0; c < this.active.grid[0].length; c++)
                if (this.active.grid[r][c] > 0)
                    this.renderer.boom((gx + c) * s + s / 2, (gy + r) * s + s / 2, '#fff', 5);

        if (gy < 0) { this.isGameOver = true; this._showGameOver(); return; }

        this.grid.place(this.active.grid, gx, gy);
        this.active = null;

        const sleep = ms => new Promise(r => setTimeout(r, ms));
        
        // RECURSIVE PHYSICS LOOP: Merge -> Gravity -> Merge...
        let stable = false;
        let loopCount = 0;
        while (!stable && loopCount < 5) {
            stable = true;
            loopCount++;

            // Phase A: Merge
            const maxMerge = this.grid.mergeAdjacent();
            if (maxMerge > 0) {
                stable = false;
                this._haptic('MEDIUM');
                this.audio.playMerge(maxMerge);
                if (maxMerge >= 4) this._triggerPopin(maxMerge);
                await sleep(80); // Visual pause for merging
            }

            // Phase B: Gravity
            const moved = this.grid.applyGravity();
            if (moved) {
                stable = false;
                await sleep(80); // Visual pause for falling
            }
        }

        this._checkClears();
        this._saveState(); 

        this._spawn();
    }

    _setMood(mood) {
        const m = document.getElementById('mascot');
        if (!m) return;
        m.style.animation = 'none';
        void m.offsetWidth; // trigger reflow
        m.style.animation = 'capyBreathe 3s ease-in-out infinite';
        
        if (mood === 'panic') m.style.backgroundImage = 'url("assets/capy_panic.png")';
        else if (mood === 'party') m.style.backgroundImage = 'url("assets/capy_party.png")';
        else m.style.backgroundImage = 'url("assets/capy_happy.png")';
    }

    _checkClears() {
        const status = this.grid.findLinesStatus();
        const clearTotal = status.clearRows.length;

        if (clearTotal === 0) {
            // Check if mascot should panic based on HEIGHT
            let maxH = 0;
            for(let r=0; r<this.grid.height; r++) if(!this.grid.cells[r].every(c=>c===0)) { maxH = this.grid.height - r; break; }
            if (maxH > this.grid.height * 0.7) this._setMood('panic');
            else this._setMood('happy');
            return;
        }

        const s = this.renderer.cellSize;
        const lines = { rows: status.clearRows, cols: status.clearCols };

        // Explosion particles for every block in cleared lines
        lines.rows.forEach(y => {
            this.renderer.sweepRow(y);
            for (let x = 0; x < this.grid.width; x++)
                if (this.grid.cells[y][x] > 0)
                    this.renderer.boom(x * s + s / 2, y * s + s / 2, this.renderer.getColor(this.grid.cells[y][x]), 6);
        });
        lines.cols.forEach(x => {
            this.renderer.sweepCol(x);
            for (let y = 0; y < this.grid.height; y++)
                if (this.grid.cells[y][x] > 0)
                    this.renderer.boom(x * s + s / 2, y * s + s / 2, this.renderer.getColor(this.grid.cells[y][x]), 6);
        });

        this.grid.clearLines(lines);

        const cross = lines.rows.length > 0 && lines.cols.length > 0;
        
        // Massive Exponential Scoring
        let totalSum = status.clearedValues.reduce((a, b) => a + b, 0);
        this.score += totalSum * 10;
        if (clearTotal > 1) this.score += 500;
        
        // Difficulty curve => speed increases with score
        this.speed = this.baseSpeed + (this.score * 0.00000005);

        if (clearTotal >= 2 || totalSum >= 100) {
            this.renderer.spawnTextPopup('delicious');
            if (navigator.vibrate) navigator.vibrate(180);
            this._setMood('party');
        } else {
            this.renderer.spawnTextPopup(status.clearedValues.some(v => v >= 128) ? 'dense' : 'perfect');
            if (navigator.vibrate) navigator.vibrate(50);
            
            // Re-check panic state after a small clear
            let maxH = 0;
            for(let r=0; r<this.grid.height; r++) if(!this.grid.cells[r].every(c=>c===0)) { maxH = this.grid.height - r; break; }
            if (maxH > this.grid.height * 0.7) this._setMood('panic');
            else this._setMood('happy');
        }

        // Progression Logic
        this.linesClearedTotal += clearTotal;
        if (this.linesClearedTotal >= this.level * 10) {
            this.level++;
            this.factory.level = this.level;
            document.getElementById('level').innerText = this.level;
            this._shake(0.5);
            // Visual Level Up? (Maybe just update UI for now)
        }
        
        this._updateHUD();
    }

    _updateHUD() {
        document.getElementById('level').innerText = this.level; 
        document.getElementById('score').textContent = this.score;
        this._progress(this.linesClearedTotal % (this.level * 10), this.level * 10);
    }

    _mathBlast() {
        const m = document.getElementById('mascot');
        const w = document.querySelector('.mascot-wrap');
        if (w) { w.classList.remove('math-blast-active'); void w.offsetWidth; w.classList.add('math-blast-active'); }
    }

    _shake() {
        const el = document.getElementById('game-container');
        if (el) { el.classList.remove('shake-active'); void el.offsetWidth; el.classList.add('shake-active'); }
    }

    _progress(current, max) {
        const bar = document.getElementById('progress');
        if (!bar) return;
        let p = (current / max) * 100;
        bar.style.width = p + '%';
    }

    _triggerPopin(val) {
        const pop = document.getElementById('popin-capy');
        if (!pop) return;
        
        // Randomly pick left or right slide
        const side = Math.random() > 0.5 ? 'left' : 'right';
        // Apply state-based sprite dynamically (Party on combos, Panic on huge dangerous merges)
        const stateClass = val >= 6 ? 'popin-panic' : 'popin-party';
        pop.className = `popin popin-${side} ${stateClass}`;
        
        // Force reflow and trigger CSS animation
        void pop.offsetWidth;
        pop.classList.add('show');
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // Hide after animation finishes
        setTimeout(() => { pop.classList.remove('show'); }, 1500);
    }

    _showGameOver() {
        this.audio.playGameOver();
        this._haptic('HEAVY');
        const m = document.getElementById('mascot');
        if (m) { m.classList.add('mascot-panic'); }
        
        // Save Score
        this.highScores.push(this.score);
        this.highScores.sort((a,b)=>b-a);
        this.highScores = this.highScores.slice(0, 5); // Keep top 5
        localStorage.setItem('capy_scores', JSON.stringify(this.highScores));

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('gameover').classList.remove('hidden');
    }

    _bindUI() {
        document.getElementById('pu-hammer')?.addEventListener('click', () => this._togglePU('hammer'));
        document.getElementById('pu-shuffle')?.addEventListener('click', () => {
            this.next = this._newPiece();
            this.renderer.updateNext(this.next);
        });
        document.getElementById('pu-plus')?.addEventListener('click', () => this._togglePU('plus'));

        // Power-up board clicks
        this.renderer.canvas.addEventListener('click', e => {
            if (!this.powerUpMode) return;
            const r = this.renderer.canvas.getBoundingClientRect();
            const gx = Math.floor((e.clientX - r.left) / this.renderer.cellSize);
            const gy = Math.floor((e.clientY - r.top) / this.renderer.cellSize);
            if (gx < 0 || gx >= this.grid.width || gy < 0 || gy >= this.grid.height) return;
            if (this.grid.cells[gy][gx] <= 0) return;

            if (this.powerUpMode === 'hammer') { 
                this.grid.cells[gy][gx] = 0; 
                this.renderer.boom(gx * this.renderer.cellSize + 18, gy * this.renderer.cellSize + 18, '#fff', 12); 
                this.grid.applyGravity(); // Drop everything resting on the destroyed block
            }
            else if (this.powerUpMode === 'plus') { this.grid.cells[gy][gx]++; this.renderer.boom(gx * this.renderer.cellSize + 18, gy * this.renderer.cellSize + 18, '#ff0', 6); }

            this.powerUpMode = null;
            document.querySelectorAll('.power-btn').forEach(b => b.classList.remove('active-power'));
            this._checkClears();
        });

        // Splash to Main Menu migration
        const spl = document.getElementById('splash');
        document.getElementById('btn-start')?.addEventListener('click', () => {
            console.log('Start button clicked!');
            if (spl) spl.classList.add('gone');
            this.isPaused = false;
            this.lastTime = performance.now();
            requestAnimationFrame(t => this._loop(t));
            if (!this.active) this._spawn();
        });

        document.getElementById('btn-scores')?.addEventListener('click', () => this._showLeaderboard());
        document.getElementById('btn-close-scores')?.addEventListener('click', () => document.getElementById('leaderboard-modal').classList.add('hidden'));

        document.getElementById('btn-revive')?.addEventListener('click', async () => {
            if (this.AdMob) {
                try {
                    // Show Rewarded Ad (Test ID for Android)
                    await this.AdMob.showRewardedAd();
                    // On success (or if testing), we allow revive. 
                    // Note: Real apps should listen for 'rewardedAdReward' event.
                } catch (e) {
                    console.warn('AdMob error or cancelled, allowing revive anyway for testing', e);
                }
            }
            
            this._executeRevive();
        });

        document.getElementById('btn-restart')?.addEventListener('click', () => {
            document.getElementById('gameover').classList.add('hidden');
            this._reset();
        });
    }

    _showLeaderboard() {
        const list = document.getElementById('score-list');
        if (!list) return;
        list.innerHTML = '';
        if (this.highScores.length === 0) list.innerHTML = '<p style="text-align:center; color:#aaa; font-weight:800">Henüz skor yok!</p>';
        this.highScores.forEach((s, i) => {
            list.innerHTML += `<div class="score-item"><span class="rank">#${i+1}</span><span>${s} PTS</span></div>`;
        });
        document.getElementById('leaderboard-modal').classList.remove('hidden');
    }

    _togglePU(name) {
        if (this.powerUpMode === name) { this.powerUpMode = null; document.querySelectorAll('.power-btn').forEach(b => b.classList.remove('active-power')); return; }
        this.powerUpMode = name;
        document.querySelectorAll('.power-btn').forEach(b => b.classList.remove('active-power'));
        document.getElementById(name === 'hammer' ? 'pu-hammer' : (name === 'plus' ? 'pu-plus' : 'pu-shuffle'))?.classList.add('active-power');
    }

    _reset() {
        this._setMood('happy');
        this.grid = new Grid(8, 10);
        this.renderer.grid = this.grid;
        this.renderer.resize();
        this.score = 0;
        this.level = 1;
        this.linesClearedTotal = 0;
        this.factory.level = 1;
        this.speed = this.baseSpeed;
        this.isGameOver = false;
        this._updateHUD();
        this.trauma = 0;
        this.next = this._newPiece();
        this._spawn();
        this.lastTime = performance.now();
        this._loop(this.lastTime);
        this._saveState();
    }

    _haptic(style) {
        if (!this.Haptics) return;
        this.Haptics.impact({ style: style });
    }

    async _saveState() {
        if (!this.Pref || this.isGameOver) return;
        const state = {
            cells: this.grid.cells,
            score: this.score,
            level: this.level,
            linesClearedTotal: this.linesClearedTotal,
            speed: this.speed
        };
        await this.Pref.set({ key: 'capy_state_v2', value: JSON.stringify(state) });
    }

    async _loadState() {
        if (!this.Pref) return;
        const { value } = await this.Pref.get({ key: 'capy_state_v2' });
        if (value) {
            try {
                const state = JSON.parse(value);
                this.grid.cells = state.cells;
                this.score = state.score;
                this.level = state.level || 1;
                this.linesClearedTotal = state.linesClearedTotal || 0;
                this.speed = state.speed;
                this.renderer.resize();
                this._updateHUD();
            } catch (e) {
                console.error('Failed to load save state', e);
            }
        }
    }

    async _executeRevive() {
        document.getElementById('gameover').classList.add('hidden');
        const m = document.getElementById('mascot');
        if (m) { m.classList.remove('mascot-panic'); }
        this.isGameOver = false;
        
        // Clear top 6 rows so player has room to breathe
        for (let i = 0; i < 6; i++) {
            this.grid.cells[i] = new Array(this.grid.width).fill(0);
        }
        this.grid.applyGravity(); // Drop any giant hovering blocks down to the floor
        
        this._spawn();
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }

    async _initAdMob() {
        if (!this.AdMob) return;
        try {
            await this.AdMob.initialize();
            // Pre-load Rewarded Ad (Android Test ID)
            await this.AdMob.prepareRewardedAd({
                adId: 'ca-app-pub-3940256099942544/5224354917',
                isTesting: true
            });
        } catch (e) {
            console.warn('AdMob initialization failed', e);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new Game();
    window.gameInstance.boot();
});
