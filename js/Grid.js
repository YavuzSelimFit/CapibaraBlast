export default class Grid {
    constructor(width = 8, height = 10) {
        this.width = width;
        this.height = height;
        this.cells = Array.from({ length: height }, () => new Array(width).fill(0));
        // Density Compression: Progressively harder per-row thresholds
        this.rowThresholds = [20, 30, 40, 50, 65, 80, 100, 120, 140, 160];
    }

    canPlace(piece, ox, oy) {
        ox = Math.floor(ox);
        oy = Math.floor(oy);
        for (let r = 0; r < piece.length; r++) {
            for (let c = 0; c < piece[0].length; c++) {
                if (piece[r][c] > 0) {
                    const ny = oy + r, nx = ox + c;
                    if (nx < 0 || nx >= this.width || ny >= this.height) return false;
                    if (ny >= 0 && this.cells[ny][nx] > 0) return false;
                }
            }
        }
        return true;
    }

    place(shape, gx, gy) {
        for (let r = 0; r < shape.length; r++)
            for (let c = 0; c < shape[0].length; c++)
                if (shape[r][c] > 0) {
                    const ny = Math.floor(gy) + r, nx = Math.floor(gx) + c;
                    if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width)
                        this.cells[ny][nx] = shape[r][c];
                }
    }

    findLinesStatus() {
        let res = { clearRows: [], clearCols: [], clearedValues: [] }; // clearCols kept empty for compatibility
        
        // Rows only!
        for (let y = 0; y < this.height; y++) {
            let sum = 0, count = 0;
            for (let x = 0; x < this.width; x++) {
                if (this.cells[y][x] > 0) { sum += this.cells[y][x]; count++; }
            }
            // Density Rule: Sum must meet or exceed THIS specific row's threshold!
            const rowTarget = this.rowThresholds[y] || 160;
            if (count > 0 && sum >= rowTarget) {
                res.clearRows.push(y);
                res.clearedValues.push(sum);
            }
        }
        
        return res;
    }

    calculateLineSum(lines) {
        let sum = 0; const seen = new Set();
        lines.rows.forEach(y => { for (let x = 0; x < this.width; x++) { sum += this.cells[y][x]; seen.add(`${y},${x}`); } });
        lines.cols.forEach(x => { for (let y = 0; y < this.height; y++) if (!seen.has(`${y},${x}`)) sum += this.cells[y][x]; });
        return sum;
    }

    clearLines(lines) {
        lines.rows.forEach(r => { this.cells[r] = new Array(this.width).fill(0); });
        lines.cols.forEach(c => { for (let r = 0; r < this.height; r++) this.cells[r][c] = 0; });
        // Gravity collapse
        const kept = this.cells.filter(row => !row.every(c => c === 0));
        while (kept.length < this.height) kept.unshift(new Array(this.width).fill(0));
        this.cells = kept;
    }

    triggerAoE(lines) {
        const targets = new Set();
        lines.rows.forEach(y => { for (let x = 0; x < this.width; x++) { if (y - 1 >= 0) targets.add(`${y-1},${x}`); if (y + 1 < this.height) targets.add(`${y+1},${x}`); } });
        lines.cols.forEach(x => { for (let y = 0; y < this.height; y++) { if (x - 1 >= 0) targets.add(`${y},${x-1}`); if (x + 1 < this.width) targets.add(`${y},${x+1}`); } });
        targets.forEach(k => { const [r, c] = k.split(',').map(Number); if (r >= 0 && r < this.height && c >= 0 && c < this.width) this.cells[r][c] = 0; });
    }

    mergeAdjacent() {
        let merged = true, iter = 0;
        let maxMergedValue = 0;
        while (merged && iter++ < 4) {
            merged = false;
            // Scan bottom-up so merged value stays at the LOWER cell
            for (let y = this.height - 1; y >= 0; y--)
                for (let x = 0; x < this.width; x++) {
                    const v = this.cells[y][x];
                    if (v <= 0) continue;
                    // Check ONLY the down neighbor for vertical-only merge
                    for (const [dy, dx] of [[1,0]]) {
                        const ty = y + dy, tx = x + dx;
                        if (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width && this.cells[ty][tx] === v) {
                            // Merged value goes to the LOWER/RIGHT cell
                            const newVal = v * 2;
                            this.cells[ty][tx] = newVal;
                            this.cells[y][x] = 0;
                            merged = true;
                            if (newVal > maxMergedValue) maxMergedValue = newVal;
                            break;
                        }
                    }
                }
        }
        return maxMergedValue;
    } // CRITICAL RESTORED BRACE

    applyGravity() {
        let moved = false;
        for (let x = 0; x < this.width; x++) {
            // Down-to-up scan to fill gaps
            for (let y = this.height - 2; y >= 0; y--) {
                if (this.cells[y][x] > 0) {
                    let dropY = y;
                    // Slide block down as long as the cell below is empty
                    while (dropY + 1 < this.height && this.cells[dropY + 1][x] === 0) {
                        dropY++;
                    }
                    if (dropY !== y) {
                        this.cells[dropY][x] = this.cells[y][x];
                        this.cells[y][x] = 0;
                        moved = true;
                    }
                }
            }
        }
        return moved;
    }
}
