class StrokePropertiesFactory {
    constructor() {
        this.properties = {};
    }

    get(color, lineWidth) {
        const key = `${color}-${lineWidth}`;
        if (!this.properties[key]) {
            this.properties[key] = { color, lineWidth };
        }
        return this.properties[key];
    }
}
