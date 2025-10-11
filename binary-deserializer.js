function deserialize(buffer) {
    const view = new DataView(buffer);
    const strokes = [];
    let offset = 0;

    const totalStrokes = view.getUint32(offset, true);
    offset += 4;

    for (let i = 0; i < totalStrokes; i++) {
        const color = view.getUint32(offset, true).toString(16);
        offset += 4;

        const lineWidth = view.getFloat32(offset, true);
        offset += 4;

        const numPoints = view.getUint32(offset, true);
        offset += 4;

        const points = [];
        for (let j = 0; j < numPoints; j++) {
            const x = view.getFloat32(offset, true);
            offset += 4;
            const y = view.getFloat32(offset, true);
            offset += 4;
            points.push({ x, y });
        }

        strokes.push({
            properties: { color: `#${color}`, lineWidth },
            points
        });
    }

    return strokes;
}
