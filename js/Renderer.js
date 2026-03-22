export default class Renderer {
    constructor(grid) {
        this.grid = grid;
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCv = document.getElementById('next-cv');
        this.nextCtx = this.nextCv ? this.nextCv.getContext('2d') : null;

        this.cellSize = 0;
        this.cellSize = 0;
        this.imgAssets = {};
        this.particles = []; // Restored critical array initialization
        this.colors = { 1:'#a8e6cf', 2:'#87ceeb', 3:'#ffd3b6', 4:'#c3aed6', 6:'#f5b7b1', 8:'#f9e79f', default:'#d5dbdb' };

        this._loadAssets();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    _loadAssets() {
        [1,2,3].forEach(n => {
            const img = new Image();
            img.onload = () => { 
                this.imgAssets[n] = img;  // DO NOT run grid blocks through the Alpha filter (they are already transparent!)
                if (window.gameInstance) { 
                    this.render(window.gameInstance.active); 
                    this.updateNext(window.gameInstance.next); 
                } 
            };
            img.src = `assets/block_${n}.png`;
        });

        // Pre-process animated sprite sheets to global CSS variables
        const loadSheet = (src, varName) => {
            const sheet = new Image();
            sheet.onload = () => {
                const cleanCanvas = this._processAlpha(sheet);
                document.documentElement.style.setProperty(varName, `url(${cleanCanvas.toDataURL('image/png')})`);
            };
            sheet.src = src;
        };

        loadSheet('assets/capy_walk_sheet.png', '--url-walk');
        loadSheet('assets/capy_party_sheet.png', '--url-party');
        loadSheet('assets/capy_panic_sheet.png', '--url-panic');
    }

    _processAlpha(image) {
        const offscreen = document.createElement('canvas');
        offscreen.width = image.naturalWidth || image.width;
        offscreen.height = image.naturalHeight || image.height;
        if (offscreen.width === 0) return image;
        
        const ctx = offscreen.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        const data32 = new Uint32Array(imageData.data.buffer);
        
        // Strict Bitwise Little-Endian RGBA -> ABGR check (Phase 1)
        for (let i = 0; i < data32.length; i++) {
            const val = data32[i];
            const r = val & 0xFF;
            const g = (val >> 8) & 0xFF;
            const b = (val >> 16) & 0xFF;
            if (r > 240 && g > 240 && b > 240) {
                data32[i] = 0; // Pure transparent A=0 R=0 G=0 B=0
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return offscreen;
    }

    resize() {
        const area = document.querySelector('.board-area');
        if (!area) return;
        const pad = 12;
        const aw = area.clientWidth - pad * 2;
        const ah = area.clientHeight - pad * 2;
        if (aw <= 0 || ah <= 0) return;

        this.cellSize = Math.floor(Math.min(aw / this.grid.width, ah / this.grid.height));
        const w = this.cellSize * this.grid.width;
        const h = this.cellSize * this.grid.height;
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    updateNext(piece) {
        if (!this.nextCtx || !piece) return;
        const c = this.nextCtx;
        c.clearRect(0, 0, 40, 40);
        const rows = piece.grid.length, cols = piece.grid[0].length;
        const s = Math.min(10, Math.floor(36 / Math.max(rows, cols)));
        const ox = (40 - cols * s) / 2, oy = (40 - rows * s) / 2;
        for (let r = 0; r < rows; r++)
            for (let cl = 0; cl < cols; cl++)
                if (piece.grid[r][cl] > 0) this._drawBlock(c, piece.grid[r][cl], ox + cl * s, oy + r * s, s);
    }

    render(active) {
        const c = this.ctx;
        const W = this.cellSize * this.grid.width;
        const H = this.cellSize * this.grid.height;
        c.clearRect(0, 0, W, H);

        // Grid background - subtle dotted intersections only
        c.strokeStyle = 'rgba(0,0,0,0.06)';
        c.lineWidth = 0.5;
        for (let y = 0; y <= this.grid.height; y++) {
            c.beginPath(); c.moveTo(0, y * this.cellSize); c.lineTo(W, y * this.cellSize); c.stroke();
        }
        for (let x = 0; x <= this.grid.width; x++) {
            c.beginPath(); c.moveTo(x * this.cellSize, 0); c.lineTo(x * this.cellSize, H); c.stroke();
        }

        // Placed blocks
        for (let y = 0; y < this.grid.height; y++)
            for (let x = 0; x < this.grid.width; x++) {
                const v = this.grid.cells[y][x];
                if (v > 0) this._drawBlock(c, v, x * this.cellSize, y * this.cellSize, this.cellSize);
            }

        // Ghost preview (shadow of where piece will land)
        if (active) {
            let ghostY = Math.floor(active.y < 0 ? 0 : active.y);
            while (this.grid.canPlace(active.grid, active.x, ghostY + 1)) ghostY++;
            c.globalAlpha = 0.18;
            for (let r = 0; r < active.grid.length; r++)
                for (let cl = 0; cl < active.grid[0].length; cl++)
                    if (active.grid[r][cl] > 0)
                        this._drawBlock(c, active.grid[r][cl], (active.x + cl) * this.cellSize, (ghostY + r) * this.cellSize, this.cellSize);
            c.globalAlpha = 1;
        }

        // Active piece (smooth sub-pixel)
        if (active) {
            c.save();
            const activeW = active.grid[0].length * this.cellSize;
            const activeH = active.grid.length * this.cellSize;
            
            const px = active.vx * this.cellSize;
            const py = active.vy * this.cellSize;
            
            c.translate(px + activeW/2, py + activeH/2);
            c.scale(active.scaleX, active.scaleY);
            c.translate(-(activeW/2), -(activeH/2));

            for (let r = 0; r < active.grid.length; r++)
                for (let cl = 0; cl < active.grid[0].length; cl++) {
                    const v = active.grid[r][cl];
                    if (v > 0) {
                        c.shadowColor = this.colors[v] || '#fff';
                        c.shadowBlur = 12;
                        this._drawBlock(c, v, cl * this.cellSize, r * this.cellSize, this.cellSize);
                        c.shadowBlur = 0;
                    }
                }
            c.restore();
        }

        this._tickParticles(c);
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    }

    _drawBlock(ctx, val, x, y, size) {
        let img = this.imgAssets[val];
        let useFallbackTexture = false;
        
        if (!img || !img.complete || img.naturalWidth === 0) {
            img = this.imgAssets[1];
            useFallbackTexture = true;
        }

        ctx.save();
        ctx.beginPath();
        const sz = size + 0.5; 
        this._roundRectPath(ctx, x, y, sz, sz, 8);
        ctx.clip();

        if (img && img.complete && img.naturalWidth > 0) {
            if (useFallbackTexture) {
                ctx.save();
                ctx.translate(x, y);
                // Stretch image to FULL cell to connect
                ctx.drawImage(img, 0, 0, sz, sz);
                
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = this.colors[val] || this.colors.default;
                ctx.globalAlpha = 0.65;
                ctx.fillRect(0, 0, sz, sz);
                
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
                
                ctx.fillStyle = 'white';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.font = `900 ${Math.round(size * 0.45)}px Nunito, sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.strokeText(val, size / 2, size / 2 + 1);
                ctx.fillText(val, size / 2, size / 2 + 1);
                ctx.restore();
            } else {
                ctx.drawImage(img, x, y, sz, sz);
            }
            ctx.restore();
            return;
        }

        // Complete Failsafe
        ctx.fillStyle = this.colors[val] || this.colors.default;
        ctx.beginPath(); this._roundRectPath(ctx, x, y, sz, sz, 5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); this._roundRectPath(ctx, x + 2, y + 2, sz - 4, size * 0.35, 3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.font = `${Math.round(size * 0.45)}px Nunito, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(val, x + size / 2, y + size / 2 + 1);
        ctx.restore();
    }

    boom(x, y, color, n) {
        for (let i = 0; i < n; i++)
            this.particles.push({ x, y, vx: (Math.random() - .5) * 10, vy: (Math.random() - .5) * 10 - 2, life: 1, color, size: Math.random() * 4 + 2 });
    }

    _tickParticles(c) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.life -= 0.035;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            c.globalAlpha = p.life;
            c.fillStyle = p.color;
            c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill();
        }
        c.globalAlpha = 1;
    }

    getColor(v) { return this.colors[v] || this.colors.default; }
}
