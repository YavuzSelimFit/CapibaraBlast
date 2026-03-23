export default class BlockFactory {
    constructor() {
        this.level = 1;
        // Weighting: 3x 1x1 blocks, 1x 1x2 block
        this.shapes = [
            [[1]], [[1]], [[1]], 
            [[1], [1]]
        ];
    }
    
    setDifficulty(level) {
        this.difficulty = level;
    }
    
    createRandom(gridInstance) {
        let shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        let blockGrid = shape.map(row => 
            row.map(cell => cell === 1 ? this.getRandomNumber() : 0)
        );
        return { grid: blockGrid };
    }
    
    getRandomNumber() {
        // Dynamic evolution based on level.
        // Level 1: [1,2,4,8]
        // Level 5: [8,16,32,64]
        // Level 10: [64,128,256,512]
        
        const basePow = Math.floor((this.level - 1) / 2); // 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6...
        const roll = Math.random();
        let add = 0;
        if (roll < 0.4) add = 0;
        else if (roll < 0.75) add = 1;
        else if (roll < 0.95) add = 2;
        else add = 3;

        return Math.pow(2, basePow + add);
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
