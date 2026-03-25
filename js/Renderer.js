export default class Renderer {
    constructor(grid) {
        this.grid = grid;
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        this.nextCv = document.getElementById('next-cv');
        this.nextCtx = this.nextCv ? this.nextCv.getContext('2d') : null;

        this.cellSize = 0;
        this.imgAssets = {};
        this.particles = []; 
        this.floatingTexts = [];
        this.sweeps = [];
        this.colors = { 
            1:'#e0f7fa', 2:'#a8e6cf', 4:'#dcedc1', 8:'#ffd3b6', 16:'#ffaaa5', 32:'#ff8b94', 
            64:'#a29bfe', 128:'#74b9ff', 256:'#55efc4', default:'#dfe6e9' 
        };

        this._loadAssets();
        
        const area = document.querySelector('.board-area');
        if (area && window.ResizeObserver) {
            new ResizeObserver(() => this.resize()).observe(area);
        } else {
            window.addEventListener('resize', () => this.resize());
            setTimeout(() => this.resize(), 150); 
        }
        
        this.resize();
    }

    _loadAssets() {
        [1, 2, 4, 8, 16, 32, 64, 128, 256].forEach(val => {
            const img = new Image();
            img.onload = () => { this.imgAssets[val] = img; };
            img.src = `assets/block_${val}.png`;
        });
        
        // Miscellaneous assets
        this.dropImg = new Image();
        this.dropImg.src = 'assets/water_drop.png';
    }

    resize() {
        const area = document.querySelector('.board-area');
        if (!area) return;
        const pad = 10;
        const dpr = window.devicePixelRatio || 1;
        
        // We want the grid to fit perfectly in the available space
        const aw = area.clientWidth - pad * 2;
        const ah = area.clientHeight - pad * 2;
        
        // Use 95% of width to avoid 'small' cells on narrow screens
        const gridAreaW = aw * 0.95;
        this.cellSize = Math.floor(Math.min(gridAreaW / this.grid.width, ah / this.grid.height));
        
        const w = aw; 
        const h = ah; 
        
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        // Center the grid in the canvas
        this.gridOffsetX = (w - (this.grid.width * this.cellSize)) / 2;
        this.gridOffsetY = (h - (this.grid.height * this.cellSize)) / 2;
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
        const W = this.canvas.width / (window.devicePixelRatio || 1);
        const H = this.canvas.height / (window.devicePixelRatio || 1);
        c.clearRect(0, 0, W, H);

        this._drawProceduralGrid(c);

        // Placed blocks
        const ox = this.gridOffsetX, oy = this.gridOffsetY, s = this.cellSize;
        for (let y = 0; y < this.grid.height; y++)
            for (let x = 0; x < this.grid.width; x++) {
                const v = this.grid.cells[y][x];
                if (v > 0) this._drawBlock(c, v, ox + x * s, oy + y * s, s);
            }

        // Ghost preview
        let ghostY = -1;
        if (active) {
            ghostY = Math.floor(active.y < 0 ? 0 : active.y);
            while (this.grid.canPlace(active.grid, active.x, ghostY + 1)) ghostY++;
            c.globalAlpha = 0.2;
            for (let r = 0; r < active.grid.length; r++)
                for (let cl = 0; cl < active.grid[0].length; cl++)
                    if (active.grid[r][cl] > 0)
                        this._drawBlock(c, active.grid[r][cl], ox + (active.x + cl) * s, oy + (ghostY + r) * s, s);
            c.globalAlpha = 1;
        }

        // Active piece
        if (active) {
            c.save();
            const activeW = active.grid[0].length * s;
            const activeH = active.grid.length * s;
            const px = ox + active.vx * s;
            const py = oy + active.vy * s;
            
            c.translate(px + activeW/2, py + activeH/2);
            c.scale(active.scaleX, active.scaleY);
            c.translate(-(activeW/2), -(activeH/2));

            for (let r = 0; r < active.grid.length; r++)
                for (let cl = 0; cl < active.grid[0].length; cl++) {
                    const v = active.grid[r][cl];
                    if (v > 0) this._drawBlock(c, v, cl * s, r * s, s);
                }
            c.restore();
        }

        this._drawRowSums(c, active, ghostY);
        this._tickSweeps(c);
        this._tickParticles(c);
    }

    _drawProceduralGrid(ctx) {
        const ox = this.gridOffsetX, oy = this.gridOffsetY, s = this.cellSize;
        const gw = this.grid.width * s, gh = this.grid.height * s;
        
        ctx.save();
        
        // 1. Premium Glass Layer Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        this._roundRectPath(ctx, ox, oy, gw, gh, 15);
        ctx.fill();

        // 2. Inner Cell Glows (The "Glass" feel)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const cx = ox + x * s;
                const cy = oy + y * s;
                // Subtle cell highlight (top-left)
                ctx.beginPath();
                ctx.moveTo(cx + 4, cy + s - 4);
                ctx.lineTo(cx + 4, cy + 4);
                ctx.lineTo(cx + s - 4, cy + 4);
                ctx.stroke();
            }
        }

        // 3. Main Grid Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= this.grid.width; x++) {
            ctx.moveTo(ox + x * s, oy);
            ctx.lineTo(ox + x * s, oy + gh);
        }
        for (let y = 0; y <= this.grid.height; y++) {
            ctx.moveTo(ox, oy + y * s);
            ctx.lineTo(ox + gw, oy + y * s);
        }
        ctx.stroke();

        // 4. Outer Glowing Frame
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        this._roundRectPath(ctx, ox, oy, gw, gh, 15);
        ctx.stroke();
        
        ctx.restore();
    }

    _drawRowSums(ctx, active, ghostY) {
        const ox = this.gridOffsetX, oy = this.gridOffsetY, s = this.cellSize;
        const gw = this.grid.width * s;
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
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

            if (rowSum > 0) {
                const rowTarget = this.grid.rowThresholds[y] || 160;
                const ratio = rowSum / rowTarget;
                const ty = oy + y * s + s / 2;
                const tx = ox + gw + 10;
                
                if (ratio >= 1.0) {
                    ctx.fillStyle = '#2ecc71';
                    ctx.font = `900 ${Math.round(s * 0.45)}px var(--font-main), sans-serif`;
                } else if (ratio >= 0.7 || activeContribution) {
                    ctx.fillStyle = '#f39c12';
                    ctx.font = `800 ${Math.round(s * 0.35)}px var(--font-main), sans-serif`;
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.font = `700 ${Math.round(s * 0.3)}px var(--font-main), sans-serif`;
                }
                ctx.fillText(`${rowSum}/${rowTarget}`, tx, ty);
            }
        }
        ctx.restore();
    }

    _drawBlock(ctx, val, x, y, size) {
        const img = this.imgAssets[val];
        // Reduce padding from 0.05 to 0.02 to make blocks look bigger
        const padding = size * 0.02;
        const drawSize = size - padding * 2;
        
        if (img && img.complete) {
            const aspect = img.width / img.height;
            let dw = drawSize, dh = drawSize;
            
            // If the image is not perfectly square, fit it within the box
            if (aspect > 1) {
                dh = drawSize / aspect;
            } else if (aspect < 1) {
                dw = drawSize * aspect;
            }

            const dx = x + padding + (drawSize - dw) / 2;
            const dy = y + padding + (drawSize - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
        } else {
            // HIGH-FIDELITY PROCEDURAL JELLY (3D Look)
            const baseColor = this.colors[val] || this.colors.default;
            const r = size * 0.25;
            const bx = x + padding, by = y + padding, bs = drawSize;
            
            ctx.save();
            // Main Body Gradient
            const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.1, baseColor);
            grad.addColorStop(1, this._shadeColor(baseColor, -20));
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            this._roundRectPath(ctx, bx, by, bs, bs, r);
            ctx.fill();
            
            // Clean Stroke for separation
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Subtle Top Shine
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            this._roundRectPath(ctx, bx + bs*0.1, by + bs*0.1, bs*0.8, bs*0.2, r/2);
            ctx.fill();
            ctx.restore();

            this._drawNumber(ctx, val, x, y, size);
        }
    }

    _shadeColor(color, percent) {
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16);
        R = parseInt(R * (100 + percent) / 100);
        G = parseInt(G * (100 + percent) / 100);
        B = parseInt(B * (100 + percent) / 100);
        R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255;
        const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
        const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
        const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
        return "#"+RR+GG+BB;
    }

    _drawNumber(ctx, val, x, y, size) {
        ctx.save();
        // Larger, more impactful font
        ctx.font = `900 ${Math.round(size * 0.55)}px var(--font-main), cursive`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        
        // Outline for double clarity
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 4;
        ctx.strokeText(val, x + size/2, y + size/2 + size*0.05);
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 6;
        ctx.fillText(val, x + size/2, y + size/2 + size*0.05); 
        ctx.restore();
    }

    _roundRectPath(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    }

    boom(x, y, color, n) {
        if (this.particles.length > 200) return; // Lag prevention
        const types = ['star', 'drop'];
        for (let i = 0; i < n; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 6 - 3,
                life: 1, color, size: Math.random() * 5 + 3,
                type: types[Math.floor(Math.random() * types.length)],
                spin: (Math.random() - 0.5) * 0.3, angle: Math.random() * Math.PI * 2
            });
        }
    }

    sweepRow(y) { this.sweeps.push({ type: 'row', index: y, life: 1 }); }
    sweepCol(x) { this.sweeps.push({ type: 'col', index: x, life: 1 }); }

    _tickSweeps(c) {
        for (let i = this.sweeps.length - 1; i >= 0; i--) {
            const s = this.sweeps[i];
            s.life -= 0.05;
            if (s.life <= 0) { this.sweeps.splice(i, 1); continue; }
            c.save();
            c.globalAlpha = s.life;
            c.fillStyle = 'white'; c.shadowBlur = 15; c.shadowColor = 'white';
            const thickness = 4 + (1 - s.life) * 20;
            if (s.type === 'row') c.fillRect(this.gridOffsetX, this.gridOffsetY + s.index * this.cellSize + this.cellSize/2 - thickness/2, this.grid.width * this.cellSize, thickness);
            else c.fillRect(this.gridOffsetX + s.index * this.cellSize + this.cellSize/2 - thickness/2, this.gridOffsetY, thickness, this.grid.height * this.cellSize);
            c.restore();
        }
    }

    _tickParticles(c) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.025; p.angle += p.spin;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            const ds = p.size * p.life;
            c.save();
            c.globalAlpha = p.life; c.translate(p.x, p.y); c.rotate(p.angle);
            if (p.type === 'star') {
                c.fillStyle = '#ffd700'; c.beginPath();
                for (let s = 0; s < 5; s++) {
                    const a = (s * 4 * Math.PI) / 5 - Math.PI / 2;
                    c[s === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * ds, Math.sin(a) * ds);
                }
                c.closePath(); c.fill();
            } else if (this.dropImg && this.dropImg.complete) {
                c.drawImage(this.dropImg, -ds/2, -ds/2, ds, ds);
            }
            c.restore();
        }
    }

    showFloatingText(text) {
        // Map string to asset name: 'FANTASTIC!' -> 'fantastic' (or same)
        const assetName = text.replace('!', '').toLowerCase();
        this.spawnTextPopup(assetName);
    }

    spawnTextPopup(type) {
        const area = document.querySelector('.board-area');
        if (!area) return;
        const img = document.createElement('img');
        img.src = `assets/${type}.png`;
        img.className = 'text-popup';
        img.style.setProperty('--target-rot', (Math.random() - 0.5) * 20 + 'deg');
        area.appendChild(img);
        setTimeout(() => img.remove(), 1500);
    }

    getColor(v) { return this.colors[v] || this.colors.default; }
}
