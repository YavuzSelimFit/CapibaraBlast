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
        this.sweeps = [];
        this.colors = { 
            1:'#a8e6cf', 2:'#87ceeb', 4:'#ffd3b6', 8:'#c3aed6', 16:'#f5b7b1', 32:'#f9e79f', 
            64:'#edbb99', 128:'#aed6f1', 256:'#a2d9ce', 512:'#f9ebae', 1024:'#d2b4de',
            default:'#d5dbdb' 
        };

        this._loadAssets();
        
        // YENİ EKLENEN KISIM: DOM boyutları tamamen hesaplandığında canvas'ı boyutlandır.
        const area = document.querySelector('.board-area');
        if (area && window.ResizeObserver) {
            // Elementin boyutu her değiştiğinde (veya ilk hesaplandığında) resize() çalışır.
            new ResizeObserver(() => this.resize()).observe(area);
        } else {
            // Eski tarayıcılar için yedek plan (fallback)
            window.addEventListener('resize', () => this.resize());
            setTimeout(() => this.resize(), 150); 
        }
        
        this.resize();
    }

    _loadAssets() {
        [2, 4, 8, 16, 32, 64, 128, 256].forEach(val => {
            const img = new Image();
            img.onload = () => { 
                this.imgAssets[val] = img;
            };
            img.src = `assets/block_${val}.png`;
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

        this.cellSize = Math.floor(Math.min(aw / (this.grid.width + 1.5), ah / this.grid.height));
        const w = this.cellSize * (this.grid.width + 1.5);
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
        const gridW = this.cellSize * this.grid.width;
        const H = this.cellSize * this.grid.height;
        const W = this.cellSize * (this.grid.width + 1.5);
        c.clearRect(0, 0, W, H);

        // Grid background - subtle dotted intersections only
        c.strokeStyle = 'rgba(0,0,0,0.06)';
        c.lineWidth = 0.5;
        for (let y = 0; y <= this.grid.height; y++) {
            c.beginPath(); c.moveTo(0, y * this.cellSize); c.lineTo(gridW, y * this.cellSize); c.stroke();
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
        let ghostY = -1;
        if (active) {
            ghostY = Math.floor(active.y < 0 ? 0 : active.y);
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
                        this._drawBlock(c, v, cl * this.cellSize, r * this.cellSize, this.cellSize);
                    }
                }
            c.restore();
        }

        // --- Row Sums & Threshold Logic ---
        c.save();
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        
        const target = window.gameInstance?.threshold || 60;

        for (let y = 0; y < this.grid.height; y++) {
            let rowSum = 0;
            let activeContribution = false;
            
            for (let x = 0; x < this.grid.width; x++) rowSum += this.grid.cells[y][x];
            
            if (active && ghostY !== -1) {
                const relativeY = y - ghostY;
                if (relativeY >= 0 && relativeY < active.grid.length) {
                    for (let cl = 0; cl < active.grid[0].length; cl++) {
                        const v = active.grid[relativeY][cl];
                        if (v > 0) { rowSum += v; activeContribution = true; }
                    }
                }
            }

            if (rowSum > 0 || activeContribution) {
                const cx = gridW + 6; // Hug the grid to fit on small screens
                const cy = y * this.cellSize + this.cellSize / 2;
                
                const rowTarget = this.grid.rowThresholds[y] || 160;
                const ratio = rowSum / rowTarget;
                const textStr = `${rowSum} / ${rowTarget}`;
                
                c.shadowBlur = 4;
                c.shadowColor = 'rgba(0,0,0,0.3)';

                if (ratio >= 1.0) {
                    // FULL/CLEARED!
                    c.fillStyle = '#2ecc71'; // Vibrant Green
                    const pulse = 1 + Math.sin(Date.now() / 150) * 0.1;
                    c.font = `900 ${Math.round(this.cellSize * 0.4 * pulse)}px Nunito, sans-serif`;
                    c.shadowColor = 'rgba(46, 204, 113, 0.6)';
                    c.shadowBlur = 12;
                } else if (ratio >= 0.7 || activeContribution) {
                    // DENSE / GHOST BOOSTING -> Bold Orange
                    c.fillStyle = '#e67e22'; 
                    c.font = `800 ${Math.round(this.cellSize * 0.35)}px Nunito, sans-serif`;
                } else {
                    // LIGHT
                    c.fillStyle = 'rgba(0,0,0,0.4)';
                    c.font = `700 ${Math.round(this.cellSize * 0.3)}px Nunito, sans-serif`;
                }
                
                c.fillText(textStr, cx, cy);
            }
        }
        c.restore();

        this._tickSweeps(c);
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
        const sz = size + 0.5;
        const radius = Math.min(10, sz * 0.25);
        const img = this.imgAssets[val];

        ctx.save();
        ctx.beginPath();
        this._roundRectPath(ctx, x, y, sz, sz, radius);
        ctx.clip();

        if (img && img.complete) {
            // New Premium Sprite (already has number and 3D look)
            ctx.drawImage(img, x, y, sz, sz);
        } else {
            // Fallback to Procedural Jelly if image not loaded
            const baseColor = this.colors[val] || this.colors.default;
            const bodyGrad = ctx.createLinearGradient(x, y, x, y + sz);
            bodyGrad.addColorStop(0, this._lighten(baseColor, 25));
            bodyGrad.addColorStop(1, this._darken(baseColor, 15));
            ctx.fillStyle = bodyGrad;
            ctx.fillRect(x, y, sz, sz);
            this._drawNumber(ctx, val, x, y, sz);
        }

        ctx.restore();
    }

    _lighten(hex, pct) {
        const n = parseInt(hex.replace('#',''), 16);
        const r = Math.min(255, (n >> 16) + Math.round(2.55 * pct));
        const g = Math.min(255, ((n >> 8) & 0xFF) + Math.round(2.55 * pct));
        const b = Math.min(255, (n & 0xFF) + Math.round(2.55 * pct));
        return `rgb(${r},${g},${b})`;
    }

    _darken(hex, pct) {
        const n = parseInt(hex.replace('#',''), 16);
        const r = Math.max(0, (n >> 16) - Math.round(2.55 * pct));
        const g = Math.max(0, ((n >> 8) & 0xFF) - Math.round(2.55 * pct));
        const b = Math.max(0, (n & 0xFF) - Math.round(2.55 * pct));
        return `rgb(${r},${g},${b})`;
    }

    _drawNumber(ctx, val, x, y, size) {
        ctx.save();
        const cx = x + size / 2;
        const cy = y + size / 2;
        ctx.font = `900 ${Math.round(size * 0.5)}px Nunito, sans-serif`;
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2c3e50'; 
        ctx.strokeText(val, cx, cy);
        ctx.fillStyle = '#fff';
        ctx.fillText(val, cx, cy);
        ctx.restore();
    }

    boom(x, y, color, n) {
        const types = ['leaf', 'star', 'drop'];
        for (let i = 0; i < n; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 6 - 3,
                life: 1,
                color,
                size: Math.random() * 5 + 3,
                type,
                spin: (Math.random() - 0.5) * 0.3,
                angle: Math.random() * Math.PI * 2
            });
        }
    }

    sweepRow(y) {
        this.sweeps.push({ type: 'row', index: y, life: 1 });
    }
    
    sweepCol(x) {
        this.sweeps.push({ type: 'col', index: x, life: 1 });
    }

    _tickSweeps(c) {
        if (this.sweeps.length === 0) return;
        c.save();
        for (let i = this.sweeps.length - 1; i >= 0; i--) {
            const s = this.sweeps[i];
            s.life -= 0.05;
            if (s.life <= 0) { this.sweeps.splice(i, 1); continue; }
            
            c.globalAlpha = s.life;
            c.fillStyle = 'white';
            c.shadowColor = 'white';
            c.shadowBlur = 15;
            
            const thickness = 4 + (1 - s.life) * 25;
            
            if (s.type === 'row') {
                const cy = s.index * this.cellSize + this.cellSize / 2;
                c.fillRect(0, cy - thickness/2, this.cellSize * this.grid.width, thickness);
            } else {
                const cx = s.index * this.cellSize + this.cellSize / 2;
                c.fillRect(cx - thickness/2, 0, thickness, this.cellSize * this.grid.height);
            }
        }
        c.restore();
    }

    _tickParticles(c) {
        if (!this.dropImg) {
            this.dropImg = new Image();
            this.dropImg.src = 'assets/water_drop.png';
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35;           
            p.vx *= 0.98;           
            p.life -= 0.025;
            p.angle += p.spin;

            if (p.life <= 0) { this.particles.splice(i, 1); continue; }

            const scale = p.life;   
            const drawSize = p.size * scale;

            c.save();
            c.globalAlpha = Math.min(1, p.life * 1.5);
            c.translate(p.x, p.y);
            c.rotate(p.angle);

            if (p.type === 'leaf') {
                c.fillStyle = '#6ec87a';
                c.beginPath();
                c.ellipse(0, 0, drawSize * 1.4, drawSize * 0.6, 0, 0, Math.PI * 2);
                c.fill();
            } else if (p.type === 'star') {
                c.fillStyle = '#ffd700';
                c.beginPath();
                for (let s = 0; s < 5; s++) {
                    const a = (s * 4 * Math.PI) / 5 - Math.PI / 2;
                    const method = s === 0 ? 'moveTo' : 'lineTo';
                    c[method](Math.cos(a) * drawSize, Math.sin(a) * drawSize);
                }
                c.closePath();
                c.fill();
            } else {
                // Asset 6.2: Water Drop
                if (this.dropImg.complete) {
                    c.drawImage(this.dropImg, -drawSize/2, -drawSize/2, drawSize, drawSize);
                } else {
                    c.fillStyle = '#87ceeb';
                    c.beginPath(); c.arc(0, 0, drawSize * 0.7, 0, Math.PI * 2); c.fill();
                }
            }

            c.restore();
        }
        c.globalAlpha = 1;
    }

    spawnTextPopup(type) {
        const area = document.querySelector('.board-area');
        if (!area) return;
        const img = document.createElement('img');
        img.src = `assets/${type}.png`;
        img.className = 'text-popup';
        const rot = (Math.random() - 0.5) * 20;
        img.style.setProperty('--target-rot', rot + 'deg');
        area.appendChild(img);
        setTimeout(() => img.remove(), 1500);
    }

    getColor(v) { return this.colors[v] || this.colors.default; }
}
