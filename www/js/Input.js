export default class Input {
    constructor(game) {
        this.game = game;
        this.cv = document.getElementById('game-board');
        this.startX = 0; this.startY = 0; this.curX = 0;
        this._bind();
    }

    _bind() {
        // Touch
        this.cv.addEventListener('touchstart', e => { if (e.touches[0]) this._down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
        this.cv.addEventListener('touchmove', e => { e.preventDefault(); if (e.touches[0]) this._move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });

        // Mouse fallback
        let down = false;
        this.cv.addEventListener('mousedown', e => { down = true; this._down(e.clientX, e.clientY); });
        window.addEventListener('mousemove', e => { if (down) this._move(e.clientX, e.clientY); });
        window.addEventListener('mouseup', () => { down = false; });

        // Keyboard (desktop convenience)
        window.addEventListener('keydown', e => {
            if (this.game.isGameOver || this.game.isPaused) return;
            if (e.key === 'ArrowLeft') this.game.steer(-1);
            else if (e.key === 'ArrowRight') this.game.steer(1);
            else if (e.key === 'ArrowDown' || e.key === ' ') this.game.hardDrop();
        });
    }

    _down(x, y) {
        if (this.game.isGameOver || this.game.isPaused) return;
        this.startX = x; this.startY = y; this.curX = x;
    }

    _move(x, y) {
        if (this.game.isGameOver || this.game.isPaused) return;

        // Hard drop on swipe down
        if (y - this.startY > 50) {
            this.game.hardDrop();
            this.startY = y + 999; // prevent re-trigger
            return;
        }

        // Horizontal steer
        const threshold = this.game.renderer.cellSize * 0.6 || 20;
        if (Math.abs(x - this.curX) >= threshold) {
            this.game.steer(x > this.curX ? 1 : -1);
            this.curX = x;
        }
    }
}
