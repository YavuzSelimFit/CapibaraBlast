import Renderer from './Renderer.js?v=9';
import Grid from './Grid.js?v=9';
import Input from './Input.js?v=9';
import BlockFactory from './BlockFactory.js?v=9';

class Game {
    constructor() {
        this.grid = new Grid(8, 14);
        this.renderer = new Renderer(this.grid);
        this.factory = new BlockFactory();
        this.input = null;

        this.score = 0;
        this.highScores = JSON.parse(localStorage.getItem('capy_scores') || '[]');
        this.targetNumber = 10;

        this.active = null;   // { grid, x, y }
        this.next = null;

        this.isGameOver = false;
        this.isPaused = true; // starts paused on splash

        this.baseSpeed = 0.0018;
        this.speed = this.baseSpeed;
        this.lastTime = 0;
        this.lockDelay = 350;
        this.lockTimer = 0;
        this.powerUpMode = null;
    }

    boot() {
        this.input = new Input(this);
        this._bindUI();
        
        // No auto-start or splash-click-anywhere. 
        // btn-start in _bindUI will trigger the transition.
        this.next = this._newPiece();
        this.renderer.updateNext(this.next);
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
        const piece = this.next || this._newPiece();
        this.active = {
            grid: piece.grid,
            x: Math.floor(this.grid.width / 2) - Math.floor(piece.grid[0].length / 2),
            y: -piece.grid.length
        };
        this.next = this._newPiece();
        this.renderer.updateNext(this.next);
        this.lockTimer = 0;

        // Game over check
        if (!this.grid.canPlace(this.active.grid, this.active.x, 0)) {
            this.isGameOver = true;
            this._showGameOver();
        }
    }

    _loop(ts) {
        if (this.isGameOver || this.isPaused) return;
        const dt = ts - this.lastTime;
        this.lastTime = ts;

        this._tick(dt);
        this.renderer.render(this.active);

        requestAnimationFrame(t => this._loop(t));
    }

    _tick(dt) {
        if (!this.active) return;
        const nextY = this.active.y + this.speed * dt;

        if (!this.grid.canPlace(this.active.grid, this.active.x, Math.ceil(nextY))) {
            this.lockTimer += dt;
            if (this.lockTimer >= this.lockDelay) this._lock();
        } else {
            this.active.y = nextY;
            this.lockTimer = 0;
        }
    }

    steer(dx) {
        if (!this.active || this.isGameOver) return;
        const nx = this.active.x + dx;
        const sy = this.active.y < 0 ? 0 : Math.floor(this.active.y);
        if (this.grid.canPlace(this.active.grid, nx, sy)) {
            this.active.x = nx;
            if (navigator.vibrate) navigator.vibrate(4);
        }
    }

    hardDrop() {
        if (!this.active || this.isGameOver) return;
        let y = Math.floor(this.active.y < 0 ? 0 : this.active.y);
        while (this.grid.canPlace(this.active.grid, this.active.x, y + 1)) y++;
        this.active.y = y;
        this._lock();
        this._shake();
    }

    _lock() {
        if (!this.active) return;
        const gx = this.active.x, gy = Math.floor(this.active.y);
        if (navigator.vibrate) navigator.vibrate(12);

        // Landing particles
        const s = this.renderer.cellSize;
        for (let r = 0; r < this.active.grid.length; r++)
            for (let c = 0; c < this.active.grid[0].length; c++)
                if (this.active.grid[r][c] > 0)
                    this.renderer.boom((gx + c) * s + s / 2, (gy + r) * s + s / 2, '#fff', 5);

        if (gy < 0) { this.isGameOver = true; this._showGameOver(); return; }

        this.grid.place(this.active.grid, gx, gy);
        const maxMerge = this.grid.mergeAdjacent();
        if (maxMerge >= 4) this._triggerPopin(maxMerge);
        this._checkClears();

        this.active = null;
        this._spawn();
    }

    _checkClears() {
        const lines = this.grid.findCompleteLines();
        const total = lines.rows.length + lines.cols.length;
        if (total === 0) return;

        const sum = this.grid.calculateLineSum(lines);
        const cross = lines.rows.length > 0 && lines.cols.length > 0;
        const s = this.renderer.cellSize;

        // Explosion particles for every block in cleared lines
        lines.rows.forEach(y => {
            for (let x = 0; x < this.grid.width; x++)
                if (this.grid.cells[y][x] > 0)
                    this.renderer.boom(x * s + s / 2, y * s + s / 2, this.renderer.getColor(this.grid.cells[y][x]), 6);
        });
        lines.cols.forEach(x => {
            for (let y = 0; y < this.grid.height; y++)
                if (this.grid.cells[y][x] > 0)
                    this.renderer.boom(x * s + s / 2, y * s + s / 2, this.renderer.getColor(this.grid.cells[y][x]), 6);
        });

        this.grid.clearLines(lines);

        if (cross) { this.score += 30; this._shake(); if (navigator.vibrate) navigator.vibrate([80, 40, 80]); }

        if (sum === this.targetNumber) {
            this.score += 50 * total + (cross ? 100 : 0);
            this.grid.triggerAoE(lines);
            this._mathBlast();
            this.speed = Math.min(this.speed + 0.0002, 0.008);
            this.targetNumber = 8 + Math.floor(Math.random() * 10);
            document.getElementById('target').textContent = this.targetNumber;
            if (navigator.vibrate) navigator.vibrate(180);
        } else {
            this.score += 10 * total;
            if (navigator.vibrate) navigator.vibrate(25);
        }

        document.getElementById('score').textContent = this.score;
        this._progress(total);
    }

