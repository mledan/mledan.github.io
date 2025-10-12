// Quadtree - Spatial indexing for efficient stroke culling

export class Quadtree {
    constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.bounds = bounds;
        this.objects = [];
        this.nodes = [];
    }

    clear() {
        this.objects = [];
        this.nodes.forEach(node => node.clear());
        this.nodes = [];
    }

    split() {
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        // Top right
        this.nodes[0] = new Quadtree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Top left
        this.nodes[1] = new Quadtree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Bottom left
        this.nodes[2] = new Quadtree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Bottom right
        this.nodes[3] = new Quadtree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
    }

    getIndex(rect) {
        const indices = [];
        const verticalMidpoint = this.bounds.x + this.bounds.width / 2;
        const horizontalMidpoint = this.bounds.y + this.bounds.height / 2;

        const topQuadrant = rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint;
        const bottomQuadrant = rect.y > horizontalMidpoint;

        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                indices.push(1);
            } else if (bottomQuadrant) {
                indices.push(2);
            } else {
                indices.push(1, 2);
            }
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                indices.push(0);
            } else if (bottomQuadrant) {
                indices.push(3);
            } else {
                indices.push(0, 3);
            }
        } else {
            if (topQuadrant) {
                indices.push(0, 1);
            } else if (bottomQuadrant) {
                indices.push(2, 3);
            } else {
                indices.push(0, 1, 2, 3);
            }
        }

        return indices;
    }

    insert(rect) {
        if (this.nodes.length > 0) {
            const indices = this.getIndex(rect);
            indices.forEach(index => {
                this.nodes[index].insert(rect);
            });
            return;
        }

        this.objects.push(rect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const indices = this.getIndex(this.objects[i]);
                indices.forEach(index => {
                    this.nodes[index].insert(this.objects[i]);
                });
                this.objects.splice(i, 1);
            }
        }
    }

    retrieve(rect) {
        let returnObjects = [];

        if (this.nodes.length > 0) {
            const indices = this.getIndex(rect);
            indices.forEach(index => {
                returnObjects = returnObjects.concat(this.nodes[index].retrieve(rect));
            });
        }

        returnObjects = returnObjects.concat(this.objects);

        return returnObjects;
    }
}

export default Quadtree;