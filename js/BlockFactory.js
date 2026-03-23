export default class BlockFactory {
    constructor() {
        this.shapes = [
            [[1, 1], [1, 1]], [[1, 1, 1, 1]], [[1], [1], [1], [1]],
            [[1, 1, 1], [0, 1, 0]], [[1, 1], [0, 1], [0, 1]], [[1]], [[1, 1]], [[1], [1]]
        ];
        
        this.largeShapes = [
            [[1, 1, 1], [1, 1, 1]], // 2x3 block (much more manageable)
            [[1, 1, 1, 1]], // 4-long horizontal
            [[1], [1], [1], [1]] // 4-long vertical
        ];
        
        this.difficulty = 'relaxed';
        this.turnCounter = 0;
    }
    
    setDifficulty(level) {
        this.difficulty = level;
    }
    
    createRandom(gridInstance) {
        let pool = this.shapes;
        
        this.turnCounter++;
        if (this.difficulty === 'crisis' || (this.turnCounter > 10 && this.turnCounter % 5 === 0)) {
            pool = pool.concat(this.largeShapes);
            this.difficulty = 'crisis';
        } else if (this.difficulty === 'breather') {
            pool = [[[1]], [[1, 1]], [[1], [1]]]; 
            if (Math.random() < 0.3) this.difficulty = 'relaxed';
        }
        
        let shape = pool[Math.floor(Math.random() * pool.length)];
        let blockGrid = shape.map(row => 
            row.map(cell => cell === 1 ? this.getRandomNumber() : 0)
        );
        return { grid: blockGrid };
    }
    
    getRandomNumber() {
        const roll = Math.random();
        if (roll < 0.5) return 1;
        if (roll < 0.8) return 2;
        return 3;
    }
    
    generateTurnBlocks(gridInstance) {
        let blocks = [
            this.createRandom(gridInstance),
            this.createRandom(gridInstance),
            this.createRandom(gridInstance)
        ];
        
        let canFitAtLeastOne = false;
        for (let b of blocks) {
            if (this.simulatePlacement(b.grid, gridInstance)) {
                canFitAtLeastOne = true;
                break;
            }
        }
        
        if (!canFitAtLeastOne) {
            if (this.simulatePlacement([[1]], gridInstance)) {
                blocks[Math.floor(Math.random()*3)] = { grid: [[this.getRandomNumber()]] };
            }
        }
        return blocks;
    }
    
    simulatePlacement(shape, gridInstance) {
        if (!gridInstance) return true;
        for (let y = 0; y < gridInstance.height; y++) {
            for (let x = 0; x < gridInstance.width; x++) {
                if (gridInstance.canPlace(shape, x, y)) {
                    return true;
                }
            }
        }
        return false;
    }
}
