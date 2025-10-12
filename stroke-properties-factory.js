// StrokePropertiesFactory - Helper class to create consistent stroke properties

export class StrokePropertiesFactory {
    constructor() {
        this.cache = new Map();
    }

    get(color, width) {
        const key = `${color}-${width}`;
        
        if (this.cache.has(key)) {
            return { ...this.cache.get(key) };
        }

        const properties = {
            color: color,
            width: width,
            opacity: 1,
            effects: []
        };

        this.cache.set(key, properties);
        return { ...properties };
    }
}

export default StrokePropertiesFactory;