    _mathBlast() {
        const m = document.getElementById('mascot');
        if (m) { m.src = 'assets/mascot_happy.png'; setTimeout(() => { if (!this.isGameOver) m.src = 'assets/mascot.png'; }, 1200); }
        const w = document.querySelector('.mascot-wrap');
        if (w) { w.classList.remove('math-blast-active'); void w.offsetWidth; w.classList.add('math-blast-active'); }
    }

    _shake() {
        const el = document.getElementById('game-container');
        if (el) { el.classList.remove('shake-active'); void el.offsetWidth; el.classList.add('shake-active'); }
    }

    _progress(n) {
        const bar = document.getElementById('progress');
        if (!bar) return;
        let w = parseFloat(bar.style.width || '0') + n * 5;
        bar.style.width = Math.min(w, 100) + '%';
    }

    _triggerPopin(val) {
        const pop = document.getElementById('popin-capy');
        if (!pop) return;
        
        // Randomly pick left or right slide
        const side = Math.random() > 0.5 ? 'left' : 'right';
        pop.className = `popin popin-${side}`;
        // Mascot state based on how big the merge is
        pop.src = val >= 6 ? 'assets/mascot_panic.png' : 'assets/mascot_happy.png';
        
        // Force reflow and trigger CSS animation
        void pop.offsetWidth;
        pop.classList.add('show');
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // Hide after animation finishes
        setTimeout(() => { pop.classList.remove('show'); }, 1500);
    }

    _showGameOver() {
        const m = document.getElementById('mascot');
        if (m) { m.src = 'assets/mascot_panic.png'; m.classList.add('mascot-panic'); }
        
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

            if (this.powerUpMode === 'hammer') { this.grid.cells[gy][gx] = 0; this.renderer.boom(gx * this.renderer.cellSize + 18, gy * this.renderer.cellSize + 18, '#fff', 12); }
            else if (this.powerUpMode === 'plus') { this.grid.cells[gy][gx]++; this.renderer.boom(gx * this.renderer.cellSize + 18, gy * this.renderer.cellSize + 18, '#ff0', 6); }

            this.powerUpMode = null;
            document.querySelectorAll('.pu-btn').forEach(b => b.classList.remove('active'));
            this._checkClears();
        });

        // Splash to Main Menu migration
        const spl = document.getElementById('splash');
        document.getElementById('btn-start')?.addEventListener('click', () => {
            if (spl) spl.classList.add('gone');
            this.isPaused = false;
            this.lastTime = performance.now();
            requestAnimationFrame(t => this._loop(t));
            if (!this.active) this._spawn();
        });

        document.getElementById('btn-scores')?.addEventListener('click', () => this._showLeaderboard());
        document.getElementById('btn-close-scores')?.addEventListener('click', () => document.getElementById('leaderboard-modal').classList.add('hidden'));

        document.getElementById('btn-revive')?.addEventListener('click', () => {
            document.getElementById('gameover').classList.add('hidden');
            const m = document.getElementById('mascot');
            if (m) { m.src = 'assets/mascot.png'; m.classList.remove('mascot-panic'); }
            this.isGameOver = false;
            for (let i = 0; i < 3; i++) this.grid.cells[i] = new Array(this.grid.width).fill(0);
            for (let i = this.grid.height - 3; i < this.grid.height; i++) this.grid.cells[i] = new Array(this.grid.width).fill(0);
            this._spawn();
            this.lastTime = performance.now();
            this._loop(this.lastTime);
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
        if (this.powerUpMode === name) { this.powerUpMode = null; document.querySelectorAll('.pu-btn').forEach(b => b.classList.remove('active')); return; }
        this.powerUpMode = name;
        document.querySelectorAll('.pu-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(name === 'hammer' ? 'pu-hammer' : 'pu-plus')?.classList.add('active');
    }

    _reset() {
        const m = document.getElementById('mascot');
        if (m) { m.src = 'assets/mascot.png'; m.classList.remove('mascot-panic'); }
        this.grid = new Grid(8, 14);
        this.renderer.grid = this.grid;
        this.renderer.resize();
        this.score = 0;
        this.targetNumber = 10;
        this.speed = this.baseSpeed;
        this.isGameOver = false;
        document.getElementById('score').textContent = '0';
        document.getElementById('target').textContent = '10';
        this.next = this._newPiece();
        this._spawn();
        this.lastTime = performance.now();
        this._loop(this.lastTime);
    }
}

window.addEventListener('DOMContentLoaded', () => new Game().boot());
