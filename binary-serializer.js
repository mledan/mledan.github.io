function serialize(strokes) {
    const totalStrokes = strokes.length;
    let bufferSize = 4; // for total strokes

    strokes.forEach(stroke => {
        bufferSize += 4; // for color
        bufferSize += 4; // for line width
        bufferSize += 4; // for number of points
        bufferSize += stroke.points.length * 8; // for points (x, y)
    });

    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint32(offset, totalStrokes, true);
    offset += 4;

    strokes.forEach(stroke => {
        const color = parseInt(stroke.properties.color.slice(1), 16);
        view.setUint32(offset, color, true);
        offset += 4;

        view.setFloat32(offset, stroke.properties.lineWidth, true);
        offset += 4;

        view.setUint32(offset, stroke.points.length, true);
        offset += 4;

        stroke.points.forEach(point => {
            view.setFloat32(offset, point.x, true);
            offset += 4;
            view.setFloat32(offset, point.y, true);
            offset += 4;
        });
    });

    return buffer;
}
